const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "config", ".env") });
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const cookieParser = require("cookie-parser");
const { sessionMiddleware } = require("./middleware/sessionMiddleWare");
const cors = require("cors");
const userRoutes = require("./router/userRoutes");
const root = require("./router/root");
const { customErrorHandler } = require("./middleware/customErrorHandler");
const app = express();
const server = http.createServer(app);
const userModel = require("./models/users/userModel");
const gameLogic = require("./models/game/gameLogic");
const gameModel = require("./models/game/gameModel");
const playerModel = require("./models/game/playerModels");

// Set online users to be an object
let onlineUsers = {};

let socketIdMap = new Map();

//set io and active cors
const io = require("socket.io")(server, {
    cors: {
        origin: "https://texas-hold-poker-game.onrender.com",
        methods: ["GET", "POST"],
    },
});

//TODO move these functions to a different page for organization
// Io connection functions start here
io.on("connection", (socket) => {
    console.log(`Connection established on socket Id: ${socket.id}`);

    //listening to front end join_lobby event being emiited
    socket.on("join_lobby", (data) => {
        if (!data.userId || !data.userName) {
            console.error("Invalid user data received during join_lobby", data);
            return; // Don't process this lobby join
        }
        // data will be the userName along with user_id . the userName and user_id  is stored in the local storage
        onlineUsers[data.userId] = data.userName;
        // getting the userId and userName from the front end and adding to the socket object

        // that way we can retrieve the data if a certain function does not pass a parameter
        socket.userId = data.userId;
        socket.userName = data.userName;

        //Updating the socket ID mapping
        socketIdMap.set(data.userId, socket.id);

        // Emitting the updated user list to all connected sockets
        io.emit("update_user_list", onlineUsers);

        // Joining the user to the 'lobby' room
        socket.join("lobby");

        // Logging the join event
        console.log(`User ${data.userName} joined the lobby`);

        //Broadcast that the user has connected on lobby
        io.to("lobby").emit("receive_message", { userName: "System", message: ` ${data.userName} joined lobby` });

        // Fetching all messages from the database
        userModel
            .getMessages()
            .then((messages) => {
                // If there are messages, emit each message to the newly joined user
                if (messages && messages.length > 0) {
                    messages.forEach((message) => {
                        // Break into username and message_content since is being requested by client
                        const messageToEmit = {
                            userName: message.username,
                            message: message.message_content,
                        };
                        // emit to the front end  the messages history in the chat to the user logging in
                        socket.emit("receive_message", messageToEmit);
                    });
                }
            })
            .catch((err) => {
                // If an error occurs while fetching messages, log it
                console.error(err);
            });
        gameModel.getActiveGame().then((activeGame) => {
            if (activeGame) {
                // Load active game state
                const activeGameState = activeGame.game_state_json;

                // Rejoin all players to the active game
                for (let userId in activeGameState.players) {
                    const activeGameStatePlayer = activeGameState.players[userId];
                    gameLogic.playerRejoinGame(userId, activeGameStatePlayer);
                }

                // Send each individual player their corresponding game state
                for (let userId in activeGameState.players) {
                    let socketId = socketIdMap.get(userId);
                    const playerGameState = activeGameState.players[userId];

                    io.to(socketId).emit("game_resume", {
                        gameId: activeGame.game_id,
                        gameState: playerGameState,
                        current_player: activeGameState.current_player,
                        pot: activeGameState.pot,
                        current_bet: activeGameState.current_bet,
                    });

                    console.log(
                        `Sent game resume data to player with ID: ${userId}. for gameId: ${
                            activeGame.game_id
                        } Player Game State: ${JSON.stringify(playerGameState, null, 2)}, Current player: ${
                            activeGameState.current_player
                        }`
                    );
                }

                console.log(`Resumed game with ID: ${activeGame.game_id}`);
            } else {
                if (Object.keys(onlineUsers).length >= 2) {
                    // Add all online users to the game
                    for (let userId in onlineUsers) {
                        // it will use the userId and get the userName by userId from onlineUser
                        // it will then set the player object state
                        gameLogic.playerJoinGame(userId, onlineUsers[userId]);
                    }

                    // Now after players joined the game we will start the game
                    gameLogic.startGame();

                    // We need to store the game in the database
                    const gameState = gameLogic.getGameState();
                    // create a new game in the database
                    gameModel
                        .createGame("Default", gameState)
                        .then((createdGame) => {
                            // the database will return the created game row but we console log the game_id
                            console.log(`Created new game with ID: ${createdGame.game_id}`);
                            /*
                            we loop through each player so we can record each individual player data on the database
                            */
                            for (let userId in gameState.players) {
                                playerModel
                                    .joinGame(userId, createdGame.game_id, gameState.players[userId])
                                    .then((createdPlayer) => {
                                        console.log(`Added player with ID: ${userId} to game with ID: ${createdGame.game_id}`);
                                    })
                                    .catch((err) => {
                                        console.error(err);
                                    });
                            }
                            /*
                              Loop to send to the front end each individual player
                              their game state. We can accomplish this by assigining
                              socketId  to socketIdMap.geet(userId) declared in the begginning
                              of IO function
                            */
                            for (let userId in gameState.players) {
                                let socketId = socketIdMap.get(userId);

                                // Sends each individual their corresponding game state
                                const playerGameState = gameState.players[userId];

                                io.to(socketId).emit("game_start", {
                                    gameId: createdGame.game_id,
                                    gameState: playerGameState,
                                    current_player: gameState.current_player,
                                    pot: gameState.pot,
                                    current_bet: gameState.current_bet,
                                });
                            }
                        })
                        .catch((err) => {
                            console.error(err);
                        });
                }
            }
        });
    });

    socket.on("bet", async (data) => {
        let betAmount = parseInt(data.amount, 10);

        const betResult = await gameLogic.playerBet(socket.userId, betAmount);

        //for debugging
        console.log(betResult);

        // If the bet was successful, get the updated game state and player states
        if ((!betResult.playerHasNoMoney && !betResult.isNotPlayerTurn) || betResult.endRound) {
            await gameModel.getRecentGameId().then(async (game_id) => {
                const gameId = game_id;
                console.log("GAME ID", gameId);

                return await gameModel.getGame(gameId).then((game) => {
                    let updatedGameState = game.game_state_json;
                    console.log("UPDATED GAME STATE", updatedGameState);

                    for (let userId in updatedGameState.players) {
                        let socketId = socketIdMap.get(userId);

                        // Sends each individual their corresponding game state
                        const playerGameState = updatedGameState.players[userId];
                        console.log("UPDATED PLAYER GAME STATE", playerGameState);
                        io.to(socketId).emit("game_update", {
                            gameId: game.game_id,
                            gameState: playerGameState,
                            current_player: updatedGameState.current_player,
                            pot: updatedGameState.pot,
                            current_bet: updatedGameState.current_bet,
                        });
                    }
                });
            });

            let success = betResult.endRound ? false : true;

            // Send the result of the bet to all players
            io.emit("bet_result", {
                success: success,
                player: socket.userId,
                amount: betAmount,
                endRound: betResult.endRound,
                message: `Player ${socket.userId} has made a bet of ${betAmount}`,
            });
        } else {
            // If the bet was not successful, just send the result to the player who made the bet
            socket.emit("bet_result", {
                success: false,
                ...betResult,
            });
        }
    });

    //TODO
    socket.on("fold", async (data) => {
        console.log(data.userName + " has folded" + " with Id " + data.userId);

        const folded = gameLogic.playerFold(data.userId);

        console.log("debugging folded", folded);

        if (folded) {
            setTimeout(async () => {
                await gameModel.getRecentGameId().then(async (game_id) => {
                    const gameId = game_id;
                    console.log("GAME ID", gameId);

                    return await gameModel.getGame(gameId).then((game) => {
                        let updatedGameState = game.game_state_json;
                        console.log("UPDATED GAME STATE", updatedGameState);

                        for (let userId in updatedGameState.players) {
                            let socketId = socketIdMap.get(userId);

                            // Sends each individual their corresponding game state
                            const playerGameState = updatedGameState.players[userId];
                            console.log("UPDATED PLAYER GAME STATE", playerGameState);
                            io.to(socketId).emit("game_update", {
                                gameId: game.game_id,
                                gameState: playerGameState,
                                current_player: updatedGameState.current_player,
                                pot: updatedGameState.pot,
                                current_bet: updatedGameState.current_bet,
                            });
                        }
                    });
                });
            },4000);

            io.emit("user_folded", { userName: data.userName, message: "Starting a new round" });
        }

        // socket.broadcast.emit("user_folded", { userName: data.userName });
    });

    // Event to listen to messages sent from the client side
    socket.on("send_message", (data) => {
        // breaking the message by descontruction the parameter data
        // so we can save the messages in the data base that correspond to the  user
        const message = { userName: data.userName, message: data.message };
        // We then Emit the message to all users in the lobby since
        // the design is to be an open chat
        io.to("lobby").emit("receive_message", message);
        // Store the message in the database
        userModel
            // we store the message with the corresponding userId  and the message content
            .storeMessage(socket.userId, data.message)
            .then((storedMessage) => {
                // check for error and emit to front end "message_error"
                if (!storedMessage) {
                    socket.emit("message_error", { error: "Message could not be stored." });
                }
                // Log the stored message
                console.log(`Stored message: ${storedMessage.message_content}`);
                console.log(`user sending message is ${data.userName}`);
            })
            .catch((err) => {
                // If an error occurs while storing the message, log it
                console.error(err);
                socket.emit("message_error", { error: "An error occurred while storing the message." });
            });
    });

    socket.on("disconnect", () => {
        if (!socket.userId) {
            console.log("Ignoring player disconnection for unassociated socket");
            return; // If socket.userId is undefined, stop execution here
        }

        console.log(`User ${socket.userName} disconnected`);

        // Wait for 3 seconds before handling the disconnection
        setTimeout(() => {
            // If the user has not reconnected within the timeout period, handle their disconnection
            const reconnectedSocketId = socketIdMap.get(socket.userId);
            if (!io.sockets.sockets.has(reconnectedSocketId)) {
                handlePlayerDisconnection(socket);
            }
        }, 3000);
    });

    function handlePlayerDisconnection(socket) {
        if (!socket.userId) {
            console.log("Ignoring player disconnection for unassociated socket");
            return; // If socket.userId is undefined, stop execution here
        }
        // If the user was part of a game, handle their disconnection
        if (gameLogic.isUserInGame(socket.userId)) {
            let gameResult = gameLogic.removeUserFromGame(socket.userId);

            if (gameResult.endGameResult) {
                gameModel
                    .getRecentGameId()
                    .then((gameId) => {
                        if (gameResult.endGameResult.gameState) {
                            gameResult.endGameResult.gameState.isActive = false;
                            gameModel.updateGame(gameResult.endGameResult.gameState, gameId).then(() => {});
                        }
                    })
                    .catch((err) => {
                        console.error("Error updating the game state", err);
                    });
                if (gameResult.endGameResult.winners) {
                    let winners = gameResult.endGameResult.winners;

                    winners.forEach((winnerName) => {
                        let winnerId = Object.keys(gameResult.endGameResult.gameState.players).find(
                            (playerId) => gameResult.endGameResult.gameState.players[playerId].userName === winnerName
                        );

                        let winner = gameResult.endGameResult.gameState.players[winnerId];

                        let loserId;

                        for (let playerId in gameResult.endGameResult.gameState.players) {
                            if (playerId !== winnerId) {
                                loserId = playerId;
                                break;
                            }
                        }

                        let loser = gameResult.endGameResult.gameState.players[loserId];

                        // Sending individualized data to each player
                        Object.keys(gameResult.endGameResult.gameState.players).forEach((playerId) => {
                            let socketId = socketIdMap.get(playerId);
                            if (socketId) {
                                let player = gameResult.endGameResult.gameState.players[playerId];
                                if (playerId === winnerId) {
                                    // If the player is the winner
                                    io.to(socketId).emit("game_end", {
                                        winner: winner,
                                        player: player,
                                        reason: `Game over. ${winner.userName} is the winner.`,
                                        winnersCard: winner.cards,
                                        losersCard: loser.cards,
                                    });
                                } else {
                                    // If the player is not the winner
                                    io.to(socketId).emit("game_end", {
                                        winner: winner,
                                        player: player,
                                        reason: `Game over. You lost. ${winner.userName} is the winner.`,
                                        winnersCard: winner.cards,
                                        losersCard: loser.cards,
                                    });
                                }
                            }
                        });
                    });
                } else {
                    // If game ends without a clear winner (all players disconnected)
                    io.emit("game_end", {
                        reason: "Game over. All players have disconnected.",
                        gameResult: gameResult.endGameResult ? gameResult.endGameResult.gameState : {},
                    });
                }
            }
        }
        // Delay the notification of other users that this user has disconnected
        setTimeout(() => {
            // Remove user from onlineUsers and socketIdMap

            if (socket.userId) {
                // Remove user from onlineUsers and socketIdMap
                delete onlineUsers[socket.userId];
                socketIdMap.delete(socket.userId);
            }

            // Notify other users that this user has disconnected
            io.emit("update_user_list", onlineUsers);
            // Broadcast that the user has disconnected from the lobby
            io.to("lobby").emit("receive_message", { userName: "System", message: `${socket.userName} has left the lobby` });
        }, 1000);

        console.log(`User ${socket.userName} disconnected`);
    }
});

