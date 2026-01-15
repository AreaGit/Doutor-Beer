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

// Rota para últimos pedidos (Dashboard)
router.get("/admin/ultimos", pedidoController.getUltimosPedidos);

// Rota para faturamento dos últimos 7 dias (Dashboard)
router.get("/admin/faturamento-semana", pedidoController.getFaturamentoSemana);

// Rota para resumo do dashboard (faturamento mês / pedidos hoje)
router.get("/admin/resumo-dashboard", pedidoController.getResumoDashboardAdmin);






module.exports = router;
