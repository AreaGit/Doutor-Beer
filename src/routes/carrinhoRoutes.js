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

// Aplicar Cupom
router.post("/apply-coupon", carrinhoController.applyCoupon);

// Remover Cupom
router.post("/remove-coupon", carrinhoController.removeCoupon);

module.exports = router;
