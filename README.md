

This project I initially started during my senior elective and worked alone. The application is under development. The web application is to be a poker game that it allows multiple people to join and play simultaneously in the same game. Users also can chat in an open chat. The application is working yet contain bugs and is under development. 

to either try the demonstration or run locally follow the instructions

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
