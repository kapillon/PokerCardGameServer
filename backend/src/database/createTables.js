const { Client } = require("pg");
const config = require("../config/development");

class CreateTableError extends Error {
    constructor(message) {
        super(message);
        this.name = "CreateTableError";
    }
}

const createTables = () => {
    const client = new Client(config.database);

    return client
        .connect()
        .then(() => {
            return client.query(
                `

                CREATE TABLE IF NOT EXISTS users (
                    user_id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE
                );
                
                CREATE TABLE IF NOT EXISTS games (
                    game_id SERIAL PRIMARY KEY,
                    game_name VARCHAR(255) NOT NULL,
                    game_state_json JSON  
                );
                
                CREATE TABLE IF NOT EXISTS players (
                    player_id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL,
                    game_id INT NOT NULL,
                    player_state_json JSON NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
                );
                

                CREATE TABLE IF NOT EXISTS messages (
                    message_id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL,
                    message_content TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                );
                
                
            `
            );
        })
        .then(() => {
            return { success: true, message: "Tables created successfully" };
        })
        .catch((error) => {
            throw new CreateTableError(`Error creating tables: ${error.message}`);
        })
        .finally(() => {
            return client.end();
        });
};

module.exports = { createTables, CreateTableError };
