const enviarEmail = require("./email");

// Função para gerar código 2FA
function gerarCodigo(length = 6) {
  const caracteres = "0123456789"; // apenas números
  let codigo = "";
  for (let i = 0; i < length; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

// Gera código, grava no usuário e envia por e-mail
async function gerarCodigo2FA(usuario) {
  const codigo = gerarCodigo(6);
  const expiracao = new Date(Date.now() + 5 * 60 * 1000); // UTC + 5 min

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
