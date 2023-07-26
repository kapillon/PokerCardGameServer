const express = require("express");
const userController = require("../controllers/userController");
const { authMiddleware, redirectToLobbyIfAuthenticated } = require("../middleware/auth");
const router = express.Router();

// User routes
router.post("/register", userController.createUser);
router.post("/login", userController.login);
router.post("/logout", authMiddleware, userController.logout); // using cookieMiddleware

/*
  This api will fetch lobby every time the page is refreshed using SPA model
*/
router.get("/is-authenticated", authMiddleware, (req, res) => {
    res.status(200).json({ authenticated: true });
});

router.get("/lobby", authMiddleware, (req, res) => {
    // Render lobby view
    res.render("lobby", { user: res.locals.user });
});

router.get("/register", (req, res) => {
    res.render("register");
});

router.get("/login", (req, res) => {
    res.render("login");
});


module.exports = router;
