const userModel = require("../models/users/userModel");
const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
    const token = req.cookies.token; // getting token from cookie;

    if (!token) {
        return res.status(401).json({ message: "Authentication required. (Message from auth api)" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token

        req.user = decoded;

        // setting res.locals.user
        const user = await userModel.getUserById(decoded.sub);
        if (user) {
            res.locals.user = user;
        }

        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
}




module.exports = {
    authMiddleware,
   
};
