// ================== checkout.js ==================
document.addEventListener("DOMContentLoaded", async () => {
  const cepInput = document.getElementById("cep");
  const freteContainer = document.getElementById("freteResultado");
  const subtotalEl = document.getElementById("subtotal");
  const freteEl = document.getElementById("frete");
  const totalEl = document.getElementById("total");
  const formEndereco = document.getElementById("formEndereco");

  let subtotal = 0;
  let freteSelecionado = 0;
  let cart = [];

  // ================== Função utilitária: carregar dados do usuário ==================
  async function carregarUsuario() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Usuário não logado");
      const user = await res.json();

      if (formEndereco) {
        const campos = {
          nome: user.nome,
          cep: user.cep,
          rua: user.endereco,
          numero: user.numero,
          complemento: user.complemento,
          cidade: user.cidade,
          estado: user.estado
        };
        for (const [id, valor] of Object.entries(campos)) {
          const input = document.getElementById(id);
          if (input && valor) input.value = valor;
        }
      }

      console.log("[Checkout] Dados de endereço carregados com sucesso");
    } catch (err) {
      console.error("[Checkout] Erro ao carregar dados do usuário:", err);
      window.location.href = "/login";
    }
  }

  await carregarUsuario();

  // ================== Autocompletar CEP ==================
  if (cepInput) {
    cepInput.addEventListener("blur", async () => {
      const cep = cepInput.value.replace(/\D/g, "");
      if (cep.length !== 8) return;

      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (data.erro) return;

        document.getElementById("rua").value = data.logradouro || "";
        document.getElementById("cidade").value = data.localidade || "";
        document.getElementById("estado").value = data.uf || "";
        document.getElementById("numero")?.focus();

        await calcularFrete(cep);
      } catch (err) {
        console.error("[Checkout] Erro ao buscar CEP:", err);
      }
    });
  }

  // ================== Submeter endereço e atualizar frete ==================
  if (formEndereco) {
    formEndereco.addEventListener("submit", async (e) => {
      e.preventDefault();

      const dados = {
        nome: formEndereco.nome.value,
        cep: formEndereco.cep.value,
        endereco: formEndereco.rua.value,
        numero: formEndereco.numero.value,
        complemento: formEndereco.complemento.value,
        cidade: formEndereco.cidade.value,
        estado: formEndereco.estado.value
      };

      try {
        const res = await fetch("/api/auth/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(dados)
        });
        if (!res.ok) throw new Error("Erro ao atualizar endereço");

        await calcularFrete(dados.cep);
      } catch (err) {
        console.error("[Checkout] Erro ao salvar endereço:", err);
      }
    });
  }

  // ================== Função: carregar resumo ==================
  async function carregarResumo() {
    const ulResumo = document.querySelector(".produtos-summary");
    if (!ulResumo || !subtotalEl || !freteEl || !totalEl) return;

    try {
      const res = await fetch("/api/carrinho", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar carrinho");
      cart = await res.json();

      ulResumo.innerHTML = "";
      subtotal = 0;

      cart.forEach(item => {
        const produto = item.Produto || {};
        const precoUnit = item.precoPromocional ?? item.preco ?? 0;
        const precoTotal = precoUnit * (item.quantidade || 1);
        subtotal += precoTotal;

        const li = document.createElement("li");
        li.innerHTML = `
          <div class="produto-item">
            <img src="${item.imagem}" alt="${produto.nome || item.nome}" class="img-produto">
            <span class="nome-produto">${produto.nome || item.nome} x${item.quantidade || 1}</span>
            <strong class="preco-produto">R$ ${precoTotal.toFixed(2).replace(".", ",")}</strong>
          </div>
        `;
        ulResumo.appendChild(li);
      });

      subtotalEl.textContent = subtotal.toFixed(2).replace(".", ",");
      freteEl.textContent = freteSelecionado.toFixed(2).replace(".", ",");
      totalEl.textContent = (subtotal + freteSelecionado).toFixed(2).replace(".", ",");
    } catch (err) {
      console.error("[Checkout] Erro ao carregar resumo do pedido:", err);
    }
  }

  // ================== Função: calcular frete ==================
  async function calcularFrete(cep) {
    if (!freteContainer) return;
    freteContainer.innerHTML = "<p>Calculando frete...</p>";
    if (!cart.length) {
      freteContainer.innerHTML = "<p>Seu carrinho está vazio.</p>";
      return;
    }

    try {
      const produtosParaFrete = cart.map(item => {
        const produto = item.Produto || {};
        return {
          width: produto.width || 20,
          height: produto.height || 20,
          length: produto.length || 20,
          weight: produto.weight || 0.3,
          insurance_value: produto.precoPromocional ?? produto.preco ?? 0,
          quantity: item.quantidade || 1
        };
      });

      const resp = await fetch("/api/frete/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cepDestino: cep, produtos: produtosParaFrete })
      });
      if (!resp.ok) throw new Error("Erro ao calcular frete");
      const opcoes = await resp.json();
      if (!opcoes.length) {
        freteContainer.innerHTML = "<p>Nenhuma opção de frete disponível.</p>";
        return;
      }

      freteContainer.innerHTML = opcoes.map(o => {
        const empresa = o.company?.name || "Transportadora";
        const logo = o.company?.picture || "/images/default-shipping.png";
        const nomeServico = o.name || "Serviço";
        const preco = parseFloat(o.price);
        const prazo = o.delivery_time || "N/A";

        return `
          <div class="frete-card" data-valor="${preco}">
            <img src="${logo}" alt="${empresa}" class="frete-logo">
            <div class="frete-info">
              <h4>${empresa} - ${nomeServico}</h4>
              <p>Valor: <strong>${preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></p>
              <p>Prazo: <strong>${prazo} dias úteis</strong></p>
            </div>
          </div>
        `;
      }).join("");

      document.querySelectorAll(".frete-card").forEach(card => {
        card.addEventListener("click", () => {
          document.querySelectorAll(".frete-card").forEach(c => c.classList.remove("selecionado"));
          card.classList.add("selecionado");

          freteSelecionado = parseFloat(card.dataset.valor);
          window.freteSelecionado = freteSelecionado;
          freteEl.textContent = freteSelecionado.toFixed(2).replace(".", ",");
          totalEl.textContent = (subtotal + freteSelecionado).toFixed(2).replace(".", ",");
        });
      });

    } catch (err) {
      console.error("[Checkout] Erro ao calcular frete:", err);
      freteContainer.innerHTML = "<p>Não foi possível calcular o frete. Tente novamente.</p>";
    }
  }

  // ================== Página de endereço ==================
  if (formEndereco) {
    await carregarResumo();
    if (cepInput && cepInput.value.replace(/\D/g, "").length === 8) {
      await calcularFrete(cepInput.value.replace(/\D/g, ""));
    }

    formEndereco.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!window.freteSelecionado) {
        alert("Selecione uma opção de frete antes de continuar.");
        return;
      }

      const dados = {
        endereco: {
          nome: formEndereco.nome.value,
          cep: formEndereco.cep.value,
          rua: formEndereco.rua.value,
          numero: formEndereco.numero.value,
          complemento: formEndereco.complemento.value,
          cidade: formEndereco.cidade.value,
          estado: formEndereco.estado.value
        },
        frete: window.freteSelecionado
      };

      try {
        const res = await fetch("/checkout/salvar-endereco-frete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(dados)
        });
        if (!res.ok) throw new Error("Erro ao salvar endereço e frete");
        window.location.href = "/pagamento";
      } catch (err) {
        console.error("[Checkout] Erro ao enviar dados:", err);
        alert("Não foi possível continuar. Tente novamente.");
      }
    });
  }

  // ================== Página de pagamento ==================
  if (window.location.pathname.includes("/pagamento")) {
    // Função para carregar resumo do pedido
    async function carregarResumoPedido() {
      try {
        const res = await fetch("/checkout/resumo", { credentials: "include" });
        if (!res.ok) throw new Error("Erro ao carregar resumo do pedido");
        const dados = await res.json();

        const ul = document.querySelector(".produtos-summary");
        if (!ul) return;
        ul.innerHTML = "";

        dados.produtos.forEach(p => {
          const li = document.createElement("li");
          li.innerHTML = `
            <div class="produto-item">
              <img src="${p.imagem || '/images/no-image.png'}" alt="${p.nome}" class="img-produto">
              <span class="nome-produto">${p.nome} x${p.quantidade}</span>
              <strong class="preco-produto">R$ ${(p.preco * p.quantidade).toFixed(2).replace(".", ",")}</strong>
            </div>
          `;
          ul.appendChild(li);
        });

        document.querySelector("#subtotal").textContent = dados.subtotal.toFixed(2).replace(".", ",");
        document.querySelector("#frete").textContent = dados.frete.toFixed(2).replace(".", ",");
        document.querySelector("#total").textContent = dados.total.toFixed(2).replace(".", ",");

        console.log("[Pagamento] Resumo carregado com sucesso:", dados);
      } catch (err) {
        console.error("[Pagamento] Erro ao carregar resumo:", err);
      }
    }

    await carregarResumoPedido();

    const cards = document.querySelectorAll('.payment-card');
    const confirmBtn = document.querySelector('.confirm-btn');

    if (!confirmBtn) {
      console.warn("[Checkout] Botão de confirmação não encontrado.");
      return;
    }

    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => {
          c.classList.remove('active');
          const form = c.querySelector('.card-form-container');
          if (form) form.style.display = 'none';
        });

        card.classList.add('active');

        if (card.dataset.method === 'cartao') {
          const form = card.querySelector('.card-form-container');
          if (form) form.style.display = 'block';
        }
      });
    });

   // ================== Confirmar pedido ==================
