// backend/controllers/checkoutController.js

const { calcularFrete } = require("../services/melhorEnvio"); // função que você já criou
const Cart = require("./carrinhoControllers").Cart; // seu model de carrinho
const Produto = require("../models/Produto");
const Pedido = require("../models/Pedido");
const PedidoItem = require("../models/PedidoItem");

// ================== Função auxiliar para pegar itens do carrinho ==================
async function getCartItems(usuarioId) {
  if (!usuarioId) return [];

  try {
    const items = await Cart.findAll({
      where: { usuarioId },
      include: [{ model: Produto, as: "Produto" }]
    });

    // Normaliza os itens para enviar ao Melhor Envio
    return items.map(item => ({
      id: item.produtoId,
      name: item.Produto?.nome || "Produto",
      quantity: item.quantidade,
      width: item.Produto?.width || 10,       // cm
      height: item.Produto?.height || 10,     // cm
      length: item.Produto?.length || 10,     // cm
      weight: item.Produto?.weight || 0.3,    // kg
      insurance_value: item.Produto?.preco || 0
    }));
  } catch (err) {
    console.error("[Checkout] Erro ao carregar carrinho:", err);
    return [];
  }
}

// ================== Calcular Frete ==================
exports.calcularFreteHandler = async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  const { cepDestino } = req.body;
  if (!cepDestino) return res.status(400).json({ error: "CEP de destino obrigatório" });

  try {
    // Pega itens do carrinho
    const produtos = await getCartItems(usuarioId);
    if (produtos.length === 0) return res.status(400).json({ error: "Carrinho vazio" });

    // Chama o Melhor Envio
    const opcoes = await calcularFrete({ toPostalCode: cepDestino, products: produtos });

    if (!opcoes || opcoes.length === 0) {
      return res.status(400).json({ error: "Nenhuma opção de frete disponível" });
    }

    // Retorna todas as opções para o frontend escolher
    res.json(opcoes);

  } catch (err) {
    console.error("[Checkout] Erro ao calcular frete:", err);
    res.status(500).json({ error: "Falha ao calcular frete" });
  }
};

// ================== Confirmar Pedido ==================

exports.confirmarPagamentoHandler = async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  const { enderecoEntrega, metodoPagamento, cupom, frete } = req.body;

  try {
    // 1️⃣ Pega itens do carrinho
    const itensCarrinho = await Cart.findAll({
      where: { usuarioId },
      include: [{ model: Produto, as: "Produto" }]
    });

    if (!itensCarrinho.length) {
      return res.status(400).json({ error: "Carrinho vazio" });
    }

    // 2️⃣ Calcula total (produtos + frete)
    let total = 0;
    itensCarrinho.forEach(item => {
      total += item.quantidade * (item.Produto.precoPromocional || item.Produto.preco);
    });
    total += frete || 0;

    // 3️⃣ Cria o pedido
    const pedido = await Pedido.create({
      usuarioId,
      status: "Pago", // ou "Pendente"
      total,
      frete: frete || 0, // <-- aqui salvamos o frete
      enderecoEntrega: JSON.stringify(enderecoEntrega),
      metodoPagamento,
      cupom
    });

    // 4️⃣ Cria os itens do pedido
    const itensPedido = itensCarrinho.map(item => ({
      pedidoId: pedido.id,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: item.Produto.precoPromocional || item.Produto.preco
    }));

    await PedidoItem.bulkCreate(itensPedido);

    // 5️⃣ Limpa carrinho
    await Cart.destroy({ where: { usuarioId } });

    // 6️⃣ Retorna sucesso
    return res.json({
      sucesso: true,
      message: "Pedido confirmado com sucesso!",
      pedidoId: pedido.id,
      codigo: `PED${pedido.id.toString().padStart(6, '0')}`
    });

  } catch (err) {
    console.error("[Checkout] Erro ao confirmar pagamento:", err);
    return res.status(500).json({ error: "Falha ao processar pedido" });
  }
};
