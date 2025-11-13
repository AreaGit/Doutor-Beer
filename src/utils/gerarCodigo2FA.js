const enviarEmail = require("./email");

// Função para gerar código 2FA com exatamente 6 dígitos
function gerarCodigo(length = 6) {
  if (length <= 0) throw new Error("Tamanho inválido para código 2FA");

  const min = Math.pow(10, length - 1);     // ex: 100000
  const max = Math.pow(10, length) - 1;     // ex: 999999

  const numeroAleatorio = Math.floor(Math.random() * (max - min + 1)) + min;
  // Como min já é 100000, nunca vai ter leading zero
  return String(numeroAleatorio);
}

// Gera código, grava no usuário e envia por e-mail
async function gerarCodigo2FA(usuario) {
  const codigo = gerarCodigo(6);
  const expiracao = new Date(Date.now() + 5 * 60 * 1000); // expira em 5 minutos

  usuario.codigo2FA = codigo;
  usuario.expira2FA = expiracao;
  await usuario.save();

  await enviarEmail(
    usuario.email,
    "Seu código de autenticação - Doutor Beer",
    `Seu código de autenticação é: ${codigo}`,
    `<p>Olá ${usuario.nome},</p>
     <p>Seu código de autenticação é: <strong>${codigo}</strong></p>
     <p>O código expira em 5 minutos.</p>`
  );

  return codigo;
}

module.exports = gerarCodigo2FA;