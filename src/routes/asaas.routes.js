const express = require("express");
const router = express.Router();
const asaasController = require("../controllers/asaas.controllers");

router.get("/consultar/:paymentId", asaasController.verificarStatusCobranca);

module.exports = router;