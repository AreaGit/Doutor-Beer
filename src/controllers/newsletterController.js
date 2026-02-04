const Newsletter = require("../models/Newsletter");
const Usuario = require("../models/Usuario");
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

    const usuario = await Usuario.findOne({ where: { email: email } })

    const assunto = "Um brinde à sua chegada 🍻 | Doutor Beer";

      const corpoTexto = `
  Olá, ${usuario.nome}!

  Que alegria ter você com a gente 🍺

  Seu cadastro na newsletter da Doutor Beer foi realizado com sucesso.
  A partir de agora, você vai receber novidades, lançamentos, promoções especiais
  e conteúdos selecionados com carinho para quem ama uma boa cerveja.

  Fique de olho na sua caixa de entrada — prometemos enviar apenas o que realmente vale a pena.

  Obrigado por fazer parte da nossa comunidade.
  Saúde! 🍻
  Equipe Doutor Beer
  `.trim()

    const corpoHtml = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <title>${assunto}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:30px 15px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,0.08);">
          
          <tr>
            <td align="center" style="background:#F9B000;padding:18px 20px;">
              <h1 style="margin:0;font-size:20px;color:#4d1818;font-weight:700;">
                Doutor Beer
              </h1>
              <p style="margin:4px 0 0;font-size:12px;color:#4d1818;opacity:.9;">
                Seja muito bem-vindo 🍻
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 24px 10px 24px;">
              <p style="margin:0 0 10px 0;font-size:15px;color:#333333;">
                Olá, <strong>${usuario.nome}</strong>!
              </p>

              <p style="margin:0 0 14px 0;font-size:14px;color:#555555;line-height:1.6;">
                É um prazer ter você com a gente!
              </p>

              <p style="margin:0 0 14px 0;font-size:14px;color:#555555;line-height:1.6;">
                Seu cadastro na <strong>newsletter da Doutor Beer</strong> foi realizado com sucesso.
                A partir de agora, você passa a fazer parte da nossa comunidade.
              </p>

              <p style="margin:0 0 18px 0;font-size:14px;color:#555555;line-height:1.6;">
                Por aqui você vai receber:
              </p>

              <ul style="margin:0 0 18px 18px;padding:0;font-size:14px;color:#555555;line-height:1.6;">
                <li>Novidades e lançamentos 🍺</li>
                <li>Promoções exclusivas 🎉</li>
                <li>Dicas, conteúdos e experiências especiais</li>
              </ul>

              <p style="margin:0 0 18px 0;font-size:14px;color:#555555;line-height:1.6;">
                Fique de olho na sua caixa de entrada — prometemos enviar apenas o que realmente vale a pena.
              </p>

              <p style="margin:0;text-align:center;font-size:14px;color:#4d1818;font-weight:bold;">
                Obrigado por escolher a Doutor Beer 💛
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 24px 20px 24px;border-top:1px solid #eeeeee;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#999999;">
                Este é um e-mail automático, mas foi enviado com carinho.
              </p>
              <p style="margin:0;font-size:11px;color:#b3b3b3;">
                © ${new Date().getFullYear()} Doutor Beer. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()


    await enviarEmail(email, assunto, corpoTexto, corpoHtml);

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
