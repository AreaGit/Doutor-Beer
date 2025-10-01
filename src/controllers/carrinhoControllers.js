const Cart = require("../models/carrinho");
const Produto = require("../models/Produto");
const { v4: uuidv4 } = require("uuid");

// ================== Adicionar produto ==================
exports.addToCart = async (req, res) => {
  const usuarioId = req.session.user?.id;
  let guestId = req.cookies.guestId; // pega cookie do guest

  // Se não logado e sem guestId, cria um
  if (!usuarioId && !guestId) {
    guestId = uuidv4();
    res.cookie("guestId", guestId, { maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 dias
  }

  const { produtoId, quantidade } = req.body;
  const qtd = Number(quantidade) || 1;

  // Procura item existente
  let item = await Cart.findOne({
    where: usuarioId
      ? { usuarioId, produtoId }
      : { guestId, produtoId }
  });

  if (item) {
    item.quantidade += qtd;
    await item.save();
  } else {
    item = await Cart.create({
      usuarioId: usuarioId || null,
      guestId: guestId || null,
      produtoId,
      quantidade: qtd
    });
  }

  res.json({ message: "Produto adicionado ao carrinho", item, guestId });
};

// ================== Remover produto ==================
exports.removeFromCart = async (req, res) => {
  const usuarioId = req.session.user?.id;
  const guestId = req.cookies.guestId;
  const { produtoId } = req.body;

  await Cart.destroy({
    where: usuarioId
      ? { usuarioId, produtoId }
      : { guestId, produtoId }
  });

  res.json({ message: "Produto removido do carrinho" });
};

// ================== Atualizar quantidade ==================
exports.updateCartItem = async (req, res) => {
  const usuarioId = req.session.user?.id;
  const guestId = req.cookies.guestId;
  const { produtoId, quantidade } = req.body;

  const item = await Cart.findOne({
    where: usuarioId
      ? { usuarioId, produtoId }
      : { guestId, produtoId }
  });

  if (item) {
    item.quantidade = quantidade;
    await item.save();
    res.json({ message: "Quantidade atualizada", item });
  } else {
    res.status(404).json({ message: "Item não encontrado" });
  }
};

// ================== Pegar carrinho ==================
exports.getCart = async (req, res) => {
  const usuarioId = req.session.user?.id;
  const guestId = req.cookies.guestId;

  const itens = await Cart.findAll({
    where: usuarioId ? { usuarioId } : { guestId },
    include: { model: Produto, as: "Produto" }
  });

  res.json(itens);
};
