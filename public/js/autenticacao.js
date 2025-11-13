document.addEventListener("DOMContentLoaded", () => {
  const form2FA = document.getElementById("form2FA");
  const otpInputs = document.querySelectorAll(".otp");
  const reenviarBtn = document.getElementById("reenviarCodigo");
  const mensagem2FA = document.getElementById("mensagem2FA");

  // Recupera email salvo no login (etapa 1)
  const email = sessionStorage.getItem("loginTempEmail");
  if (!email) {
    mostrarMensagem("E-mail não encontrado. Faça login novamente.", "erro");
    setTimeout(() => window.location.href = "/login", 3000); // 👈 ajustado
    return;
  }

  // Função para exibir mensagem na caixinha
  function mostrarMensagem(texto, tipo) {
    mensagem2FA.textContent = texto;
    mensagem2FA.className = `mensagem2FA ${tipo}`;
    mensagem2FA.style.opacity = 0;
    mensagem2FA.style.display = "block";

    // Fade in
    let op = 0;
    const fadeIn = setInterval(() => {
      if (op >= 1) clearInterval(fadeIn);
      mensagem2FA.style.opacity = op;
      op += 0.1;
    }, 30);

    // Esconde após 5 segundos com fade out
    setTimeout(() => {
      let opOut = 1;
      const fadeOut = setInterval(() => {
        if (opOut <= 0) {
          clearInterval(fadeOut);
          mensagem2FA.style.display = "none";
        }
        mensagem2FA.style.opacity = opOut;
        opOut -= 0.1;
      }, 30);
    }, 5000);
  }

  // Junta os valores dos inputs
  const getCodigo = () => Array.from(otpInputs).map(input => input.value.trim()).join("");

  // Foco automático
  otpInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (input.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && input.value === "" && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });

  // Submissão do formulário 2FA
  form2FA.addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigo = getCodigo();
    if (codigo.length !== 6) {
      mostrarMensagem("Digite o código completo de 6 dígitos.", "erro");
      return;
    }

    try {
      const res = await fetch("/api/auth/login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo }),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao validar código.");

      // 👇 usa o destino que o backend mandou (painel-adm se admin, / se usuário comum)
      const destino = data.redirectTo || "/";

      mostrarMensagem("Login realizado com sucesso!", "sucesso");
      sessionStorage.removeItem("loginTempEmail");
      setTimeout(() => {
        window.location.href = destino;
      }, 1500);

    } catch (err) {
      mostrarMensagem(err.message, "erro");
      console.error("Erro no login 2FA:", err);
    }
  });

  // Reenvio de código
  reenviarBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/auth/login/reenvio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao reenviar código.");

      mostrarMensagem("Código reenviado para seu e-mail!", "sucesso");

    } catch (err) {
      mostrarMensagem(err.message, "erro");
      console.error("Erro ao reenviar código 2FA:", err);
    }
  });
});