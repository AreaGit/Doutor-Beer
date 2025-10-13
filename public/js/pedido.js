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

  try {
    if (loadingEl) loadingEl.style.display = "block";

    // ================== Fetch do pedido via API ==================
    const res = await fetch(`/api/pedido/${pedidoId}`, { credentials: "include" });
    if (!res.ok) throw new Error("Pedido não encontrado");

    const pedido = await res.json();

    // ================== Preencher informações do pedido ==================
    pedidoIdEl.textContent = `#${pedido.id}`;
    statusEl.textContent = pedido.status;
    metodoPagamentoEl.textContent = pedido.metodoPagamento;

    // Ajusta endereço caso esteja salvo como string
    const endereco = typeof pedido.enderecoEntrega === "string"
      ? JSON.parse(pedido.enderecoEntrega)
      : pedido.enderecoEntrega;

    enderecoEntregaEl.textContent = endereco
      ? `${endereco.rua}, ${endereco.numero}${endereco.complemento ? ' - ' + endereco.complemento : ''}, ${endereco.cidade}, ${endereco.estado} - CEP: ${endereco.cep}`
      : "Endereço não informado";

    // ================== Exibir itens do pedido ==================
    itensList.innerHTML = "";
    let subtotal = 0;

    if (pedido.Itens && pedido.Itens.length > 0) {
      pedido.Itens.forEach(item => {
        // Preço promocional se existir
        const precoProduto = item.precoUnitario ?? 0;
        const precoTotal = precoProduto * (item.quantidade ?? 1);
        subtotal += precoTotal;

        const li = document.createElement("li");
        li.classList.add("produto-item");
        li.innerHTML = `
          <img src="${item.imagem || '/images/no-image.png'}" alt="${item.nome || 'Produto'}" class="img-produto">
          <span class="nome-produto">${item.nome || "Produto"} x${item.quantidade ?? 1}</span>
          <strong class="preco-produto">R$ ${precoTotal.toFixed(2).replace(".", ",")}</strong>
        `;
        itensList.appendChild(li);
      });
    } else {
      itensList.innerHTML = "<li>Nenhum item encontrado no pedido.</li>";
    }

    // ================== Calcular total com frete ==================
    const frete = pedido.frete ?? 0;
    const total = subtotal + frete;

    subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;
    freteEl.textContent = `R$ ${frete.toFixed(2).replace(".", ",")}`;
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
