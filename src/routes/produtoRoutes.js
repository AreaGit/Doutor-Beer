const express = require("express");
const router = express.Router();
const produtoController = require("../controllers/produtoController");

// Criar
router.post("/", produtoController.criarProduto);

// Listar todos
router.get("/", produtoController.listarProdutos);

// 🔹 Buscar por seção (tem que vir antes de /:id)
router.get("/secao/:secao", produtoController.buscarPorSecao);

// Buscar por categoria
router.get("/categoria/:categoria", produtoController.buscarPorCategoria);

// 🔹 Buscar produtos globalmente (barra de pesquisa) - deve vir antes de /:id
router.get("/busca", produtoController.buscarProdutos);

// Buscar específico
router.get("/:id", produtoController.buscarProduto);

// Atualizar
router.put("/:id", produtoController.atualizarProduto);

// Deletar
router.delete("/:id", produtoController.deletarProduto);

module.exports = router;