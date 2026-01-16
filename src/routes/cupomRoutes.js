const express = require("express");
const router = express.Router();
const cupomController = require("../controllers/cupomController");

// Listar todos os cupons (Admin)
router.get("/", cupomController.listarCupons);

// Criar um novo cupom (Admin)
router.post("/", cupomController.criarCupom);

// Editar um cupom (Admin)
router.put("/:id", cupomController.editarCupom);

// Excluir um cupom (Admin)
router.delete("/:id", cupomController.excluirCupom);

// Alternar status do cupom (Admin)
router.patch("/:id/status", cupomController.alternarStatus);

module.exports = router;
