const cron = require("node-cron");
const Pedido = require("../models/Pedido");
const User = require("../models/Usuario");
const { consultarCobranca } = require("../services/asaas.services");
const nodemailer = require("nodemailer");
require('dotenv').config({ path: "../../.env" });

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


cron.schedule("*/1 * * * *", async() => {
    console.log("⏳ Verificando status dos boletos pendentes...");

    try {
      const boletosPendentes = await Pedido.findAll({
        where: { status: "AGUARDANDO PAGAMENTO", formaPagamento: "BOLETO" }
      });
  
      if (!boletosPendentes.length) {
        console.log("Nenhum boleto pendente encontrado.");
        return;
      }
  
      for (const pedido of boletosPendentes) {
        try {
          const cobranca = await consultarCobranca(pedido.paymentId);
          const statusAsaas = cobranca.status?.toUpperCase();
  
          if (["RECEIVED", "CONFIRMED"].includes(statusAsaas)) {
            await pedido.update({
              status: "PAGO",
            });
  
            const usuario = await User.findByPk(pedido.usuarioId);
  
            if (usuario && usuario.email) {
                await enviarEmail(
                    usuario.email,
                    "🎉 Pagamento confirmado!",
                    "Seu pagamento foi realizado com sucesso!",
                    `<h2>Olá ${usuario.nome},</h2>
                    <p>Recebemos o pagamento do seu pedido <strong>#${pedido.id}</strong> via boleto.</p>
                    <p>Seu pedido agora está sendo processado e em breve será despachado!</p>
                    <br>
                    <p>Obrigado por comprar conosco 💛</p>
                    <p><strong>Equipe DOUTOR BEER</strong></p>`
                );
            }
  
            console.log(`✅ Pedido ${pedido.id} confirmado como PAGO`);
          } else if (statusAsaas === "OVERDUE") {
            await pedido.update({
              status: "VENCIDO",
            });
            console.log(`⚠️ Pedido ${pedido.id} está VENCIDO`);
          } else {
            console.log(`⏳ Pedido ${pedido.id} ainda pendente (${statusAsaas})`);
          }
        } catch (err) {
          console.error(`Erro ao verificar boleto ${pedido.paymentId}:`, err.message);
        }
      }
    } catch (err) {
      console.error("Erro geral ao verificar boletos:", err.message);
    }
});