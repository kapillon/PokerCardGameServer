const playerModel = require("./playerModels");
const gamesModel = require("../game/gameModel");

const suits = ["♠", "♥", "♦", "♣"];

const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck() {
    let deck = [];
    suits.forEach((suit) => {
        ranks.forEach((rank) => {
            deck.push(`${rank}${suit}`);
        });
    });
    return deck;
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }
    console.log("cards shuffle....");
    return deck;
}

let gameState = {
    isActive: true,
    pot: 0,
    current_bet: 0,
    dealer: null,
    current_player: null,
    players: {}, // We will store the player's data using their user_id as the key
};

// Getter function
function getGameState() {
    return gameState;
}

function isUserInGame(user_id) {
    let result = !!gameState.players[user_id] ? `user leaving is  in game` : `user leaving is not  in game`;

    console.log(result);

    return !!gameState.players[user_id];
}

function removeUserFromGame(user_id) {
    let gameResult = {};
    // Check if the player exists in the game
    if (!gameState.players[user_id]) {
        return `Player ${user_id} does not exist in the game`;
    }

    // If the player is the dealer, assign a new dealer
    if (gameState.dealer === user_id) {
        console.log("user leaving the game was a dealer");
        gameState.dealer = getNextPlayer(user_id);
    }

    // If the player is the current player, move to the next player
    if (gameState.current_player === user_id) {
        console.log("user leaving the game was a current player");
        gameState.current_player = getNextPlayer(user_id);
    }

    let playState = gameState.players[user_id];
    playState.isParticipating = false;
    playerModel.updatePlayerState(user_id, gameState.players[user_id]);

    let activePlayers = Object.values(gameState.players).filter((player) => player.isParticipating).length;
    console.log("Active players remaining in the game:", activePlayers);

    if (activePlayers > 2) {
        console.log("more than one player left");
        // we will count the cards
        gameResult.roundResult = endRound();
    } else if (activePlayers <= 2) {
        console.log(" 2 or less players left. End game!");
        // only the player who did not leave the game should be counted as winner regardless of the cards
        gameResult.endGameResult = endGame();
        Object.values(gameState.players).forEach((player) => {
            player.isActive = false;
            player.isParticipating = false;
            playerModel.updatePlayerState(user_id, gameState.players[user_id]);
        });
    }

    return gameResult;
}

function playerJoinGame(user_id, userName) {
    if (!user_id || !userName) {
        console.error("invalid user_id or username", user_id, userName);
        return;
    }

    if (gameState.players[user_id]) {
        if (gameState.players[user_id].isParticipating) {
            console.error("User is already active", user_id, userName);
            return;
        } else {
            // User exists, update their state to reflect that they have reconnected
            gameState.players[user_id].isActive = true;
            gameState.players[user_id].isParticipating = true;
        }
    } else {
        gameState.players[user_id] = {
            userName: userName,
            cards: [],
            bet_amount: 0,
            money: 50, // Let's give each player 1000 units of money to start
            isActive: true, // New property indicating if the player is active in the current round
            isParticipating: true,
            roundsWon: 0,
            roundsLost: 0,
            gamesWon: 0,
            gamesLost: 0,
        };

        let activePlayers = Object.values(gameState.players).filter((player) => player.isParticipating).length;

        if (activePlayers === 1) {
            // If this is the first player to join, they become the dealer
            gameState.dealer = user_id;
        } else if (activePlayers === 2 && !gameState.current_player) {
            // If this is the second player to join, they become the current player
            gameState.current_player = user_id;
        }
    }
}

async function playerFold(user_id) {
    let player = gameState.players[user_id];


    player.isActive = false;

    try {
        console.log("Updating player state in the database: ", user_id);
        await playerModel.updatePlayerState(user_id, gameState.players[user_id]);
        console.log(`Player state ${user_id} updated in the database.`);
    } catch (err) {
        console.log("Error updating player state: ", err);
    }

    // getting the other player
    gameState.current_player = getNextPlayer(user_id);

    let activePlayers = Object.values(gameState.players).filter((p) => p.isActive);

    if (activePlayers.length < 2) {
        console.log(" starting a new round due to fold");
        startNewRound();

        console.log("Updating game state in the database");

        gamesModel
            .getRecentGameId()
            .then((gameId) => {
                console.log("retrieved the gameId", gameId);

                return gamesModel.updateGame(gameState, gameId);
            })
            .then((result) => {
                console.log(`Game state updated successfully, ${result} row(s) affected`);
            })
            .catch((err) => console.log("Error updating game state: ", err));
        return true;
    }
    return false;
}

