// ================== checkout.js ==================
document.addEventListener("DOMContentLoaded", async () => {
  const cepInput = document.getElementById("cep");
  const freteContainer = document.getElementById("freteResultado");
  const subtotalEl = document.getElementById("subtotal");
  const freteEl = document.getElementById("frete");
  const totalEl = document.getElementById("total");
  const formEndereco = document.getElementById("formEndereco");

  let subtotal = 0;
  let freteSelecionado = undefined; // valor atualmente escolhido (pode ser 0)
  let cart = [];

  let descontoCupom = 0;
  let subtotalComDesconto = 0;

  /* ================== Utils ================== */

  function formatMoney(valor) {
    return Number(valor || 0).toFixed(2).replace(".", ",");
  }

  // Carrega dados do usuário e preenche o formulário de endereço
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
      // se quiser forçar login
      window.location.href = "/login";
    }
  }

  function mostrarToast(mensagem, duracao = 3000) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = mensagem;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 50);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, duracao);
  }

  /* ================== Resumo (TELA DE ENDEREÇO) ================== */
async function carregarResumo() {
  const ulResumo = document.querySelector(".produtos-summary");
  if (!ulResumo || !subtotalEl || !freteEl || !totalEl) return;

  try {
    // Busca resumo (com cupom/frete) + carrinho completo (pra frete)
    const [resResumo, resCarrinho] = await Promise.all([
      fetch("/checkout/resumo", { credentials: "include" }),
      fetch("/api/carrinho", { credentials: "include" })
    ]);

    if (!resResumo.ok) throw new Error("Erro ao buscar resumo do checkout");
    const resumo = await resResumo.json();

    // Trata formatos possíveis do carrinho
    let dataCart = [];
    if (resCarrinho.ok) dataCart = await resCarrinho.json();
    cart = Array.isArray(dataCart) ? dataCart : (dataCart.items || []);

    // Atualiza variáveis globais com base no resumo
    subtotal = Number(resumo.subtotal || 0);
    descontoCupom = Number(resumo.desconto || 0);

    subtotalComDesconto =
      typeof resumo.subtotalComDesconto === "number"
        ? Number(resumo.subtotalComDesconto)
        : Math.max(subtotal - descontoCupom, 0);

    // frete vindo do backend: valor que deve ser mostrado ao cliente por padrão
    window.freteOriginal = Number(resumo.freteOriginal ?? 0);
    freteSelecionado = Number(resumo.frete ?? resumo.freteOriginal ?? 0);
    window.freteSelecionado = freteSelecionado;

    // flags de frete grátis: backend autoritativo
    // resumo.cupom?.freteGratis ou resumo.freteGratis (ambos aceitos)
    const cupomDoResumo = resumo.cupom || null;
    window.freteGratisAvailable = !!(cupomDoResumo && cupomDoResumo.freteGratis === true) || !!resumo.freteGratis;
    window.freteGratisSelected = !!resumo.freteGratis; // true se backend já marcou frete grátis como escolhido

    // Monta lista de produtos do resumo
    ulResumo.innerHTML = "";
    (resumo.produtos || []).forEach(p => {
      let precoFinal = p.preco ?? 0;

      if (p.torneira === "Tap Handle Prata" || p.torneira === "Tap Handle Preta") {
        precoFinal += 15;
      }
      const refilQtd = Number(p.refil) || 1;
      if (refilQtd > 1) {
        precoFinal += (refilQtd - 1) * 40;
      }

      const precoTotal = precoFinal * (p.quantidade || 1);

      const li = document.createElement("li");
      li.innerHTML = `
<div class="produto-item">
  <img src="${p.imagem || '/images/no-image.png'}" alt="${p.nome}" class="img-produto">
  <div class="produto-info">
    <span class="nome-produto">
      ${p.quantidade || 1}x ${p.nome}
    </span>
    ${p.cor && p.cor !== "padrao" ? `<p>Cor: ${p.cor}</p>` : ""}
    ${p.torneira && p.torneira !== "padrao" ? `<p>Torneira: ${p.torneira}</p>` : ""}
    ${p.refil && Number(p.refil) > 1 ? `<p>Refis: ${p.refil}</p>` : ""}
    <strong class="preco-produto">
      R$ ${formatMoney(precoTotal)}
    </strong>
  </div>
</div>
`;

      ulResumo.appendChild(li);
    });

    // Atualiza textos de resumo
    subtotalEl.textContent = formatMoney(subtotalComDesconto);

    // Mostrar frete conforme escolha do usuário (respeita frete grátis já selecionado)
    if (window.freteGratisSelected) {
      freteEl.textContent = "Grátis";
    } else {
      freteEl.textContent = formatMoney(Number(resumo.frete ?? window.freteOriginal ?? 0));
    }

    const totalBackend =
      typeof resumo.total === "number"
        ? Number(resumo.total)
        : subtotalComDesconto + (window.freteGratisSelected ? 0 : Number(resumo.frete ?? window.freteOriginal ?? 0));

    totalEl.textContent = formatMoney(totalBackend);

    // Linha de desconto, se existir no HTML
    const descontoRow = document.getElementById("row-desconto");
    const descontoSpan = document.getElementById("desconto");
    if (descontoRow && descontoSpan) {
      if (descontoCupom > 0) {
        descontoRow.style.display = "flex";
        descontoSpan.textContent = formatMoney(descontoCupom);
      } else {
        descontoRow.style.display = "none";
        descontoSpan.textContent = "0,00";
      }
    }

  } catch (err) {
    console.error("[Checkout] Erro ao carregar resumo do pedido:", err);
  }
}


  /* ================== Calcular frete (TELA DE ENDEREÇO) ================== */
  async function calcularFrete(cep) {
  if (!freteContainer) return;
  freteContainer.innerHTML = "<p>Calculando frete...</p>";

  if (!cart || !cart.length) {
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
        insurance_value:
          item.precoPromocional ??
          item.preco ??
          produto.precoPromocional ??
          produto.preco ??
          0,
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

    opcoes = opcoes.filter(o =>
      o.company?.name !== "Jadlog" && o.company?.name !== "Azul"
    );

    if (!opcoes.length) {
      freteContainer.innerHTML = "<p>Nenhuma opção de frete disponível.</p>";
      return;
    }

    // Gera HTML das opções de frete (transportadoras)
    let htmlOpcoes = opcoes.map(o => {
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

    // Só adiciona Frete Grátis se backend indicou explicitamente (cupom DBFRETEGRATIS)
    const podeFreteGratis = !!window.freteGratisAvailable;

    if (podeFreteGratis) {
      const freteGratisHtml = `
        <div class="frete-card frete-gratis" data-valor="0" data-cupom="DBFRETEGRATIS" style="border:2px dashed #4CAF50;">
          <img src="https://i.imgur.com/DmOpWel.png" alt="Frete Grátis" class="frete-logo">
          <div class="frete-info">
            <h4>Frete Grátis</h4>
            <p>Valor: <strong>Grátis</strong></p>
            <p>Condição: Cupom aplicado</p>
          </div>
        </div>
      `;
      htmlOpcoes = freteGratisHtml + htmlOpcoes;
    }

    freteContainer.innerHTML = htmlOpcoes;

    // Seleciona automaticamente o cartão que corresponde ao window.freteSelecionado (se existir)
    function syncSelectedCard() {
      document.querySelectorAll(".frete-card").forEach(c => c.classList.remove("selecionado"));

      // se backend já marcou frete grátis como escolha, prioriza ele
      if (window.freteGratisSelected) {
        const matchGratis = document.querySelector('.frete-card[data-valor="0"]');
        if (matchGratis) {
          matchGratis.classList.add("selecionado");
          freteSelecionado = 0;
          window.freteSelecionado = 0;
          return;
        }
      }

      // senão tenta selecionar pelo valor salvo em window.freteSelecionado
      if (window.freteSelecionado != null) {
        const cards = Array.from(document.querySelectorAll(".frete-card"));
        const match = cards.find(c => parseFloat(c.dataset.valor || "0") === Number(window.freteSelecionado));
        if (match) {
          match.classList.add("selecionado");
          return;
        }
      }

      // fallback: primeira opção paga
      const firstPaid = Array.from(document.querySelectorAll(".frete-card")).find(c => !c.classList.contains("frete-gratis"));
      if (firstPaid) firstPaid.classList.add("selecionado");
    }

    syncSelectedCard();

    // Click handlers
    document.querySelectorAll(".frete-card").forEach(card => {
      card.addEventListener("click", () => {
        // remove seleção de todos
        document.querySelectorAll(".frete-card").forEach(c => c.classList.remove("selecionado"));
        card.classList.add("selecionado");

        const valor = parseFloat(card.dataset.valor || "0");

        // Se clicou no cartão de frete grátis, marca como escolhido; caso contrário, desmarca freteGratisSelected
        if (valor === 0 && card.classList.contains("frete-gratis")) {
          window.freteSelecionado = 0;
          window.freteGratisSelected = true;
          freteSelecionado = "Grátis";
        } else {
          window.freteSelecionado = valor;
          freteSelecionado = valor;
          window.freteGratisSelected = false;
          // garante que freteOriginal tenha um valor real (útil ao salvar)
          window.freteOriginal = Number(window.freteOriginal || valor);
        }

        // Atualiza visual do resumo
        if (window.freteGratisSelected) {
          freteEl.textContent = "Grátis";
          totalEl.textContent = formatMoney(subtotalComDesconto);
        } else {
          freteEl.textContent = formatMoney(freteSelecionado);
          totalEl.textContent = formatMoney(subtotalComDesconto + (Number(freteSelecionado) || 0));
        }
      });
    });

  } catch (err) {
    console.error("[Checkout] Erro ao calcular frete:", err);
    freteContainer.innerHTML = "<p>Não foi possível calcular o frete. Tente novamente.</p>";
  }
}


  /* ================== Autocompletar CEP ================== */
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

  /* ================== PÁGINA DE ENDEREÇO ================== */
  if (formEndereco) {
    await carregarUsuario();
    await carregarResumo();

    if (cepInput && cepInput.value.replace(/\D/g, "").length === 8) {
      await calcularFrete(cepInput.value.replace(/\D/g, ""));
    }

    formEndereco.addEventListener("submit", async (e) => {
      e.preventDefault();

      // aceitar frete 0 (quando o usuário escolheu frete grátis)
      if (window.freteSelecionado == null) {
        mostrarToast("Selecione uma opção de frete antes de continuar.");
        return;
      }

      const enderecoPayload = {
        nome: formEndereco.nome.value,
        cep: formEndereco.cep.value,
        rua: formEndereco.rua.value,
        numero: formEndereco.numero.value,
        complemento: formEndereco.complemento.value,
        cidade: formEndereco.cidade.value,
        estado: formEndereco.estado.value
      };

      try {
        // opcional: atualizar endereço do usuário
        try {
          await fetch("/api/auth/me", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(enderecoPayload)
          });
        } catch (e) {
          console.warn("[Checkout] Não foi possível atualizar endereço do usuário, mas segue o fluxo:", e);
        }

        // envia o objeto de frete esperado pelo backend
        const fretePayload = {
          freteValue: Number(window.freteSelecionado || 0),
          freteGratis: !!window.freteGratisSelected,
          freteOriginal: Number(window.freteOriginal || 0)
        };

        const res = await fetch("/checkout/salvar-endereco-frete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            endereco: enderecoPayload,
            frete: fretePayload
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(()=>({}));
          throw new Error(err.error || "Erro ao salvar endereço e frete");
        }

        if(freteSelecionado == 0) {
          mostrarToast("Selecione uma opção de frete antes de continuar.");
          return;
        }else {
          window.location.href = "/pagamento";
        }
      } catch (err) {
        console.error("[Checkout] Erro ao enviar dados:", err);
        mostrarToast(err.message || "Não foi possível continuar. Tente novamente.");
      }
    });
  }

  /* ================== PÁGINA DE PAGAMENTO ================== */
  if (window.location.pathname.includes("/pagamento")) {

    async function carregarResumoPagamento() {
      try {
        // 🔹 Resumo do checkout (já com cupom + frete + total certo)
        const resResumo = await fetch("/checkout/resumo", { credentials: "include" });
        if (!resResumo.ok) throw new Error("Erro ao buscar resumo");
        const resumoSessao = await resResumo.json();

        const ulResumo = document.querySelector(".produtos-summary");
        const subtotalElPg = document.querySelector("#subtotal");
        const freteElPg = document.querySelector("#frete");
        const totalElPg = document.querySelector("#total");
        const descontoRow = document.getElementById("row-desconto");
        const descontoSpan = document.getElementById("desconto");

        ulResumo.innerHTML = "";

        // 🔹 Monta itens usando os MESMOS dados de /checkout/resumo
        (resumoSessao.produtos || []).forEach(p => {
          let precoFinal = p.preco ?? 0;

          // Mesma regra de variação usada no backend
          if (p.torneira === "Tap Handle Prata" || p.torneira === "Tap Handle Preta") {
            precoFinal += 15;
          }
          const refilQtd = Number(p.refil) || 1;
          if (refilQtd > 1) {
            precoFinal += (refilQtd - 1) * 40;
          }

          const precoTotal = precoFinal * (p.quantidade || 1);

          const li = document.createElement("li");
          li.innerHTML = `
    <div class="produto-item">
      <img src="${p.imagem || '/images/no-image.png'}"
           alt="${p.nome}" class="img-produto">
      <div class="produto-info">
        <span class="nome-produto">
          ${p.quantidade || 1}x ${p.nome}
        </span>
        ${p.cor && p.cor !== "padrao" ? `<p>Cor: ${p.cor}</p>` : ""}
        ${p.torneira && p.torneira !== "padrao" ? `<p>Torneira: ${p.torneira}</p>` : ""}
        ${p.refil && Number(p.refil) > 1 ? `<p>Refis: ${p.refil}</p>` : ""}
        <strong class="preco-produto">
          R$ ${formatMoney(precoTotal)}
        </strong>
      </div>
    </div>
  `;

          ulResumo.appendChild(li);
        });

        const subtotalFinal = Number(resumoSessao.subtotal || 0);
        const desconto = Number(resumoSessao.desconto || 0);
        const subtotalComDesconto = Number(resumoSessao.subtotalComDesconto || (subtotalFinal - desconto));
        const freteSessao = Number(resumoSessao.frete || 0);
        const freteGratis = !!resumoSessao.freteGratis;

        const totalFinal = typeof resumoSessao.total === "number"
          ? Number(resumoSessao.total)
          : subtotalComDesconto + (freteGratis ? 0 : freteSessao);


        subtotalElPg.textContent = formatMoney(subtotalFinal);

        if (freteGratis) {
          freteElPg.textContent = "Grátis";
        } else {
          freteElPg.textContent = formatMoney(freteSessao);
        }

        totalElPg.textContent = formatMoney(totalFinal);


        // Linha de desconto (se você tiver esse row no HTML)
        if (descontoRow && descontoSpan) {
          if (desconto > 0) {
            descontoRow.style.display = "flex";
            descontoSpan.textContent = formatMoney(desconto);
          } else {
            descontoRow.style.display = "none";
            descontoSpan.textContent = "0,00";
          }
        }

        console.log("[Pagamento] Resumo completo carregado:", {
          subtotal: subtotalFinal,
          frete: freteSessao,
          desconto,
          total: totalFinal
        });

      } catch (err) {
        console.error("[Pagamento] Erro ao carregar resumo do pagamento:", err);
        mostrarToast("Erro ao carregar resumo do pedido.");
      }
    }

    // chama logo ao entrar na página de pagamento
    await carregarResumoPagamento();

    const cards = document.querySelectorAll(".payment-card");
    const confirmBtn = document.querySelector(".confirm-btn");

    if (!confirmBtn) {
      console.warn("[Checkout] Botão de confirmação não encontrado.");
      return;
    }

    cards.forEach(card => {
      card.addEventListener("click", () => {
        cards.forEach(c => {
          c.classList.remove("active");
          const form = c.querySelector(".card-form-container");
          if (form) form.style.display = "none";
        });

        card.classList.add("active");

        if (card.dataset.method === "cartao") {
          const form = card.querySelector(".card-form-container");
          if (form) form.style.display = "block";
        }
      });
    });

    // ================== Confirmar pedido (PIX / BOLETO / CARTÃO) ==================
    confirmBtn.addEventListener("click", async () => {
      const metodo = document.querySelector(".payment-card.active")?.dataset.method;
      if (!metodo) return mostrarToast("Selecione uma forma de pagamento.");

      confirmBtn.disabled = true;
      confirmBtn.textContent = "Processando...";
      confirmBtn.style.backgroundColor = "#FFC107";

      try {
        // 🔹 Sempre pega o resumo ATUAL do backend (já com desconto e frete)
        const resumoRes = await fetch("/checkout/resumo", { credentials: "include" });
        if (!resumoRes.ok) throw new Error("Erro ao carregar resumo do pedido");
        const resumo = await resumoRes.json();

        // 🔹 Dados do usuário
        const userRes = await fetch("/api/auth/me", { credentials: "include" });
        if (!userRes.ok) throw new Error("Usuário não logado");
        const usuario = await userRes.json();

        // 🔹 Corpo base do pedido
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
          // usamos o frete que veio do resumo (que reflete a escolha do usuário)
          frete: resumo.frete,
          itens: resumo.produtos.map((p) => {
            let precoFinal = p.preco ?? 0;

            // mesma regra usada em todo lugar (carrinho + resumo)
            if (p.torneira === "Tap Handle Prata" || p.torneira === "Tap Handle Preta") {
              precoFinal += 15;
            }

            const refilQtd = Number(p.refil) || 1;
            if (refilQtd > 1) {
              precoFinal += (refilQtd - 1) * 40;
            }

            return {
              produtoId: p.id,
              nome: p.nome,
              quantidade: p.quantidade,
              precoUnitario: precoFinal,
              subtotal: precoFinal * p.quantidade,
              cor: p.cor || "padrao",
              torneira: p.torneira || "padrao",
              refil: refilQtd
            };
          }),
          subtotal: resumo.subtotal,
          total: resumo.total,
          metodoPagamento: metodo.toUpperCase()
        };


        // ... (fluxo de pagamento continua igual)
        // PIX
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

        // BOLETO
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

        // CARTÃO
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

    /* ================== Modais PIX / BOLETO / CARTÃO ================== */
    function abrirModalPix(qrCodeImageUrl, qrCodeText, valor, paymentId) {
      const modalHtml = `
        <div id="pixModal" class="pix-modal-overlay">
          <div class="pix-modal">
            <button id="fecharPixModal" class="pix-close">✖</button>
            <h3>Pagamento via PIX</h3>
            <p><strong>Valor:</strong> R$ ${formatMoney(valor)}</p>
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
      document.getElementById("fecharPixModal").addEventListener("click", fecharPixModal);
    }

    function fecharPixModal() { document.getElementById("pixModal")?.remove(); }

    function abrirModalBoleto({ boletoUrl, linhaDigitavel, vencimento, valor, pedidoId }) {
      const modalHtml = `
        <div id="boletoModal" class="boleto-modal-overlay">
          <div class="boleto-modal">
            <button id="fecharBoletoModal" class="boleto-close">✖</button>
            <h3>Pagamento via Boleto</h3>
            <p><strong>Valor:</strong> R$ ${formatMoney(valor)}</p>
            <p><strong>Vencimento:</strong> ${new Date(vencimento).toLocaleDateString()}</p>
            <textarea id="linhaDigitavel" readonly>${linhaDigitavel}</textarea>
            <button id="copiarLinhaDigitavel" class="boleto-btn">Copiar Código</button>
            <a href="${boletoUrl}" target="_blank" class="boleto-btn boleto-view">Abrir Boleto</a>
            <p id="boletoStatus" class="boleto-status">Aguardando pagamento...</p>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);

      document.getElementById("copiarLinhaDigitavel").addEventListener("click", () => {
        const text = document.getElementById("linhaDigitavel");
        text.select();
        document.execCommand("copy");
        mostrarToast("Linha digitável copiada!");
      });

      document.getElementById("fecharBoletoModal").addEventListener("click", () => {
        fecharModalBoleto();
      });

      // auto fecha e redireciona depois de um tempo (comportamento que você já tinha)
      setTimeout(() => {
        fecharModalBoleto();
        mostrarToast("Pedido criado! Aguardando pagamento do boleto.");
        if (pedidoId) {
          window.location.href = `/pedido/${pedidoId}`;
        }
      }, 10000);
    }

    function fecharModalBoleto() {
      document.getElementById("boletoModal")?.remove();
    }

    function abrirModalCartao(valor, paymentId) {
      const modalHtml = `
        <div id="cartaoModal" class="pix-modal-overlay">
          <div class="pix-modal">
            <button id="fecharCartaoModal" class="pix-close">✖</button>
            <h3>Pagamento com Cartão de Crédito</h3>
            <p><strong>Valor:</strong> R$ ${formatMoney(valor)}</p>
            <p id="cartaoStatus" class="pix-status">⏳ Aguardando confirmação...</p>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      document.getElementById("fecharCartaoModal").addEventListener("click", fecharModalCartao);
    }

    function fecharModalCartao() { document.getElementById("cartaoModal")?.remove(); }

    /* ================== Monitoramento de Pagamentos ================== */
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

    // Finalizar Pedido depois da confirmação de pagamento (PIX / CARTÃO / BOLETO)
    async function finalizarPedido(formaPagamento) {
      try {
        const resumoRes = await fetch("/checkout/resumo", { credentials: "include" });
        if (!resumoRes.ok) throw new Error("Erro ao buscar resumo");
        const resumo = await resumoRes.json();

        const userRes = await fetch("/api/auth/me", { credentials: "include" });
        if (!userRes.ok) throw new Error("Usuário não logado");
        const usuario = await userRes.json();

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
          cupom: resumo.cupom,
          desconto: resumo.desconto,
          subtotalComDesconto,
          freteGratis: resumo.freteGratis,
          freteOriginal: resumo.freteOriginal,
          formaPagamento,
          total: resumo.total || 0,
          itens: resumo.produtos.map(p => {
            let precoFinal = p.preco ?? 0;

            if (p.torneira === "Tap Handle Prata" || p.torneira === "Tap Handle Preta") {
              precoFinal += 15;
            }
            const refilQtd = Number(p.refil) || 1;
            if (refilQtd > 1) {
              precoFinal += (refilQtd - 1) * 40;
            }

            return {
              produtoId: p.produtoId || p.id,
              nome: p.nome,
              quantidade: p.quantidade,
              precoUnitario: precoFinal,
              cor: p.cor || "padrao",
              torneira: p.torneira || "padrao",
              refil: refilQtd
            };
          })
        };

        console.log("[FinalizarPedido] Dados enviados:", pedidoData);

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
