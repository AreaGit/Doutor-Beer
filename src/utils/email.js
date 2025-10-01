const nodemailer = require("nodemailer");

// Cria o transporter com SMTP (Gmail como exemplo)
const transporter = nodemailer.createTransport({
  host: "email-ssl.com.br",
  port: 465,
  secure: true, // true se usar SSL (porta 465)
  auth: {
    user: process.env.EMAIL_USER, // seu email (variável de ambiente)
    pass: process.env.EMAIL_PASS  // senha ou app password
  }
});

// Função para enviar e-mail
async function enviarEmail(to, subject, text, html) {
  const mailOptions = {
    from: `"Doutor Beer" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("E-mail enviado:", info.response);
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
  }
}

module.exports = enviarEmail;