function startGame() {
    let participatingPlayers = Object.values(gameState.players).filter((player) => player.isParticipating);

    if (participatingPlayers.length < 2) {
        return;
    }

    // Create and shuffle the deck
    let deck = createDeck();
    shuffle(deck);

    for (let user_id in gameState.players) {
        gameState.players[user_id].cards = [deck.pop(), deck.pop()];
        gameState.players[user_id].isActive = true;
        gameState.players[user_id].isParticipating = true;
    }

    // The player after the dealer goes first if there's no current player
    if (!gameState.current_player) {
        gameState.current_player = getNextPlayer(gameState.dealer);
    }
}

async function playerBet(user_id, amount) {
    let player = gameState.players[user_id];

    const result = {};

    console.log("PlayerBet Called: ", user_id, amount);

    if (player.money < amount) {
        result.playerHasNoMoney = true;
        console.log("Player has no money for this bet");
        return result;
    } else if (gameState.current_player !== user_id) {
        result.isNotPlayerTurn = true;
        console.log("Not the turn of this player");
        return result;
    }

    player.bet_amount += amount;
    gameState.current_bet = player.bet_amount;
    player.money -= amount;
    gameState.pot += amount;
    player.isActive = false;

    console.log("Player after bet: ", player);

    try {
        console.log("Updating player state in the database: ", user_id);
        await playerModel.updatePlayerState(user_id, gameState.players[user_id]);
        console.log(`Player state ${user_id} updated in the database.`);
    } catch (err) {
        console.log("Error updating player state: ", err);
    }

    if (player.money === 0) {
        result.allIn = true;
        console.log("Player is all in");
    }

    let activePlayers = Object.values(gameState.players).filter((p) => p.isActive);
    if (activePlayers.length === 0) {
        console.log("End round, all players are inactive");
        result.endRound = await endRound();
    }

    gameState.current_player = getNextPlayer(user_id);
    console.log("Current player: ", gameState.current_player);

    // Update the game state in the database after all changes
    console.log("Updating game state in the database");

    gamesModel
        .getRecentGameId()
        .then((gameId) => {
            console.log("retrieved the gameId", gameId);

            return gamesModel.updateGame(gameState, gameId);
        })
        .then((result) => {
            console.log(`Game state updated successfully, ${result} row(s) affected`);
        })
        .catch((err) => console.log("Error updating game state: ", err));

    console.log("GameState: ", gameState);

    return result;
}

function getNextPlayer(currentPlayerId) {
    // Get all player ids
    const playerIds = Object.keys(gameState.players);

    // Get the index of the current player
    const currentPlayerIndex = playerIds.indexOf(currentPlayerId);

    // Get the next player index
    let nextPlayerIndex = (currentPlayerIndex + 1) % playerIds.length;

    let loopCount = 0; // count how many times we've looped

    while (!gameState.players[playerIds[nextPlayerIndex]].isActive) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerIds.length;
        loopCount++;

        // If we've looped over all players and none are active, return null or some default value
        if (loopCount >= playerIds.length) {
            return null;
        }
    }

    // Return the id of the next player
    return playerIds[nextPlayerIndex];
}

function showCards(user_id) {
    let player = gameState.players[user_id];
    if (player) {
        return player.cards;
    } else {
        return `${user_id} is not in the game`;
    }
}

