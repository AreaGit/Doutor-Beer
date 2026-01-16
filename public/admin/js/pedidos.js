/* =====================
 * PEDIDOS
 * ===================== */

let todosPedidos = []; // Armazena todos os pedidos para filtragem

async function carregarPedidos() {
  const tabelaBody = document.getElementById("listaPedidos");
  if (!tabelaBody) return;

  tabelaBody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  try {
    const response = await fetch("/api/pedido/admin");
    if (!response.ok) throw new Error("Erro ao carregar pedidos");

    todosPedidos = await response.json();

    aplicarFiltros();
  } catch (err) {
    console.error(err);
    tabelaBody.innerHTML = "<tr><td colspan='5'>Erro ao carregar pedidos.</td></tr>";
  }
}

function aplicarFiltros() {
  const tabelaBody = document.getElementById("listaPedidos");
  if (!tabelaBody) return;

  const filtroStatus = document.getElementById("filtroStatusPedido")?.value || "";
  const buscaId = document.getElementById("buscarPedidoInput")?.value.trim() || "";

  let pedidosFiltrados = [...todosPedidos];

  // Filtro por status
  if (filtroStatus) {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.status === filtroStatus);
  }

  // Busca por ID
  if (buscaId) {
    const idBuscado = buscaId.replace(/#/g, ""); // Remove # se o usuário digitar
    pedidosFiltrados = pedidosFiltrados.filter(p =>
      String(p.id).includes(idBuscado)
    );
  }

  // Renderiza resultados
  if (!pedidosFiltrados.length) {
    tabelaBody.innerHTML = "<tr><td colspan='5'>Nenhum pedido encontrado com os filtros aplicados.</td></tr>";
    return;
  }

  tabelaBody.innerHTML = pedidosFiltrados.map(p => `
    <tr data-id="${p.id}">
      <td data-label="ID">#${p.id}</td>
      <td data-label="Cliente">${p.usuario?.nome ?? "Cliente removido"}</td>
      <td data-label="Status">${p.status}</td>
      <td data-label="Total">${formatCurrency(p.total)}</td>
      <td data-label="Data">${new Date(p.criadoEm).toLocaleDateString("pt-BR")}</td>
    </tr>
  `).join("");

  // Adiciona eventos de clique
  tabelaBody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", () => {
      const pedidoId = tr.getAttribute("data-id");
      const pedido = todosPedidos.find(p => p.id == pedidoId);
      if (pedido) abrirModalPedido(pedido);
    });
  });
}

// Inicializa filtros e busca
function initFiltrosPedidos() {
  const filtroStatus = document.getElementById("filtroStatusPedido");
  const buscaInput = document.getElementById("buscarPedidoInput");
  const btnLimpar = document.getElementById("btnLimparFiltrosPedido");

  if (filtroStatus) {
    filtroStatus.addEventListener("change", aplicarFiltros);
  }

  if (buscaInput) {
    buscaInput.addEventListener("input", aplicarFiltros);
    buscaInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        aplicarFiltros();
      }
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      if (filtroStatus) filtroStatus.value = "";
      if (buscaInput) buscaInput.value = "";
      aplicarFiltros();
    });
  }
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFiltrosPedidos);
} else {
  initFiltrosPedidos();
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

      // Atualiza o pedido na lista local
      const pedidoIndex = todosPedidos.findIndex(p => p.id == pedido.id);
      if (pedidoIndex !== -1) {
        todosPedidos[pedidoIndex].status = data.status;
      }

      aplicarFiltros();
      showToast("Status do pedido atualizado.", "success");

      // Reload automático após ação impactante
      setTimeout(() => window.location.reload(), 1000);
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
  // ITENS DO PEDIDO 
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

  // Configurar botão de imprimir
  const btnPrint = document.getElementById("btnImprimirPedido");
  if (btnPrint) {
    btnPrint.onclick = () => imprimirPedido(pedido);
  }
}