// Server side code

// view engine setup
app.set("views", path.join(__dirname, "../../frontend/src/public/views"));

app.set("view engine", "ejs");

// Serve static files for front end

app.use(express.static(path.join(__dirname, "../../frontend/src/public/")));

// middleware
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(sessionMiddleware);

app.use("/", root);
app.use("/user", userRoutes);

// Move customErrorHandler here, after the routes
app.use(customErrorHandler);

//Creates database
const { CreateTableError, createTables } = require("./database/createTables");

const result = {};

createTables()
    .then((resultStatus) => {
        result.message = resultStatus.message;
        // start server here
        const port = process.env.PORT || 3000;

        // 404 error handling
        app.use((req, res, next) => {
            res.status(404).json({ message: "Not Found" });
        });

        // error handling
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(err.statusCode || 500).json({ message: err.message });
        });

        return new Promise((resolve, reject) => {
            server.listen(port, () => {
                result.serverMessage = `Server running on port ${port}`;
                console.log(result.serverMessage);
                resolve(result);
            });
        });
    })
    .catch((error) => {
        if (error instanceof CreateTableError) {
            result.message = ("Error in creating table", error.message);
        } else {
            result.internal = ("Error in createTables", error);
        }
        return Promise.reject(result);
    })
    .then((result) => {
        console.log("Server started successfully", result);
    })
    .catch((result) => {
        console.log("Error starting server", result);
    });
