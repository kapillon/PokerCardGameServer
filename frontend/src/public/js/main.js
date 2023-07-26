import { register } from "./register";
import { login } from "./login";
import { logout } from "./logout";
import { io } from "socket.io-client";
let socket;

async function isUserLoggedin() {
    const user_id = localStorage.getItem("user_id");

    if (!user_id) {
        console.log("User is not logged in");
        return;
    }

    redirectToLobbyIfAuthenticated();
}

function renderGame(data) {
    // stored locally when logging in. Check the log in  js file
    const userId = localStorage.getItem("user_id");
    const userName = localStorage.getItem("userName");

    // Access the game div
    const gameElement = document.getElementById("game");

    // Clear the game div
    gameElement.innerHTML = "";

    // Create the scoreboard
    const scoreBoardElement = document.createElement("div");
    scoreBoardElement.classList.add("score-board");
    scoreBoardElement.innerHTML = `
               
           <p>Game ID: ${data.gameId}</p>
           <p>Game pot: ${data.pot}</p>
           <p>Game current_bet: ${data.current_bet}</p>
           <p>Current player: ${data.current_player}</p>
           <p>money: $${data.gameState.money}</p>
           <p>Your Round wons: ${data.gameState.roundsWon}</p>
           <p>Your Round loss: ${data.gameState.roundsLost}</p>
       `;

    // Add the scoreboard to the game div
    gameElement.appendChild(scoreBoardElement);

    // Create the user card
    const userCardElement = document.createElement("div");
    userCardElement.classList.add("user-card");
    // Loop through the cards array and add each card to userCardElement

    if (data.gameState.cards) {
        for (let card of data.gameState.cards) {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card");

            const cardRank = card.split(" ")[0];
            const cardSuit = card.split(" ")[1];

            const cardFrontElement = document.createElement("div");
            cardFrontElement.classList.add("card-front");
            cardElement.appendChild(cardFrontElement);

            const cardValueElement = document.createElement("div");
            cardValueElement.classList.add("card-value");
            cardValueElement.textContent = cardRank;
            cardFrontElement.appendChild(cardValueElement);

            const cardSuitElement = document.createElement("div");
            cardSuitElement.classList.add("card-suit");
            cardSuitElement.textContent = cardSuit;
            cardFrontElement.appendChild(cardSuitElement);

            const cardBackElement = document.createElement("div");
            cardBackElement.classList.add("card-back");
            cardElement.appendChild(cardBackElement);

            userCardElement.appendChild(cardElement);
        }
    }

    // Add the user card to the game div
    gameElement.appendChild(userCardElement);

    // Create the game buttons
    const buttonsElement = document.createElement("div");
    buttonsElement.classList.add("buttons");

    const betInput = document.createElement("input");
    betInput.type = "number";
    betInput.id = "bet-input";
    betInput.min = 5;
    betInput.max = data.gameState.money;
    buttonsElement.appendChild(betInput);

    const betButton = document.createElement("button");
    betButton.id = "bet-button";
    betButton.textContent = "Bet";
    buttonsElement.appendChild(betButton);

    const foldButton = document.createElement("button");
    foldButton.id = "fold-button";
    foldButton.textContent = "Fold";
    buttonsElement.appendChild(foldButton);

    // Add the game buttons to the game div
    gameElement.appendChild(buttonsElement);

    // Event listener for bet-button
    document.getElementById("bet-button").addEventListener("click", (e) => {
        e.preventDefault();
        const betAmount = document.getElementById("bet-input").value;
        // For debugginh
        console.log("bet pressed", betAmount);
        socket.emit("bet", { amount: betAmount });
    });

    //event listener for the fold button
    document.getElementById("fold-button").addEventListener("click", (e) => {
        e.preventDefault();

        const cards = document.getElementsByClassName("card");

        console.log("fold pressed");
        for (let i = 0; i < cards.length; i++) {
            cards[i].style.transform = "rotateY(180deg)";
        }

        socket.emit("fold", { userName: userName, userId: userId });
    });
}

async function redirectToLobbyIfAuthenticated() {
    try {
        const response = await fetch("/user/is-authenticated", {
            credentials: "include", // Include the session cookie in the request
        });

        const data = await response.json();

        //SPA model
        if (data.authenticated) {
            fetchLobby();
        }
    } catch (error) {
        console.error("Error checking authentication status:", error);
    }
}

