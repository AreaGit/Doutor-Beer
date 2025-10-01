const express = require("express");
const router = express.Router();
const cartController = require("../controllers/carrinhoControllers");

// Adicionar produto ao carrinho
router.post("/add", cartController.addToCart);

// Remover produto do carrinho
router.post("/remove", cartController.removeFromCart);

// Atualizar quantidade
router.post("/update", cartController.updateCartItem);

// Pegar carrinho do usuário
router.get("/", cartController.getCart);

module.exports = router;
