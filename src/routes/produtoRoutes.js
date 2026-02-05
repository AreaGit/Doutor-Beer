const express = require("express");
const router = express.Router();
const produtoController = require("../controllers/produtoController");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ================= SITE PÚBLICO =================

// Listar produtos ativos (home)
router.get("/public/ativos", produtoController.listarProdutosAtivos);

// Buscar produto público por ID (somente ativo)
router.get("/public/:id", produtoController.buscarProdutoPublico);

// Buscar produtos por seção (somente ativos)
router.get("/secao/:secao", produtoController.buscarPorSecao);

// Buscar produtos por categoria (somente ativos)
router.get("/categoria/:categoria", produtoController.buscarPorCategoria);

// Busca global (somente ativos)
router.get("/busca", produtoController.buscarProdutos);

// Contar produtos ativos (Dashboard)
router.get("/stats/ativos", produtoController.contarProdutosAtivos);

// ================= ADMIN =================

// Importar produtos via Excel
router.post("/import", upload.single("planilha"), produtoController.importarProdutos);

// Baixar modelo de planilha
router.get("/baixar-template", produtoController.baixarTemplate);

// Criar produto
router.post("/", produtoController.criarProduto);

// Listar todos os produtos (admin)
router.get("/", produtoController.listarProdutos);

// Buscar produto por ID (admin)
router.get("/:id", produtoController.buscarProduto);

// Atualizar produto por ID
router.put("/:id", produtoController.atualizarProduto);

// Ativar / Desativar produto
router.patch("/:id/status", produtoController.toggleStatusProduto);

// Deletar produto por ID
router.delete("/:id", produtoController.deletarProduto);

module.exports = router;