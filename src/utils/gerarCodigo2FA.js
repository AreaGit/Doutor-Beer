const enviarEmail = require("./email");

// Função para gerar código 2FA com exatamente 6 dígitos
function gerarCodigo(length = 6) {
  if (length <= 0) throw new Error("Tamanho inválido para código 2FA");

  const min = Math.pow(10, length - 1); // ex: 100000
  const max = Math.pow(10, length) - 1; // ex: 999999

  const numeroAleatorio = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(numeroAleatorio); // sempre 6 dígitos, sem zero à esquerda
}

// Gera código, grava no usuário e envia por e-mail
async function gerarCodigo2FA(usuario) {
  const codigo = gerarCodigo(6);
  const expiracao = new Date(Date.now() + 5 * 60 * 1000); // expira em 5 minutos

  usuario.codigo2FA = codigo;
  usuario.expira2FA = expiracao;
  await usuario.save();

  const assunto = "Seu código de autenticação - Doutor Beer";

  // Versão texto (fallback para clientes que não leem HTML)
  const corpoTexto = `
Olá, ${usuario.nome}!

Seu código de autenticação na Doutor Beer é: ${codigo}

Ele é válido por 5 minutos.

Se você não solicitou este código, pode ignorar este e-mail com segurança.
  `.trim();

  // Versão HTML estilizada
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
          
          <!-- Cabeçalho -->
          <tr>
            <td align="center" style="background:#F9B000;padding:18px 20px;">
              <h1 style="margin:0;font-size:20px;color:#4d1818;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
                Doutor Beer
              </h1>
              <p style="margin:4px 0 0;font-size:12px;color:#4d1818;opacity:.9;">
                Autenticação em 2 etapas
              </p>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding:24px 24px 10px 24px;">
              <p style="margin:0 0 10px 0;font-size:15px;color:#333333;">
                Olá, <strong>${usuario.nome}</strong>!
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#555555;line-height:1.5;">
                Para concluir seu acesso à <strong>Doutor Beer</strong>, use o código de verificação abaixo. 
                Ele garante uma camada extra de segurança para a sua conta.
              </p>

              <div style="text-align:center;margin:18px 0 20px;">
                <span style="
                  display:inline-block;
                  padding:12px 22px;
                  background:#fff7dd;
                  border-radius:8px;
                  border:1px dashed #F9B000;
                  font-size:24px;
                  letter-spacing:6px;
                  font-weight:bold;
                  color:#4d1818;
                  font-family:monospace;
                ">
                  ${codigo}
                </span>
              </div>

              <p style="margin:0 0 10px 0;font-size:13px;color:#666666;line-height:1.5;">
                ⏱ <strong>Validade:</strong> este código expira em <strong>5 minutos</strong>.
              </p>
              <p style="margin:0 0 16px 0;font-size:13px;color:#666666;line-height:1.5;">
                Se você não solicitou este código, é provável que alguém tenha digitado seu e-mail por engano.
                Neste caso, você pode simplesmente ignorar esta mensagem.
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="padding:14px 24px 20px 24px;border-top:1px solid #eeeeee;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#999999;">
                Este é um e-mail automático, por favor não responda.
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
  `.trim();

  await enviarEmail(usuario.email, assunto, corpoTexto, corpoHtml);

  return codigo;
}

module.exports = gerarCodigo2FA;
