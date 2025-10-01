// src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminControllers");

// Rotas de admin
router.post("/criar", adminController.criarAdmin);
router.post("/login", adminController.login);
router.get("/me", adminController.me);
router.post("/logout", adminController.logout);

module.exports = router;