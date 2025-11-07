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
  try {
    const usuarioId = req.session.user?.id;
    let { cepDestino, produtos } = req.body;
    cepDestino = limparCEP(cepDestino);

    if (!validarCEP(cepDestino)) {
      return res.status(400).json({ error: `CEP inválido: ${req.body.cepDestino}` });
    }

    let products = [];

    if (usuarioId) {
      // Usuário logado → pega do carrinho
      const items = await Cart.findAll({
        where: { usuarioId },
        include: [{ model: Produto, as: "Produto" }]
      });

      if (!items.length) return res.status(400).json({ error: "Carrinho vazio" });

      products = items.map(i => ({
        width: i.Produto.width || 20,
        height: i.Produto.height || 20,
        length: i.Produto.length || 20,
        weight: i.Produto.weight || 0.3,
        insurance_value: i.Produto.precoPromocional ?? i.Produto.preco ?? 0,
        quantity: i.quantidade || 1
      }));
    } else if (Array.isArray(produtos) && produtos.length) {
      // Visitante → usa body
      products = produtos.map(p => ({
        width: p.width || 20,
        height: p.height || 20,
        length: p.length || 20,
        weight: p.weight || 0.3,
        insurance_value: p.precoPromocional ?? p.preco ?? 0,
        quantity: p.quantidade || 1
      }));
    } else {
      return res.status(400).json({ error: "Nenhum produto fornecido para o cálculo do frete." });
    }

    const opcoesFrete = await calcularFrete({ toPostalCode: cepDestino, products });
    const filtradas = opcoesFrete.filter(o => o.company?.name !== "Jadlog" && o.company?.name !== "Azul");

    if (!filtradas.length)
      return res.status(404).json({ error: "Nenhuma opção de frete disponível." });

    res.json(filtradas);
  } catch (err) {
    console.error("[Frete] Erro ao calcular:", err);
    res.status(500).json({ error: "Erro ao calcular frete." });
  }
});

/* ================== ROTA: Salvar endereço + frete ================== */
router.post("/salvar-endereco-frete", (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  const { endereco, frete } = req.body;
  if (!endereco || frete == null) {
    return res.status(400).json({ error: "Endereço ou frete inválido" });
  }

  req.session.checkout = {
    endereco,
    frete: Number(frete),
    timestamp: Date.now()
  };

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

    // 🔹 Calcula subtotal com variações (torneira/refil)
    const subtotal = items.reduce((acc, item) => {
      const base = item.Produto.precoPromocional ?? item.Produto.preco ?? 0;
      let precoFinal = base;

      if (item.torneira === "Tap Handle Prata" || item.torneira === "Tap Handle Preta") precoFinal += 15;
      const refilQtd = Number(item.refil) || 1;
      if (refilQtd > 1) precoFinal += (refilQtd - 1) * 40;

      return acc + precoFinal * item.quantidade;
    }, 0);

    const checkoutSession = req.session.checkout || {};
    const frete = Number(checkoutSession.frete || 0);

    res.json({
      produtos: items.map(i => ({
        produtoId: i.Produto.id,
        id: i.Produto.id,
        nome: i.Produto.nome,
        preco: i.Produto.precoPromocional ?? i.Produto.preco ?? 0,
        quantidade: i.quantidade,
        cor: i.cor,
        torneira: i.torneira,
        refil: i.refil,
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

/* ================== PAGAMENTOS ================== */
router.post("/gerar-pix", checkoutController.gerarPix);
router.post("/gerar-boleto", checkoutController.gerarBoleto);
router.post("/gerar-cartao", checkoutController.gerarCartao);

// ================== ROTA: Finalizar pedido ==================
router.post("/finalizar", async (req, res) => {
  try {
    const usuarioIdSessao = req.session.user?.id;
    if (!usuarioIdSessao) return res.status(401).json({ error: "Usuário não logado" });

    const { itens, formaPagamento } = req.body;
    if (!itens?.length) return res.status(400).json({ error: "Itens do pedido ausentes" });

    // Dados de endereço e frete da sessão
    const sessionData = req.session.checkout || {};
    const endereco = sessionData.endereco || {};
    const frete = Number(sessionData.frete || 0);

    // 🔹 Calcula subtotal com base no preço final enviado do front
    const subtotal = itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
    const total = subtotal + frete;

    // 🔹 Define status inicial conforme método de pagamento
    let statusInicial = "PENDENTE";
    const metodo = (formaPagamento || "").toUpperCase();

    if (metodo === "PIX" || metodo === "CARTAO") {
      statusInicial = "PAGO";
    } else if (metodo === "BOLETO") {
      statusInicial = "AGUARDANDO_PAGAMENTO";
    }

    // 🔹 Cria o pedido
    const pedido = await Pedido.create({
      usuarioId: usuarioIdSessao,
      status: statusInicial,
      frete,
      total,
      enderecoEntrega: endereco,
      formaPagamento: metodo || "INDEFINIDO"
    });

    // 🔹 Cria os itens
    const pedidoItems = itens.map(item => ({
      pedidoId: pedido.id,
      produtoId: item.produtoId || item.id,
      quantidade: Number(item.quantidade || 1),
      precoUnitario: Number(item.precoUnitario || 0),
      subtotal: Number(item.precoUnitario * item.quantidade),
      cor: item.cor || "padrao",
      torneira: item.torneira || "padrao",
      refil: item.refil && Number(item.refil) > 1 ? Number(item.refil) : null
    }));

    await PedidoItem.bulkCreate(pedidoItems);

    // 🔹 Limpa carrinho após sucesso
    await Cart.destroy({ where: { usuarioId: usuarioIdSessao } });

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