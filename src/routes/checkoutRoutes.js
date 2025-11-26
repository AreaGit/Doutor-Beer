const express = require("express");
const router = express.Router();
const { calcularFrete } = require("../services/melhorEnvio");
const Carrinho = require("../models/carrinho");
const CarrinhoItem = require("../models/CarrinhoItem");
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
    const carrinho = await Carrinho.findOne({
      where: { usuarioId, status: "ABERTO" },
      include: [
        {
          model: CarrinhoItem,
          as: "itens",
          include: [{ model: Produto, as: "Produto" }]
        }
      ]
    });

    if (!carrinho || !carrinho.itens || !carrinho.itens.length) {
      return res.status(400).json({ error: "Carrinho vazio" });
    }

    const subtotal = Number(carrinho.subtotal || 0);     // soma itens, sem cupom
    const desconto = Number(carrinho.desconto || 0);     // desconto do cupom
    const subtotalComDesconto = Math.max(subtotal - desconto, 0);

    const checkoutSession = req.session.checkout || {};
    const freteOriginal = Number(checkoutSession.frete || 0);

    const LIMITE_FRETE_GRATIS = 200;

    let frete = freteOriginal;
    let freteGratis = false;

    // 👉 Regra: se subtotal COM desconto >= 200, cliente não paga frete
    if (subtotalComDesconto >= LIMITE_FRETE_GRATIS) {
      frete = 0;
      freteGratis = true;
    }

    const total = subtotalComDesconto + frete;

    const cupomSessao = req.session.cupom || null;

    res.json({
      produtos: carrinho.itens.map((i) => ({
        produtoId: i.Produto.id,
        id: i.Produto.id,
        nome: i.Produto.nome,
        preco: i.Produto.precoPromocional ?? i.Produto.preco ?? 0,
        quantidade: i.quantidade,
        cor: i.cor,
        torneira: i.torneira,
        refil: i.refil,
        imagem: Array.isArray(i.Produto.imagem)
          ? i.Produto.imagem[0]
          : i.Produto.imagem || null
      })),
      subtotal,              // antes do cupom
      desconto,              // valor do cupom
      subtotalComDesconto,   // depois do cupom
      frete,                 // frete que o cliente vê (0 se frete grátis)
      freteOriginal,         // custo real calculado (pra você usar depois, se quiser)
      freteGratis,           // flag booleana p/ o front
      total,                 // subtotalComDesconto + frete (0 ou não)
      cupom: cupomSessao
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
    if (!usuarioIdSessao) {
      return res.status(401).json({ error: "Usuário não logado" });
    }

    const { itens, formaPagamento } = req.body;
    if (!itens?.length) {
      return res.status(400).json({ error: "Itens do pedido ausentes" });
    }

    // 🔹 Dados de checkout da sessão
    const checkout = req.session.checkout || {};

    // Cupom e desconto vindos da sessão
    const cupomSessao = req.session.cupom || {};
    const cupom = cupomSessao.codigo || checkout.cupom || null;
    const descontoCupom = Number(cupomSessao.desconto || checkout.desconto || 0);

    // 🔹 FRETE
    // - freteOriginal: quanto custaria o frete sem promoção
    const freteOriginal = Number(
      checkout.freteOriginal !== undefined
        ? checkout.freteOriginal
        : (checkout.frete ?? 0)
    );

    // Endereço salvo na sessão
    const endereco = checkout.endereco || {};

    // Subtotal calculado pelos itens enviados
    const subtotal = itens.reduce((acc, item) => {
      const preco = Number(item.precoUnitario || 0);
      const qtd = Number(item.quantidade || 1);
      return acc + (preco * qtd);
    }, 0);

    // 🔹 Total de produtos após desconto (base para regra de frete grátis)
    const totalProdutos = subtotal - descontoCupom;

    // 🔹 Regra de frete grátis:
    // se total de produtos > 200 → frete = 0
    let freteGratis = checkout.freteGratis === true;
    if (totalProdutos > 200) {
      freteGratis = true;
    }

    const freteFinal = freteGratis ? 0 : freteOriginal;

    // Se você já tiver o total calculado na sessão (o mesmo que o usuário viu),
    // pode usar ele. Senão, calculamos: totalProdutos + freteFinal
    const total =
      checkout.total !== undefined
        ? Number(checkout.total)
        : (totalProdutos + freteFinal);

    // 🔹 Status inicial baseado na forma de pagamento
    let statusInicial = "PENDENTE";
    const metodo = (formaPagamento || "").toUpperCase();

    if (metodo === "PIX" || metodo === "CARTAO" || metodo === "CARTAO_CREDITO") {
      statusInicial = "PENDENTE"; // se for usar webhook ASAAS, mantém pendente
    } else if (metodo === "BOLETO") {
      statusInicial = "AGUARDANDO_PAGAMENTO";
    }

    // 🔹 Cria o pedido SALVANDO CUPOM E FRETE
    const pedido = await Pedido.create({
      usuarioId: usuarioIdSessao,
      status: statusInicial,
      frete: freteFinal,          // 0 se frete grátis, valor real se não for
      total,
      enderecoEntrega: endereco,
      formaPagamento: metodo || "INDEFINIDO",
      cupom: cupom || null,
      descontoCupom: descontoCupom || 0
    });

    // 🔹 Cria os itens do pedido
    const pedidoItems = itens.map(item => {
      const preco = Number(item.precoUnitario || 0);
      const qtd = Number(item.quantidade || 1);

      return {
        pedidoId: pedido.id,
        produtoId: item.produtoId || item.id,
        quantidade: qtd,
        precoUnitario: preco,
        subtotal: preco * qtd,
        cor: item.cor || "padrao",
        torneira: item.torneira || "padrao",
        refil: item.refil && Number(item.refil) > 1 ? Number(item.refil) : null
      };
    });

    await PedidoItem.bulkCreate(pedidoItems);

    // 🔹 Limpa carrinho e sessão de checkout/cupom
    await Carrinho.destroy({ where: { usuarioId: usuarioIdSessao } });
    delete req.session.checkout;
    delete req.session.cupom;

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