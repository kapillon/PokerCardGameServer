const db = require("../../database/db");
const { CustomError } = require("../../middleware/customErrorHandler");

const playerModel = {};

playerModel.joinGame = (user_id, game_id, player_state_json) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO players (user_id, game_id, player_state_json) VALUES ($1, $2, $3) RETURNING *`;
        const values = [user_id, game_id, JSON.stringify(player_state_json)];

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

playerModel.getPlayerState = (player_id) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM players WHERE player_id = $1`;
        const values = [player_id];

        db.query(query, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rows[0]);
                } else {
                    reject(new CustomError("Player not found", 404));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

playerModel.updatePlayerState = (player_id, player_state_json) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE players SET player_state_json = $1 WHERE player_id = $2 `;
        const values = [JSON.stringify(player_state_json), player_id];

        db.query(query, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rowCount);
                } else {
                    reject(new Error("No rows were updated."));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

playerModel.getPlayersByGame = (game_id) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM players WHERE game_id = $1`;
        const values = [game_id];

        db.query(query, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rows);
                } else {
                    reject(new CustomError("No players found for this game", 404));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

playerModel.removePlayer = (user_id) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM players WHERE user_id = $1`;
        const values = [user_id];
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

module.exports = playerModel;
