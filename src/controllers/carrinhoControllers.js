// controllers/carrinhoControllers.js

const Carrinho = require("../models/carrinho");       // HEADER (tabela: carrinhos)
const CarrinhoItem = require("../models/CarrinhoItem"); // ITENS (tabela: carrinho_itens)
const Produto = require("../models/Produto");
const Pedido = require("../models/Pedido");

/* ================== Helpers ================== */

// Acha ou cria um carrinho ABERTO para o usuário
async function getOrCreateCarrinho(usuarioId) {
  let carrinho = await Carrinho.findOne({
    where: { usuarioId, status: "ABERTO" }
  });

  if (!carrinho) {
    carrinho = await Carrinho.create({
      usuarioId,
      subtotal: 0,
      desconto: 0,
      total: 0,
      status: "ABERTO"
    });
  }

  return carrinho;
}

// Recalcula subtotal / desconto / total do carrinho com base nos itens
async function recomputarTotais(carrinho) {
  const itens = await CarrinhoItem.findAll({
    where: { carrinhoId: carrinho.id }
  });

  const subtotal = itens.reduce(
    (acc, item) => acc + (item.precoFinal || 0) * item.quantidade,
    0
  );

  // Regras de cupom existentes
  const CUPOM_DESCONTO = "NHGSYS150S";
  const MINIMO_DESCONTO = 500;

  // Novo cupom de frete grátis
  const CUPOM_FRETE_GRATIS = "DBFRETEGRATIS";
  const MINIMO_FRETE_GRATIS = 200; // se ficar abaixo disso, remove o cupom de frete grátis

  let desconto = 0;
  let freteGratis = false;

  // Se já havia cupom aplicado no carrinho, respeitamos seu efeito
  if (carrinho.cupomCodigo === CUPOM_DESCONTO) {
    // se tem cupom monetário e subtotal >= minimo mantém, senão remove
    if (subtotal >= MINIMO_DESCONTO) {
      desconto = carrinho.desconto || 0; // valor já salvo (150)
    } else {
      // remove cupom se não atende mais ao mínimo
      carrinho.cupomCodigo = null;
      desconto = 0;
    }
  } else if (carrinho.cupomCodigo === CUPOM_FRETE_GRATIS) {
    // frete grátis: permite aplicação independente do subtotal, mas se subtotal < MINIMO_FRETE_GRATIS remove
    if (subtotal >= MINIMO_FRETE_GRATIS) {
      freteGratis = true;
      desconto = 0;
    } else {
      // se não atinge o mínimo de permanência, remove o cupom
      carrinho.cupomCodigo = null;
      freteGratis = false;
      desconto = 0;
    }
  } else {
    desconto = carrinho.desconto || 0;
  }

  const total = Math.max(subtotal - desconto, 0);

  carrinho.subtotal = subtotal;
  carrinho.desconto = desconto;
  carrinho.total = total;
  // salva flag pra front-end se quiser usar
  carrinho.freteGratis = !!freteGratis;
  await carrinho.save();

  return { subtotal, desconto, total, freteGratis: !!freteGratis };
}


// Normaliza item para o front (igual ao que você já usava)
function formatCartItem(item) {
  const imagemPrincipal = Array.isArray(item.Produto?.imagem)
    ? item.Produto.imagem[0]
    : item.Produto?.imagem || "";

  return {
    id: item.produtoId,
    nome: item.Produto?.nome || "",
    imagem: imagemPrincipal,          // sempre a principal
    imagemPrincipal,                  // campo extra se quiser usar no front
    preco: item.precoFinal || item.Produto?.preco || 0,
    precoPromocional: item.Produto?.precoPromocional || null,
    quantidade: item.quantidade,
    cor: item.cor || "padrao",
    torneira: item.torneira || null,
    refil: item.refil || null
  };
}


