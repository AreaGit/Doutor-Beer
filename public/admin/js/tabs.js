/* =====================
 * TABS / SIDEBAR
 * ===================== */

function initTabs() {
  const navItems = document.querySelectorAll(".nav-item");
  const tabs = document.querySelectorAll(".tab");
  const topbarTitle = document.querySelector(".topbar-left h1");
  const topbarSubtitle = document.querySelector(".topbar-left p");

  const tabLabels = {
    dashboard: {
      title: "Dashboard",
      subtitle: "Resumo geral da operação da loja."
    },
    produtos: {
      title: "Produtos",
      subtitle: "Gerencie o catálogo de produtos da loja."
    },
    pedidos: {
      title: "Pedidos",
      subtitle: "Controle o status e acompanhe os pedidos da loja."
    },
    clientes: {
      title: "Clientes",
      subtitle: "Visualize seus clientes e histórico de compras."
    },
    config: {
      title: "Configurações",
      subtitle: "Preferências gerais do painel e da loja."
    }
  };

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");

      // ativa item da sidebar
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      // mostra a tab correta
      tabs.forEach((tab) => {
        tab.classList.toggle("active", tab.id === tabId);
      });

      // atualiza título e subtítulo
      if (tabLabels[tabId]) {
        topbarTitle.textContent = tabLabels[tabId].title;
        topbarSubtitle.textContent = tabLabels[tabId].subtitle;
      }

      // carrega dados quando entrar nas abas
      if (tabId === "produtos") carregarProdutos();
      if (tabId === "pedidos") carregarPedidos();
      if (tabId === "clientes") carregarClientes();
    });
  });

  // botão "ver todos" de Últimos pedidos (dashboard) pula pra aba de pedidos
  document.querySelectorAll("[data-tab-jump='pedidos']").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetNav = document.querySelector(".nav-item[data-tab='pedidos']");
      if (targetNav) targetNav.click();
    });
  });
}