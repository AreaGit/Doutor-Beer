// src/routes/clubeVipRoutes.js
const express = require("express");
const router = express.Router();
const clubeVipController = require("../controllers/clubeVipController");

// POST /api/clube-vip
router.post("/", clubeVipController.criarCadastro);

module.exports = router;
