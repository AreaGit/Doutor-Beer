const express = require("express");
const router = express.Router();
const pedidoController = require("../controllers/pedidoController");

// Rota para listar todos os pedidos (admin)
router.get("/admin", pedidoController.getTodosPedidos); 

// Rota para buscar pedido pelo ID
router.get("/:id", pedidoController.getPedidoById);

// Rota para listar todos os pedidos do usuário logado
router.get("/", pedidoController.getPedidosUsuario);

// Atualizar status
router.put("/admin/:id/status", pedidoController.atualizarStatusPedido);



module.exports = router;
