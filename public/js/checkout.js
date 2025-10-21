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
  
      let opcoes = await resp.json();
  
      // 🔴 Filtrar transportadoras indesejadas (Jadlog e Azul)
      opcoes = opcoes.filter(o =>
        o.company?.name !== "Jadlog" && o.company?.name !== "Azul"
      );
  
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
        mostrarToast("Selecione uma opção de frete antes de continuar.");
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
        mostrarToast("Não foi possível continuar. Tente novamente.");
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

// ================== Confirmar pedido (com integração PIX / Boleto / Cartão) ==================
confirmBtn.addEventListener("click", async () => {
  const metodo = document.querySelector(".payment-card.active")?.dataset.method;
  if (!metodo) return mostrarToast("Selecione uma forma de pagamento.");

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Processando...";
  confirmBtn.style.backgroundColor = "#FFC107";

  try {
    // 🔹 Busca o resumo atualizado do pedido
    const resumoRes = await fetch("/checkout/resumo", { credentials: "include" });
    if (!resumoRes.ok) throw new Error("Erro ao carregar resumo do pedido");
    const resumo = await resumoRes.json();

    // 🔹 Busca dados do usuário
    const userRes = await fetch("/api/auth/me", { credentials: "include" });
    if (!userRes.ok) throw new Error("Usuário não logado");
    const usuario = await userRes.json();

    // 🔹 Monta o corpo do pedido
    const pedidoData = {
      usuarioId: usuario.id,
      endereco: {
        nome: usuario.nome,
        cep: usuario.cep,
        rua: usuario.endereco,
        numero: usuario.numero,
        complemento: usuario.complemento,
        cidade: usuario.cidade,
        estado: usuario.estado
      },
      frete: resumo.frete,
      itens: resumo.produtos.map(p => ({
        produtoId: p.id,
        nome: p.nome,
        quantidade: p.quantidade,
        precoUnitario: p.preco,
        subtotal: p.preco * p.quantidade
      })),
      subtotal: resumo.subtotal,
      total: resumo.total,
      metodoPagamento: metodo.toUpperCase()
    };

    // 🔹 Se for PIX
    if (metodo === "pix") {
      const response = await fetch("/checkout/gerar-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoData)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao gerar PIX");

      abrirModalPix(result.qrCodeImageUrl, result.qrCodeText, result.valor, result.paymentId);
      monitorarPagamento(result.paymentId);
      return;
    }

    // 🔹 Se for BOLETO
    if (metodo === "boleto") {
      const response = await fetch("/checkout/gerar-boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoData)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao gerar boleto");

      abrirModalBoleto(result);
      return;
    }

    // 🔹 Se for CARTÃO
    if (metodo === "cartao") {
      const nome = document.getElementById("cardNome").value.trim();
      const numero = document.getElementById("cardNumero").value.replace(/\s+/g, "");
      const validadeMes = document.getElementById("cardValidadeMes").value.trim();
      const validadeAno = document.getElementById("cardValidadeAno").value.trim();
      const cvv = document.getElementById("cardCVV").value.trim();

      if (!nome || !numero || !validadeMes || !validadeAno || !cvv)
        throw new Error("Preencha todos os dados do cartão.");

      const cartao = {
        holderName: nome,
        number: numero,
        expiryMonth: validadeMes,
        expiryYear: validadeAno,
        cvv: cvv
      };

      const response = await fetch("/checkout/gerar-cartao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pedidoData, cartao })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao gerar pagamento");

      console.log(result);

      abrirModalCartao(result.value, result.paymentId);
      monitorarPagamentoCartao(result.paymentId);
      return;
    }

    throw new Error("Método de pagamento inválido.");

  } catch (err) {
    console.error("[Checkout] Erro ao finalizar compra:", err);
    mostrarToast(err.message || "Erro ao finalizar compra.");
    confirmBtn.textContent = "Confirmar Pagamento";
    confirmBtn.style.backgroundColor = "";
  } finally {
    confirmBtn.disabled = false;
  }
});

// ================== Modais PIX / BOLETO / CARTÃO ==================
function abrirModalPix(qrCodeImageUrl, qrCodeText, valor, paymentId) {
  const modalHtml = `
    <div id="pixModal" class="pix-modal-overlay">
      <div class="pix-modal">
        <button id="fecharPixModal" class="pix-close">✖</button>
        <h3>Pagamento via PIX</h3>
        <p><strong>Valor:</strong> R$ ${Number(valor).toFixed(2).replace(".", ",")}</p>
        <img src="data:image/png;base64,${qrCodeImageUrl}" alt="QR Code PIX" class="pix-qrcode" />
        <p class="pix-instrucao">Escaneie o QR Code com seu aplicativo bancário ou copie o código abaixo:</p>
        <textarea id="pixCodeText" readonly>${qrCodeText}</textarea>
        <button id="copiarPixCode" class="pix-btn">Copiar Código PIX</button>
        <p id="pixStatus" class="pix-status">Aguardando pagamento...</p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("copiarPixCode").addEventListener("click", () => {
    const text = document.getElementById("pixCodeText");
    text.select();
    document.execCommand("copy");
    mostrarToast("Código PIX copiado!");
  });
  document.getElementById("fecharPixModal").addEventListener("click", fecharModalPix);
}

function fecharModalPix() {
  document.getElementById("pixModal")?.remove();
}


// Modal Boleto
function abrirModalBoleto({ boletoUrl, linhaDigitavel, vencimento, valor, pedidoId }) {
  const modalHtml = `
    <div id="boletoModal" class="boleto-modal-overlay">
      <div class="boleto-modal">
        <button id="fecharBoletoModal" class="boleto-close">✖</button>
        <h3>Pagamento via Boleto</h3>
        <p><strong>Valor:</strong> R$ ${Number(valor).toFixed(2).replace(".", ",")}</p>
        <p><strong>Vencimento:</strong> ${new Date(vencimento).toLocaleDateString()}</p>
        <textarea id="linhaDigitavel" readonly>${linhaDigitavel}</textarea>
        <button id="copiarLinhaDigitavel" class="boleto-btn">Copiar Código</button>
        <a href="${boletoUrl}" target="_blank" class="boleto-btn boleto-view">Abrir Boleto</a>
        <p id="boletoStatus" class="boleto-status">Aguardando pagamento...</p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Botão copiar linha digitável
  document.getElementById("copiarLinhaDigitavel").addEventListener("click", () => {
    const text = document.getElementById("linhaDigitavel");
    text.select();
    document.execCommand("copy");
    mostrarToast("Linha digitável copiada!");
  });

  // Botão fechar modal
  document.getElementById("fecharBoletoModal").addEventListener("click", () => {
    fecharModalBoleto();
  });

  // Status e fechamento automático após 10s
  const statusEl = document.getElementById("boletoStatus");
  setTimeout(() => {
    fecharModalBoleto();
    mo("Pedido criado! Aguardando pagamento do boleto.");
    window.location.href = `/pedido/${pedidoId}`;
  }, 10000);

  // Se quiser monitorar status do boleto em tempo real, poderia adicionar fetch periódico aqui
}

