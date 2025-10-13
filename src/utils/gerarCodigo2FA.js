const enviarEmail = require("./email");

// Função para gerar código 2FA com exatamente 6 dígitos
function gerarCodigo(length = 6) {
  // Gera número aleatório entre 0 e 999999, depois preenche com zeros à esquerda
  const numeroAleatorio = Math.floor(Math.random() * Math.pow(10, length));
  return String(numeroAleatorio).padStart(length, "0");
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