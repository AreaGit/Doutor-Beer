document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const successMessage = document.querySelector(".success-message");

    // MASK TELEFONE (BR)
  const telefoneInput = document.getElementById("telefone");

  if (telefoneInput) {
    telefoneInput.addEventListener("input", (e) => {
      let value = e.target.value;

      // Remove tudo que não for número
      value = value.replace(/\D/g, "");

      // Limita no máximo 11 dígitos (DDD + 9 dígitos)
      if (value.length > 11) value = value.slice(0, 11);

      // Aplica formatação
      if (value.length > 6) {
        // Celular (11 dígitos): (11) 98765-4321
        if (value.length === 11) {
          value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
        } else {
          // Fixo (10 ou menos, depois de 6): (11) 3456-7890
          value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
        }
      } else if (value.length > 2) {
        // DDD + começando número: (11) 3...
        value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
      } else if (value.length > 0) {
        // Começando a digitar o DDD: (1 -> (1 / 11 -> (11
        value = value.replace(/^(\d{0,2})$/, "($1");
      }

      e.target.value = value;
    });
  }

  // Garante que o JS só execute nessa página
  if (form) {
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = {
        nome: form.nome.value.trim(),
        email: form.email.value.trim(),
        telefone: form.telefone.value.trim(),
        pedido: form.pedido.value.trim(),
        mensagem: form.mensagem.value.trim(),
        conheceu: form.conheceu.value
      };

      // Validação simples no front (melhor UX)
      if (!formData.nome || !formData.email || !formData.mensagem) {
        successMessage.style.display = "block";
        successMessage.style.color = "#e67e22";
        successMessage.textContent = "⚠️ Preencha nome, e-mail e mensagem.";
        setTimeout(() => (successMessage.style.display = "none"), 3000);
        return;
      }

      try {
        // estado de carregando
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Enviando...";
        }

        const res = await fetch("/fale-conosco", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = data?.error || "Erro ao enviar mensagem.";
          throw new Error(msg);
        }

        successMessage.style.display = "block";
        successMessage.style.color = "#2ecc71";
        successMessage.textContent = "✅ Mensagem enviada com sucesso! Entraremos em contato em breve.";
        form.reset();

        setTimeout(() => (successMessage.style.display = "none"), 4000);
      } catch (err) {
        console.error(err);
        successMessage.style.display = "block";
        successMessage.style.color = "#e74c3c";
        successMessage.textContent = "⚠️ Ocorreu um erro. Tente novamente mais tarde.";
        setTimeout(() => (successMessage.style.display = "none"), 4000);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "📨 Enviar Mensagem";
        }
      }
    });
  }

  // FAQ interativo
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      item.classList.toggle("active");
    });
  });
});