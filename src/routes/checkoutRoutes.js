const express = require("express");
const router = express.Router();
const { calcularFrete } = require("../services/melhorEnvio");
const Cart = require("../models/carrinho");
const Produto = require("../models/Produto");
const Pedido = require("../models/Pedido");
const PedidoItem = require("../models/PedidoItem");
const checkoutController = require("../controllers/checkoutControllers");

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
        produtoId: i.Produto.id,
        id: i.Produto.id,
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

router.post("/gerar-pix", checkoutController.gerarPix);
router.post("/gerar-boleto", checkoutController.gerarBoleto);
router.post("/gerar-cartao", checkoutController.gerarCartao);

/* ================== ROTA: Finalizar pedido ================== */
router.post("/finalizar", async (req, res) => {
  try {
    const usuarioIdSessao = req.session.user?.id;
    if (!usuarioIdSessao) return res.status(401).json({ error: "Usuário não logado" });

    const {
      usuarioId: usuarioIdFront,
      endereco,
      frete,
      itens,
      subtotal,
      total,
      formaPagamento
    } = req.body;

    if (!endereco || !itens?.length) {
      return res.status(400).json({ error: "Dados incompletos do pedido" });
    }

    // Normaliza endereço
    const enderecoEntrega = {
      nome: endereco.nome || "",
      cep: endereco.cep || "",
      rua: endereco.rua || "",
      numero: endereco.numero || "",
      complemento: endereco.complemento || "",
      cidade: endereco.cidade || "",
      estado: endereco.estado || ""
    };

    // Calcula subtotal caso não venha do frontend
    const subtotalCalc = itens.reduce(
      (acc, item) => acc + Number(item.precoUnitario || 0) * Number(item.quantidade || 0),
      0
    );

    // Cria o pedido
    const pedido = await Pedido.create({
      usuarioId: usuarioIdSessao || usuarioIdFront,
      status: "PAGO",
      frete: Number(frete || 0),
      total: Number(total || subtotalCalc + Number(frete || 0)),
      enderecoEntrega,
      formaPagamento: formaPagamento || "Indefinido"
    });

    // 🔒 Monta os itens garantindo produtoId válido e existe no banco
    const produtoIds = itens.map(i => i.produtoId || i.id);
    const produtosValidos = await Produto.findAll({
      where: { id: produtoIds }
    });
    const idsValidos = produtosValidos.map(p => p.id);

    const pedidoItems = itens
      .filter(item => (item.produtoId || item.id) && idsValidos.includes(item.produtoId || item.id))
      .map(item => ({
        pedidoId: pedido.id,
        produtoId: item.produtoId || item.id,
        quantidade: Number(item.quantidade || 1),
        precoUnitario: Number(item.precoUnitario || 0)
      }));

    if (!pedidoItems.length) {
      // Se nenhum produto for válido, apaga o pedido criado
      await pedido.destroy();
      return res.status(400).json({ error: "Nenhum produto válido no pedido" });
    }

    await PedidoItem.bulkCreate(pedidoItems);

    // Limpa o carrinho do usuário
    await Cart.destroy({ where: { usuarioId: usuarioIdSessao } });

    return res.json({
      sucesso: true,
      pedidoId: pedido.id,
      mensagem: "Pedido criado com sucesso!"
    });
  } catch (err) {
    console.error("[Checkout] Erro ao finalizar pedido:", err);
    return res.status(500).json({ error: "Erro ao finalizar pedido" });
  }
});


module.exports = router;
