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


// Listar todos os pedidos (acesso administrativo)
exports.getTodosPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      include: [
        {
          model: PedidoItem,
          as: "Itens",
          include: [{ model: Produto, as: "Produto" }]
        },
        {
          association: "Usuario", // inclui informações do usuário
          attributes: ["id", "nome", "email"]
        }
      ],
      order: [["createdAt", "DESC"]]
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
        usuario: pedido.Usuario ? {
          id: pedido.Usuario.id,
          nome: pedido.Usuario.nome,
          email: pedido.Usuario.email
        } : null,
        status: pedido.status,
        subtotal,
        total: pedido.total,
        frete: pedido.frete,
        metodoPagamento: pedido.metodoPagamento,
        enderecoEntrega: pedido.enderecoEntrega,
        itens: itensFormatados,
        criadoEm: pedido.createdAt
      };
    });

    res.json(pedidosFormatados);
  } catch (err) {
    console.error("[PedidoController] Erro ao listar todos os pedidos:", err);
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
};

const enviarEmail = require("../utils/email"); // importa seu email.js
const Usuario = require("../models/Usuario"); // precisa para pegar o email do usuário

// Atualizar status do pedido e enviar e-mail
exports.atualizarStatusPedido = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Busca o pedido com o usuário relacionado
    const pedido = await Pedido.findByPk(id, {
      include: [{ model: Usuario, as: "Usuario", attributes: ["nome", "email"] }]
    });

    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    // Atualiza o status no banco
    pedido.status = status;
    await pedido.save();

    // Se existir e-mail do usuário, envia notificação
    if (pedido.Usuario?.email) {
      const assunto = `Atualização do Pedido #${pedido.id} - ${status}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; background: #fafafa;">
          <h2 style="color: #c29e44;">🍺 Doutor Beer</h2>
          <p>Olá <strong>${pedido.Usuario.nome}</strong>,</p>
          <p>O status do seu pedido <strong>#${pedido.id}</strong> foi atualizado para:</p>
          <p style="font-size: 18px; font-weight: bold; color: #333;">${status}</p>
          <hr style="border: none; border-top: 1px solid #ddd;">
          <p>Você pode acompanhar o andamento do seu pedido acessando sua conta no site.</p>
          <p>Obrigado por comprar com a <strong>Doutor Beer</strong>! 🍻</p>
          <br>
          <p style="font-size: 12px; color: #888;">Este é um e-mail automático. Por favor, não responda.</p>
        </div>
      `;

      await enviarEmail(pedido.Usuario.email, assunto, "", html);
      console.log(`📩 E-mail enviado para ${pedido.Usuario.email}`);
    }

    res.json({ success: true, status: pedido.status });

  } catch (err) {
    console.error("[PedidoController] Erro ao atualizar status:", err);
    res.status(500).json({ error: "Erro ao atualizar status do pedido" });
  }
};
