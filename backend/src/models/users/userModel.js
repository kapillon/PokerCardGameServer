const db = require("../../database/db");
const { CustomError } = require("../../middleware/customErrorHandler");
const bcrypt = require("bcrypt");

const userModel = {};

userModel.createUser = (username, password, email) => {
    return new Promise(async (resolve, reject) => {
        try {
            const existingUser = await userModel.getUserByUsername(username);
            const existingEmail = await userModel.getUserByEmail(email);
            if (existingUser) {
                reject(new CustomError("Username already exists", 409));
            }
            if (existingEmail) {
                reject(new CustomError("Email already exists", 409));
            } else {
                const hashedPassword = await bcrypt.hash(password, 10);
                const query = `INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING *`;
                const values = [username, hashedPassword, email];

                db.query(query, values)
                    .then(async (result) => {
                        if (result.rowCount > 0) {
                            resolve(result.rows[0]);
                        } else {
                            reject(new CustomError("No rows affected", 404));
                        }
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
        } catch (err) {
            reject(err);
        }
    });
};

userModel.getUserById = (user_id) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT user_id, username, email FROM users WHERE user_id = $1`;
        const values = [user_id];

        db.query(query, values)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rows[0]);
                } else {
                    reject(new CustomError("User not found", 404));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

userModel.getUserByUsername = (username) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT user_id, username, password, email FROM users WHERE username = $1`;
        const values = [username];

        db.query(query, values)
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

userModel.getUserByEmail = (username) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT user_id, username, password, email FROM users WHERE email = $1`;
        const values = [username];

        db.query(query, values)
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

userModel.comparePassword = (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};




userModel.login = async (username, password)=>{

    try{

        const user = await userModel.getUserByUsername(username);
        if(user){
            const passwordMatch = await userModel.comparePassword(password, user.password);

            if ( passwordMatch){
                delete user.password;
                return user;
            }
            else{
                throw new CustomError ("Incorrect password or user name name",401);
            }
        }else{
            throw new CustomError("Incorrect user name or user not found",404);
        }
    }catch(err){
        throw err;
    }
}



userModel.logout = (req, res) => {
    res.clearCookie("token");
  };

userModel.getCurrentUser = async (req) => {
    try {
        // Get user ID from session data
        const userId = req.session.userId;
        if (userId) {
            // Get user by ID
            const user = await userModel.getUserById(userId);
            return user;
        } else {
            throw new CustomError("User not authenticated", 401);
        }
    } catch (err) {
        throw err;
    }
};



userModel.storeMessage = (user_id, message_content) => {
    return new Promise((resolve, reject) => {
        const query = ` INSERT INTO messages (user_id, message_content) VALUES ($1, $2) RETURNING *`;

        const values = [user_id, message_content];

        db.query(query, values).then((result) => {
            if (result.rowCount > 0) {
                resolve(result.rows[0]);
            } else {
                reject(new CustomError("No rows affected", 404));
            }
        });
    }).catch((err) => {
        reject(err);
    });
};

userModel.getMessages = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT users.username, messages.message_content FROM messages JOIN users
        ON messages.user_id = users.user_id ORDER BY messages.message_id ASC`;

        db.query(query)
            .then((result) => {
                if (result.rowCount > 0) {
                    resolve(result.rows);
                } else {
                    resolve([]);
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
};

module.exports = userModel;
