/* =========================================================
 * PAINEL ADMINISTRATIVO — painel-adm.js (VERSÃO ORGANIZADA)
 * Dashboard preparado para dados reais no futuro
 * ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTopbarDate();
  initLogout();
  initModals();
  initProdutoCadastro();
  initProdutoEdicao();
  initBuscaProdutos();
  initDashboard();
  initMascarasECEPClienteModal();
  carregarUltimosPedidosDashboard();

});

/* =====================
 * UTILIDADES GERAIS
 * ===================== */

function showToast(message, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast toast-${type} show`;
  setTimeout(() => el.classList.remove("show"), 2500);
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* =====================
 * DATA NO TOPO
 * ===================== */

function initTopbarDate() {
  const dateEl = document.getElementById("topbarDate");
  if (!dateEl) return;

  const hoje = new Date();
  dateEl.textContent = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

/* =====================
 * LOGOUT
 * ===================== */

function initLogout() {
  const btnLogout = document.getElementById("btnLogout");
  if (!btnLogout) return;

  btnLogout.addEventListener("click", () => {
    if (!confirm("Deseja sair do painel administrativo?")) return;

    fetch("/api/auth/logout", { method: "POST" })
      .finally(() => (window.location.href = "/login"));
  });
}

/* =====================
 * MODAIS (GENÉRICO)
 * ===================== */

function initModals() {
  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-modal-close]");
    if (closeBtn) {
      const modal = closeBtn.closest(".modal");
      if (modal) modal.style.display = "none";
    }

    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });

  const modalNovoProduto = document.getElementById("modalNovoProduto");
  const btnNovoProduto = document.getElementById("btnNovoProduto");

  if (btnNovoProduto && modalNovoProduto) {
    btnNovoProduto.addEventListener("click", () => {
      modalNovoProduto.style.display = "block";
    });
  }
}

/* =====================
 * DASHBOARD 
 * ===================== */

function initDashboard() {
  carregarResumoDashboard();
  carregarGraficoFaturamento();
}

/* MOCK CENTRAL — substituir futuramente por API */
function getDashboardMock() {
  // CARREGAR DADOS DO BACKEND
  
  return {
    resumo: {
      faturamentoMes: 42870,
      pedidosHoje: 37,
      produtosAtivos: 124,
      clientesCadastrados: 892
    },
    faturamentoSemana: {
      labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      valores: [1890, 2150, 1780, 2420, 3100, 2890, 3320]
    }
  };
}

/* KPIs */
async function carregarResumoDashboard() {
  try {
    // Busca resumo de pedidos (faturamento mês / pedidos hoje)
    let faturamentoMes = 0;
    let pedidosHoje = 0;

    try {
      const resResumo = await fetch("/api/pedido/admin/resumo-dashboard");
      if (resResumo.ok) {
        const dataResumo = await resResumo.json();
        faturamentoMes = Number(dataResumo.faturamentoMes) || 0;
        pedidosHoje = Number(dataResumo.pedidosHoje) || 0;
      }
    } catch (e) {
      console.error("Erro ao carregar resumo de pedidos (admin):", e);
      // mantém 0 como valor padrão
    }

    // Busca produtos ativos do backend
    const resProdutos = await fetch("/api/produtos/stats/ativos");
    let produtosAtivos = 124; // valor padrão em caso de erro
    
    if (resProdutos.ok) {
      const dataProdutos = await resProdutos.json();
      produtosAtivos = dataProdutos.produtosAtivos || 0;
    }

    // Busca clientes cadastrados do backend
    const resClientes = await fetch("/api/auth/stats/clientes");
    let clientesCadastrados = 892; // valor padrão em caso de erro
    
    if (resClientes.ok) {
      const dataClientes = await resClientes.json();
      clientesCadastrados = dataClientes.clientesCadastrados || 0;
    }

    const map = [
      ["Faturamento (mês)", formatCurrency(faturamentoMes)],
      ["Pedidos hoje", pedidosHoje],
      ["Produtos ativos", produtosAtivos],
      ["Clientes cadastrados", clientesCadastrados]
    ];

    document.querySelectorAll(".metric-card .metric-value").forEach((el, i) => {
      if (map[i]) el.textContent = map[i][1];
    });
  } catch (err) {
    console.error("Erro ao carregar resumo do dashboard:", err);
    const map = [
      ["Faturamento (mês)", formatCurrency(0)],
      ["Pedidos hoje", 0],
      ["Produtos ativos", 0],
      ["Clientes cadastrados", 0]
    ];

    document.querySelectorAll(".metric-card .metric-value").forEach((el, i) => {
      if (map[i]) el.textContent = map[i][1];
    });
  }
}

/* =====================
 * GRÁFICO DE FATURAMENTO
 * ===================== */

let chartFaturamentoInstance = null;

async function carregarGraficoFaturamento() {
  const ctx = document.getElementById("chartFaturamento");
  if (!ctx || !window.Chart) return;

  let data;

  try {
    const res = await fetch("/api/pedido/admin/faturamento-semana");

    if (res.ok) {
      data = await res.json();
    } else {
      // Se o backend responder com erro, cai no fallback de zeros
      throw new Error("Resposta não OK ao carregar faturamento-semana");
    }
  } catch (err) {
    console.error("Erro ao carregar faturamento dos últimos 7 dias:", err);

    // Fallback: últimos 7 dias com valor 0 (sem pedidos / erro no backend)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const labels = [];
    const valores = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      labels.push(nomesDias[d.getDay()]);
      valores.push(0);
    }

    data = { labels, valores };
  }

  if (chartFaturamentoInstance) {
    chartFaturamentoInstance.destroy();
  }

  chartFaturamentoInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Faturamento (R$)",
          data: data.valores,
          tension: 0.35,
          fill: true,
          borderWidth: 2,
          borderColor: "rgba(249, 176, 0, 1)",
          backgroundColor: "rgba(249, 176, 0, 0.12)",
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "rgba(249, 176, 0, 1)",
          pointBorderColor: "rgba(12, 12, 22, 1)"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(8,8,16,0.95)",
          borderColor: "rgba(249,176,0,0.6)",
          borderWidth: 1,
          titleColor: "#fff",
          bodyColor: "#f5f5f5",
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#b2b2d0", font: { size: 11 } }
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#9b9bb0",
            font: { size: 11 },
            callback: (v) => "R$ " + Number(v).toLocaleString("pt-BR")
          }
        }
      }
    }
  });
}