/* ================== GET /api/carrinho ================== */
exports.getCart = async (req, res) => {
  const usuarioId = req.session.user?.id;

  if (!usuarioId) {
    return res.json({
      items: [],
      cupom: null,
      subtotal: 0,
      desconto: 0,
      total: 0
    });
  }

  try {
    let carrinho = await Carrinho.findOne({
      where: { usuarioId, status: "ABERTO" },
      include: [
        {
          model: CarrinhoItem,
          as: "itens",
          include: [{ model: Produto, as: "Produto" } ]
        }
      ]
    });

    if (!carrinho) {
      return res.json({
        items: [],
        cupom: null,
        subtotal: 0,
        desconto: 0,
        total: 0
      });
    }

    const { subtotal, desconto, total, freteGratis } = await recomputarTotais(carrinho);

    let cupom = null;
    if (carrinho.cupomCodigo) {
      cupom = {
        codigo: carrinho.cupomCodigo,
        desconto: carrinho.desconto || 0,
        minimo: carrinho.cupomCodigo === "NHGSYS150S" ? 500 : undefined,
        freteGratis: !!freteGratis
      };
    }

    return res.json({
      items: carrinho.itens.map(formatCartItem),
      cupom,
      subtotal,
      desconto,
      total
    });
  } catch (err) {
    console.error("[Carrinho] Erro ao carregar carrinho:", err);
    res.status(500).json({ error: "Erro ao carregar carrinho" });
  }
};


