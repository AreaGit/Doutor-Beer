const express = require("express");
const router = express.Router();
const { calcularFrete } = require("../services/melhorEnvio");

router.post("/calcular", async (req, res) => {
  try {
    const { cepDestino, produtos } = req.body;

    if (!cepDestino || !produtos) {
      return res.status(400).json({ error: "CEP de destino e produtos são obrigatórios" });
    }

    const resultado = await calcularFrete({
      toPostalCode: cepDestino,
      products: produtos,
    });

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;