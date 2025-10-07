const express = require("express");
const router = express.Router();
const { calcularFrete } = require("../utils/melhorEnvio");
const Cart = require("../models/carrinho");
const Produto = require("../models/Produto");

// Rota POST para calcular frete
router.post("/frete", async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  try {
    const { cepDestino } = req.body;

    // Busca os produtos do carrinho do usuário
    const items = await Cart.findAll({
      where: { usuarioId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!items.length) return res.status(400).json({ error: "Carrinho vazio" });

    // Mapeia para o formato do Melhor Envio
    const products = items.map(i => ({
      width: i.Produto.width,
      height: i.Produto.height,
      length: i.Produto.length,
      weight: i.Produto.weight,
      insurance_value: i.Produto.preco || 0,
      quantity: i.quantidade
    }));

    const opcoesFrete = await calcularFrete({ toPostalCode: cepDestino, products });

    res.json(opcoesFrete);

  } catch (err) {
    console.error("[Checkout] Erro ao calcular frete:", err);
    res.status(500).json({ error: "Erro ao calcular frete" });
  }
});

module.exports = router;