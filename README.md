

STUDENT: MOHAMED SHARIF
STUDENT ID: 920703534
PROJECT: CSC667 TERM PROJECT


Texas Hold Poker Game Term Project


The project is live on 

Note: I have the free edition of render. It will take about 2-4 minutes to render and start application after clicking the link

https://texas-hold-poker-game.onrender.com

This is a simplified version of a poker game with abiltiy to bet or fold. The score are based of deck of 2-3 cards. 
The minimum amount of players are 2 and the game will end if there are less than 2 players


To run the project:


Before:  cd backend/src/config/development.js and add your database credentials


Also:

//set io and active cors
const io = require("socket.io")(server, {
    cors: {
        origin: "https://texas-hold-poker-game.onrender.com",
        methods: ["GET", "POST"],
    },
});

replace with *

in main.js


   if (!socket) {
                socket = io("https://texas-hold-poker-game.onrender.com");
            }
change to the local host


this way having your database credentials, server cors set * and socket io to local host, you are able to test locally. The current configuration
is ready to test on render.



To build and run locally:

1- cd frontend/src
2- npm run build
3- npm start

The env variable is added
