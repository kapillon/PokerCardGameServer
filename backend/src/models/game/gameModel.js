const db = require("../../database/db");
const { CustomError } = require("../../middleware/customErrorHandler");

const gamesModel = {};

gamesModel.createGame = (game_name, game_state_json) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO games (game_name, game_state_json) VALUES ($1, $2) RETURNING *`;
        const values = [game_name, JSON.stringify(game_state_json)];

        db.query(query, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rows[0]);
                } else {
                    reject(new CustomError("No rows affected", 404));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

gamesModel.getGame = (game_id) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM games WHERE game_id = $1`;
        const values = [game_id];

        db.query(query, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rows[0]);
                } else {
                    reject(new CustomError("Game not found", 404));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

gamesModel.updateGame = (game_state_json, game_id) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE games SET game_state_json = $1 WHERE game_id = $2`;
        const values = [JSON.stringify(game_state_json), game_id];

        db.query(query, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rowCount);
                } else {
                    reject(new CustomError("No rows affected", 404));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

gamesModel.getRecentGameId = () => {
    return new Promise((resolve, reject) => {
        const query = "SELECT game_id FROM games ORDER BY game_id DESC LIMIT 1";

        db.query(query)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rows[0].game_id);
                } else {
                    reject(new Error("No games found"));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

gamesModel.getActiveGame = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM games WHERE game_state_json ->> 'isActive' = 'true' `;

        db.query(query)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rows[0]);
                } else {
                    resolve(null);
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

module.exports = gamesModel;
