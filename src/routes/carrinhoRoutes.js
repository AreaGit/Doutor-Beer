const express = require("express");
const router = express.Router();
const carrinhoController = require("../controllers/carrinhoControllers");

// Pegar carrinho
router.get("/", carrinhoController.getCart);

// Adicionar produto
router.post("/add", carrinhoController.addToCart);

// Atualizar quantidade
router.post("/update", carrinhoController.updateCart);

// Remover produto
router.post("/remove", carrinhoController.removeFromCart);

module.exports = router;
