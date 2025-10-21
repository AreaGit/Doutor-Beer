const nodemailer = require("nodemailer");

(async () => {
  const transporter = nodemailer.createTransport({
    host: "mail.doutorbeer.com.br", // teste com este
    port: 465,
    secure: true,
    auth: {
      user: "contato@doutorbeer.com.br",
      pass: "Z1mb@bue1"
    }
  });

  transporter.verify((error, success) => {
    if (error) console.error("Erro de conexão SMTP:", error);
    else console.log("SMTP conectado com sucesso!");
  });
})();