function calculateHandValue(hand) {
    // Convert card ranks to numbers for easier comparison
    let values = hand.map((card) => {
        let value = card.slice(0, -1); // Remove the last character (suit)

        if (value === "J") return 11;
        if (value === "Q") return 12;
        if (value === "K") return 13;
        if (value === "A") return 14;

        return parseInt(value);
    });

    // Check for pair or three of a kind
    let counts = {};
    for (let value of values) {
        if (!counts[value]) counts[value] = 0;
        counts[value]++;
    }

    let pairs = Object.values(counts).filter((count) => count === 2).length;
    let threes = Object.values(counts).filter((count) => count === 3).length;

    // Pair: Add 1000 to make it worth more than high card
    // Three of a kind: Add 2000 to make it worth more than pair
    let pairValue = pairs > 0 ? 1000 + Math.max(...values) : 0;
    let threeValue = threes > 0 ? 2000 + Math.max(...values) : 0;

    // High card: Just the value of the highest card
    let highCardValue = Math.max(...values);

    return Math.max(pairValue, threeValue, highCardValue);
}

function determineWinner() {
    let handValues = {};
    let highestHandValue = -1;

    // Calculate hand values and find the highest value
    for (let user_id in gameState.players) {
        let hand = gameState.players[user_id].cards;
        let handValue = calculateHandValue(hand);
        handValues[user_id] = handValue;

        if (handValue > highestHandValue) {
            highestHandValue = handValue;
        }
    }

    // Check how many players have the highest hand value
    let winners = [];
    for (let user_id in handValues) {
        if (handValues[user_id] === highestHandValue) {
            winners.push(user_id);
        }
    }

    if (winners.length > 1) {
        // If more than one player has the highest hand value, it's a tie
        return winners;
    } else {
        // Otherwise, the single player with the highest hand value is the winner
        return winners[0];
    }
}

async function endRound() {
    let roundResult = {
        cards: {},
        winner: null,
        money: null,
    };

    roundResult.message = "revealing each players hand";

    console.log("revealing each players hand");

    for (let user_id in gameState.players) {
        let cards = showCards(user_id);
        if (Array.isArray(cards)) {
            roundResult.cards[user_id] = cards;
            roundResult.playersHand = `${gameState.players[user_id].userName}'s hand: ${cards}`;
            console.log(`${gameState.players[user_id].userName}'s hand: ${cards}`);
        } else {
            console.log(cards);
        }
    }

    let winners = determineWinner();

    if (Array.isArray(winners)) {
        console.log("It's a tie!");
        roundResult.winner = "tie";
        winners.forEach((winner) => {
            gameState.players[winner].money += gameState.pot / winners.length;
            roundResult.money = gameState.players[winner].money;
        });
    } else {
        console.log(`${gameState.players[winners].userName} wins the pot of ${gameState.pot}!`);
        roundResult.winner = gameState.players[winners].userName;
        gameState.players[winners].money += gameState.pot;
        roundResult.money = gameState.players[winners].money;
        gameState.players[winners].roundsWon++;

        for (let user_id in gameState.players) {
            if (user_id !== winners) {
                gameState.players[user_id].roundsLost++;
            }
        }
    }

    if (Array.isArray(winners)) {
        roundResult.winnersCard = [];
        winners.forEach((winner) => {
            roundResult.winnersCard.push(gameState.players[winner].cards);
        });
    } else {
        roundResult.winnersCards = gameState.players[winners].cards;
    }

    for (let user_id in gameState.players) {
        try {
            await playerModel.updatePlayerState(user_id, gameState.players[user_id]);
            console.log(`Player state ${user_id} updated in the database.`);
        } catch (err) {
            console.log("Error updating player state: ", err);
        }
    }

    console.log("round result:", roundResult);

    let activePlayers = Object.values(gameState.players).filter((p) => p.money > 0);
    if (activePlayers.length > 1) {
        startNewRound();
    } else {
        console.log("Game over! We have a winner!");
        endGame();
    }


    gamesModel
        .getRecentGameId()
        .then((gameId) => {
            console.log("retrieved the gameId", gameId);

            return gamesModel.updateGame(gameState, gameId);
        })
        .then((result) => {
            console.log(`Game state updated successfully, ${result} row(s) affected`);
        })
        .catch((err) => console.log("Error updating game state: ", err));

    console.log("GameState: ", gameState);

    return roundResult;
}
function startNewRound() {
    console.log("started new round");


     // Update players' state at the beginning of a new round.
     for (let user_id in gameState.players) {
        try {
            console.log("Updating player state in the database new round: ", user_id);
            playerModel.updatePlayerState(user_id, gameState.players[user_id]);
            console.log(`Player state ${user_id} updated in the database for new round.`);
        } catch (err) {
            console.log("Error updating player state: ", err);
        }
    }


    let participatingPlayers = Object.values(gameState.players).filter((player) => player.isParticipating);

    if (participatingPlayers.length < 2) {
        return;
    }

    gameState.pot = 0;
    gameState.current_bet = 0;
   

    let deck = createDeck();
    shuffle(deck);

    // First set all participating players as active
    for (let user_id in gameState.players) {
        if (gameState.players[user_id].money <= 0) {
            gameState.players[user_id].isParticipating = false;
            continue;
        }
        gameState.players[user_id].isActive = true;
    }
    // Now get the next dealer and current player
    gameState.dealer = getNextPlayer(gameState.dealer);

    console.log("debugging null dealer", gameState.dealer);

    gameState.current_player = getNextPlayer(gameState.dealer); // assuming that the current player is the one after the dealer

    // Then continue with the round setup
    for (let user_id in gameState.players) {
        if (!gameState.players[user_id].isParticipating) {
            continue;
        }
        gameState.players[user_id].cards = [deck.pop(), deck.pop()];
        gameState.players[user_id].bet_amount = 0;
    }

   
}