/* ================== POST /api/carrinho/add ================== */
exports.addToCart = async (req, res) => {
  const { produtoId, quantidade = 1, cor, torneira, refil } = req.body;
  const usuarioId = req.session.user?.id;

  if (!usuarioId)
    return res.status(401).json({ error: "Usuário não logado" });

  if (!produtoId || quantidade <= 0)
    return res
      .status(400)
      .json({ error: "Produto e quantidade válidos são obrigatórios" });

  const corFinal = cor && cor.trim() !== "" ? cor : "padrao";
  const torneiraFinal =
    torneira && torneira.trim() !== "" ? torneira : "padrao";
  const refilFinal = refil ?? null;

  try {
    const carrinho = await getOrCreateCarrinho(usuarioId);

    const produto = await Produto.findByPk(produtoId);
    if (!produto)
      return res.status(404).json({ error: "Produto não encontrado" });

    // calcula preço unitário final baseado nas variações
    let precoBase = produto.precoPromocional ?? produto.preco;
    let precoFinal = precoBase;

    if (
      torneiraFinal === "Tap Handle Prata" ||
      torneiraFinal === "Tap Handle Preta"
    ) {
      precoFinal += 15;
    }

    if (refilFinal && Number(refilFinal) > 1) {
      precoFinal += (refilFinal - 1) * 40;
    }

    // procura item igual no carrinho (mesmo produto + variações)
    let item = await CarrinhoItem.findOne({
      where: {
        carrinhoId: carrinho.id,
        produtoId,
        cor: corFinal,
        torneira: torneiraFinal,
        refil: refilFinal
      },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (item) {
      item.quantidade += quantidade;
      item.precoFinal = precoFinal;
      await item.save();
    } else {
      item = await CarrinhoItem.create({
        carrinhoId: carrinho.id,
        produtoId,
        quantidade,
        cor: corFinal,
        torneira: torneiraFinal,
        refil: refilFinal,
        precoFinal
      });

      item = await CarrinhoItem.findByPk(item.id, {
        include: [{ model: Produto, as: "Produto" }]
      });
    }

    await recomputarTotais(carrinho);

    res.json(formatCartItem(item));
  } catch (err) {
    console.error("[Carrinho] Erro ao adicionar produto:", err);
    res.status(500).json({ error: "Erro ao adicionar produto ao carrinho" });
  }
};

/* ================== POST /api/carrinho/update ================== */
exports.updateCart = async (req, res) => {
  const { produtoId, quantidade, cor, torneira, refil } = req.body;
  const usuarioId = req.session.user?.id;

  if (!usuarioId)
    return res.status(401).json({ error: "Usuário não logado" });

  if (!produtoId || quantidade <= 0)
    return res
      .status(400)
      .json({ error: "Produto e quantidade válidos são obrigatórios" });

  const corFinal = cor && cor.trim() !== "" ? cor : "padrao";
  const torneiraFinal =
    torneira && torneira.trim() !== "" ? torneira : "padrao";
  const refilFinal = refil ?? null;

  try {
    const carrinho = await getOrCreateCarrinho(usuarioId);

    const item = await CarrinhoItem.findOne({
      where: {
        carrinhoId: carrinho.id,
        produtoId,
        cor: corFinal,
        torneira: torneiraFinal,
        refil: refilFinal
      },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!item)
      return res
        .status(404)
        .json({ error: "Produto não encontrado no carrinho" });

    const produto = item.Produto;

    let precoBase = produto.precoPromocional ?? produto.preco;
    let precoFinal = precoBase;

    if (
      torneiraFinal === "Tap Handle Prata" ||
      torneiraFinal === "Tap Handle Preta"
    ) {
      precoFinal += 15;
    }

    if (refilFinal && Number(refilFinal) > 1) {
      precoFinal += (refilFinal - 1) * 40;
    }

    item.quantidade = quantidade;
    item.precoFinal = precoFinal;
    await item.save();

    await recomputarTotais(carrinho);

    res.json(formatCartItem(item));
  } catch (err) {
    console.error("[Carrinho] Erro ao atualizar quantidade:", err);
    res.status(500).json({ error: "Erro ao atualizar carrinho" });
  }
};

/* ================== POST /api/carrinho/remove ================== */
exports.removeFromCart = async (req, res) => {
  const { produtoId, cor, torneira, refil } = req.body;
  const usuarioId = req.session.user?.id;

  if (!usuarioId)
    return res.status(401).json({ error: "Usuário não logado" });

  if (!produtoId)
    return res.status(400).json({ error: "ProdutoId é obrigatório" });

  const corFinal = cor && cor.trim() !== "" ? cor : "padrao";
  const torneiraFinal =
    torneira && torneira.trim() !== "" ? torneira : "padrao";
  const refilFinal = refil ?? null;

  try {
    const carrinho = await getOrCreateCarrinho(usuarioId);

    const item = await CarrinhoItem.findOne({
      where: {
        carrinhoId: carrinho.id,
        produtoId,
        cor: corFinal,
        torneira: torneiraFinal,
        refil: refilFinal
      }
    });

    if (!item) {
      console.log("[Carrinho] Item não encontrado no banco:", {
        usuarioId,
        produtoId,
        cor: corFinal,
        torneira: torneiraFinal
      });
      return res
        .status(404)
        .json({ error: "Item não encontrado no carrinho" });
    }

    await item.destroy();
    await recomputarTotais(carrinho);

    res.json({ success: true });
  } catch (err) {
    console.error("[Carrinho] Erro ao remover produto:", err);
    res.status(500).json({ error: "Erro ao remover produto do carrinho" });
  }
};

/* ================== POST /api/carrinho/apply-coupon ================== */
exports.applyCoupon = async (req, res) => {
  const { codigo } = req.body;
  const usuarioId = req.session.user?.id;

  if (!usuarioId) {
    return res.json({
      success: false,
      code: "NAO_LOGADO",
      message: "Você precisa estar logado para usar cupons."
    });
  }

  // Cupom monetário antigo
  const CUPOM_DESCONTO = "NHGSYS150S";
  const DESCONTO = 150;
  const MINIMO = 500;

  // Novo cupom de frete grátis
  const CUPOM_FRETE_GRATIS = "DBFRETEGRATIS";

  if (!codigo || typeof codigo !== "string") {
    return res.json({ success: false, code: "CUPOM_INVALIDO" });
  }

  const upper = codigo.toUpperCase().trim();

  try {
    const carrinho = await getOrCreateCarrinho(usuarioId);

    // já aplicado
    if (carrinho.cupomCodigo === upper) {
      return res.json({
        success: false,
        code: "JA_APLICADO_NO_CARRINHO",
        message: "Este cupom já está aplicado nesta compra 😄"
      });
    }

    // já usado em pedido anterior?
    const usos = await Pedido.count({ where: { usuarioId, cupom: upper } });
    if (usos >= 1) {
      return res.json({
        success: false,
        code: "JA_USOU",
        message: "Você já utilizou este cupom em uma compra anterior."
      });
    }

    // lógica por cupom
    if (upper === CUPOM_DESCONTO) {
      // cupom monetário (mesma lógica antiga)
      const { subtotal } = await recomputarTotais(carrinho);
      if (subtotal < MINIMO) {
        const faltam = MINIMO - subtotal;
        return res.json({
          success: false,
          code: "MINIMO_NAO_ATINGIDO",
          message: `Este cupom é válido para compras a partir de R$ ${MINIMO.toFixed(2).replace(".", ",")}.`,
          subtotal,
          minimo: MINIMO,
          faltam
        });
      }

      carrinho.cupomCodigo = CUPOM_DESCONTO;
      carrinho.desconto = DESCONTO;
      const { desconto, total } = await recomputarTotais(carrinho);

      const cupomData = {
        codigo: CUPOM_DESCONTO,
        desconto,
        minimo: MINIMO
      };

      req.session.cupom = cupomData;

      return res.json({
        success: true,
        cupom: cupomData,
        subtotal: carrinho.subtotal,
        desconto,
        total,
        message: `Cupom aplicado: - R$ ${DESCONTO.toFixed(2).replace(".", ",")}`
      });
    } else if (upper === CUPOM_FRETE_GRATIS) {
      // cupom de frete grátis — AQUI: pode aplicar independente do subtotal
      carrinho.cupomCodigo = CUPOM_FRETE_GRATIS;
      // garante que desconto monetário não é afetado
      carrinho.desconto = 0;
      // recomputa (irá setar carrinho.freteGratis = true ou remover imediatamente se subtotal < MINIMO_FRETE_GRATIS)
      const { subtotal, desconto, total, freteGratis } = await recomputarTotais(carrinho);

      // Se recomputarTotais removeu o cupom (porque subtotal < MINIMO_FRETE_GRATIS), avisamos isso ao usuário
      if (!freteGratis && carrinho.cupomCodigo !== CUPOM_FRETE_GRATIS) {
        // o carrinho não manteve o cupom (subtotal < limite de permanência)
        return res.json({
          success: false,
          code: "MINIMO_FRETE_NAO_ATINGIDO",
          message: `Frete grátis a partir de R$200`,
          subtotal,
          minimo: 200
        });
      }

      const cupomData = {
        codigo: CUPOM_FRETE_GRATIS,
        freteGratis: true
      };

      req.session.cupom = cupomData;

      return res.json({
        success: true,
        cupom: cupomData,
        subtotal,
        desconto,
        total,
        message: "Cupom de frete grátis aplicado! A opção aparecerá no checkout."
      });
    } else {
      return res.json({
        success: false,
        code: "CUPOM_INVALIDO",
        message: "Cupom inválido. Confira se digitou certinho 😉"
      });
    }
  } catch (err) {
    console.error("[Carrinho] Erro ao aplicar cupom:", err);
    return res.status(500).json({
      success: false,
      code: "ERRO_INTERNO",
      message: "Erro ao aplicar cupom. Tente novamente em instantes. 🙏"
    });
  }
};


/* ================== POST /api/carrinho/remove-coupon ================== */
exports.removeCoupon = async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  try {
    const carrinho = await Carrinho.findOne({
      where: { usuarioId, status: "ABERTO" }
    });

    if (carrinho) {
      carrinho.cupomCodigo = null;
      carrinho.desconto = 0;
      carrinho.freteGratis = false;
      await recomputarTotais(carrinho);
    }

    if (req.session.cupom) {
      delete req.session.cupom;
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[Carrinho] Erro ao remover cupom:", err);
    return res.status(500).json({ error: "Erro ao remover cupom" });
  }
};

module.exports = {
  getCart: exports.getCart,
  addToCart: exports.addToCart,
  updateCart: exports.updateCart,
  removeFromCart: exports.removeFromCart,
  applyCoupon: exports.applyCoupon,
  removeCoupon: exports.removeCoupon,
  recomputarTotais 
};