function fecharModalBoleto() {
  document.getElementById("boletoModal")?.remove();
}


// Modal Cartão
function abrirModalCartao(valor, paymentId) {
  const modalHtml = `
    <div id="cartaoModal" class="pix-modal-overlay">
      <div class="pix-modal">
        <button id="fecharCartaoModal" class="pix-close">✖</button>
        <h3>Pagamento com Cartão de Crédito</h3>
        <p><strong>Valor:</strong> R$ ${Number(valor).toFixed(2).replace(".", ",")}</p>
        <p id="cartaoStatus" class="pix-status">⏳ Aguardando confirmação...</p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("fecharCartaoModal").addEventListener("click", fecharModalCartao);
}

function fecharModalCartao() {
  document.getElementById("cartaoModal")?.remove();
}

// ================== Monitoramento de Pagamentos ==================
function monitorarPagamento(paymentId) {
  const statusEl = document.getElementById("pixStatus");
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/asaas/consultar/${paymentId}`);
      const data = await res.json();
      const status = data.status?.toLowerCase();

      if (statusEl)
        statusEl.textContent =
          status === "received" || status === "confirmed"
            ? "✅ Pagamento confirmado!"
            : `⏳ Status: ${status}`;

      if (["received", "confirmed"].includes(status)) {
        clearInterval(interval);
        await finalizarPedido("PIX");
      }
    } catch (err) {
      console.error("Erro ao consultar status do PIX:", err);
    }
  }, 10000);
}

function monitorarPagamentoCartao(paymentId) {
  const statusEl = document.getElementById("cartaoStatus");
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/asaas/consultar/${paymentId}`);
      const data = await res.json();
      const status = data.status?.toLowerCase();

      if (statusEl)
        statusEl.textContent =
          status === "received" || status === "confirmed"
            ? "✅ Pagamento confirmado!"
            : `⏳ Status: ${status}`;

      if (["received", "confirmed"].includes(status)) {
        clearInterval(interval);
        await finalizarPedido("CARTAO");
      }
    } catch (err) {
      console.error("Erro ao consultar status do cartão:", err);
    }
  }, 10000);
}


// Mostrar toasts
function mostrarToast(mensagem, duracao = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = mensagem;
  document.body.appendChild(toast);

  // Força animação
  setTimeout(() => toast.classList.add("show"), 50);

  // Remove depois do tempo
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, duracao);
}

// ================== Finalizar Pedido ==================
async function finalizarPedido(formaPagamento) {
  try {
    // Busca resumo atual do checkout (produtos, frete e total)
    const resumoRes = await fetch("/checkout/resumo", { credentials: "include" });
    if (!resumoRes.ok) throw new Error("Erro ao buscar resumo");
    const resumo = await resumoRes.json();

    // Busca dados do usuário logado
    const userRes = await fetch("/api/auth/me", { credentials: "include" });
    if (!userRes.ok) throw new Error("Usuário não logado");
    const usuario = await userRes.json();

    // Monta os dados completos do pedido
    const pedidoData = {
      usuarioId: usuario.id,
      endereco: {
        nome: usuario.nome || "",
        cep: usuario.cep || "",
        rua: usuario.endereco || "",
        numero: usuario.numero || "",
        complemento: usuario.complemento || "",
        cidade: usuario.cidade || "",
        estado: usuario.estado || ""
      },
      frete: resumo.frete || 0,
      formaPagamento,
      total: resumo.total || 0,
      itens: resumo.produtos.map(p => ({
        produtoId: p.produtoId || p.id, // garante compatibilidade
        quantidade: p.quantidade,
        precoUnitario: p.preco
      }))
    };


    console.log(pedidoData)

    // Envia para o backend
    const response = await fetch("/checkout/finalizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(pedidoData)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Erro ao finalizar pedido");

    alert("✅ Pedido finalizado com sucesso!");
    window.location.href = `/pedido/${result.pedidoId}`;
  } catch (error) {
    console.error("Erro ao finalizar pedido:", error);
    alert(error.message);
  }
}


  }
});