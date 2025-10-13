const express = require("express");
const router = express.Router();
const pedidoController = require("../controllers/pedidoController");

// Rota para buscar pedido pelo ID
router.get("/:id", pedidoController.getPedidoById);

// Rota para listar todos os pedidos do usuário logado
router.get("/", pedidoController.getPedidosUsuario);

module.exports = router;
