const userModel = require("../models/users/userModel");
const jwt = require("jsonwebtoken");
const userController = {};

userController.createUser = (req, res) => {
    const { username, password, email } = req.body;

    userModel
        .createUser(username, password, email)
        .then((user) => {
            const token = jwt.sign({ sub: user.user_id }, process.env.JWT_SECRET); // Token generated for new user

            res.cookie("token", token, { httpOnly: true, sameSite: "strict" }); //set token in the cookie

            res.clearCookie("token");

            res.status(201).json({ message: "User created successfully", user });
        })
        .catch((err) => {
            res.status(err.status || 500).json({ message: err.message });
        });
};

userController.getUserById = (req, res) => {
    const { id } = req.params;

    userModel
        .getUserById(id)
        .then((user) => {
            if (!user) {
                throw new Error("User not found");
            }
            res.status(200).json(user);
        })
        .catch((err) => {
            res.status(err.status || 500).json({ message: err.message });
        });
};

userController.login = (req, res, next) => {

    const {username,password} = req.body 

    userModel
        .login(username, password)
        .then((user) => {
            const token = jwt.sign({ sub: user.user_id }, process.env.JWT_SECRET, { expiresIn: "1h" });

            res.cookie("token", token, { httpOnly: true, sameSite: "strict" });

            res.status(200).json({ user });
        })
        .catch((err) => {
            next(err);
        });
};

userController.logout = async (req, res, next) => {
    if (req.method === "POST" || req.method === "GET") {
        try {
            userModel.logout(req, res);
            res.status(200).json({ message: "User logged out successfully" });
        } catch (err) {
            next(err);
        }
    }
};

userController.getCurrentUser = (req, res, next) => {
    userModel
        .getCurrentUser(req)
        .then((user) => {
            res.status(200).json(user); // Send the response with user data
        })
        .catch((err) => {
            res.status(err.status || 500).json({ message: err.message });
        });
};

module.exports = userController;
