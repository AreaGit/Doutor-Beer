const nodemailer = require("nodemailer");

// transporter (mantive host/creds como você tinha)
const transporter = nodemailer.createTransport({
  host: "email-ssl.com.br",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  logger: true,
  debug: true
});

// Função para enviar e-mail
async function enviarEmail(to, subject, text, html) {
  const mailOptions = {
    from: `"Doutor Beer" <contato@doutorbeer.com.br>`,
    to,
    subject,
    text,
    html,
    // define envelope/return-path para alinhamento MAIL FROM <-> FROM
    envelope: {
      from: 'contato@doutorbeer.com.br', // MAIL FROM (Return-Path)
      to: to
    },
    headers: {
      "X-Mailer": "Nodemailer",
      "X-Priority": "3",
      "X-MSMail-Priority": "Normal",
      // Permite aos clientes e provedores auto-responder e facilitar unsubscribe
      "List-Unsubscribe": "<mailto:contato@doutorbeer.com.br?subject=unsubscribe>",
      "Precedence": "bulk"
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);
    console.log("Response:", info.response);
    console.log("MessageId:", info.messageId);

  } catch (error) {
    console.error("Erro ao enviar e-mail:", error && (error.response || error.message || error));
  }
}

module.exports = enviarEmail;