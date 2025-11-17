// public/js/recuperar.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("recuperarSenhaForm");
  const emailInput = document.getElementById("email");
  const feedbackBox = document.getElementById("caixaFeedback");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const submitButton = form.querySelector('button[type="submit"]');
  const buttonText = submitButton.querySelector("span");
  const buttonIcon = submitButton.querySelector("i");

  if (!form) return;

  // ============== Helpers de UI ==============

  function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  function showFeedback(message, type = "erro") {
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
    if (!submitButton) return;

    if (isLoading) {
      // overlay
      if (loadingOverlay) loadingOverlay.style.display = "flex";

      submitButton.disabled = true;
      submitButton.classList.add("is-loading");

      if (!submitButton.dataset.originalText) {
        submitButton.dataset.originalText = buttonText.textContent.trim();
      }

      buttonText.textContent = "Enviando e-mail...";
      if (buttonIcon) {
        buttonIcon.classList.add("loading-icon");
        // opcional: troca o ícone pra um "spinner" simples
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

  function validarFormulario() {
    const email = emailInput.value.trim();

    showFeedback("");

    if (!email) {
      showFeedback("Por favor, informe o e-mail cadastrado.", "erro");
      emailInput.focus();
      return false;
    }

    if (!validarEmail(email)) {
      showFeedback("Informe um e-mail válido.", "erro");
      emailInput.focus();
      return false;
    }

    return true;
  }

  // Limpa feedback ao digitar
  emailInput.addEventListener("input", () => {
    if (feedbackBox && feedbackBox.style.display === "flex") {
      showFeedback("");
    }
  });

  // ============== Submit ==============

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    setLoading(true);

    try {
      const payload = { email: emailInput.value.trim() };

      const res = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showFeedback(
          data.message ||
            "Não foi possível enviar o e-mail de recuperação. Tente novamente.",
          "erro"
        );
        return;
      }

      // Backend já retorna uma mensagem genérica de segurança
      showFeedback(
        data.message ||
          "Se o e-mail estiver cadastrado, enviaremos um link de recuperação em instantes.",
        "sucesso"
      );

      // Anima levemente o botão depois do sucesso
      submitButton.classList.add("sent-success");
      setTimeout(() => submitButton.classList.remove("sent-success"), 900);
    } catch (error) {
      console.error("Erro ao solicitar recuperação de senha:", error);
      showFeedback(
        "Erro ao processar sua solicitação. Tente novamente em alguns instantes.",
        "erro"
      );
    } finally {
      setLoading(false);
    }
  });
});
