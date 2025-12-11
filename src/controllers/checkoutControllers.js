// backend/controllers/checkoutController.js

const { calcularFrete } = require("../services/melhorEnvio"); // função que você já criou
const Cart = require("./carrinhoControllers").Cart; // seu model de carrinho
const Carrinho = require("../models/carrinho");
const CarrinhoItem = require("../models/CarrinhoItem");
const Produto = require("../models/Produto");
const Pedido = require("../models/Pedido");
const PedidoItem = require("../models/PedidoItem");
const { cobrancaPixAsaas, obterCodPix, cobrancaBoletoAsaas, obterLinhaBoleto, cobrancaCartaoAsaas } = require("../services/asaas.services");
const Usuario = require("../models/Usuario");
const { enviarEmail } = require("../utils/email");

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
  try {
    const usuarioId = req.session.user?.id;
    const { cepDestino, produtos } = req.body;

    if (!cepDestino)
      return res.status(400).json({ error: "CEP de destino obrigatório" });

    let produtosParaEnvio = [];

    // 🛒 Se estiver logado, pega produtos do carrinho
    if (usuarioId && (!produtos || produtos.length === 0)) {
      produtosParaEnvio = await getCartItems(usuarioId);
    }
    // 🎯 Caso contrário, usa os produtos enviados pelo frontend (ex: página de produto)
    else if (produtos && produtos.length > 0) {
      produtosParaEnvio = produtos.map(p => ({
        id: p.id || p.produtoId || 0,
        name: p.nome || "Produto",
        quantity: p.quantidade || 1,
        width: p.width || 10,
        height: p.height || 10,
        length: p.length || 10,
        weight: p.weight || 0.3,
        insurance_value: p.preco || 0
      }));
    }

    if (!produtosParaEnvio.length)
      return res.status(400).json({ error: "Nenhum produto encontrado para calcular o frete." });

    // 🚚 Chama o serviço do Melhor Envio
    let opcoes = await calcularFrete({
      toPostalCode: cepDestino,
      products: produtosParaEnvio
    });

    if (!opcoes || opcoes.length === 0)
      return res.status(400).json({ error: "Nenhuma opção de frete disponível" });

    // ===== Verifica se devemos injetar a opção de Frete Grátis =====
    try {
      if (usuarioId) {
        // busca carrinho com itens para calcular subtotal
        const carrinho = await Carrinho.findOne({
          where: { usuarioId, status: "ABERTO" },
          include: [
            {
              model: CarrinhoItem,
              as: "itens",
              include: [{ model: Produto, as: "Produto" }]
            }
          ]
        });

        if (carrinho && Array.isArray(carrinho.itens)) {
          const subtotal = carrinho.itens.reduce((acc, it) => {
            // prefere precoFinal (campo do item) senão preço do produto
            const unit = Number(it.precoFinal ?? it.Produto?.preco ?? 0);
            return acc + unit * (Number(it.quantidade) || 0);
          }, 0);

          const CUPOM_FRETE = "DBFRETEGRATIS";
          const MINIMO_FRETE = 200;

          const freteGratisAplicavel =
            String(carrinho.cupomCodigo || "").toUpperCase() === CUPOM_FRETE &&
            subtotal >= MINIMO_FRETE;

          if (freteGratisAplicavel) {
            // cria uma opção minimalista de frete grátis compatível com o shape do MelhorEnvio
            const freteGratisOpc = {
              company: { name: "Nossa Loja", picture: "/images/label-free.png" },
              name: "Frete Grátis (Cupom)",
              price: 0,
              delivery_time: 0,
              service_code: "FRETE_GRATIS"
            };

            // coloca frete grátis no topo das opções
            opcoes = [freteGratisOpc, ...opcoes];
          }
        }
      }
    } catch (innerErr) {
      // não falha o cálculo de frete por essa verificação — apenas loga
      console.warn("[Checkout] Não foi possível verificar cupom de frete grátis:", innerErr.message || innerErr);
    }

    // devolve as opções (com frete grátis injetado apenas quando aplicável)
    return res.json(opcoes);

  } catch (err) {
    console.error("[Checkout] Erro ao calcular frete:", err.response?.data || err.message);
    res.status(500).json({ error: "Erro ao calcular frete" });
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

const itensPedido = itensCarrinho.map(item => {
  const produto = item.Produto || {};
  
  // 🔹 Base do preço (promocional ou normal)
  let precoFinal = produto.precoPromocional ?? produto.preco ?? 0;

  // 🔹 Adiciona valor extra da torneira
  if (item.torneira === "Tap Handle Prata" || item.torneira === "Tap Handle Preta") {
    precoFinal += 15;
  }

  // 🔹 Adiciona refil extra
  const refilQtd = Number(item.refil) || 1;
  if (refilQtd > 1) {
    precoFinal += (refilQtd - 1) * 40;
  }

  return {
    pedidoId: pedido.id,
    produtoId: item.produtoId,
    quantidade: item.quantidade,
    precoUnitario: precoFinal, // ✅ já vem com tudo incluído
    cor: item.cor || null,
    torneira: item.torneira || null,
    refil: item.refil || null
  };
});

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

exports.gerarPix = async (req, res) => {
  try {
    const { usuarioId, total, endereco, frete, itens } = req.body;

    if (!usuarioId || !total || !endereco || !frete || !itens)
      return res.status(400).json({ error: "Dados incompletos" });

    const cliente = await Usuario.findOne({ where: { id: usuarioId } });
    if (!cliente || !cliente.customer_asaas_id)
      return res.status(404).json({ error: "Cliente não encontrado no Asaas" });

    const externalReference = "pedido_temp_" + Date.now();

    //const pedidoRef = Date.now().toString(); // ou ID temporário
    const cobranca = await cobrancaPixAsaas({
      customer: cliente.customer_asaas_id,
      value: total,
      dueDate: new Date().toISOString().split("T")[0],
      externalReference: externalReference,
      endereco,
      frete,
      itens
    });

    // Obter QR Code PIX
    const qrCode = await obterCodPix(cobranca.id);

    return res.json({
      paymentId: cobranca.id, // alterado para alinhar com o frontend
      valor: cobranca.value,
      qrCodeImageUrl: qrCode?.encodedImage,
      qrCodeText: qrCode?.payload || qrCode?.payloadContent,
      externalReference
    });
  } catch (err) {
    console.error("Erro ao gerar PIX:", err.response?.data || err.message);
    res.status(500).json({ error: "Erro ao gerar cobrança PIX" });
  }
};

exports.gerarBoleto = async (req, res) => {
  try {
    const usuarioIdSessao = req.session.user?.id;
    const {
      usuarioId: usuarioIdFront,
      total,
      endereco,
      frete,
      itens
    } = req.body;

    if (!usuarioIdSessao && !usuarioIdFront)
      return res.status(401).json({ error: "Usuário não logado" });

    if (!endereco || !itens?.length)
      return res.status(400).json({ error: "Dados incompletos." });

    // Normaliza endereço
    const enderecoEntrega = {
      nome: endereco.nome || "",
      cep: endereco.cep || "",
      rua: endereco.rua || "",
      numero: endereco.numero || "",
      complemento: endereco.complemento || "",
      cidade: endereco.cidade || "",
      estado: endereco.estado || ""
    };

    // Calcula subtotal caso não venha do frontend
    const subtotalCalc = itens.reduce(
      (acc, item) => acc + Number(item.precoUnitario || 0) * Number(item.quantidade || 0),
      0
    );

    // === Criar cobrança no Asaas ===
    const cliente = await Usuario.findByPk(usuarioIdSessao || usuarioIdFront);
    if (!cliente || !cliente.customer_asaas_id)
      return res.status(404).json({ error: "Cliente não encontrado no ASAAS." });

    const externalReference = "pedido_" + Date.now();
    const cobranca = await cobrancaBoletoAsaas({
      customer: cliente.customer_asaas_id,
      value: total || subtotalCalc + Number(frete || 0),
      dueDate: new Date().toISOString().split("T")[0]
    });

    const linhaDigitavel = await obterLinhaBoleto(cobranca.id);

    // === Cria o pedido ===
    const pedido = await Pedido.create({
      usuarioId: usuarioIdSessao || usuarioIdFront,
      status: "AGUARDANDO PAGAMENTO",
      frete: Number(frete || 0),
      total: Number(total || subtotalCalc + Number(frete || 0)),
      enderecoEntrega,
      formaPagamento: "BOLETO",
      paymentId: cobranca.id,
      paymentStatus: cobranca.status || "PENDING",
      externalReference
    });

    // 🔒 Monta os itens garantindo produtoId válido e existente no banco
    const produtoIds = itens.map(i => i.produtoId || i.id);
    const produtosValidos = await Produto.findAll({ where: { id: produtoIds } });
    const idsValidos = produtosValidos.map(p => p.id);

    const pedidoItems = itens
      .filter(item => (item.produtoId || item.id) && idsValidos.includes(item.produtoId || item.id))
      .map(item => ({
        pedidoId: pedido.id,
        produtoId: item.produtoId || item.id,
        quantidade: Number(item.quantidade || 1),
        precoUnitario: Number(item.precoUnitario || 0),
        cor: item.cor || null
      }));

    if (!pedidoItems.length) {
      await pedido.destroy();
      return res.status(400).json({ error: "Nenhum produto válido no pedido" });
    }

    await PedidoItem.bulkCreate(pedidoItems);

    // Limpa carrinho do usuário
    await Carrinho.destroy({ where: { usuarioId: usuarioIdSessao } });

    // Envia e-mail
    try {
      await enviarEmail(
        cliente.email,
        "🎉 Pedido gerado com sucesso!",
        `
          <h2>Olá, ${cliente.nome}!</h2>
          <p>Seu pedido <strong>#${pedido.id}</strong> foi criado com sucesso e está aguardando o pagamento do boleto.</p>
          <p>Baixe seu boleto clicando no link abaixo:</p>
          <p><a href="${cobranca.bankSlipUrl}" target="_blank">Visualizar boleto</a></p>
          <p>Após o pagamento, o status do seu pedido será atualizado automaticamente.</p>
          <br>
          <p>Obrigado por comprar conosco! 💚</p>
        `
      );
    } catch (emailErr) {
      console.warn("Erro ao enviar e-mail:", emailErr.message);
    }

    // Retorno
    return res.status(200).json({
      sucesso: true,
      pedidoId: pedido.id,
      paymentId: cobranca.id,
      valor: cobranca.value,
      boletoUrl: cobranca.bankSlipUrl,
      linhaDigitavel: linhaDigitavel.identificationField,
      vencimento: cobranca.dueDate,
      status: cobranca.status
    });
  } catch (error) {
    console.error("Erro ao gerar boleto:", error.response?.data || error.message);
    return res.status(500).json({ error: "Erro ao gerar boleto." });
  }
};

exports.gerarCartao = async (req, res) => {
  try {
    const { usuarioId, total, endereco, frete, cartao } = req.body;

    console.log(req.body.parcelamento.parcelas, req.body.parcelamento.valorParcela);

    if (!usuarioId || !total || !endereco || !frete || !cartao) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const cliente = await Usuario.findByPk(usuarioId);
    if (!cliente || !cliente.customer_asaas_id) {
      return res.status(404).json({ error: "Cliente não encontrado no Asaas" });
    }

    const cobranca = await cobrancaCartaoAsaas({
      customer: cliente.customer_asaas_id,
      value: total,
      holderName: cartao.holderName,
      installmentCount: req.body.parcelamento.parcelas,
      installmentValue: Number( req.body.parcelamento.valorParcela ),
      number: cartao.number,
      expiryMonth: cartao.expiryMonth,
      expiryYear: cartao.expiryYear,
      ccv: cartao.cvv,
      email: cliente.email,
      cpfCnpj: cliente.cpf,
      postalCode: endereco.cep,
      addressNumber: endereco.numero,
      addressComplement: endereco.complemento,
      phone: cliente.celular
    });

    res.status(200).json({
      paymentId: cobranca.id,
      status: cobranca.status,
      value: cobranca.value
    });
  } catch (error) {
    console.error("Erro ao gerar pagamento cartão:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao processar pagamento com cartão" });
  }
};
