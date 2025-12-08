/* =====================
 * PEDIDOS
 * ===================== */

async function carregarPedidos() {
  const tabelaBody = document.getElementById("listaPedidos");
  if (!tabelaBody) return;

  tabelaBody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  try {
    const response = await fetch("/api/pedido/admin");
    if (!response.ok) throw new Error("Erro ao carregar pedidos");

    const pedidos = await response.json();

    if (!pedidos.length) {
      tabelaBody.innerHTML = "<tr><td colspan='5'>Nenhum pedido encontrado.</td></tr>";
      return;
    }

    tabelaBody.innerHTML = pedidos.map(p => `
      <tr data-id="${p.id}">
        <td data-label="ID">#${p.id}</td>
        <td data-label="Cliente">${p.usuario?.nome ?? "Cliente removido"}</td>
        <td data-label="Status">${p.status}</td>
        <td data-label="Total">${formatCurrency(p.total)}</td>
        <td data-label="Data">${new Date(p.criadoEm).toLocaleDateString("pt-BR")}</td>
      </tr>
    `).join("");

    tabelaBody.querySelectorAll("tr").forEach(tr => {
      tr.addEventListener("click", () => {
        const pedidoId = tr.getAttribute("data-id");
        const pedido = pedidos.find(p => p.id == pedidoId);
        abrirModalPedido(pedido);
      });
    });
  } catch (err) {
    console.error(err);
    tabelaBody.innerHTML = "<tr><td colspan='5'>Erro ao carregar pedidos.</td></tr>";
  }
}

function abrirModalPedido(pedido) {
  const modal = document.getElementById("modalPedido");
  if (!modal) return;

  modal.style.display = "block";

  // Título / cliente
  document.getElementById("modalPedidoId").innerText = "#" + pedido.id;
  document.getElementById("modalClientePed").innerText = pedido.usuario?.nome ?? "Cliente removido";

  // Select de status
  const statusSelect = document.getElementById("modalStatus");
  statusSelect.innerHTML = `
    <option value="Pendente">Pendente</option>
    <option value="Processando">Processando</option>
    <option value="Enviado">Enviado</option>
    <option value="Entregue">Entregue</option>
    <option value="Cancelado">Cancelado</option>
  `;
  statusSelect.value = pedido.status;
  aplicarCorStatusTexto(statusSelect);

  statusSelect.onchange = async () => {
    const novoStatus = statusSelect.value;
    aplicarCorStatusTexto(statusSelect);

    try {
      const response = await fetch(`/api/pedido/admin/${pedido.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao atualizar status");

      console.log("Status atualizado:", data.status);
      carregarPedidos();
      showToast("Status do pedido atualizado.", "success");
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      showToast("Erro ao atualizar status do pedido.", "error");
    }
  };

  // Endereço
  const end = pedido.enderecoEntrega || {};
  document.getElementById("modalEndereco").innerText =
    `${end.rua ?? ""}, ${end.numero ?? ""} - ${end.cidade ?? ""} / ${end.estado ?? ""}, CEP: ${end.cep ?? ""}`;

  // Pagamento (ajustei pra tentar formaPagamento ou metodoPagamento)
  document.getElementById("modalPagamento").innerText =
    pedido.metodoPagamento || pedido.formaPagamento || "-";

  // ===========================
  // ITENS DO PEDIDO (AQUI ESTAVA O ERRO)
  // ===========================
  const itensContainer = document.getElementById("modalItens");

  // Garante que sempre seja um array, mesmo que venha undefined
  const itens = Array.isArray(pedido.itens)
    ? pedido.itens
    : Array.isArray(pedido.Itens)
      ? pedido.Itens
      : [];

  if (!itens.length) {
    itensContainer.innerHTML = `
      <p style="font-size:0.82rem;color:#9b9bb0;">
        Nenhum item encontrado neste pedido.
      </p>
    `;
  } else {
    itensContainer.innerHTML = itens.map(i => {
      const imagem = i.imagem?.[0] ?? "/images/no-image.png";
      const nome = i.nome || i.Produto?.nome || "Produto";
      const qtd = i.quantidade ?? 1;
      const preco = i.precoUnitario ?? i.preco ?? 0;
      console.log(i)
      return `
        <div class="item-card">
          <img src="${i.imagem}" alt="${nome}">
          <div class="item-details">
            <span><strong>${nome}</strong></span>
            <span>Qtd: ${qtd}x</span>
            <span>Unit: ${formatCurrency(preco)}</span>
            <span>Subtotal: ${formatCurrency(preco * qtd)}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // Totais (com fallback pra não quebrar)
  const subtotal = pedido.subtotal ?? pedido.subTotal ?? 0;
  const frete = pedido.frete ?? 0;
  const total = pedido.total ?? (subtotal + frete);

  document.getElementById("modalSubtotal").innerText = subtotal.toFixed(2);
  document.getElementById("modalFrete").innerText = frete.toFixed(2);
  document.getElementById("modalTotal").innerText = total.toFixed(2);
}


function aplicarCorStatusTexto(select) {
  const status = select.value;
  select.style.backgroundColor = "#101018";
  select.style.fontWeight = "600";
  select.style.border = "1px solid rgba(255,255,255,0.06)";
  select.style.borderRadius = "999px";
  select.style.padding = "4px 10px";
  select.style.fontSize = "0.8rem";

  switch (status) {
    case "Pendente":
      select.style.color = "#F9B000";
      break;
    case "Processando":
      select.style.color = "#3498db";
      break;
    case "Enviado":
      select.style.color = "#9b59b6";
      break;
    case "Entregue":
      select.style.color = "#27ae60";
      break;
    case "Cancelado":
      select.style.color = "#e74c3c";
      break;
    default:
      select.style.color = "#ddd";
  }
}