export async function fetchLobby() {
    const userId = localStorage.getItem("user_id");

    const userName = localStorage.getItem("userName");

    try {
        const response = await fetch("/user/lobby", {
            credentials: "include", // Include the credentials (cookies) in the request
        });

        const lobbyHtml = await response.text();

        if (response.status === 200) {
            document.querySelector("body").innerHTML = lobbyHtml;
            window.history.pushState({}, "", "/user/lobby");

            if (!socket) {
                socket = io("https://texas-hold-poker-game.onrender.com");
            }

            socket.emit("join_lobby", { userId: userId, userName: userName });

            // socket to receive messages
            socket.on("receive_message", (data) => {
                // Access the message Div
                const messagesElement = document.getElementById("messages");
                //Message element
                const messageElement = document.createElement("p");

                // If the message is from the current user, it is not an incoming message
                if (data.userName !== userName) {
                    messageElement.classList.add("message", "incoming");
                } else {
                    messageElement.classList.add("message", "outgoing");
                }

                messageElement.textContent = `${data.userName}: ${data.message}`;

                //Appending the new message to the message div
                // sroll down messages
                messagesElement.appendChild(messageElement);
                messagesElement.scrollTop = messagesElement.scrollHeight;
                console.log("Received a message:", data);
            });

            socket.on("update_user_list", (users) => {
                const userListElement = document.getElementById("user-list");
                const waitingMessage = document.getElementById("waiting-message");

                // Clear the user list
                userListElement.innerHTML = "";

                // Add each user to the user list
                for (let userId in users) {
                    // use a for...in loop to iterate through an object
                    const userElement = document.createElement("li");
                    userElement.id = `user-${userId}`; // use userId as the id
                    userElement.textContent = `${users[userId]} is online`; // use users[userId] to access the userName
                    userListElement.appendChild(userElement);
                }

                // Show or hide the start button and waiting message based on number of users
                const numUsers = Object.keys(users).length; // use Object.keys() to get the number of users
                if (numUsers >= 2) {
                    waitingMessage.style.display = "none";
                } else {
                    waitingMessage.style.display = "block";
                }
            });

            socket.on("game_start", async (data) => {
                console.log("Game data received: ", data);
                renderGame(data);
            });

            socket.on("game_update", async (data) => {
                console.log("Game update received: ", data);
                // Call renderGame to update the display with the new game state
                renderGame(data);
            });

            socket.on("user_folded", (data) => {
                console.log(`${data.userName}  has folded`);

                const notificationElement = document.getElementById("notifications");
                notificationElement.innerHTML = data.userName + "has folded." + data.message;

                setTimeout(() => {
                    notificationElement.innerHTML = "";
                }, 4000);

                //  unfolding cards/

                const cards = document.getElementsByClassName("card");
                setTimeout(() => {
                    for (let i = 0; i < cards.length; i++) {
                        cards[i].style.transform = "rotateY(0deg)";
                    }
                }, 3700);
            });

            socket.on("bet_result", (data) => {
                console.log("Bet result received: ", data);

                let message = "";

                console.log(data.endRound);

                if (data.endRound) {
                    const winnersCards = data.endRound.winnersCards || [];
                    message = "The round has ended! Winner's cards: " + winnersCards;

                    const winnersCardElements = document.createElement("div");
                    winnersCardElements.classList.add("winners-cards");

                    for (let card of winnersCards) {
                        const cardElement = document.createElement("div");
                        cardElement.classList.add("card");

                        const cardRank = card.split(" ")[0];
                        const cardSuit = card.split(" ")[1];

                        const cardFrontElement = document.createElement("div");
                        cardFrontElement.classList.add("card-front");
                        cardElement.appendChild(cardFrontElement);

                        const cardValueElement = document.createElement("div");
                        cardValueElement.classList.add("card-value");
                        cardValueElement.textContent = cardRank;
                        cardFrontElement.appendChild(cardValueElement);

                        const cardSuitElement = document.createElement("div");
                        cardSuitElement.classList.add("card-suit");
                        cardSuitElement.textContent = cardSuit;
                        cardFrontElement.appendChild(cardSuitElement);

                        winnersCardElements.appendChild(cardElement);
                    }

                    message += winnersCardElements.outerHTML;
                } else if (data.success) {
                    message = data.message;
                } else {
                    if (data.isNotPlayerTurn) {
                        message = "It's not your turn!";
                    } else if (data.playerHasNoMoney) {
                        message = "You don't have enough money for this bet!";
                    } else if (data.allIn) {
                        message = "You are all in!";
                    }
                }

                // Display the result of the bet in the notification area
                const notificationElement = document.getElementById("notifications");
                notificationElement.innerHTML = message;

                setTimeout(() => {
                    notificationElement.innerHTML = "";
                }, 4000);
            });

            socket.on("game_resume", async (data) => {
                renderGame(data);
            });

            socket.on("game_end", (data) => {
                console.log("front end game_end Game ended. Reason:", data.reason);

                // Access the game div
                const gameElement = document.getElementById("game");

                // Clear the game div
                gameElement.innerHTML = "";

                // Create a new div for the game result
                const gameResultElement = document.createElement("div");
                gameResultElement.classList.add("game-result");

                // Create new divs for winner and loser cards
                const winnerCardsElement = document.createElement("div");
                winnerCardsElement.classList.add("winner-cards");
                const loserCardsElement = document.createElement("div");
                loserCardsElement.classList.add("loser-cards");

                for (let card of data.winnersCard) {
                    const cardElement = createCardElement(card);
                    winnerCardsElement.appendChild(cardElement);
                }

                for (let card of data.losersCard) {
                    const cardElement = createCardElement(card);
                    loserCardsElement.appendChild(cardElement);
                }

                // Add the game result and card elements to the game result div
                if (data.winner) {
                    gameResultElement.innerHTML = `
                        <p>Winner: ${data.winner.userName}</p>
                        <p>Reason: ${data.reason}</p>
                        <p>Winner's Cards:</p>
                        ${winnerCardsElement.outerHTML}
                        <p>Loser's Cards:</p>
                        ${loserCardsElement.outerHTML}
                    `;
                } else {
                    gameResultElement.innerHTML = `
                        <p>Reason: ${data.reason}</p>
                        <p>Winner's Cards:</p>
                        ${winnerCardsElement.outerHTML}
                        <p>Loser's Cards:</p>
                        ${loserCardsElement.outerHTML}
                    `;
                }

                // Add the game result div to the game div
                gameElement.appendChild(gameResultElement);

                // Show game result for 4 seconds then hide it and show the waiting message
                setTimeout(() => {
                    // Clear the game result
                    gameElement.innerHTML = "";
                    // Show waiting message
                    const waitingMessage = document.getElementById("waiting-message");
                    waitingMessage.style.display = "block";
                }, 4000);
            });

            function createCardElement(card) {
                const cardElement = document.createElement("div");
                cardElement.classList.add("card");

                const cardRank = card.split(" ")[0];
                const cardSuit = card.split(" ")[1];

                const cardFrontElement = document.createElement("div");
                cardFrontElement.classList.add("card-front");
                cardElement.appendChild(cardFrontElement);

                const cardValueElement = document.createElement("div");
                cardValueElement.classList.add("card-value");
                cardValueElement.textContent = cardRank;
                cardFrontElement.appendChild(cardValueElement);

                const cardSuitElement = document.createElement("div");
                cardSuitElement.classList.add("card-suit");
                cardSuitElement.textContent = cardSuit;
                cardFrontElement.appendChild(cardSuitElement);

                const cardBackElement = document.createElement("div");
                cardBackElement.classList.add("card-back");
                cardElement.appendChild(cardBackElement);

                return cardElement;
            }

            // Event handler for sending messages
            document.getElementById("message-form").addEventListener("submit", (event) => {
                event.preventDefault();
                const message = document.getElementById("message-input").value;
                socket.emit("send_message", { message: message, userName: userName });

                document.getElementById("message-input").value = " ";
            });

            // event listener for error related to messages
            socket.on("message_error", (data) => {
                console.error("Message error:", data.error);
            });
        } else {
            console.error("Error fetching lobby:", lobbyHtml);
        }
    } catch (error) {
        console.error("Error fetching lobby:", error);
    }
}

function handleRegistrationForm() {
    const registerForm = document.getElementById("register-form");

    if (registerForm) {
        registerForm.addEventListener("submit", (event) => {
            event.preventDefault();
            register(event);
        });
    }
}

function handleLoginForm() {
    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            login(event);
        });
    }
}

function handleLogout() {
    document.addEventListener("click", (event) => {
        if (event.target && event.target.id === "logout") {
            event.preventDefault();
            logout();
        }
    });
}

function attachEventListeners() {
    handleRegistrationForm();
    handleLoginForm();
    handleLogout();
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded event fired");
    isUserLoggedin();
    attachEventListeners();
});
