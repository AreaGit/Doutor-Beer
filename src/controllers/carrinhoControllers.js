// controllers/carrinhoControllers.js

const Carrinho = require("../models/carrinho");       // HEADER (tabela: carrinhos)
const CarrinhoItem = require("../models/CarrinhoItem"); // ITENS (tabela: carrinho_itens)
const Produto = require("../models/Produto");
const Pedido = require("../models/Pedido");
const Cupom = require("../models/Cupom");

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

  let desconto = 0;
  let freteGratis = false;

  if (carrinho.cupomCodigo) {
    const cupom = await Cupom.findOne({
      where: { codigo: carrinho.cupomCodigo, ativo: true }
    });

    if (cupom) {
      // Validar data de validade
      if (cupom.validade && new Date(cupom.validade) < new Date()) {
        carrinho.cupomCodigo = null;
        carrinho.desconto = 0;
      }
      // Validar valor mínimo
      else if (subtotal < cupom.minimo) {
        carrinho.cupomCodigo = null;
        carrinho.desconto = 0;
      }
      else {
        // Aplicar lógica do cupom
        if (cupom.tipo === "frete_gratis") {
          freteGratis = true;
          desconto = 0;
        } else if (cupom.tipo === "fixo") {
          desconto = cupom.valor;
        } else if (cupom.tipo === "percentual") {
          desconto = subtotal * (cupom.valor / 100);
        }
      }
    } else {
      // Cupom não encontrado ou inativo, remove do carrinho
      carrinho.cupomCodigo = null;
      carrinho.desconto = 0;
    }
  }

  const total = Math.max(subtotal - desconto, 0);

  carrinho.subtotal = subtotal;
  carrinho.desconto = desconto;
  carrinho.total = total;
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
    refil: item.refil || null,
    arteUrl: item.arteUrl || null
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
          include: [{ model: Produto, as: "Produto" }]
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
      const cupomDb = await Cupom.findOne({ where: { codigo: carrinho.cupomCodigo } });
      cupom = {
        codigo: carrinho.cupomCodigo,
        desconto: carrinho.desconto || 0,
        minimo: cupomDb ? cupomDb.minimo : undefined,
        freteGratis: !!freteGratis,
        tipo: cupomDb ? cupomDb.tipo : null
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
  const { produtoId, quantidade = 1, cor, torneira, refil, arteUrl } = req.body;
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
        refil: refilFinal,
        arteUrl: arteUrl || null
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
        arteUrl: arteUrl || null,
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
  const { produtoId, quantidade, cor, torneira, refil, arteUrl } = req.body;
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
    if (arteUrl !== undefined) item.arteUrl = arteUrl;
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

  if (!codigo || typeof codigo !== "string") {
    return res.json({ success: false, code: "CUPOM_INVALIDO" });
  }

  const upper = codigo.toUpperCase().trim();

  try {
    const carrinho = await getOrCreateCarrinho(usuarioId);

    // Buscar cupom no banco
    const cupom = await Cupom.findOne({ where: { codigo: upper, ativo: true } });

    if (!cupom) {
      return res.json({
        success: false,
        code: "CUPOM_INVALIDO",
        message: "Cupom inválido. Confira se digitou certinho 😉"
      });
    }

    // Já aplicado
    if (carrinho.cupomCodigo === upper) {
      return res.json({
        success: false,
        code: "JA_APLICADO_NO_CARRINHO",
        message: "Este cupom já está aplicado nesta compra 😄"
      });
    }

    // Validade
    if (cupom.validade && new Date(cupom.validade) < new Date()) {
      return res.json({
        success: false,
        code: "CUPOM_EXPIRADO",
        message: "Este cupom já expirou. 😢"
      });
    }

    // Limite de usos (geral)
    if (cupom.limite !== null && cupom.usos >= cupom.limite) {
      return res.json({
        success: false,
        code: "LIMITE_ATINGIDO",
        message: "Este cupom atingiu o limite máximo de usos. 😢"
      });
    }

    // Verificação de uso por usuário (se definido no cupom)
    if (cupom.limite_usuario !== null) {
      const usosUsuario = await Pedido.count({ where: { usuarioId, cupom: upper } });
      if (usosUsuario >= cupom.limite_usuario) {
        return res.json({
          success: false,
          code: "LIMITE_USUARIO_ATINGIDO",
          message: `Você já atingiu o limite de usos (${cupom.limite_usuario}) para este cupom. 😢`
        });
      }
    }

    // Mínimo não atingido
    const { subtotal } = await recomputarTotais(carrinho);
    if (subtotal < cupom.minimo) {
      const faltam = cupom.minimo - subtotal;
      return res.json({
        success: false,
        code: "MINIMO_NAO_ATINGIDO",
        message: `Este cupom é válido para compras a partir de R$ ${cupom.minimo.toFixed(2).replace(".", ",")}.`,
        subtotal,
        minimo: cupom.minimo,
        faltam
      });
    }

    // Aplicar cupom
    carrinho.cupomCodigo = upper;

    // Calcular desconto inicial para salvar no carrinho
    let vDesconto = 0;
    if (cupom.tipo === "fixo") {
      vDesconto = cupom.valor;
    } else if (cupom.tipo === "percentual") {
      vDesconto = subtotal * (cupom.valor / 100);
    }

    carrinho.desconto = vDesconto;
    const { desconto, total, freteGratis } = await recomputarTotais(carrinho);

    const cupomData = {
      codigo: upper,
      desconto,
      minimo: cupom.minimo,
      freteGratis,
      tipo: cupom.tipo
    };

    req.session.cupom = cupomData;

    let msg = "";
    if (cupom.tipo === "frete_gratis") {
      msg = "Cupom de frete grátis aplicado! 🎉";
    } else {
      msg = `Cupom aplicado: - R$ ${desconto.toFixed(2).replace(".", ",")}`;
    }

    return res.json({
      success: true,
      cupom: cupomData,
      subtotal: carrinho.subtotal,
      desconto,
      total,
      message: msg
    });
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
