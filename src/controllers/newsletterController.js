const Newsletter = require("../models/Newsletter");
const enviarEmail = require("../utils/email");

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

exports.cadastrar = async (req, res) => {
  try {
    const { email, origem = "home" } = req.body || {};

    if (!email || !validarEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "E-mail inválido. Confira e tente novamente 😉",
      });
    }

    // normalizar
    const emailNormalizado = email.trim().toLowerCase();

    // Verifica se já existe
    const existente = await Newsletter.findOne({ where: { email: emailNormalizado } });

    if (existente) {
      return res.status(200).json({
        success: true,
        message: "Esse e-mail já está cadastrado na nossa newsletter 😄",
      });
    }

    await Newsletter.create({
      email: emailNormalizado,
      origem,
      confirmado: true, // se quiser double opt-in, pode vir como false e só ativar depois
    });

    return res.status(201).json({
      success: true,
      message: "Cadastro realizado com sucesso! Fique de olho nas novidades 🍻",
    });
  } catch (error) {
    console.error("[Newsletter] Erro ao cadastrar:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao cadastrar. Tente novamente em instantes 🙏",
    });
  }
};


// (Opcional) Listar inscritos (pode proteger por admin depois)
exports.listar = async (req, res) => {
  try {
    // Exemplo simples – você pode colocar validação de admin aqui
    const inscritos = await Newsletter.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json(inscritos);
  } catch (error) {
    console.error("[Newsletter] Erro ao listar inscritos:", error);
    res.status(500).json({ message: "Erro ao listar inscritos" });
  }
};

// ==========================
// 🔹 Enviar email em massa para newsletter
// ==========================
exports.enviarEmailMassa = async (req, res) => {
  try {
    const { assunto, conteudoHtml, conteudoTexto } = req.body;

    if (!assunto || !conteudoHtml) {
      return res.status(400).json({
        success: false,
        message: "Assunto e conteúdo HTML são obrigatórios"
      });
    }

    // Busca todos os emails confirmados da newsletter
    const inscritos = await Newsletter.findAll({
      where: { confirmado: true },
      attributes: ["email"]
    });

    if (!inscritos || inscritos.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nenhum inscrito encontrado na newsletter"
      });
    }

    const emails = inscritos.map(i => i.email);
    let enviados = 0;
    let falhas = 0;
    const erros = [];

    // Envia email para cada destinatário
    for (const email of emails) {
      try {
        await enviarEmail(
          email,
          assunto,
          conteudoTexto || "",
          conteudoHtml
        );
        enviados++;
        
        // Pequeno delay para não sobrecarregar o servidor de email
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        falhas++;
        erros.push({ email, erro: err.message });
        console.error(`[Newsletter] Erro ao enviar para ${email}:`, err);
      }
    }

    res.json({
      success: true,
      message: `Emails enviados: ${enviados} de ${emails.length}`,
      total: emails.length,
      enviados,
      falhas,
      erros: erros.length > 0 ? erros : undefined
    });
  } catch (error) {
    console.error("[Newsletter] Erro ao enviar emails em massa:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao enviar emails em massa"
    });
  }
};
