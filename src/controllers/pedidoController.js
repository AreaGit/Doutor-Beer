const Pedido = require("../models/Pedido");
const PedidoItem = require("../models/PedidoItem");
const Produto = require("../models/Produto");
const Usuario = require("../models/Usuario");
const enviarEmail = require("../utils/email");

// ==========================
// 🔹 Buscar pedido por ID
// ==========================
exports.getPedidoById = async (req, res) => {
  const usuarioId = req.session.user?.id;
  if (!usuarioId) return res.status(401).json({ error: "Usuário não logado" });

  const pedidoId = req.params.id;

  try {
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

    let subtotal = 0;
    const itensFormatados = pedido.Itens.map(i => {
      const precoUnit = i.precoUnitario ?? 0;
      const qtd = i.quantidade ?? 1;
      subtotal += precoUnit * qtd;

      const imagemProduto = Array.isArray(i.Produto?.imagem)
        ? i.Produto.imagem[0]
        : i.Produto?.imagem || "/images/no-image.png";

      return {
        nome: i.Produto?.nome ?? "Produto",
        quantidade: qtd,
        precoUnitario: precoUnit,
        imagem: imagemProduto,
        cor: i.cor || null,
        torneira: i.torneira || null,
        refil: i.refil || null
      };
    });

    res.json({
      id: pedido.id,
      status: pedido.status,
      total: pedido.total,              // valor final já com desconto + freteFinal
      subtotal,                         // soma dos itens
      frete: pedido.frete ?? 0,         // já vem 0 se frete grátis
      descontoCupom: pedido.descontoCupom ?? 0,
      cupom: pedido.cupom || null,
      metodoPagamento: pedido.formaPagamento || pedido.metodoPagamento || "Não informado",
      enderecoEntrega: pedido.enderecoEntrega ?? {},
      clienteNome: pedido.clienteNome,
      clienteEmail: pedido.clienteEmail,
      clienteCpf: pedido.clienteCpf,
      clienteCelular: pedido.clienteCelular,
      clienteTelefone: pedido.clienteTelefone,
      clienteDataNascimento: pedido.clienteDataNascimento,
      Itens: itensFormatados
    });

  } catch (err) {
    console.error("[PedidoController] Erro ao buscar pedido:", err);
    res.status(500).json({ error: "Erro ao buscar pedido" });
  }
};

// ==========================
// 🔹 Listar pedidos do usuário logado
// ==========================
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
      order: [["createdAt", "DESC"]]
    });

    const pedidosFormatados = pedidos.map(pedido => {
      let subtotal = 0;
      const itensFormatados = pedido.Itens.map(i => {
        const precoUnit = i.precoUnitario ?? 0;
        const qtd = i.quantidade ?? 1;
        subtotal += precoUnit * qtd;

        const imagemProduto = Array.isArray(i.Produto?.imagem)
          ? i.Produto.imagem[0]
          : i.Produto?.imagem || "/images/no-image.png";

        return {
          nome: i.Produto?.nome ?? "Produto",
          quantidade: qtd,
          precoUnitario: precoUnit,
          imagem: imagemProduto,
          cor: i.cor || null,
          torneira: i.torneira || null,
          refil: i.refil || null
        };
      });

      return {
        id: pedido.id,
        status: pedido.status,
        total: pedido.total,
        subtotal,
        frete: pedido.frete ?? 0,
        metodoPagamento: pedido.formaPagamento || pedido.metodoPagamento,
        enderecoEntrega: pedido.enderecoEntrega ?? {},
        Itens: itensFormatados,
        criadoEm: pedido.createdAt
      };
    });

    res.json(pedidosFormatados);
  } catch (err) {
    console.error("[PedidoController] Erro ao listar pedidos:", err);
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
};

// ==========================
// 🔹 Listar todos os pedidos (Admin)
// ==========================
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
          association: "Usuario",
          attributes: ["id", "nome", "email", "cpf", "celular", "telefone", "data_de_nascimento", "bairro", "cidade", "estado", "cep", "endereco", "numero"]
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

        const imagemProduto = Array.isArray(i.Produto?.imagem)
          ? i.Produto.imagem[0]
          : i.Produto?.imagem || "/images/no-image.png";

        return {
          nome: i.Produto?.nome ?? "Produto",
          quantidade: qtd,
          precoUnitario: precoUnit,
          imagem: imagemProduto,
          cor: i.cor || null,
          torneira: i.torneira || null,
          refil: i.refil || null
        };
      });

      return {
        id: pedido.id,
        usuario: pedido.Usuario
          ? {
            id: pedido.Usuario.id,
            nome: pedido.Usuario.nome,
            email: pedido.Usuario.email
          }
          : null,
        status: pedido.status,
        subtotal,
        total: pedido.total,
        frete: pedido.frete,
        metodoPagamento: pedido.formaPagamento || pedido.metodoPagamento,
        enderecoEntrega: typeof pedido.enderecoEntrega === "string" ? JSON.parse(pedido.enderecoEntrega) : (pedido.enderecoEntrega || {}),
        clienteNome: pedido.clienteNome || pedido.Usuario?.nome,
        clienteEmail: pedido.clienteEmail || pedido.Usuario?.email,
        clienteCpf: pedido.clienteCpf || pedido.Usuario?.cpf,
        clienteCelular: pedido.clienteCelular || pedido.Usuario?.celular,
        clienteTelefone: pedido.clienteTelefone || pedido.Usuario?.telefone,
        clienteDataNascimento: pedido.clienteDataNascimento || pedido.Usuario?.data_de_nascimento,
        Itens: itensFormatados,
        criadoEm: pedido.createdAt
      };
    });

    res.json(pedidosFormatados);
  } catch (err) {
    console.error("[PedidoController] Erro ao listar todos os pedidos:", err);
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
};

