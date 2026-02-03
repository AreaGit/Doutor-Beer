const express = require("express");
const router = express.Router();
const { calcularFrete } = require("../services/melhorEnvio");
const Carrinho = require("../models/carrinho");
const CarrinhoItem = require("../models/CarrinhoItem");
const Produto = require("../models/Produto");
const Pedido = require("../models/Pedido");
const PedidoItem = require("../models/PedidoItem");
const checkoutController = require("../controllers/checkoutControllers");

// tenta pegar sequelize a partir do index dos models (ajuste conforme sua exportação)
let sequelize;
try {
  const db = require("../models");
  sequelize = db.sequelize || (db.default && db.default.sequelize);
} catch (err) {
  // caso não exista, sequelize permanecerá undefined — transação será ignorada (mas é recomendado ajustar)
  console.warn("[CheckoutRoutes] não foi possível carregar sequelize do ../models. Transactions podem não estar disponíveis.");
}

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
      return res.status(400).json({ error: `CEP inválido: ${cepDestino}` });
    }

    let products = [];

    if (usuarioId) {
      // Usuário logado → pega do carrinho (itens do carrinho)
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

      products = carrinho.itens.map(i => ({
        width: i.Produto?.width || 20,
        height: i.Produto?.height || 20,
        length: i.Produto?.length || 20,
        weight: i.Produto?.weight || 0.3,
        insurance_value: i.Produto?.precoPromocional ?? i.Produto?.preco ?? 0,
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
    const filtradas = (opcoesFrete || []).filter(o => o.company?.name !== "Jadlog" && o.company?.name !== "Azul");

    if (!filtradas.length)
      return res.status(404).json({ error: "Nenhuma opção de frete disponível." });

    res.json(filtradas);
  } catch (err) {
    console.error("[Frete] Erro ao calcular:", err);
    res.status(500).json({ error: "Erro ao calcular frete." });
  }
});

/* ================== ROTA: Salvar endereço + frete ================== */
router.post("/salvar-endereco-frete", async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  const { endereco, frete } = req.body;
  // frete agora pode ser objeto { freteValue, freteGratis, freteOriginal } ou número antigo
  if (!endereco || frete == null) {
    return res.status(400).json({ error: "Endereço ou frete inválido" });
  }

  // normaliza payload compatível com versão anterior
  let freteObj = {};
  if (typeof frete === "number") {
    freteObj = { freteValue: Number(frete), freteGratis: Number(frete) === 0, freteOriginal: Number(frete) };
  } else {
    freteObj = {
      freteValue: Number(frete.freteValue ?? frete.frete ?? 0),
      freteGratis: !!frete.freteGratis,
      freteOriginal: Number(frete.freteOriginal ?? frete.frete ?? frete.freteValue ?? 0)
    };
  }

  // Se usuário quer escolher frete grátis, valida que o carrinho atende ao requisito
  if (freteObj.freteGratis) {
    const carrinho = await Carrinho.findOne({
      where: { usuarioId, status: "ABERTO" }
    });

    if (!carrinho) {
      return res.status(400).json({ error: "Carrinho não encontrado." });
    }

    // Se o carrinho não tem a flag de frete grátis (vinda do cupom ou regra dinâmica), bloqueia
    // Regra adicional: se subtotal >= 1000
    const subtotalCarrinho = Number(carrinho.subtotal || 0);
    const atingiuMinimo = subtotalCarrinho >= 1000;

    if (!carrinho.freteGratis && !atingiuMinimo) {
      return res.status(400).json({ error: "Frete grátis não disponível para este pedido." });
    }
  }

  // salva na sessão de forma explícita
  req.session.checkout = {
    endereco,
    freteValue: freteObj.freteValue,
    freteGratis: freteObj.freteGratis,
    freteOriginal: freteObj.freteOriginal,
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

    // normaliza freteOriginal: pode vir de várias chaves antigas/novas
    const freteOriginal = Number(
      checkoutSession.freteOriginal ??
      checkoutSession.freteValue ??
      checkoutSession.frete ??
      0
    );

    // disponibilidade do frete grátis (para o front renderizar a opção)
    const atingiuMinimo = subtotal >= 1000;
    const freteGratisAvailable = !!carrinho.freteGratis || atingiuMinimo;

    // se o usuário já escolheu frete grátis anteriormente (persistido na sessão)
    const freteGratisSelected = !!checkoutSession.freteGratis && freteGratisAvailable;

    // valor de frete que será mostrado ao cliente (0 se ele escolheu frete grátis)
    const frete = freteGratisSelected ? 0 : freteOriginal;

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
        arteUrl: i.arteUrl,
        imagem: Array.isArray(i.Produto.imagem) ? i.Produto.imagem[0] : i.Produto.imagem || null
      })),
      subtotal,                    // antes do cupom
      desconto,                    // valor do cupom
      subtotalComDesconto,         // depois do cupom
      frete,                       // frete que o cliente vê (0 se usuário escolheu frete grátis)
      freteOriginal,               // custo real calculado (pra mostrar "R$ X → Grátis" se quiser)
      freteGratisAvailable,        // boolean: está disponível para escolha?
      freteGratisSelected,         // boolean: usuário já escolheu frete grátis?
      total,                       // subtotalComDesconto + frete
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

    const { itens: itensFront, formaPagamento } = req.body;
    if (!itensFront?.length) {
      return res.status(400).json({ error: "Itens do pedido ausentes" });
    }

    // 🔹 Dados de checkout da sessão
    const checkout = req.session.checkout || {};

    // Cupom e desconto vindos da sessão
    const cupomSessao = req.session.cupom || {};
    const cupom = cupomSessao.codigo || checkout.cupom || null;
    const descontoCupom = Number(cupomSessao.desconto || checkout.desconto || 0);

    // 🔹 FRETE (normaliza possíveis campos)
    const freteOriginal = Number(
      checkout.freteOriginal ??
      checkout.freteValue ??
      checkout.frete ??
      0
    );
    const freteSelected = Number(checkout.freteValue ?? freteOriginal);
    const freteGratisSelected = !!checkout.freteGratis;

    // Endereço salvo na sessão
    const endereco = checkout.endereco || {};

    // === RECOMPUTAR ITEMS NO SERVIDOR (não confiar em preços enviados pelo cliente) ===
    const produtoIds = itensFront.map(i => i.produtoId || i.id).filter(Boolean);
    const produtos = await Produto.findAll({ where: { id: produtoIds } });
    const produtosMap = new Map(produtos.map(p => [p.id, p]));

    // monta itens confiáveis baseados no DB
    const itensServer = itensFront.map(item => {
      const produto = produtosMap.get(item.produtoId || item.id);
      if (!produto) {
        throw new Error(`Produto inválido ou não encontrado: ${item.produtoId || item.id}`);
      }

      let precoFinal = produto.precoPromocional ?? produto.preco ?? 0;

      // regra: torneira soma +15 se aplicável
      if (item.torneira === "Tap Handle Prata" || item.torneira === "Tap Handle Preta") {
        precoFinal += 15;
      }

      const refilQtd = Number(item.refil) || 1;
      if (refilQtd > 1) {
        precoFinal += (refilQtd - 1) * 40;
      }

      return {
        produtoId: produto.id,
        quantidade: Number(item.quantidade || 1),
        precoUnitario: precoFinal,
        cor: item.cor || null,
        torneira: item.torneira || null,
        refil: refilQtd,
        arteUrl: item.arteUrl || null
      };
    });

    // Subtotal calculado pelos itens confiáveis
    const subtotal = itensServer.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0);

    // 🔹 Total de produtos após desconto (base para regra de frete grátis)
    const totalProdutos = subtotal - descontoCupom;

    const LIMITE_FRETE_GRATIS = 200;

    // 🔹 Revalidação: se o usuário escolheu frete grátis, garante que a condição ainda é válida
    // Busca novamente o carrinho para garantir a flag freteGratis atualizada
    const carrinhoDB = await Carrinho.findOne({ where: { usuarioId: usuarioIdSessao, status: "ABERTO" } });
    const freteGratisCupom = carrinhoDB ? !!carrinhoDB.freteGratis : false;
    const atingiuMinimoTotal = subtotal >= 1000;

    const freteGratisReal = freteGratisCupom || atingiuMinimoTotal;

    if (freteGratisSelected && !freteGratisReal) {
      return res.status(400).json({
        error: `A condição para frete grátis não é mais válida. Por favor, revise seu pedido.`
      });
    }

    // 🔹 Determina frete final: se usuário escolheu frete grátis => 0, senão usa o selecionado/original
    const freteFinal = freteGratisSelected ? 0 : freteSelected;

    // 🔹 Calcula total final (produtos - desconto + frete)
    const total =
      checkout.total !== undefined
        ? Number(checkout.total)
        : (totalProdutos + freteFinal);

    // 🔹 Status inicial baseado na forma de pagamento
    let statusInicial = "PENDENTE";
    const metodo = (formaPagamento || "").toUpperCase();

    if (metodo === "PIX" || metodo === "CARTAO" || metodo === "CARTAO_CREDITO") {
      statusInicial = "PENDENTE";
    } else if (metodo === "BOLETO") {
      statusInicial = "AGUARDANDO_PAGAMENTO";
    }

    // 🔹 Cria o pedido SALVANDO CUPOM E FRETE - usa transação se sequelize estiver disponível
    let pedido;
    if (sequelize) {
      await sequelize.transaction(async (t) => {
        pedido = await Pedido.create({
          usuarioId: usuarioIdSessao,
          status: statusInicial,
          frete: freteFinal,
          total,
          enderecoEntrega: endereco,
          formaPagamento: metodo || "INDEFINIDO",
          cupom: cupom || null,
          descontoCupom: descontoCupom || 0
        }, { transaction: t });

        const pedidoItems = itensServer.map(item => ({
          pedidoId: pedido.id,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          subtotal: item.precoUnitario * item.quantidade,
          cor: item.cor || "padrao",
          torneira: item.torneira || "padrao",
          refil: item.refil && Number(item.refil) > 1 ? Number(item.refil) : null,
          arteUrl: item.arteUrl || null
        }));

        await PedidoItem.bulkCreate(pedidoItems, { transaction: t });

        // Limpa carrinho do usuário
        await Carrinho.destroy({ where: { usuarioId: usuarioIdSessao } }, { transaction: t });

        // remove sessão de checkout/cupom dentro da transação lógica (sessão não transaciona DB)
        // ainda assim excluímos depois fora da transação para garantir consistência
      });
    } else {
      // sem sequelize, cria sem transação (menos seguro)
      pedido = await Pedido.create({
        usuarioId: usuarioIdSessao,
        status: statusInicial,
        frete: freteFinal,
        total,
        enderecoEntrega: endereco,
        formaPagamento: metodo || "INDEFINIDO",
        cupom: cupom || null,
        descontoCupom: descontoCupom || 0
      });

      const pedidoItems = itensServer.map(item => ({
        pedidoId: pedido.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        subtotal: item.precoUnitario * item.quantidade,
        cor: item.cor || "padrao",
        torneira: item.torneira || "padrao",
        refil: item.refil && Number(item.refil) > 1 ? Number(item.refil) : null,
        arteUrl: item.arteUrl || null
      }));

      await PedidoItem.bulkCreate(pedidoItems);
      await Carrinho.destroy({ where: { usuarioId: usuarioIdSessao } });
    }

    // 🔹 Limpa sessão de checkout/cupom
    delete req.session.checkout;
    delete req.session.cupom;

    res.json({
      sucesso: true,
      pedidoId: pedido.id,
      mensagem: "Pedido criado com sucesso!"
    });
  } catch (err) {
    console.error("[Checkout] Erro ao finalizar pedido:", err);
    // Se o erro veio de validação (mensagem amigável), repassamos 400
    if (err && err.message && err.message.startsWith("Produto inválido")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Erro ao finalizar pedido" });
  }
});

module.exports = router;