function endGame() {
    let result = {};

    let activePlayers = [];
    let inactivePlayers = [];

    // Identify all active players
    for (let user_id in gameState.players) {
        if (user_id === "undefined") continue; // Prevent undefined user_id

        if (gameState.players[user_id].isParticipating) {
            activePlayers.push(user_id);
        } else {
            inactivePlayers.push(user_id);
        }
    }

    // If only one player is active, they're the winner
    if (activePlayers.length === 1) {
        let winnerId = activePlayers[0];
        gameState.players[winnerId].gamesWon++;
        result.winners = [gameState.players[winnerId].userName];

        // Increment gamesLost for all inactive players and store their usernames
        result.losers = inactivePlayers.map((playerId) => {
            gameState.players[playerId].gamesLost++;
            return gameState.players[playerId].userName;
        });
    } else {
        // If more than one player is active, determine the player(s) with the maximum rounds won
        let maxRoundsWon = 0;
        let winners = [];

        for (let user_id in gameState.players) {
            if (user_id === "undefined") continue; // Prevent undefined user_id

            if (gameState.players[user_id].roundsWon > maxRoundsWon) {
                maxRoundsWon = gameState.players[user_id].roundsWon;
                winners = [user_id]; // New winner found, reset the winners array
            } else if (gameState.players[user_id].roundsWon === maxRoundsWon) {
                winners.push(user_id); // Tie, add the player to the winners array
            }
        }

        // Increment the gamesWon for the winners and gamesLost for the others
        for (let user_id in gameState.players) {
            if (user_id === "undefined") continue; // Prevent undefined user_id

            if (winners.includes(user_id)) {
                gameState.players[user_id].gamesWon++;
            } else {
                gameState.players[user_id].gamesLost++;
            }
        }

        let winnerNames = winners.map((id) => gameState.players[id].userName);
        result.winners = winnerNames;
    }

    // Set all players to inactive and not participating
    for (let user_id in gameState.players) {
        if (user_id === "undefined") continue; // Prevent undefined user_id

        let playerState = gameState.players[user_id];
        playerState.isActive = false;
        playerState.isParticipating = false;
        console.log("debugging end game players status before the database call", playerState);
        playerModel.updatePlayerState(user_id, playerState);
    }

    result.gameState = gameState;

    console.log("debugging end game players status", result.gameState.players);
    return result;
}

// for individual player
function playerRejoinGame(user_id, playerGameState) {
    if (!gameState.players[user_id]) {
        console.log(`Player with id ${user_id} does not exist in the game.`);
        return;
    }

    // Update the player's game state with the provided game state
    gameState.players[user_id] = playerGameState;

    const playerState = gameState.players[user_id];

    playerModel.updatePlayerState(user_id, playerState);
}

module.exports = {
    createDeck,
    shuffle,
    playerJoinGame,
    playerFold,
    startGame,
    playerBet,
    getGameState,
    determineWinner,
    endRound,
    showCards,
    isUserInGame,
    removeUserFromGame,
    playerRejoinGame,
    startNewRound,
};
