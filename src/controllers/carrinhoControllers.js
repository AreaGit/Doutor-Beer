
const Cart = require("../models/carrinho");
const Produto = require("../models/Produto");

// Função utilitária para padronizar os itens do carrinho
function formatCartItem(item) {
  return {
    id: item.produtoId,
    nome: item.Produto?.nome || "",
    imagem: Array.isArray(item.Produto?.imagem) ? item.Produto.imagem[0] : item.Produto?.imagem || "",
    preco: item.Produto?.preco || 0,
    precoPromocional: item.Produto?.precoPromocional || null,
    quantidade: item.quantidade,
    cupom: item.cupom || null // novo
  };
}

// ================== Pegar carrinho ==================
// ================== Pegar carrinho ==================
exports.getCart = async (req, res) => {
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  if (!usuarioId && !guestId) return res.json([]);

  try {
    const items = await Cart.findAll({
      where: usuarioId ? { usuarioId } : { guestId },
      include: [{ model: Produto, as: "Produto" }]
    });

    const validCoupons = {
      "DESCONTO10": 0.10,
      "FRETEGRATIS": 0.15,
      "JORGERAMOS69": 0.69
    };

    const formatted = items.map(item => {
      const baseItem = formatCartItem(item);

      if (item.cupom && validCoupons[item.cupom]) {
        const desconto = validCoupons[item.cupom];
        const precoBase = baseItem.precoPromocional ?? baseItem.preco ?? 0;
        const precoComDesconto = precoBase * (1 - desconto);

        return {
          ...baseItem,
          precoFinal: precoComDesconto,
          desconto,
          cupom: item.cupom
        };
      }

      return {
        ...baseItem,
        precoFinal: baseItem.precoPromocional ?? baseItem.preco ?? 0
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("[Carrinho] Erro:", err);
    res.status(500).json({ error: "Erro ao carregar carrinho" });
  }
};

// ================== Adicionar produto ==================
exports.addToCart = async (req, res) => {
  const { produtoId, quantidade } = req.body;
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  if (!usuarioId && !guestId)
    return res.status(400).json({ error: "Usuário ou guestId necessário" });

  try {
    let cartItem = await Cart.findOne({
      where: usuarioId ? { usuarioId, produtoId } : { guestId, produtoId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (cartItem) {
      cartItem.quantidade += quantidade;
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        usuarioId: usuarioId || null,
        guestId: usuarioId ? null : guestId,
        produtoId,
        quantidade
      });

      // recarregar com include
      cartItem = await Cart.findByPk(cartItem.id, {
        include: [{ model: Produto, as: "Produto" }]
      });
    }

    res.json(formatCartItem(cartItem));
  } catch (err) {
    console.error("[Carrinho] Erro ao adicionar:", err);
    res.status(500).json({ error: "Erro ao adicionar produto ao carrinho" });
  }
};

// ================== Atualizar quantidade ==================
exports.updateCart = async (req, res) => {
  const { produtoId, quantidade } = req.body;
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  if (!usuarioId && !guestId)
    return res.status(400).json({ error: "Usuário ou guestId necessário" });

  try {
    let cartItem = await Cart.findOne({
      where: usuarioId ? { usuarioId, produtoId } : { guestId, produtoId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!cartItem)
      return res.status(404).json({ error: "Produto não encontrado no carrinho" });

    cartItem.quantidade = quantidade;
    await cartItem.save();

    res.json(formatCartItem(cartItem));
  } catch (err) {
    console.error("[Carrinho] Erro ao atualizar:", err);
    res.status(500).json({ error: "Erro ao atualizar carrinho" });
  }
};

// ================== Remover produto ==================
exports.removeFromCart = async (req, res) => {
  const { produtoId } = req.body;
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  if (!usuarioId && !guestId)
    return res.status(400).json({ error: "Usuário ou guestId necessário" });

  try {
    const cartItem = await Cart.findOne({
      where: usuarioId ? { usuarioId, produtoId } : { guestId, produtoId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!cartItem)
      return res.status(404).json({ error: "Produto não encontrado no carrinho" });

    await cartItem.destroy();

    res.json({ success: true, produtoId });
  } catch (err) {
    console.error("[Carrinho] Erro ao remover:", err);
    res.status(500).json({ error: "Erro ao remover produto do carrinho" });
  }
};

// ================== Aplicar cupom ==================
exports.applyCoupon = async (req, res) => {
  const { codigo } = req.body;
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  if (!usuarioId && !guestId)
    return res.status(400).json({ error: "Usuário ou guestId necessário" });

  const validCoupons = {
    "DESCONTO10": 0.10,
    "FRETEGRATIS": 0.15,
    "JORGERAMOS69": 0.69
  };

  const desconto = validCoupons[codigo?.toUpperCase()];
  if (!desconto) return res.status(400).json({ error: "Cupom inválido" });

  try {
    // Atualiza todos os itens do carrinho do usuário/guest
    await Cart.update(
      { cupom: codigo.toUpperCase() },
      { where: usuarioId ? { usuarioId } : { guestId } }
    );

    res.json({ success: true, codigo: codigo.toUpperCase(), desconto });
  } catch (err) {
    console.error("[Carrinho] Erro ao aplicar cupom:", err);
    res.status(500).json({ error: "Erro ao aplicar cupom" });
  }
};

