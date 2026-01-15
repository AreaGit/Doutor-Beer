// routes/newsletterRoutes.js
const express = require("express");
const router = express.Router();
const newsletterController = require("../controllers/newsletterController");

// POST /api/newsletter  -> cadastrar e-mail
router.post("/", newsletterController.cadastrar);

// GET /api/newsletter   -> (opcional) listar inscritos (pode travar por admin)
router.get("/", newsletterController.listar);

// POST /api/newsletter/enviar -> enviar email em massa (admin)
router.post("/enviar", newsletterController.enviarEmailMassa);

module.exports = router;
