/* ================== ENDEREÇO ================== */

/* ================== Preencher Endereço com Dados do Usuário ================== */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) {
      console.warn("[Checkout] Usuário não logado — redirecionando para login");
      window.location.href = "/login";
      return;
    }

    const user = await res.json();

    const map = {
      nome: user.nome,
      cep: user.cep,
      rua: user.endereco,
      numero: user.numero,
      complemento: user.complemento,
      cidade: user.cidade,
      estado: user.estado
    };

    for (const [campo, valor] of Object.entries(map)) {
      const input = document.getElementById(campo);
      if (input && valor) input.value = valor;
    }

    console.log("[Checkout] Dados de endereço carregados com sucesso");

    // Se o CEP já estiver preenchido, calcula frete automaticamente
    if (user.cep) {
      atualizarFrete(user.cep);
    }

  } catch (err) {
    console.error("[Checkout] Erro ao carregar dados do usuário:", err);
    showToast("⚠️ Erro ao carregar seu endereço. Tente novamente mais tarde.");
  }
});

/* ================== Submeter Formulário ================== */
const form = document.getElementById("formEndereco");
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const dados = {
    nome: form.nome.value,
    cep: form.cep.value,
    endereco: form.rua.value,
    numero: form.numero.value,
    complemento: form.complemento.value,
    cidade: form.cidade.value,
    estado: form.estado.value
  };

  try {
    const res = await fetch("/api/usuario/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(dados)
    });

    if (!res.ok) throw new Error("Erro ao atualizar endereço");

    // Atualiza frete ao salvar endereço
    atualizarFrete(dados.cep);

  } catch (err) {
    console.error("[Checkout] Erro ao salvar endereço:", err);
    showToast("⚠️ Erro ao salvar seu endereço. Tente novamente.");
  }
});

/* ================== Autocompletar Endereço pelo CEP ================== */
const cepInput = document.getElementById("cep");
if (cepInput) {
  cepInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, "$1-$2");
    e.target.value = value;
  });

  cepInput.addEventListener("blur", async () => {
    const cep = cepInput.value.replace(/\D/g, "");
    if (cep.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();

      if (data.erro) {
        showToast("❌ CEP não encontrado.");
        return;
      }

      document.getElementById("rua").value = data.logradouro || "";
      document.getElementById("cidade").value = data.localidade || "";
      document.getElementById("estado").value = data.uf || "";
      document.getElementById("numero")?.focus();

      showToast("✅ Endereço preenchido automaticamente!");

      // Atualiza frete ao preencher CEP
      atualizarFrete(cep);

    } catch (err) {
      console.error("[Checkout] Erro ao buscar CEP:", err);
      showToast("⚠️ Erro ao buscar CEP. Tente novamente mais tarde.");
    }
  });
}

/* ================== Toast de feedback ================== */
function showToast(message) {
  let toast = document.querySelector(".toast-message");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast-message";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

/* ================== Carregar Resumo do Pedido ================== */
async function carregarResumo() {
  const ulResumo = document.querySelector(".produtos-summary");
  const subtotalSpan = document.getElementById("subtotal");
  const totalSpan = document.getElementById("total");
  const freteSpan = document.getElementById("frete");

  if (!ulResumo || !subtotalSpan || !totalSpan || !freteSpan) return;

  try {
    const res = await fetch("/api/carrinho");
    const carrinho = await res.json();

    ulResumo.innerHTML = "";
    let subtotal = 0;

    carrinho.forEach(item => {
      const precoUnit = item.precoPromocional || item.preco;
      const precoTotal = precoUnit * item.quantidade;
      subtotal += precoTotal;

      const li = document.createElement("li");
      li.innerHTML = `
        <span>${item.nome}</span>
        <span>R$ ${precoUnit.toFixed(2).replace(".", ",")} x${item.quantidade}</span>
      `;
      ulResumo.appendChild(li);
    });

    subtotalSpan.textContent = subtotal.toFixed(2).replace(".", ",");
    const frete = parseFloat(freteSpan.textContent.replace(",", ".")) || 0;
    totalSpan.textContent = (subtotal + frete).toFixed(2).replace(".", ",");

  } catch (err) {
    console.error("[Checkout] Erro ao carregar resumo do pedido:", err);
  }
}

/* ================== Calcular e Renderizar Frete ================== */
async function atualizarFrete(cepDestino) {
  const resultadoDiv = document.getElementById("freteResultado");
  if (!resultadoDiv) return;

  resultadoDiv.innerHTML = "<p>Calculando frete...</p>";

  try {
    const res = await fetch("/api/checkout/frete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ cepDestino })
    });

    if (!res.ok) throw new Error("Falha ao calcular frete");
    const opcoes = await res.json();

    const opcoesValidas = (opcoes || []).filter(o => o.price && !o.error);

    if (!opcoesValidas.length) {
      resultadoDiv.innerHTML = `<p>Nenhuma opção de frete disponível para este CEP.</p>`;
      return;
    }

    // Renderiza cards
    resultadoDiv.innerHTML = opcoesValidas
      .map((o, index) => {
        const nomeEmpresa = o.company?.name || "Transportadora";
        const nomeFrete = o.name || "Serviço";
        const valor = parseFloat(o.price);
        const prazo = o.delivery_time || "N/A";
        const logo = o.company?.picture || "/images/default-shipping.png";

        return `
          <div class="frete-card" data-index="${index}">
            <img src="${logo}" alt="${nomeEmpresa}" class="frete-logo">
            <div class="frete-info">
              <h4>${nomeEmpresa} - ${nomeFrete}</h4>
              <p>Valor: <strong>${valor.toLocaleString("pt-BR", { style: 'currency', currency: 'BRL' })}</strong></p>
              <p>Prazo: <strong>${prazo} dias úteis</strong></p>
            </div>
          </div>
        `;
      })
      .join("");

    // Torna clicáveis
    document.querySelectorAll(".frete-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll(".frete-card").forEach(c => c.classList.remove("selecionado"));
        card.classList.add("selecionado");

        const index = card.dataset.index;
        const freteSelecionado = opcoesValidas[index];
        window.freteSelecionado = freteSelecionado;

        const subtotal = parseFloat(document.getElementById("subtotal").textContent.replace(",", ".")) || 0;
        document.getElementById("frete").textContent = freteSelecionado.price.toFixed(2).replace(".", ",");
        document.getElementById("total").textContent = (subtotal + freteSelecionado.price).toFixed(2).replace(".", ",");
      });
    });

    // Seleciona automaticamente o primeiro
    document.querySelector(".frete-card")?.click();

  } catch (err) {
    console.error("[Checkout] Erro ao calcular frete:", err);
    resultadoDiv.innerHTML = `<p style="color:red;">Não foi possível calcular o frete.</p>`;
  }
}

// Executa ao carregar a página
document.addEventListener("DOMContentLoaded", carregarResumo);