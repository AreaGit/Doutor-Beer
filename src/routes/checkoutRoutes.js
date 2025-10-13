const express = require("express");
const router = express.Router();
const { calcularFrete } = require("../services/melhorEnvio");
const Cart = require("../models/carrinho");
const Produto = require("../models/Produto");
const Pedido = require("../models/Pedido");
const PedidoItem = require("../models/PedidoItem");

/* ================== FUNÇÕES AUXILIARES ================== */
function limparCEP(cep) {
  return (cep || "").replace(/\D/g, "");
}

function validarCEP(cep) {
  return /^[0-9]{8}$/.test(cep);
}

/* ================== ROTA: Calcular frete ================== */
router.post("/frete", async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  try {
    let { cepDestino } = req.body;
    cepDestino = limparCEP(cepDestino);

    if (!validarCEP(cepDestino)) {
      return res.status(400).json({ error: `CEP inválido: ${req.body.cepDestino}` });
    }

    const items = await Cart.findAll({
      where: { usuarioId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!items.length) return res.status(400).json({ error: "Carrinho vazio" });

    const products = items.map(i => ({
      width: i.Produto.width,
      height: i.Produto.height,
      length: i.Produto.length,
      weight: i.Produto.weight,
      insurance_value: i.Produto.precoPromocional ?? i.Produto.preco ?? 0,
      quantity: i.quantidade
    }));

    const opcoesFrete = await calcularFrete({ toPostalCode: cepDestino, products });
    res.json(opcoesFrete);

  } catch (err) {
    console.error("[Checkout] Erro ao calcular frete:", err);
    res.status(500).json({ error: "Erro ao calcular frete" });
  }
});

/* ================== ROTA: Salvar endereço + frete na sessão ================== */
router.post("/salvar-endereco-frete", (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  const { endereco, frete } = req.body;

  if (!endereco || frete == null) {
    return res.status(400).json({ error: "Endereço ou frete inválido" });
  }

  req.session.checkout = { endereco, frete };

  console.log("[Checkout] Endereço e frete salvos na sessão:", req.session.checkout);
  res.json({ ok: true });
});

/* ================== ROTA: Resumo do carrinho ================== */
router.get("/resumo", async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  try {
    const items = await Cart.findAll({
      where: { usuarioId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!items.length) return res.status(400).json({ error: "Carrinho vazio" });

    const subtotal = items.reduce(
      (acc, item) => acc + ((item.Produto.precoPromocional ?? item.Produto.preco ?? 0) * item.quantidade),
      0
    );

    const checkoutSession = req.session.checkout || {};
    const frete = checkoutSession.frete ?? 0;

    res.json({
      produtos: items.map(i => ({
        nome: i.Produto.nome,
        preco: i.Produto.precoPromocional ?? i.Produto.preco ?? 0,
        quantidade: i.quantidade,
        imagem: i.Produto.imagem || null
      })),
      subtotal,
      frete,
      total: subtotal + frete
    });

  } catch (err) {
    console.error("[Checkout] Erro ao carregar resumo:", err);
    res.status(500).json({ error: "Erro ao carregar resumo do pedido" });
  }
});

/* ================== ROTA: Finalizar pedido ================== */
router.post("/finalizar", async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  try {
    const { metodoPagamento } = req.body;
    const checkoutSession = req.session.checkout;

    if (!checkoutSession || !checkoutSession.endereco) {
      return res.status(400).json({ error: "Endereço/frete não definidos" });
    }

    // Captura o endereço exatamente como veio do front
    const enderecoEntrega = {
      cep: checkoutSession.endereco.cep || "",
      rua: checkoutSession.endereco.rua || "",
      nome: checkoutSession.endereco.nome || "",
      cidade: checkoutSession.endereco.cidade || "",
      estado: checkoutSession.endereco.estado || "",
      numero: checkoutSession.endereco.numero || "",
      complemento: checkoutSession.endereco.complemento || ""
    };

    // Busca os itens do carrinho do usuário
    const cartItems = await Cart.findAll({
      where: { usuarioId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!cartItems.length)
      return res.status(400).json({ error: "Carrinho vazio" });

    // Calcula subtotal
    const subtotal = cartItems.reduce(
      (acc, item) =>
        acc +
        ((item.Produto.precoPromocional ?? item.Produto.preco ?? 0) *
          item.quantidade),
      0
    );

    // Cria o pedido com o endereço puro e frete
    const pedido = await Pedido.create({
      usuarioId,
      status: "Pendente",
      total: subtotal + (checkoutSession.frete ?? 0),
      frete: checkoutSession.frete ?? 0,
      enderecoEntrega: enderecoEntrega, // já é JSON, sem stringify
      metodoPagamento
    });

    // Cria os itens do pedido
    const pedidoItems = cartItems.map(item => ({
      pedidoId: pedido.id,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario:
        item.Produto.precoPromocional ?? item.Produto.preco ?? 0
    }));

    await PedidoItem.bulkCreate(pedidoItems);

    // Limpa o carrinho
    await Cart.destroy({ where: { usuarioId } });

    // Retorna resposta
    res.json({
      sucesso: true,
      pedidoId: pedido.id,
      mensagem: "Pedido criado com sucesso!"
    });
  } catch (err) {
    console.error("[Checkout] Erro ao finalizar pedido:", err);
    res.status(500).json({ error: "Erro ao finalizar pedido" });
  }
});


module.exports = router;
