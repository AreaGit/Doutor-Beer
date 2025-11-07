const Cart = require("../models/carrinho");
const Produto = require("../models/Produto");

/* ================== Utilitário ================== */
function formatCartItem(item) {
  return {
    id: item.produtoId,
    nome: item.Produto?.nome || "",
    imagem: Array.isArray(item.Produto?.imagem)
      ? item.Produto.imagem[0]
      : item.Produto?.imagem || "",
    preco: item.precoFinal || item.Produto?.preco || 0,
    precoPromocional: item.Produto?.precoPromocional || null,
    quantidade: item.quantidade,
    cor: item.cor || "padrao",
    torneira: item.torneira || null,
    refil: item.refil || null
  };
}

/* ================== Pegar carrinho ================== */
exports.getCart = async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.json([]);

  try {
    const items = await Cart.findAll({
      where: { usuarioId },
      include: [{ model: Produto, as: "Produto" }]
    });

    res.json(items.map(formatCartItem));
  } catch (err) {
    console.error("[Carrinho] Erro ao carregar carrinho:", err);
    res.status(500).json({ error: "Erro ao carregar carrinho" });
  }
};

/* ================== Adicionar produto ================== */
exports.addToCart = async (req, res) => {
  const { produtoId, quantidade = 1, cor, torneira, refil } = req.body;
  const usuarioId = req.session.user?.id;
  const corFinal = cor && cor.trim() !== "" ? cor : "padrao";
  const torneiraFinal = torneira && torneira.trim() !== "" ? torneira : "padrao";
  const refilFinal = refil ?? null;

  if (!usuarioId)
    return res.status(401).json({ error: "Usuário não logado" });
  if (!produtoId || quantidade <= 0)
    return res.status(400).json({ error: "Produto e quantidade válidos são obrigatórios" });

  try {
    const produto = await Produto.findByPk(produtoId);
    if (!produto)
      return res.status(404).json({ error: "Produto não encontrado" });

    // 🧮 CALCULA O PREÇO FINAL COM BASE NAS VARIAÇÕES
    let precoBase = produto.precoPromocional ?? produto.preco;
    let precoFinal = precoBase;

    // 🔹 Torneira extra
    if (torneiraFinal === "Tap Handle Prata" || torneiraFinal === "Tap Handle Preta") {
      precoFinal += 15;
    }

    // 🔹 Refis extras
    if (refilFinal && Number(refilFinal) > 1) {
      precoFinal += (refilFinal - 1) * 40;
    }

    // 🔹 Tenta localizar item existente com as mesmas variações
    let cartItem = await Cart.findOne({
      where: { usuarioId, produtoId, cor: corFinal, torneira: torneiraFinal, refil: refilFinal },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (cartItem) {
      cartItem.quantidade += quantidade;
      cartItem.precoFinal = precoFinal; // atualiza caso tenha mudado
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        usuarioId,
        produtoId,
        quantidade,
        cor: corFinal,
        torneira: torneiraFinal,
        refil: refilFinal,
        precoFinal
      });
      cartItem = await Cart.findByPk(cartItem.id, {
        include: [{ model: Produto, as: "Produto" }]
      });
    }

    res.json(formatCartItem(cartItem));
  } catch (err) {
    console.error("[Carrinho] Erro ao adicionar produto:", err);
    res.status(500).json({ error: "Erro ao adicionar produto ao carrinho" });
  }
};

/* ================== Atualizar quantidade ================== */
exports.updateCart = async (req, res) => {
  const { produtoId, quantidade, cor, torneira, refil } = req.body;
  const usuarioId = req.session.user?.id;
  const corFinal = cor && cor.trim() !== "" ? cor : "padrao";
  const torneiraFinal = torneira && torneira.trim() !== "" ? torneira : "padrao";
  const refilFinal = refil ?? null;

  if (!usuarioId)
    return res.status(401).json({ error: "Usuário não logado" });
  if (!produtoId || quantidade <= 0)
    return res.status(400).json({ error: "Produto e quantidade válidos são obrigatórios" });

  try {
    const cartItem = await Cart.findOne({
      where: { usuarioId, produtoId, cor: corFinal, torneira: torneiraFinal, refil: refilFinal },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!cartItem)
      return res.status(404).json({ error: "Produto não encontrado no carrinho" });

    // Recalcula o preçoFinal se algo mudou
    let precoBase = cartItem.Produto.precoPromocional ?? cartItem.Produto.preco;
    let precoFinal = precoBase;

    if (torneiraFinal === "Tap Handle Prata" || torneiraFinal === "Tap Handle Preta") {
      precoFinal += 15;
    }
    if (refilFinal && Number(refilFinal) > 1) {
      precoFinal += (refilFinal - 1) * 40;
    }

    cartItem.quantidade = quantidade;
    cartItem.precoFinal = precoFinal;
    await cartItem.save();

    res.json(formatCartItem(cartItem));
  } catch (err) {
    console.error("[Carrinho] Erro ao atualizar quantidade:", err);
    res.status(500).json({ error: "Erro ao atualizar carrinho" });
  }
};

/* ================== Remover produto ================== */
exports.removeFromCart = async (req, res) => {
  const { produtoId, cor, torneira, refil } = req.body;
  const usuarioId = req.session.user?.id;

  // 🟡 Mantém a mesma lógica usada na cor:
  const corFinal = cor && cor.trim() !== "" ? cor : "padrao";
  const torneiraFinal = torneira && torneira.trim() !== "" ? torneira : "padrao";
  const refilFinal = refil ?? null;

  if (!usuarioId)
    return res.status(401).json({ error: "Usuário não logado" });

  if (!produtoId)
    return res.status(400).json({ error: "ProdutoId é obrigatório" });

  try {
    // 🔹 Busca combinando cor e torneira (ambas podem ser "padrao")
    const cartItem = await Cart.findOne({
      where: { usuarioId, produtoId, cor: corFinal, torneira: torneiraFinal, refil: refilFinal }
    });

    if (!cartItem) {
      console.log("[Carrinho] Item não encontrado no banco:", {
        usuarioId,
        produtoId,
        cor: corFinal,
        torneira: torneiraFinal
      });
      return res.status(404).json({ error: "Item não encontrado no carrinho" });
    }

    await cartItem.destroy();

    console.log("[Carrinho] Item removido com sucesso:", {
      usuarioId,
      produtoId,
      cor: corFinal,
      torneira: torneiraFinal
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[Carrinho] Erro ao remover produto:", err);
    res.status(500).json({ error: "Erro ao remover produto do carrinho" });
  }
};