document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTopbarDate();
  initLogout();
  initModals();
  initProdutoCadastro();
  initProdutoEdicao();
  initBuscaProdutos();
  initChart();
  initMascarasECEPClienteModal();
  // As abas carregam dados sob demanda:
  // - produtos: carregarProdutos()
  // - pedidos: carregarPedidos()
  // - clientes: carregarClientes()
});

/* =====================
 * UTILIDADES GERAIS
 * ===================== */

function showToast(message, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast toast-${type} show`;
  setTimeout(() => {
    el.classList.remove("show");
  }, 2500);
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
  const formatado = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  dateEl.textContent = formatado;
}

/* =====================
 * LOGOUT
 * ===================== */

function initLogout() {
  const btnLogout = document.getElementById("btnLogout");
  if (!btnLogout) return;

  btnLogout.addEventListener("click", () => {
    if (confirm("Deseja sair do painel administrativo?")) {
      fetch("/api/auth/logout", { method: "POST" })
        .finally(() => {
          window.location.href = "/login";
        });
    }
  });
}

/* =====================
 * MODAIS (GENÉRICO)
 * ===================== */

function initModals() {
  // Fecha modais pelos botões com data-modal-close
  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-modal-close]");
    if (closeBtn) {
      const modal = closeBtn.closest(".modal");
      if (modal) modal.style.display = "none";
    }
  });

  // Fecha clicando no overlay
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });

  // Modal "Novo Produto" tem abertura por botão
  const modalNovoProduto = document.getElementById("modalNovoProduto");
  const btnNovoProduto = document.getElementById("btnNovoProduto");

  if (btnNovoProduto && modalNovoProduto) {
    btnNovoProduto.addEventListener("click", () => {
      modalNovoProduto.style.display = "block";
    });
  }
}

/* =====================
 * GRÁFICO DE FATURAMENTO (fake por enquanto)
 * ===================== */

function initChart() {
  const ctxFat = document.getElementById("chartFaturamento");
  if (!ctxFat || !window.Chart) return;

  const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const valores = [1890, 2150, 1780, 2420, 3100, 2890, 3320]; // fake

  new Chart(ctxFat, {
    type: "line",
    data: {
      labels: dias,
      datasets: [
        {
          label: "Faturamento (R$)",
          data: valores,
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
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "rgba(8,8,16,0.95)",
          borderColor: "rgba(249,176,0,0.6)",
          borderWidth: 1,
          titleColor: "#ffffff",
          bodyColor: "#f5f5f5",
          padding: 8,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: "#b2b2d0",
            font: {
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: "rgba(255,255,255,0.04)"
          },
          ticks: {
            color: "#9b9bb0",
            font: {
              size: 11
            },
            callback: (value) => "R$ " + Number(value).toLocaleString("pt-BR")
          }
        }
      }
    }
  });
}