function imprimirPedido(pedido) {
  const printWindow = window.open("", "_blank");

  // Formata data
  const dataPedido = new Date(pedido.createdAt || pedido.criadoEm).toLocaleString("pt-BR");

  const listaItens = pedido.itens || pedido.Itens || [];

  // Itens com detalhes (cor, torneira, refil)
  const itensHtml = listaItens.map((i, index) => {
    const nome = i.nome || i.Produto?.nome || "Produto";
    const cor = i.cor && i.cor !== "padrao" ? `<br><small>Cor: ${i.cor}</small>` : "";
    const torneira = i.torneira && i.torneira !== "padrao" ? `<br><small>Torneira: ${i.torneira}</small>` : "";
    const refil = Number(i.refil) > 1 ? `<br><small>Refis: ${i.refil}x</small>` : "";

    // Numeração sequencial
    const itemNumero = index + 1;

    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <strong>${itemNumero}. ${nome}</strong>
          <div style="color: #666; font-size: 0.9em; margin-top: 4px; padding-left: 14px;">
            ${cor} ${torneira} ${refil}
          </div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; vertical-align: top;">
          ${i.quantidade}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; vertical-align: top;">
          ${formatCurrency(i.precoUnitario || i.preco || 0)}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; vertical-align: top;">
          ${formatCurrency((i.precoUnitario || i.preco || 0) * i.quantidade)}
        </td>
      </tr>
    `;
  }).join("");

  // Endereço seguro
  const end = pedido.enderecoEntrega || {};
  const enderecoHtml = `
    ${end.rua || ""}, ${end.numero || "S/N"} <br>
    ${end.complemento ? end.complemento + " - " : ""}${end.bairro || ""} <br>
    ${end.cidade || ""}/${end.estado || ""} - CEP: ${end.cep || ""}
  `;

  // Cálculos finais
  const subtotal = Number(pedido.subtotal || 0); // items.reduce...
  const frete = Number(pedido.frete || 0);
  const desconto = Number(pedido.descontoCupom || 0);
  // Se o total não vier do banco, calcula:
  const total = pedido.total !== undefined ? Number(pedido.total) : (subtotal + frete - desconto);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pedido #${pedido.id} - Doutor Beer</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; max-width: 900px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
        .meta { color: #666; font-size: 0.9rem; }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .box h3 { border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; font-size: 1.1rem; color: #000; }
        .box p { margin: 6px 0; line-height: 1.5; font-size: 0.95rem; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { text-align: left; background: #f8f9fa; padding: 12px 10px; border-bottom: 2px solid #333; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; }
        
        .totais-container { margin-top: 30px; border-top: 2px solid #333; padding-top: 20px; display: flex; justify-content: flex-end; }
        .totais-table { width: 300px; }
        .totais-table td { padding: 5px 0; text-align: right; }
        .totais-table .label { text-align: left; color: #666; }
        .totais-table .final { font-size: 1.3rem; font-weight: bold; color: #000; padding-top: 10px; }
        
        @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; }
            .box { break-inside: avoid; }
            @page { margin: 2cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Doutor Beer</div>
        <h2>Pedido #${pedido.id}</h2>
        <div class="meta">
          Data: ${dataPedido} | Status: <strong>${pedido.status}</strong>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <h3>Dados do Cliente</h3>
          <p><strong>Nome:</strong> ${pedido.clienteNome || pedido.usuario?.nome || "Não informado"}</p>
          <p><strong>Email:</strong> ${pedido.clienteEmail || pedido.usuario?.email || "-"}</p>
          <p><strong>CPF:</strong> ${pedido.clienteCpf || pedido.usuario?.cpf || "-"}</p>
          <p><strong>Celular:</strong> ${pedido.clienteCelular || pedido.usuario?.celular || "-"}</p>
          <p><strong>Data Nasc.:</strong> ${pedido.clienteDataNascimento ? new Date(pedido.clienteDataNascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : (pedido.usuario?.data_de_nascimento ? new Date(pedido.usuario.data_de_nascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-")}</p>
        </div>
        <div class="box">
          <h3>Entrega</h3>
          <p>${enderecoHtml}</p>
        </div>
        <div class="box">
          <h3>Pagamento</h3>
          <p><strong>Método:</strong> ${pedido.metodoPagamento || pedido.formaPagamento || "-"}</p>
          <p><strong>ID Pagamento:</strong> ${pedido.paymentId || "-"}</p>
          <p><strong>Status Pagamento:</strong> ${pedido.paymentStatus || "-"}</p>
        </div>
        <div class="box">
          <h3>Cupom</h3>
          <p><strong>Código:</strong> ${pedido.cupom || "-"}</p>
          <p><strong>Desconto Aplicado:</strong> ${formatCurrency(desconto)}</p>
        </div>
      </div>

      <h3>Itens do Pedido</h3>
      <table>
        <thead>
          <tr>
            <th width="50%">Produto</th>
            <th width="10%" style="text-align: center;">Qtd.</th>
            <th width="20%" style="text-align: right;">Preço Unit.</th>
            <th width="20%" style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itensHtml}
        </tbody>
      </table>

      <div class="totais-container">
        <table class="totais-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td>${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td class="label">Cupom / Desconto:</td>
            <td style="color: #e74c3c;">- ${formatCurrency(desconto)}</td>
          </tr>
          <tr>
            <td class="label">Frete:</td>
            <td>${formatCurrency(frete)}</td>
          </tr>
          <tr>
            <td class="label final">Total:</td>
            <td class="final">${formatCurrency(total)}</td>
          </tr>
        </table>
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
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

/* =====================
 * ÚLTIMOS PEDIDOS (Dashboard)
 * ===================== */
async function carregarUltimosPedidosDashboard() {
  const tbody = document.getElementById("dashboard-ultimos-pedidos");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5">Carregando...</td>
    </tr>
  `;

  try {
    const response = await fetch("/api/pedido/admin/ultimos?limite=5");
    if (!response.ok) throw new Error("Erro ao buscar últimos pedidos");

    const pedidos = await response.json();

    if (!pedidos.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">Nenhum pedido encontrado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = pedidos.map(p => `
      <tr data-id="${p.id}">
        <td>#${p.id}</td>
        <td>${p.usuario?.nome ?? "Cliente removido"}</td>
        <td>
          <span class="status-pill status-${p.status.toLowerCase()}">
            ${p.status}
          </span>
        </td>
        <td>R$ ${Number(p.total).toFixed(2)}</td>
        <td>${new Date(p.criadoEm).toLocaleDateString("pt-BR")}</td>
      </tr>
    `).join("");

    // Clique para abrir modal do pedido
    tbody.querySelectorAll("tr").forEach(tr => {
      tr.addEventListener("click", () => {
        const id = tr.dataset.id;
        const pedido = pedidos.find(p => p.id == id);
        if (pedido) abrirModalPedido(pedido);
      });
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Erro ao carregar pedidos.</td>
      </tr>
    `;
  }
}

