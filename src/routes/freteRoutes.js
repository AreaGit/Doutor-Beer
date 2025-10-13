const express = require("express");
const router = express.Router();
const { calcularFrete } = require("../services/melhorEnvio");

router.post("/calcular", async (req, res) => {
  const { cepDestino, produtos } = req.body;

  if (!cepDestino || !produtos || !produtos.length) {
    return res.status(400).json({ erro: "CEP ou produtos inválidos" });
  }

  console.log("[Frete] Calculando para produtos:", produtos, "CEP:", cepDestino);

  try {
    const resultado = await calcularFrete({ toPostalCode: cepDestino, products: produtos });
    res.json(resultado);
  } catch (err) {
  console.error("[Frete] Erro ao calcular:", err.response?.data || err.message);
  res.status(500).json({ erro: "Não foi possível calcular o frete", detalhe: err.response?.data || err.message });
}
});

module.exports = router;
