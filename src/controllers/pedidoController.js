const Pedido = require("../models/Pedido");
const PedidoItem = require("../models/PedidoItem");
const Produto = require("../models/Produto");

exports.getPedidoById = async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  const pedidoId = req.params.id;

  try {
    // Busca pedido com itens e produtos relacionados
    const pedido = await Pedido.findOne({
      where: { id: pedidoId, usuarioId },
      include: [
        {
          model: PedidoItem,
          as: "Itens",
          include: [{ model: Produto, as: "Produto" }]
        }
      ]
    });

    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    // Calcula subtotal somando todos os itens
    let subtotal = 0;
    const itensFormatados = pedido.Itens.map(i => {
      const precoUnit = i.precoUnitario ?? 0;
      const qtd = i.quantidade ?? 1;
      subtotal += precoUnit * qtd;

      return {
        nome: i.Produto?.nome ?? "Produto",
        quantidade: qtd,
        precoUnitario: precoUnit,
        imagem: i.Produto?.imagem ?? "/images/no-image.png"
      };
    });

    res.json({
      id: pedido.id,
      status: pedido.status,
      total: pedido.total,
      subtotal,
      frete: pedido.frete ?? 0,
      metodoPagamento: pedido.metodoPagamento,
      enderecoEntrega: pedido.enderecoEntrega ?? {},
      Itens: itensFormatados
    });

  } catch (err) {
    console.error("[PedidoController] Erro ao buscar pedido:", err);
    res.status(500).json({ error: "Erro ao buscar pedido" });
  }
};

// Listar Pedidos do usuário Logado

exports.getPedidosUsuario = async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  try {
    const pedidos = await Pedido.findAll({
      where: { usuarioId },
      include: [
        {
          model: PedidoItem,
          as: "Itens",
          include: [{ model: Produto, as: "Produto" }]
        }
      ],
      order: [["createdAt", "DESC"]] // mais recentes primeiro
    });

    const pedidosFormatados = pedidos.map(pedido => {
      let subtotal = 0;
      const itensFormatados = pedido.Itens.map(i => {
        const precoUnit = i.precoUnitario ?? 0;
        const qtd = i.quantidade ?? 1;
        subtotal += precoUnit * qtd;

        return {
          nome: i.Produto?.nome ?? "Produto",
          quantidade: qtd,
          precoUnitario: precoUnit,
          imagem: i.Produto?.imagem ?? "/images/no-image.png"
        };
      });

      return {
        id: pedido.id,
        status: pedido.status,
        total: pedido.total,
        subtotal,
        frete: pedido.frete ?? 0,
        metodoPagamento: pedido.metodoPagamento,
        enderecoEntrega: pedido.enderecoEntrega ?? {},
        itens: itensFormatados,
        criadoEm: pedido.createdAt
      };
    });

    res.json(pedidosFormatados);

  } catch (err) {
    console.error("[PedidoController] Erro ao listar pedidos:", err);
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
};