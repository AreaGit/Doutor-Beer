const { consultarCobranca } = require("../services/asaas.services");
const Pedido = require("../models/Pedido");
const PedidoItem = require("../models/PedidoItem");

exports.verificarStatusCobranca = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) return res.status(400).json({ error: "paymentId obrigatório" });

    const cobranca = await consultarCobranca(paymentId);

    return res.json({
      status: cobranca.status,
      value: cobranca.value,
    });
  } catch (err) {
    console.error("Erro ao verificar status da cobrança:", err.response?.data || err);
    res.status(500).json({ error: "Erro ao verificar cobrança" });
  }
};