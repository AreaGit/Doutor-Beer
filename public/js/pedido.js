document.addEventListener("DOMContentLoaded", async () => {
  const pedidoId = window.location.pathname.split("/").pop();

  const pedidoIdEl = document.getElementById("pedidoId");
  const statusEl = document.getElementById("status");
  const metodoPagamentoEl = document.getElementById("metodoPagamento");
  const enderecoEntregaEl = document.getElementById("enderecoEntrega");
  const itensList = document.getElementById("itensList");
  const subtotalEl = document.getElementById("subtotal");
  const freteEl = document.getElementById("frete");
  const totalEl = document.getElementById("total");
  const loadingEl = document.getElementById("loadingPedido");

  const descontoCupomEl = document.getElementById("descontoCupom");
  const cupomCodigoEl = document.getElementById("cupomCodigo");

  try {
    if (loadingEl) loadingEl.style.display = "block";

    // ================== Fetch do pedido via API ==================
    const res = await fetch(`/api/pedido/${pedidoId}`, { credentials: "include" });
    if (!res.ok) throw new Error("Pedido não encontrado");

    const pedido = await res.json();

    console.log(pedido);

    // ================== Preencher informações do pedido ==================
    pedidoIdEl.textContent = `#${pedido.id}`;
    statusEl.textContent = pedido.status;
    statusEl.classList.add("status", pedido.status.toLowerCase());
    metodoPagamentoEl.textContent = pedido.metodoPagamento || "Não informado";

    // Ajusta endereço (se for string, converte para objeto)
    const endereco = typeof pedido.enderecoEntrega === "string"
      ? JSON.parse(pedido.enderecoEntrega)
      : pedido.enderecoEntrega;

    enderecoEntregaEl.textContent = endereco
      ? `${endereco.rua}, ${endereco.numero}${endereco.complemento ? " - " + endereco.complemento : ""}, ${endereco.cidade}, ${endereco.estado} - CEP: ${endereco.cep}`
      : "Endereço não informado";

     // ================== Exibir itens do pedido ==================
    itensList.innerHTML = "";
    let subtotalCalculado = 0;

    if (pedido.Itens && pedido.Itens.length > 0) {
      pedido.Itens.forEach(item => {
        const precoProduto = item.precoUnitario ?? 0;
        const quantidade = item.quantidade ?? 1;
        const precoTotal = precoProduto * quantidade;
        subtotalCalculado += precoTotal;

        const li = document.createElement("li");
        li.classList.add("produto-item");
        li.innerHTML = `
          <div class="produto-card">
            <img src="${item.imagem || '/images/no-image.png'}" 
                 alt="${item.nome || 'Produto'}" 
                 class="img-produto">

            <div class="produto-detalhes">
              <span class="nome-produto">${item.nome || "Produto"}</span>
              
              <div class="info-adicional">
                ${item.cor && item.cor !== "padrao" ? `<p>Cor: <strong>${item.cor}</strong></p>` : ""}
                ${item.torneira && item.torneira !== "padrao" ? `<p>Torneira: <strong>${item.torneira}</strong></p>` : ""}
                ${item.refil && Number(item.refil) > 1 ? `<p>Refis: <strong>${item.refil}</strong></p>` : ""}
              </div>

              <p class="quantidade">Quantidade: <strong>${quantidade}</strong></p>
              <p class="preco-unitario">Preço unitário: <strong>R$ ${precoProduto.toFixed(2).replace(".", ",")}</strong></p>
              <p class="preco-total">Total: <strong>R$ ${precoTotal.toFixed(2).replace(".", ",")}</strong></p>
            </div>
          </div>
        `;

        itensList.appendChild(li);
      });
    } else {
      itensList.innerHTML = "<li>Nenhum item encontrado no pedido.</li>";
    }

    // ================== Usar valores vindos da API ==================
    // Se o backend mandou "subtotal", "frete" e "total", usamos eles como fonte da verdade
    const subtotal = pedido.subtotal ?? subtotalCalculado;
    const frete = pedido.frete ?? 0;
    const total = pedido.total ?? (subtotal + frete);
    const descontoCupom = pedido.descontoCupom ?? 0;
    const cupomCodigo = pedido.cupom || null;

    subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;

    // Exibir "Grátis" quando o frete for 0
    if (frete === 0) {
      freteEl.textContent = "Grátis";
    } else {
      freteEl.textContent = `R$ ${frete.toFixed(2).replace(".", ",")}`;
    }

     // ✅ Desconto do cupom (só mostra valor se tiver cupom e desconto > 0)
    if (descontoCupomEl) {
      if (cupomCodigo && descontoCupom > 0) {
        descontoCupomEl.textContent = `- R$ ${descontoCupom
          .toFixed(2)
          .replace(".", ",")}`;
      } else {
        descontoCupomEl.textContent = `R$ 0,00`;
      }
    }

    // Cupom (código)
    if (cupomCodigoEl) {
      cupomCodigoEl.textContent = cupomCodigo || "Nenhum";
    }

    totalEl.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;

  } catch (err) {
    console.error("Erro ao carregar pedido:", err);
    document.body.innerHTML = `
      <p style="text-align:center;margin-top:2rem;color:#f44336;">
        Pedido não encontrado ou ocorreu um erro. <br>
        <a href="/" style="color:#2196F3;">Voltar para a página inicial</a>
      </p>
    `;
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
  }
});