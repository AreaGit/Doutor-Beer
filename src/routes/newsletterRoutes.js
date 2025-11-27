// routes/newsletterRoutes.js
const express = require("express");
const router = express.Router();
const newsletterController = require("../controllers/newsletterController");

// POST /api/newsletter  -> cadastrar e-mail
router.post("/", newsletterController.cadastrar);

// GET /api/newsletter   -> (opcional) listar inscritos (pode travar por admin)
router.get("/", newsletterController.listar);

module.exports = router;
