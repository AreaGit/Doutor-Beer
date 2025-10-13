const { padStart } = String.prototype;

// Função idêntica à usada no seu utils/gerarCodigo2FA.js
function gerarCodigo(length = 6) {
  const numeroAleatorio = Math.floor(Math.random() * Math.pow(10, length));
  return String(numeroAleatorio).padStart(length, "0");
}

// Testar 1000 códigos seguidos
let falhas = 0;

for (let i = 0; i < 1000; i++) {
  const codigo = gerarCodigo(6);

  if (codigo.length !== 6) {
    console.error(`❌ Código inválido: ${codigo}`);
    falhas++;
  }

  if (!/^\d{6}$/.test(codigo)) {
    console.error(`⚠️ Código contém caracteres inválidos: ${codigo}`);
    falhas++;
  }
}

if (falhas === 0) {
  console.log("✅ Todos os códigos possuem exatamente 6 dígitos numéricos!");
} else {
  console.log(`❌ Foram encontradas ${falhas} falhas.`);
}