// ==========================
// 🔹 Atualizar status e enviar e-mail
// ==========================
exports.atualizarStatusPedido = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const pedido = await Pedido.findByPk(id, {
      include: [{ model: Usuario, as: "Usuario", attributes: ["nome", "email"] }]
    });

    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    pedido.status = status;
    await pedido.save();

    // 🔸 Envia e-mail de notificação
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

// ==========================
// 🔹 Retornar últimos N pedidos (Dashboard)
// ==========================
exports.getUltimosPedidos = async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 5; // padrão: 5 pedidos
    const pedidos = await Pedido.findAll({
      include: [
        {
          model: PedidoItem,
          as: "Itens",
          include: [{ model: Produto, as: "Produto" }]
        },
        {
          association: "Usuario",
          attributes: ["id", "nome", "email", "cpf", "celular", "telefone", "data_de_nascimento", "bairro", "cidade", "estado", "cep", "endereco", "numero"]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit: limite
    });

    const pedidosFormatados = pedidos.map(pedido => {
      let subtotal = 0;
      const itensFormatados = pedido.Itens.map(i => {
        const precoUnit = i.precoUnitario ?? 0;
        const qtd = i.quantidade ?? 1;
        subtotal += precoUnit * qtd;

        const imagemProduto = Array.isArray(i.Produto?.imagem)
          ? i.Produto.imagem[0]
          : i.Produto?.imagem || "/images/no-image.png";

        return {
          nome: i.Produto?.nome ?? "Produto",
          quantidade: qtd,
          precoUnitario: precoUnit,
          imagem: imagemProduto,
          cor: i.cor || null,
          torneira: i.torneira || null,
          refil: i.refil || null
        };
      });

      return {
        id: pedido.id,
        usuario: pedido.Usuario
          ? { id: pedido.Usuario.id, nome: pedido.Usuario.nome, email: pedido.Usuario.email }
          : null,
        status: pedido.status,
        subtotal,
        total: pedido.total,
        frete: pedido.frete,
        Itens: itensFormatados,
        criadoEm: pedido.createdAt
      };
    });

    res.json(pedidosFormatados);
  } catch (err) {
    console.error("[PedidoController] Erro ao carregar últimos pedidos:", err);
    res.status(500).json({ error: "Erro ao carregar últimos pedidos" });
  }
};

// ==========================
// 🔹 Faturamento dos últimos 7 dias (Dashboard)
// ==========================
exports.getFaturamentoSemana = async (req, res) => {
  try {
    const { Op } = require("sequelize");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 7 dias incluindo hoje (hoje + 6 dias anteriores)
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 6);

    // Busca pedidos dos últimos 7 dias
    const pedidos = await Pedido.findAll({
      where: {
        createdAt: {
          [Op.gte]: seteDiasAtras
        }
      },
      attributes: ["createdAt", "total"],
      raw: true
    });

    // Agrupa faturamento por dia (chave yyyy-mm-dd)
    const faturamentoPorDia = {};

    pedidos.forEach(p => {
      const d = new Date(p.createdAt);
      d.setHours(0, 0, 0, 0);
      const chave = d.toISOString().split("T")[0];

      const total = Number(p.total) || 0;
      faturamentoPorDia[chave] = (faturamentoPorDia[chave] || 0) + total;
    });

    // Monta os 7 dias (sempre 7 pontos, mesmo sem pedidos)
    const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const labels = [];
    const valores = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const chave = d.toISOString().split("T")[0];
      labels.push(nomesDias[d.getDay()]);
      valores.push(faturamentoPorDia[chave] || 0);
    }

    return res.json({ labels, valores });
  } catch (err) {
    console.error("[PedidoController] Erro ao carregar faturamento da semana:", err);
    return res.status(500).json({ error: "Erro ao carregar faturamento da semana" });
  }
};

// ==========================
// 🔹 Resumo (faturamento mês / pedidos hoje) - Dashboard
// ==========================
exports.getResumoDashboardAdmin = async (req, res) => {
  try {
    const { Op } = require("sequelize");

    const agora = new Date();

    // Início e fim do dia de hoje
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0, 0);
    const inicioAmanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 0, 0);

    // Início do mês atual e início do próximo mês
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
    const inicioProximoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1, 0, 0, 0, 0);

    // Quantidade de pedidos hoje (todos os status)
    const pedidosHoje = await Pedido.count({
      where: {
        createdAt: {
          [Op.gte]: inicioHoje,
          [Op.lt]: inicioAmanha
        }
      }
    });

    // Faturamento do mês (soma do total do pedido)
    const somaMes = await Pedido.sum("total", {
      where: {
        createdAt: {
          [Op.gte]: inicioMes,
          [Op.lt]: inicioProximoMes
        }
      }
    });

    const faturamentoMes = Number(somaMes) || 0;

    return res.json({
      faturamentoMes,
      pedidosHoje
    });
  } catch (err) {
    console.error("[PedidoController] Erro ao carregar resumo do dashboard (admin):", err);
    return res.status(500).json({ error: "Erro ao carregar resumo do dashboard" });
  }
};