confirmBtn.addEventListener('click', async () => {
  const metodo = document.querySelector('.payment-card.active')?.dataset.method;
  if (!metodo) return alert('Selecione uma forma de pagamento.');

  // Validação simples se for cartão
  if (metodo === 'cartao') {
    const nome = document.getElementById('cardNome').value.trim();
    const numero = document.getElementById('cardNumero').value.trim();
    const validade = document.getElementById('cardValidade').value.trim();
    const cvv = document.getElementById('cardCVV').value.trim();

    if (!nome || !numero || !validade || !cvv) {
      return alert('Preencha todos os dados do cartão.');
    }
  }

  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processando...";
    confirmBtn.style.backgroundColor = "#FFC107"; // amarelo para processando

    // ================== Envia o pedido para o backend ==================
    const res = await fetch("/checkout/finalizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ 
        metodoPagamento: metodo,
        frete: window.freteSelecionado || 0 // <-- envia o frete selecionado
      })
    });

    const data = await res.json();

    if (!res.ok || !data.sucesso) {
      throw new Error(data.error || "Erro ao finalizar pedido");
    }

    // Feedback visual
    confirmBtn.textContent = "Pedido confirmado!";
    confirmBtn.style.backgroundColor = "#4CAF50"; // verde para sucesso

    // Redireciona para a nova página de pedido
    window.location.href = `/pedido/${data.pedidoId}`;

  } catch (err) {
    console.error("[Checkout] Erro ao finalizar pedido:", err);
    alert("Erro ao processar pedido. Tente novamente.");
    confirmBtn.textContent = "Confirmar Pagamento";
    confirmBtn.style.backgroundColor = ""; // reseta cor
  } finally {
    confirmBtn.disabled = false;
  }
});

  }
});