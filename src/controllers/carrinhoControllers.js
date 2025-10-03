const { v4: uuidv4 } = require("uuid");
const Cart = require("../models/carrinho");
const Produto = require("../models/Produto");

// ================== CONSTANTES ==================
const VALID_COUPONS = {
  "DESCONTO10": 0.10,
  "FRETEGRATIS": 0.15,
  "JORGERAMOS69": 0.69,
  "DOUTOR10": 0.10,
  "BEER20": 0.20
};

// ================== UTILS ==================
function formatCartItem(item) {
  const baseItem = {
    id: item.produtoId,
    nome: item.Produto?.nome || "",
    imagem: Array.isArray(item.Produto?.imagem) ? item.Produto.imagem[0] : item.Produto?.imagem || "",
    preco: item.Produto?.preco || 0,
    precoPromocional: item.Produto?.precoPromocional || null,
    quantidade: item.quantidade,
    cupom: item.cupom || null
  };

  // Aplicar desconto se cupom válido
  if (item.cupom && VALID_COUPONS[item.cupom]) {
    const desconto = VALID_COUPONS[item.cupom];
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
}

// ================== Criar guestId ==================
exports.createGuestCart = async (req, res) => {
  try {
    // Gera um guestId único
    const guestId = uuidv4();

    // Apenas retorna o guestId, não cria registro vazio
    // O registro será criado quando adicionar o primeiro produto
    
    console.log("[Carrinho] Novo guestId criado:", guestId);
    res.json({ guestId });
  } catch (err) {
    console.error("[Carrinho] Erro ao criar guestId:", err);
    res.status(500).json({ error: "Erro ao criar guestId" });
  }
};

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

    const formatted = items.map(formatCartItem);
    console.log(`[Carrinho] Carrinho carregado: ${formatted.length} itens`);
    res.json(formatted);
  } catch (err) {
    console.error("[Carrinho] Erro ao carregar carrinho:", err);
    res.status(500).json({ error: "Erro ao carregar carrinho" });
  }
};

