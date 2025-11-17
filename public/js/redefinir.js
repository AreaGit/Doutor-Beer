// public/js/redefinir.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("novaSenhaForm");
  const novaSenhaInput = document.getElementById("novaSenha");
  const confirmarSenhaInput = document.getElementById("confirmarSenha");
  const requisitosEl = document.getElementById("senhaRequisitos");
  const feedbackBox = document.getElementById("caixaFeedback");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const submitButton = form.querySelector('button[type="submit"]');
  const buttonText = submitButton.querySelector("span");
  const buttonIcon = submitButton.querySelector("i");

  // ====== CAPTURAR TOKEN E EMAIL DA URL ======
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const email = params.get("email");

  if (!token || !email) {
    mostrarFeedback(
      "Link inválido ou expirado. Solicite uma nova recuperação de senha.",
      "erro"
    );
    form.style.display = "none";
    return;
  }

  // ====== TOGGLE VISIBILIDADE SENHA ======
  document.querySelectorAll(".toggle-icon").forEach(iconWrapper => {
    iconWrapper.addEventListener("click", () => {
      const targetId = iconWrapper.dataset.target;
      const input = document.getElementById(targetId);
      const icon = iconWrapper.querySelector("i");

      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      } else {
        input.type = "password";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }
    });
  });

  // ====== VALIDAÇÃO FORÇA DA SENHA ======
  function validarForcaSenha(senha) {
    const temLetraMaiuscula = /[A-Z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    const temEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
    const temTamanho = senha.length >= 8;

    let forca = 0;
    if (temLetraMaiuscula) forca++;
    if (temNumero) forca++;
    if (temEspecial) forca++;
    if (temTamanho) forca++;

    if (senha.length === 0) {
      requisitosEl.textContent = "";
      requisitosEl.className = "senha-requisitos";
      return false;
    }

    if (forca <= 1) {
      requisitosEl.textContent =
        "Senha fraca. Use letras maiúsculas, números e símbolos.";
      requisitosEl.className = "senha-requisitos fraca";
      return false;
    } else if (forca === 2 || forca === 3) {
      requisitosEl.textContent =
        "Senha média. Adicione mais variação para fortalecê-la.";
      requisitosEl.className = "senha-requisitos media";
      return false;
    } else {
      requisitosEl.textContent = "Senha forte! Boa escolha.";
      requisitosEl.className = "senha-requisitos forte";
      return true;
    }
  }

  novaSenhaInput.addEventListener("input", () => {
    validarForcaSenha(novaSenhaInput.value);
  });

  // ====== FEEDBACK / LOADING HELPERS ======
  function mostrarFeedback(message, type = "erro") {
    if (!feedbackBox) return;

    if (!message) {
      feedbackBox.style.display = "none";
      feedbackBox.textContent = "";
      feedbackBox.classList.remove("erro", "sucesso");
      return;
    }

    feedbackBox.textContent = message;
    feedbackBox.classList.remove("erro", "sucesso");

    if (type === "sucesso") {
      feedbackBox.classList.add("sucesso");
    } else {
      feedbackBox.classList.add("erro");
    }

    feedbackBox.style.display = "flex";
  }

  function setLoading(isLoading) {
    if (isLoading) {
      if (loadingOverlay) loadingOverlay.style.display = "flex";
      submitButton.disabled = true;
      submitButton.classList.add("is-loading");

      if (!submitButton.dataset.originalText) {
        submitButton.dataset.originalText = buttonText.textContent.trim();
      }

      buttonText.textContent = "Salvando nova senha...";
      if (buttonIcon) {
        buttonIcon.classList.add("loading-icon");
        buttonIcon.classList.remove("fa-arrow-right");
        buttonIcon.classList.add("fa-spinner");
      }
    } else {
      if (loadingOverlay) loadingOverlay.style.display = "none";
      submitButton.disabled = false;
      submitButton.classList.remove("is-loading");

      if (submitButton.dataset.originalText) {
        buttonText.textContent = submitButton.dataset.originalText;
      }

      if (buttonIcon) {
        buttonIcon.classList.remove("loading-icon", "fa-spinner");
        buttonIcon.classList.add("fa-arrow-right");
      }
    }
  }

  // ====== VALIDAÇÃO DO FORM ======
  function validarFormulario() {
    mostrarFeedback("");

    const senha = novaSenhaInput.value;
    const confirmar = confirmarSenhaInput.value;

    if (!senha || !confirmar) {
      mostrarFeedback("Preencha ambos os campos de senha.", "erro");
      return false;
    }

    const forte = validarForcaSenha(senha);
    if (!forte) {
      mostrarFeedback(
        "A senha deve ter pelo menos 8 caracteres, letra maiúscula, número e símbolo.",
        "erro"
      );
      return false;
    }

    if (senha !== confirmar) {
      mostrarFeedback("As senhas não coincidem.", "erro");
      return false;
    }

    return true;
  }

  // Limpa feedback ao digitar
  novaSenhaInput.addEventListener("input", () => {
    if (feedbackBox.style.display === "flex") mostrarFeedback("");
  });
  confirmarSenhaInput.addEventListener("input", () => {
    if (feedbackBox.style.display === "flex") mostrarFeedback("");
  });

  // ====== SUBMIT ======
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    setLoading(true);

    try {
      const payload = {
        email,
        token,
        novaSenha: novaSenhaInput.value
      };

      const res = await fetch("/api/auth/resetar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        mostrarFeedback(
          data.message ||
            "Não foi possível redefinir sua senha. O link pode ter expirado.",
          "erro"
        );
        return;
      }

      mostrarFeedback(
        data.message || "Senha redefinida com sucesso! Você já pode fazer login.",
        "sucesso"
      );

      submitButton.classList.add("sent-success");

      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      mostrarFeedback(
        "Erro ao processar sua solicitação. Tente novamente em instantes.",
        "erro"
      );
    } finally {
      setLoading(false);
    }
  });
});
