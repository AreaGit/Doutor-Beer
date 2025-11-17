document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".container form");
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const whatsappInput = document.getElementById("whatsapp");
  const nomeInput = document.getElementById("nome");
  const cpfCnpjInput = document.getElementById("cpfCnpj"); // 👈 campo CPF / CNPJ
  const emailInput = document.getElementById("email");

  // Caixa de feedback geral (erro/sucesso)
  const feedbackBox = document.createElement("div");
  feedbackBox.className = "form-feedback";
  form.appendChild(feedbackBox);

  // ============== Helpers de UI ==============

  function clearFieldErrors() {
    const errorMessages = form.querySelectorAll(".error-message");
    errorMessages.forEach((el) => el.remove());

    const erroredInputs = form.querySelectorAll(".input-error");
    erroredInputs.forEach((el) => el.classList.remove("input-error"));
  }

  function setButtonLoading(isLoading) {
    if (!submitButton) return;

    const textSpan = submitButton.querySelector("span") || submitButton;
    const icon = submitButton.querySelector("i");

    if (isLoading) {
      submitButton.classList.add("is-loading");
      submitButton.disabled = true;

      if (!submitButton.dataset.originalText) {
        submitButton.dataset.originalText = textSpan.textContent.trim();
      }

      textSpan.textContent = "Ativando benefício...";

      if (icon) {
        icon.classList.add("loading-icon");
      }
    } else {
      submitButton.classList.remove("is-loading");
      submitButton.disabled = false;

      if (submitButton.dataset.originalText) {
        textSpan.textContent = submitButton.dataset.originalText;
      }

      if (icon) {
        icon.classList.remove("loading-icon");
      }
    }
  }

  function showFeedback(message, type = "error") {
    feedbackBox.textContent = message || "";
    feedbackBox.classList.remove("form-feedback--error", "form-feedback--success");

    if (!message) return;

    if (type === "success") {
      feedbackBox.classList.add("form-feedback--success");
    } else {
      feedbackBox.classList.add("form-feedback--error");
    }
  }

  function createFieldError(input, message) {
    if (!input) return;
    input.classList.add("input-error");

    const msg = document.createElement("small");
    msg.className = "error-message";
    msg.textContent = message;

    input.parentElement.appendChild(msg);
  }

  // ============== Utilitários ==============

  function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  function getDigits(value) {
    return value.replace(/\D/g, "");
  }

  // ======== Validação CPF & CNPJ ========

  function isAllSameDigits(str) {
    return /^(\d)\1+$/.test(str);
  }

  function isValidCPF(cpf) {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return false;
    if (isAllSameDigits(digits)) return false;

    // 1º dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i], 10) * (10 - i);
    }
    let firstCheck = (sum * 10) % 11;
    if (firstCheck === 10 || firstCheck === 11) firstCheck = 0;
    if (firstCheck !== parseInt(digits[9], 10)) return false;

    // 2º dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i], 10) * (11 - i);
    }
    let secondCheck = (sum * 10) % 11;
    if (secondCheck === 10 || secondCheck === 11) secondCheck = 0;
    if (secondCheck !== parseInt(digits[10], 10)) return false;

    return true;
  }

  function isValidCNPJ(cnpj) {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) return false;
    if (isAllSameDigits(digits)) return false;

    const calcCheckDigit = (base, weights) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) {
        sum += parseInt(base[i], 10) * weights[i];
      }
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const base12 = digits.slice(0, 12);
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const dv1 = calcCheckDigit(base12, weights1);
    if (dv1 !== parseInt(digits[12], 10)) return false;

    const base13 = digits.slice(0, 13);
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const dv2 = calcCheckDigit(base13, weights2);
    if (dv2 !== parseInt(digits[13], 10)) return false;

    return true;
  }

  function isValidCpfCnpj(value) {
    const digits = getDigits(value);
    if (digits.length === 11) return isValidCPF(digits);
    if (digits.length === 14) return isValidCNPJ(digits);
    return false;
  }

  // ======= Máscara CPF/CNPJ =======

  function maskCpfCnpj(value) {
    let digits = value.replace(/\D/g, "").slice(0, 14);

    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      if (digits.length <= 3) {
        return digits;
      }
      if (digits.length <= 6) {
        return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      }
      if (digits.length <= 9) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      }
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    } else {
      // CNPJ: 00.000.000/0000-00
      if (digits.length <= 2) {
        return digits;
      }
      if (digits.length <= 5) {
        return `${digits.slice(0, 2)}.${digits.slice(2)}`;
      }
      if (digits.length <= 8) {
        return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
      }
      if (digits.length <= 12) {
        return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
      }
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
    }
  }

  // ============== Validação geral do formulário ==============

  function validateForm() {
    clearFieldErrors();
    showFeedback("", "error");

    let valid = true;

    if (!nomeInput.value.trim() || nomeInput.value.trim().length < 3) {
      createFieldError(nomeInput, "Informe seu nome completo.");
      valid = false;
    }

    if (!cpfCnpjInput.value.trim() || !isValidCpfCnpj(cpfCnpjInput.value)) {
      createFieldError(cpfCnpjInput, "Informe um CPF ou CNPJ válido.");
      valid = false;
    }

    const whatsappDigits = getDigits(whatsappInput.value);
    if (whatsappDigits.length < 10) {
      createFieldError(whatsappInput, "Informe um WhatsApp válido com DDD.");
      valid = false;
    }

    if (!validarEmail(emailInput.value.trim())) {
      createFieldError(emailInput, "Informe um e-mail válido.");
      valid = false;
    }

    if (!valid) {
      showFeedback(
        "Confira os campos destacados antes de continuar.",
        "error"
      );
    }

    return valid;
  }

  // ============== Máscara de WhatsApp ==============

  function maskWhatsApp(value) {
    let digits = value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    // 11 dígitos – celular: (DD) 9XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  if (whatsappInput) {
    whatsappInput.addEventListener("input", (e) => {
      const current = e.target.value;
      e.target.value = maskWhatsApp(current);
    });
  }

  if (cpfCnpjInput) {
    cpfCnpjInput.addEventListener("input", (e) => {
      const current = e.target.value;
      e.target.value = maskCpfCnpj(current);
    });
  }

  // ============== Submit do formulário ==============

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setButtonLoading(true);

    try {
      const payload = {
        nome: nomeInput.value,
        cpfCnpj: cpfCnpjInput.value, // já formatado (000.000.000-00 ou 00.000.000/0000-00)
        whatsapp: whatsappInput.value,
        email: emailInput.value,
        origem: "landing-beneficio",
      };

      const response = await fetch("/api/clube-vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        showFeedback(
          data.message || "Não foi possível ativar o benefício.",
          "error"
        );
        setButtonLoading(false);
        return;
      }

      showFeedback(
        "Benefício ativado com sucesso! 🎉 Em breve entraremos em contato.",
        "success"
      );
      form.reset();
    } catch (err) {
      console.error("Erro ao enviar cadastro Clube VIP:", err);
      showFeedback(
        "Erro ao enviar seus dados. Tente novamente em instantes.",
        "error"
      );
    } finally {
      setButtonLoading(false);
    }
  });
});