// ================== Adicionar produto ==================
exports.addToCart = async (req, res) => {
  const { produtoId, quantidade = 1 } = req.body;
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  // Validações
  if (!usuarioId && !guestId) {
    return res.status(400).json({ error: "Usuário ou guestId necessário" });
  }
  
  if (!produtoId || quantidade <= 0) {
    return res.status(400).json({ error: "Produto e quantidade válida são obrigatórios" });
  }

  try {
    // Verificar se produto existe
    const produto = await Produto.findByPk(produtoId);
    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    let cartItem = await Cart.findOne({
      where: usuarioId ? { usuarioId, produtoId } : { guestId, produtoId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (cartItem) {
      cartItem.quantidade += quantidade;
      await cartItem.save();
      console.log(`[Carrinho] Produto ${produtoId} atualizado: quantidade ${cartItem.quantidade}`);
    } else {
      cartItem = await Cart.create({
        usuarioId: usuarioId || null,
        guestId: usuarioId ? null : guestId,
        produtoId,
        quantidade
      });

      // Recarregar com include
      cartItem = await Cart.findByPk(cartItem.id, {
        include: [{ model: Produto, as: "Produto" }]
      });
      console.log(`[Carrinho] Produto ${produtoId} adicionado ao carrinho`);
    }

    res.json(formatCartItem(cartItem));
  } catch (err) {
    console.error("[Carrinho] Erro ao adicionar produto:", err);
    res.status(500).json({ error: "Erro ao adicionar produto ao carrinho" });
  }
};

// ================== Atualizar quantidade ==================
exports.updateCart = async (req, res) => {
  const { produtoId, quantidade } = req.body;
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  if (!usuarioId && !guestId) {
    return res.status(400).json({ error: "Usuário ou guestId necessário" });
  }

  if (!produtoId || quantidade <= 0) {
    return res.status(400).json({ error: "Produto e quantidade válida são obrigatórios" });
  }

  try {
    let cartItem = await Cart.findOne({
      where: usuarioId ? { usuarioId, produtoId } : { guestId, produtoId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Produto não encontrado no carrinho" });
    }

    cartItem.quantidade = quantidade;
    await cartItem.save();

    console.log(`[Carrinho] Produto ${produtoId} atualizado: quantidade ${quantidade}`);
    res.json(formatCartItem(cartItem));
  } catch (err) {
    console.error("[Carrinho] Erro ao atualizar quantidade:", err);
    res.status(500).json({ error: "Erro ao atualizar carrinho" });
  }
};

// ================== Remover produto ==================
exports.removeFromCart = async (req, res) => {
  const { produtoId } = req.body;
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  if (!usuarioId && !guestId) {
    return res.status(400).json({ error: "Usuário ou guestId necessário" });
  }

  try {
    const cartItem = await Cart.findOne({
      where: usuarioId ? { usuarioId, produtoId } : { guestId, produtoId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Produto não encontrado no carrinho" });
    }

    await cartItem.destroy();
    console.log(`[Carrinho] Produto ${produtoId} removido do carrinho`);

    res.json({ success: true, produtoId });
  } catch (err) {
    console.error("[Carrinho] Erro ao remover produto:", err);
    res.status(500).json({ error: "Erro ao remover produto do carrinho" });
  }
};

// ================== APLICAR CUPOM ==================
exports.applyCoupon = async (req, res) => {
  const { codigo } = req.body;
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  if (!usuarioId && !guestId) {
    return res.status(400).json({ error: "Usuário ou guestId necessário" });
  }

  const cupomUpper = codigo?.toUpperCase().trim();
  const desconto = VALID_COUPONS[cupomUpper];

  if (!desconto) {
    return res.status(400).json({ error: "Cupom inválido ou expirado" });
  }

  try {
    // Aplicar cupom a todos os itens do carrinho
    await Cart.update(
      { cupom: cupomUpper },
      { 
        where: usuarioId ? { usuarioId } : { guestId } 
      }
    );

    console.log(`[Carrinho] Cupom aplicado: ${cupomUpper} (${desconto * 100}% off)`);
    
    res.json({ 
      success: true, 
      codigo: cupomUpper, 
      desconto,
      message: `Cupom aplicado! ${desconto * 100}% de desconto`
    });

  } catch (err) {
    console.error("[Carrinho] Erro ao aplicar cupom:", err);
    res.status(500).json({ error: "Erro ao aplicar cupom" });
  }
};

// ================== REMOVER CUPOM ==================
exports.removeCoupon = async (req, res) => {
  const usuarioId = req.session.user?.id || null;
  const guestId = req.headers["x-guest-id"] || null;

  if (!usuarioId && !guestId) {
    return res.status(400).json({ error: "Usuário ou guestId necessário" });
  }

  try {
    // Remover cupom de todos os itens do carrinho
    await Cart.update(
      { cupom: null },
      { 
        where: usuarioId ? { usuarioId } : { guestId } 
      }
    );

    console.log(`[Carrinho] Cupom removido`);
    
    res.json({ 
      success: true, 
      message: "Cupom removido com sucesso" 
    });

  } catch (err) {
    console.error("[Carrinho] Erro ao remover cupom:", err);
    res.status(500).json({ error: "Erro ao remover cupom" });
  }
};

// ================== MESCLAR CARRINHO GUEST → USUÁRIO ==================
exports.mergeGuestCart = async (req, res) => {
  const usuarioId = req.session.user?.id;
  const guestId = req.headers["x-guest-id"];

  if (!usuarioId) {
    return res.status(401).json({ error: "Usuário não logado" });
  }

  if (!guestId) {
    return res.status(400).json({ error: "GuestId necessário para mesclagem" });
  }

  try {
    console.log(`[Carrinho] Mesclando carrinho: guest ${guestId} → user ${usuarioId}`);

    // Buscar itens do guest
    const guestItems = await Cart.findAll({
      where: { guestId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (guestItems.length === 0) {
      return res.json({ message: "Nenhum item para mesclar", merged: 0 });
    }

    let mergedCount = 0;

    // Para cada item do guest, mesclar com o usuário
    for (const guestItem of guestItems) {
      try {
        // Verificar se o produto ainda existe
        const produto = await Produto.findByPk(guestItem.produtoId);
        if (!produto) {
          console.log(`[Carrinho] Produto ${guestItem.produtoId} não existe mais, ignorando`);
          await guestItem.destroy();
          continue;
        }

        // Verificar se o usuário já tem este produto no carrinho
        const userItem = await Cart.findOne({
          where: { usuarioId, produtoId: guestItem.produtoId }
        });

        if (userItem) {
          // Somar quantidades e manter cupom se existir
          userItem.quantidade += guestItem.quantidade;
          // Preservar cupom do usuário se já tiver, senão usar do guest
          if (!userItem.cupom && guestItem.cupom) {
            userItem.cupom = guestItem.cupom;
          }
          await userItem.save();
          
          // Deletar item do guest
          await guestItem.destroy();
        } else {
          // Mover item do guest para o usuário
          guestItem.usuarioId = usuarioId;
          guestItem.guestId = null;
          await guestItem.save();
        }
        
        mergedCount++;
      } catch (itemError) {
        console.error(`[Carrinho] Erro ao mesclar item ${guestItem.produtoId}:`, itemError);
      }
    }

    console.log(`[Carrinho] Mesclagem concluída: ${mergedCount} itens`);
    res.json({ 
      success: true, 
      message: `Carrinho mesclado com sucesso`, 
      merged: mergedCount 
    });

  } catch (err) {
    console.error("[Carrinho] Erro na mesclagem:", err);
    res.status(500).json({ error: "Erro ao mesclar carrinho" });
  }
};