const express = require("express");
const router = express.Router();
const produtoController = require("../controllers/produtoController");

// Criar um produto
router.post("/", produtoController.criarProduto);

// Listar todos os produtos
router.get("/", produtoController.listarProdutos);

// Buscar produtos por seção (tem que vir antes de /:id)
router.get("/secao/:secao", produtoController.buscarPorSecao);

// Buscar produtos por categoria (pode vir antes ou depois de /:id, mas melhor antes)
router.get("/categoria/:categoria", produtoController.buscarPorCategoria);

// Buscar produtos globalmente (barra de pesquisa) - deve vir antes de /:id
router.get("/busca", produtoController.buscarProdutos);

// Buscar produto específico por ID
router.get("/:id", produtoController.buscarProduto);

// Atualizar produto por ID
router.put("/:id", produtoController.atualizarProduto);

// Deletar produto por ID
router.delete("/:id", produtoController.deletarProduto);

module.exports = router;
