

/* ================================================
   PROMOÇÕES ROTATIVAS
================================================ */
function initPromocoes() {
  const promoMessages = document.querySelectorAll('.promo-message');
  if (!promoMessages.length) return;

  let currentPromo = 0;
  promoMessages[0].classList.add('active');

  setInterval(() => {
    promoMessages[currentPromo].classList.remove('active');
    currentPromo = (currentPromo + 1) % promoMessages.length;
    promoMessages[currentPromo].classList.add('active');
  }, 4000);
}

/* ================================================
   BUSCA GLOBAL DE PRODUTOS
================================================ */
function initBusca() {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const suggestionsDiv = document.getElementById("searchSuggestions");
  let debounceTimeout;

  async function buscarProdutoGlobal(termo, showSuggestions = false) {
    termo = termo.trim();
    if (!termo) return (suggestionsDiv.style.display = "none");

    try {
      const resp = await fetch(`/api/produtos/busca?query=${encodeURIComponent(termo)}`);
      if (!resp.ok) throw new Error();

      const resultados = await resp.json();
      if (!resultados?.length) return (suggestionsDiv.style.display = "none");

      if (showSuggestions) {
        renderSuggestions(resultados);
      } else {
        const primeiraCategoria = resultados[0].categoria;
        window.location.href = `/categoria?categoria=${primeiraCategoria}&search=${encodeURIComponent(termo)}`;
      }
    } catch (err) {
      console.error("[BuscarProdutos] Erro:", err);
      suggestionsDiv.style.display = "none";
    }
  }

  function renderSuggestions(resultados) {
    suggestionsDiv.innerHTML = resultados.map(prod => `
      <div class="suggestion-item" data-id="${prod.id}">${prod.nome}</div>
    `).join("");
    suggestionsDiv.style.display = "block";

    document.querySelectorAll(".suggestion-item").forEach(item => {
      item.addEventListener("click", () => {
        window.location.href = `/detalhes-produto?id=${item.dataset.id}`;
      });
    });
  }

  searchInput?.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => buscarProdutoGlobal(searchInput.value, true), 300);
  });

  searchInput?.addEventListener("keypress", e => {
    if (e.key === "Enter") buscarProdutoGlobal(searchInput.value);
  });

  searchButton?.addEventListener("click", () => buscarProdutoGlobal(searchInput.value));

  document.addEventListener("click", e => {
    if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.style.display = "none";
    }
  });
}

/* ================================================
   MENU MOBILE / SUBMENUS
================================================ */
function initMenu() {
  const navToggle = document.querySelector('.nav-toggle');
  const categoriesList = document.querySelector('.categories-list');
  const subMenus = document.querySelectorAll('.has-sub');

  navToggle?.addEventListener('click', () => categoriesList.classList.toggle('show'));
  subMenus.forEach(menu => {
    menu.querySelector('a')?.addEventListener('click', e => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        menu.classList.toggle('open');
      }
    });
  });
}

/* ================================================
   STATUS DE LOGIN
================================================ */
async function checkLoginStatus() {
  const notLoggedIn = document.getElementById("notLoggedIn");
  const loggedIn = document.getElementById("loggedIn");
  const loggedSpan = document.getElementById("logged");

  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();

    notLoggedIn.style.display = "none";
    loggedIn.style.display = "block";
    loggedSpan.textContent = data.nome;
  } catch {
    notLoggedIn.style.display = "block";
    loggedIn.style.display = "none";
  }
}

/* ================================================
   PRODUTOS POR CATEGORIA
================================================ */
function initCategoriaProdutos() {
  const grid = document.querySelector(".products-grid");
  const headerTitle = document.getElementById("category-title");
  const breadcrumbName = document.getElementById("category-breadcrumb-name");
  const subtitleEl = document.getElementById("category-subtitle");
  const countBadge = document.getElementById("category-count-badge");
  const sortSelect = document.getElementById("sort");
  const chipsContainer = document.getElementById("active-filters");
  const viewButtons = document.querySelectorAll(".view-btn");

  const params = new URLSearchParams(window.location.search);
  const categoria = params.get("categoria");
  const searchTerm = params.get("search");

  // estado interno
  let currentSort = "relevance";
  let showPromoOnly = false;

  if (!grid || !categoria) {
    if (grid) grid.innerHTML = "<p>Nenhuma categoria informada.</p>";
    return;
  }

const CATEGORY_CONFIG = {
  torres: {
    title: "Torres",
    subtitle: "Encontre a torre de bebida ideal para bares, festas, restaurantes e eventos. Modelos modernos e resistentes, perfeitos para servir bebidas geladas com estilo e praticidade."
  },

  torres_de_chopp: {
    title: "Torres de Chopp",
    subtitle: "Torres de Chopp profissionais com excelente desempenho térmico. A torre para bar perfeita para servir chopp gelado em festas, restaurantes, resenhas e eventos. Ideal para quem busca uma torre moderna para bebidas."
  },

  torres_de_terere: {
    title: "Torres de Tereré",
    subtitle: "Torres de Tereré com alta capacidade térmica, mantendo o tereré gelado por horas. Ideais para festas, bares e quem busca uma torre de bebidas geladas prática e estilosa."
  },

  torres_de_chopp_360: {
    title: "Torres de Chopp 360",
    subtitle: "Torres de Chopp 360° com visual inovador e distribuição uniforme. Perfeitas para eventos, bares e restaurantes que desejam uma torre para servir bebidas com impacto visual e eficiência."
  },

  torres_de_chopp_icechopp: {
    title: "Torres de Chopp IceChopp",
    subtitle: "Modelos IceChopp com tecnologia avançada que mantém o chopp gelado por muito mais tempo. A torre de bebidas ideal para bar, festas e eventos, com tubo de alumínio e design premium."
  },

  torres_de_terere_360: {
    title: "Torres de Tereré 360",
    subtitle: "Torres de Tereré 360° com visual moderno e excelente conservação térmica. perfeitas para quem busca torre de bebida gelada com estilo para festas, bares e eventos."
  },

  torres_de_terere_icechopp: {
    title: "Torres de Tereré IceChopp",
    subtitle: "A tecnologia IceChopp aplicada ao tereré: torre com tubo de alumínio que mantém a bebida gelada por horas. Ideal para eventos, bares e quem busca uma torre moderna para bebidas."
  },

  torres_de_drinks: {
    title: "Torres de Drinks",
    subtitle: "Torres para drinks compartilhados com design premium. A escolha ideal para bares, festas e eventos que desejam uma torre para servir bebidas com apresentação diferenciada."
  },

  combos: {
    title: "Combos Doutor Beer",
    subtitle: "Combos especiais com torres de bebida, acessórios e itens essenciais para bares e eventos. A melhor opção para quem deseja economia e mais valor na operação."
  },

  chopeiras: {
    title: "Chopeiras",
    subtitle: "Chopeiras profissionais para servir chopp gelado com qualidade superior. Ideais para bares, festas, eventos e restaurantes que precisam de alto desempenho e estabilidade."
  },

  acessorios: {
    title: "Acessórios",
    subtitle: "Acessórios essenciais para sua torre de bebida ou chopeira. Itens que aumentam durabilidade, praticidade e eficiência na hora de servir bebidas em bares, festas e eventos."
  },

  acessorios_para_torre_icechopp: {
    title: "Acessórios para Torre IceChopp",
    subtitle: "Acessórios originais IceChopp, desenvolvidos para manter sua torre de bebidas geladas com máximo desempenho. Compatibilidade perfeita com modelos para bar, festas e eventos."
  },

  acessorios_para_torre_doutor_beer: {
    title: "Acessórios para Torre Doutor Beer",
    subtitle: "Acessórios exclusivos Doutor Beer para otimizar sua torre de bebida. Projetados para quem busca maior durabilidade, praticidade e performance em bares e eventos."
  },

  baldes_de_gelo: {
    title: "Baldes de Gelo",
    subtitle: "Baldes de gelo resistentes e elegantes para manter bebidas geladas em festas, bares, restaurantes e eventos. Complemento ideal para torres de bebida e chopeiras."
  },

  canudos_inox: {
    title: "Canudos Inox",
    subtitle: "Canudos de inox reutilizáveis e sustentáveis, perfeitos para drinks, bares e consumo diário. Uma opção moderna e durável para complementar suas torres de drinks."
  },

  torneiras: {
    title: "Torneiras",
    subtitle: "Torneiras para torres e chopeiras com fluxo perfeito e alta durabilidade. Compatíveis com torres de bebida para bar, festas e eventos, oferecendo maior controle ao servir bebidas."
  },

  marcas: {
    title: "Marcas",
    subtitle: "Explore as marcas Doutor Beer e IceChopp, referência em torres modernas para bebidas, acessórios profissionais e produtos de alta performance."
  },

  doutor_beer: {
    title: "Linha Doutor Beer",
    subtitle: "Linha oficial Doutor Beer com torres de bebida, acessórios e produtos profissionais. Perfeita para bares, festas e eventos que buscam qualidade superior."
  },

  icechopp: {
    title: "Linha IceChopp",
    subtitle: "Linha IceChopp com tecnologia de resfriamento avançada e tubo de alumínio. Ideal para quem deseja uma torre para bebida gelada com desempenho máximo."
  }
};



  const cfg = CATEGORY_CONFIG[categoria] || {
    title: categoria.replace(/_/g, " "),
    subtitle: "Confira os produtos disponíveis nesta categoria."
  };

  if (headerTitle) headerTitle.textContent = cfg.title;
  if (breadcrumbName) breadcrumbName.textContent = cfg.title;
  if (subtitleEl) subtitleEl.textContent = cfg.subtitle;

  function renderFilterChips() {
    if (!chipsContainer) return;
    const chips = [];

    // Chip da categoria
    chips.push(`
      <div class="filter-chip">
        <span class="material-icons">category</span>
        <span>${cfg.title}</span>
      </div>
    `);

    // Chip da busca, se existir
    if (searchTerm) {
      chips.push(`
        <div class="filter-chip">
          <span class="material-icons">search</span>
          <span>Busca: "${searchTerm}"</span>
        </div>
      `);
    }

    chipsContainer.innerHTML = chips.join("");
  }

  renderFilterChips();

  async function carregarProdutos() {
    try {
      grid.innerHTML = `
        <div class="produto skeleton-card"></div>
        <div class="produto skeleton-card"></div>
        <div class="produto skeleton-card"></div>
      `;

      const resp = await fetch(`/api/produtos/categoria/${categoria}`);
      if (!resp.ok) throw new Error(`Erro ${resp.status}`);

      let produtos = await resp.json();
      if (!produtos || !produtos.length) {
        grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
        if (countBadge) countBadge.textContent = "0 produtos";
        return;
      }

      // 🔹 Ordenação
      produtos = produtos.sort((a, b) => {
        const precoA = a.precoPromocional ?? a.preco ?? 0;
        const precoB = b.precoPromocional ?? b.preco ?? 0;

        switch (currentSort) {
          case "price-low":
            return precoA - precoB;
          case "price-high":
            return precoB - precoA;
          case "newest":
            return (b.createdAt ?? b.id ?? 0) - (a.createdAt ?? a.id ?? 0);
          case "relevance":
          default:
            return 0;
        }
      });

      // 🔥 Filtro: apenas promoções, se estiver ativado
      if (showPromoOnly) {
        produtos = produtos.filter(prod => {
          const preco = Number(prod.preco) || 0;
          const precoPromocional =
            prod.precoPromocional != null ? Number(prod.precoPromocional) : null;
          return precoPromocional && precoPromocional < preco;
        });
      }

      if (!produtos.length) {
        grid.innerHTML = showPromoOnly
          ? "<p>Nenhum produto em promoção no momento.</p>"
          : "<p>Nenhum produto encontrado.</p>";
        if (countBadge) countBadge.textContent = "0 produtos";
        return;
      }

      // Atualiza badge de contagem
      if (countBadge) {
        countBadge.textContent =
          produtos.length === 1 ? "1 produto" : `${produtos.length} produtos`;
      }

      // Renderização dos cards
      grid.innerHTML = produtos
        .map(prod => {
          const imagens = Array.isArray(prod.imagem) ? prod.imagem : [prod.imagem];
          const imagemUrl = imagens[0] || "../images/placeholder.png";

          const preco = Number(prod.preco) || 0;
          const precoPromocional =
            prod.precoPromocional != null ? Number(prod.precoPromocional) : null;

          const precoAntigoHtml =
            precoPromocional && precoPromocional < preco
              ? `<span class="antigo">${preco.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })}</span>`
              : "";

          const precoNovoValor =
            precoPromocional && precoPromocional < preco ? precoPromocional : preco;

          const precoNovoHtml = precoNovoValor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          });

          let badgeHtml = "";
          if (precoPromocional && precoPromocional < preco) {
            const discount = Math.round(100 - (precoPromocional * 100) / preco);
            badgeHtml = `
              <span class="product-badge promo">
                -${discount}% OFF
              </span>
            `;
          }

          return `
            <a href="/detalhes-produto?id=${prod.id}" class="produto">
              ${badgeHtml}
              <img src="${imagemUrl}" alt="${prod.nome}">
              <h3>${prod.nome}</h3>
              <div class="preco">
                ${precoAntigoHtml}
                <span class="novo">${precoNovoHtml}</span>
              </div>
            </a>
          `;
        })
        .join("");
    } catch (err) {
      console.error("[Categoria] Erro ao carregar produtos:", err);
      grid.innerHTML = "<p>Erro ao carregar os produtos.</p>";
      if (countBadge) countBadge.textContent = "–";
    }
  }

  // 🔹 Inicial: carrega com sort padrão + filtro atual
  carregarProdutos();

  // 🔹 Ordenação (select)
  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value;
    carregarProdutos();
  });

  // 🔹 Toggle "Todos" x "Promoções"
  viewButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode; // "all" ou "promo"

      viewButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      showPromoOnly = mode === "promo";
      carregarProdutos();
    });
  });
}



/* ================================================
   BOTÃO "VOLTAR AO TOPO"
================================================ */
function initBtnTopo() {
  const btnTop = document.getElementById("btnTop");
  window.addEventListener("scroll", () => {
    btnTop.classList.toggle("show", window.scrollY > 300);
  });
  btnTop?.addEventListener("click", e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ================================================
   CARRINHO INTERATIVO
================================================ */
async function initCart() {
  const cartButton = document.getElementById("cart-button");
  const cartSidebar = document.getElementById("cart-sidebar");
  const closeCart = document.getElementById("close-cart");
  const cartOverlay = document.getElementById("cart-overlay");
  const cartCount = document.getElementById("cart-count");
  const cartItemsContainer = document.querySelector(".cart-items");

  const summaryItems = document.getElementById("summary-items");
  const summaryQuantity = document.getElementById("summary-quantity");
  const summaryTotal = document.getElementById("summary-total");

  const couponInput = document.getElementById("coupon-code");
  const applyCouponBtn = document.getElementById("apply-coupon");
  const couponMessage = document.getElementById("coupon-message");
  const summaryDiscountLine = document.getElementById("summary-discount-line");
  const summaryDiscount = document.getElementById("summary-discount");

  let isLoggedIn = false;
  let cartItems = [];
  let guestId = null;
  let cupomAtivo = null;
  let resumoServidor = null;

  /* ================== Utilitários ================== */
  function formatBRL(valor) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }

  function setCookie(name, value, days = 30) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; path=/; expires=${date.toUTCString()}`;
  }

  function saveGuestCartToLocalStorage() {
    localStorage.setItem("guestCart", JSON.stringify(cartItems));
  }

  function loadGuestCartFromLocalStorage() {
    const data = localStorage.getItem("guestCart");
    return data ? JSON.parse(data) : [];
  }

  function setCouponFeedback(type, message) {
    if (!couponInput) return;

    couponInput.classList.remove("coupon-success", "coupon-error");

    if (couponMessage) {
      couponMessage.textContent = "";
      couponMessage.classList.remove("success", "error");
      couponMessage.style.display = "none";
    }

    if (!type) {
      couponInput.placeholder = "Digite seu cupom";
      return;
    }

    couponInput.placeholder = message || "Digite seu cupom";
    couponInput.value = "";

    if (type === "success") {
      couponInput.classList.add("coupon-success");
    } else if (type === "error") {
      couponInput.classList.add("coupon-error");
    }
  }

  /* ================== Detectar login ================== */
  async function checkLoginStatus() {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });
      isLoggedIn = res.ok;
      return isLoggedIn;
    } catch (error) {
      console.error("[Carrinho] Erro ao verificar login:", error);
      isLoggedIn = false;
      return false;
    }
  }

  /* ================== Guest ID ================== */
  async function ensureGuestId() {
    if (isLoggedIn) {
      guestId = null;
      return null;
    }

    guestId = getCookie("guestId");

    if (!guestId) {
      guestId = `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setCookie("guestId", guestId, 30);
      console.log("[Carrinho] Novo guestId criado:", guestId);
    } else {
      console.log("[Carrinho] GuestId recuperado:", guestId);
    }

    return guestId;
  }

  /* ================== MESCLAR CARRINHO GUEST → USUÁRIO ================== */
  async function mergeGuestCart() {
    if (!isLoggedIn) return false;

    const guestCart = loadGuestCartFromLocalStorage();
    if (!guestCart.length) return false;

    try {
      await Promise.all(
        guestCart.map((item) =>
          fetch("/api/carrinho/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              produtoId: item.id,
              quantidade: item.quantidade,
            }),
          })
        )
      );

      localStorage.removeItem("guestCart");
      console.log("[Carrinho] Carrinho do guest mesclado ao usuário");
      return true;
    } catch (err) {
      console.error("[Carrinho] Erro ao mesclar carrinho guest:", err);
      return false;
    }
  }

  /* ================== Buscar carrinho (BACK) ================== */
  async function fetchCart() {
    if (isLoggedIn) {
      try {
        const resp = await fetch("/api/carrinho", { credentials: "include" });

        if (!resp.ok) {
          resumoServidor = null;
          cupomAtivo = null;
          return [];
        }

        const data = await resp.json();

        if (Array.isArray(data)) {
          resumoServidor = null;
          cupomAtivo = null;
          return data;
        }

        resumoServidor = {
          subtotal: data.subtotal || 0,
          desconto: data.desconto || 0,
          total: data.total || 0,
        };
        cupomAtivo = data.cupom || null;

        return data.items || [];
      } catch (err) {
        console.error("[Carrinho] Erro ao buscar carrinho do servidor:", err);
        resumoServidor = null;
        cupomAtivo = null;
        return [];
      }
    } else {
      resumoServidor = null;
      cupomAtivo = null;
      return loadGuestCartFromLocalStorage();
    }
  }

  /* ✅ Helper central: sempre que mudar algo no carrinho logado */
  async function syncCartFromServer() {
    cartItems = await fetchCart();
    renderCart();
  }

  /* ================== Renderizar carrinho ================== */
  const colorTranslations = {
    red: "Vermelho",
    blue: "Azul",
    black: "Preto",
    white: "Branco",
    green: "Verde",
    yellow: "Amarelo",
    brown: "Marrom",
    orange: "Laranja",
    pink: "Rosa",
    purple: "Roxo",
    gray: "Cinza",
    silver: "Prata",
    gold: "Dourado",
    beige: "Bege",
    transparent: "Transparente",
  };

  function renderCart() {
    cartItemsContainer.innerHTML = "";

    if (!cartItems.length) {
      cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio.</p>";
      updateResumo();
      return;
    }

    cartItems.forEach((item, index) => {
      const preco = item.preco ?? item.precoPromocional ?? 0;
      const produtoId = item.produtoId || item.id || (item.produto && item.produto.id);

      const imageSrc = Array.isArray(item.imagem)
        ? item.imagem[0]
        : (item.imagemPrincipal || item.imagem || "");

      const itemDiv = document.createElement("div");
      itemDiv.className = "cart-item";

      itemDiv.innerHTML = `
        <a 
          href="${produtoId ? `/detalhes-produto?id=${produtoId}` : "#"}" 
          class="cart-item-image-link"
        >
          <img src="${imageSrc}" alt="${item.nome}">
        </a>
        <div class="cart-item-info">
          <h4>${item.nome}</h4>

          ${
            item.cor &&
            item.cor !== "padrao" &&
            item.cor !== "default" &&
            item.cor !== ""
              ? `
            <div class="cart-color">
              <span class="color-circle" 
                style="background-color:${
                  typeof item.cor === "object" ? item.cor.hex || "#ccc" : item.cor
                };">
              </span>
              <span class="color-name">
                ${(() => {
                  const corEn =
                    typeof item.cor === "object"
                      ? item.cor.nome || item.cor.hex || ""
                      : item.cor;
                  const corKey = corEn?.toLowerCase().trim();
                  return colorTranslations[corKey] || corEn;
                })()}
              </span>
            </div>
          `
              : ""
          }

          ${
            item.torneira && item.torneira !== "padrao" && item.torneira !== ""
              ? `
            <div class="cart-torneira">
              <span class="torneira-label">Torneira:</span>
              <span class="torneira-name">${item.torneira}</span>
            </div>
          `
              : ""
          }

          ${
            item.refil
              ? `
            <div class="cart-refil">
              <span class="refil-label">Refis:</span>
              <span class="refil-count">${item.refil}</span>
            </div>
          `
              : ""
          }

          <p class="cart-price">
            ${preco.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>

          <div class="cart-quantity">
            <button class="qty-btn minus" data-index="${index}">-</button>
            <input type="number" min="1" value="${
              item.quantidade
            }" data-index="${index}" class="quantity-input">
            <button class="qty-btn plus" data-index="${index}">+</button>
          </div>

          <button class="remove-btn" data-index="${index}">Remover</button>
        </div>
      `;

      cartItemsContainer.appendChild(itemDiv);
    });

    // Controles de quantidade
    document.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.index);
        const novoValor = btn.classList.contains("plus")
          ? cartItems[idx].quantidade + 1
          : Math.max(1, cartItems[idx].quantidade - 1);
        await updateQuantity(idx, novoValor);
      });
    });

    document.querySelectorAll(".quantity-input").forEach((input) => {
      input.addEventListener("change", async () => {
        const idx = parseInt(input.dataset.index);
        let novaQtd = parseInt(input.value);
        if (isNaN(novaQtd) || novaQtd < 1) novaQtd = 1;
        await updateQuantity(idx, novaQtd);
      });
    });

    // Remover
    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.index);
        await removeItem(idx);
      });
    });

    updateResumo();
  }

  /* ================== Atualizar resumo ================== */
function updateResumo() {
  const totalItems = cartItems.length;
  const totalQuantity = cartItems.reduce((acc, i) => acc + i.quantidade, 0);

  const subtotalCalc = cartItems.reduce((acc, i) => {
    const precoBase = i.preco ?? i.precoPromocional ?? 0;
    return acc + precoBase * i.quantidade;
  }, 0);

  let totalParaMostrar = subtotalCalc;
  let descontoParaMostrar = 0;

  if (isLoggedIn && resumoServidor) {
    totalParaMostrar = resumoServidor.total ?? subtotalCalc;
    descontoParaMostrar = resumoServidor.desconto ?? 0;
  }

  if (cartCount) cartCount.textContent = totalQuantity;
  if (summaryItems) summaryItems.textContent = totalItems;
  if (summaryQuantity) summaryQuantity.textContent = totalQuantity;
  if (summaryTotal) summaryTotal.textContent = formatBRL(totalParaMostrar);

  if (summaryDiscountLine && summaryDiscount) {
    if (descontoParaMostrar > 0) {
      summaryDiscountLine.style.display = "block";
      summaryDiscount.textContent = formatBRL(descontoParaMostrar);
    } else {
      summaryDiscountLine.style.display = "none";
      summaryDiscount.textContent = formatBRL(0);
    }
  }

  if (!isLoggedIn) saveGuestCartToLocalStorage();
}

  /* ================== Aplicar cupom ================== */
  if (applyCouponBtn && couponInput && couponMessage) {
    applyCouponBtn.addEventListener("click", async () => {
      const codigo = couponInput.value.trim();

      setCouponFeedback(null, "");
      couponInput.placeholder = "Digite seu cupom";

      if (!codigo) {
        setCouponFeedback("error", "Digite o código do cupom 😉");
        return;
      }

      applyCouponBtn.disabled = true;
      const oldText = applyCouponBtn.textContent;
      applyCouponBtn.textContent = "Aplicando...";

      try {
        const res = await fetch("/api/carrinho/apply-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ codigo }),
        });

        let data = null;
        try {
          data = await res.json();
        } catch (e) {
          setCouponFeedback(
            "error",
            "Erro ao processar a resposta do servidor. Tente novamente em instantes 🙏"
          );
          return;
        }

        if (!res.ok) {
          setCouponFeedback(
            "error",
            (data && data.message) ||
              "Erro ao aplicar cupom. Tente novamente em instantes 🙏"
          );
          return;
        }

        if (!data.success) {
          let msg = data.message || "Não foi possível aplicar o cupom.";

          switch (data.code) {
            case "NAO_LOGADO":
              msg = "Você precisa estar logado para usar cupons 💙";
              break;
            case "CARRINHO_VAZIO":
              msg = "Seu carrinho está vazio. Adicione um produto 😊";
              break;
            case "CUPOM_INVALIDO":
              msg = "Cupom não encontrado. Confira se escreveu certinho 😉";
              break;
            case "JA_USOU":
              msg = "Você já usou este cupom em outra compra 💙";
              break;
            case "JA_APLICADO_NO_CARRINHO":
              msg = "Este cupom já está aplicado nesta compra 😄";
              break;
            case "MINIMO_NAO_ATINGIDO":
              if (typeof data.faltam === "number") {
                msg = `Faltam ${formatBRL(
                  data.faltam
                )} para usar este cupom 😉`;
              }
              break;
            default:
              break;
          }

          setCouponFeedback("error", msg);

          cupomAtivo = null;
          if (summaryDiscountLine) summaryDiscountLine.style.display = "none";
          await syncCartFromServer();
          return;
        }

        // Sucesso 🎉
        cupomAtivo = data.cupom;

        setCouponFeedback(
          "success",
          `Cupom ${data.cupom.codigo} aplicado! Desconto de ${formatBRL(
            data.desconto
          )} 🎉`
        );

        // ✅ recarrega tudo do servidor (subtotais + desconto)
        await syncCartFromServer();

        applyCouponBtn.textContent = "Cupom aplicado ✅";
        applyCouponBtn.disabled = true;
      } catch (err) {
        setCouponFeedback(
          "error",
          "Não foi possível se conectar ao servidor. Verifique sua conexão e tente novamente 🙏"
        );
      } finally {
        if (!cupomAtivo) {
          applyCouponBtn.disabled = false;
          applyCouponBtn.textContent = oldText;
        }
      }
    });
  }

  /* ================== Atualizar quantidade ================== */
  async function updateQuantity(idx, quantidade) {
    if (idx < 0 || idx >= cartItems.length) return;

    const item = cartItems[idx];
    const produtoId = item.produtoId || item.id || item.produto?.id;
    const cor = item.cor && item.cor !== "" ? item.cor : "padrao";
    const torneira = item.torneira && item.torneira !== "" ? item.torneira : "padrao";
    const refil = item.refil || null;

    console.log("[Carrinho] Atualizando quantidade:", {
      produtoId,
      cor,
      torneira,
      quantidade,
    });

    if (isLoggedIn) {
      try {
        await fetch("/api/carrinho/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            produtoId,
            quantidade,
            cor,
            torneira,
            refil,
          }),
        });

        // ✅ sempre sincroniza do servidor
        await syncCartFromServer();
      } catch (err) {
        console.error("[Carrinho] Erro ao atualizar quantidade:", err);
      }
    } else {
      cartItems[idx].quantidade = quantidade;
      saveGuestCartToLocalStorage();
      renderCart();
    }
  }

  /* ================== Remover item ================== */
  async function removeItem(idx) {
    if (idx < 0 || idx >= cartItems.length) return;

    const item = cartItems[idx];

    const produtoId = item.produtoId || item.id || item.produto?.id;
    const cor = item.cor && item.cor !== "" ? item.cor : "padrao";
    const torneira = item.torneira && item.torneira !== "" ? item.torneira : "padrao";
    const refil = item.refil || null;

    console.log("[Carrinho] Removendo item:", { produtoId, cor, torneira });

    if (isLoggedIn) {
      try {
        const response = await fetch("/api/carrinho/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ produtoId, cor, torneira, refil }),
        });

        if (!response.ok) {
          console.error(
            "[Carrinho] Falha ao remover do servidor:",
            response.status
          );
        }

        // ✅ recarrega tudo do servidor
        await syncCartFromServer();
      } catch (err) {
        console.error("[Carrinho] Erro ao remover item:", err);
      }
    } else {
      cartItems.splice(idx, 1);
      saveGuestCartToLocalStorage();
      renderCart();
    }
  }

  /* ================== Adicionar produto ================== */
  window.addToCart = async function (produto) {
    if (!produto || !produto.id) return;

    const corSelecionada =
      produto.cor?.hex || produto.cor || produto.corSelecionada || "padrao";
    const torneiraSelecionada =
      produto.torneira || produto.torneiraSelecionada || "padrao";

    const imagemPrincipal =
      produto.imagemPrincipal ||
      (Array.isArray(produto.imagem) ? produto.imagem[0] : produto.imagem);

    const existingIndex = cartItems.findIndex(
      (i) =>
        i.id === produto.id &&
        (i.cor?.hex || i.cor || "padrao") === corSelecionada &&
        (i.torneira || "padrao") === torneiraSelecionada &&
        (Number(i.refil) || 1) === (Number(produto.refil) || 1)
    );

    if (!isLoggedIn) {
      // guest: controla só no front/localStorage
      if (existingIndex >= 0) {
        cartItems[existingIndex].quantidade += produto.quantidade || 1;
      } else {
        cartItems.push({
          ...produto,
          quantidade: produto.quantidade || 1,
          cor: corSelecionada,
          torneira: torneiraSelecionada,
          imagem: imagemPrincipal,
          imagemPrincipal,
        });
      }

      saveGuestCartToLocalStorage();
      renderCart();
      return;
    }

    // logado: controla pelo back
    try {
      await fetch("/api/carrinho/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          produtoId: produto.id,
          quantidade: produto.quantidade || 1,
          cor: corSelecionada,
          torneira: torneiraSelecionada,
          refil: produto.refil || null,
        }),
      });

      // ✅ sempre puxa carrinho atualizado do servidor
      await syncCartFromServer();
    } catch (err) {
      console.error("[Carrinho] Erro ao adicionar produto:", err);
    }
  };

  /* ================== Abrir/Fechar carrinho ================== */
  if (cartButton && cartSidebar && cartOverlay) {
    cartButton.addEventListener("click", () => {
      cartSidebar.classList.add("active");
      cartOverlay.classList.add("active");
    });

    closeCart &&
      closeCart.addEventListener("click", () => {
        cartSidebar.classList.remove("active");
        cartOverlay.classList.remove("active");
      });

    cartOverlay.addEventListener("click", () => {
      cartSidebar.classList.remove("active");
      cartOverlay.classList.remove("active");
    });
  }

  /* ================== Inicializar ================== */
  async function initializeCart() {
    const wasLoggedIn = isLoggedIn;
    await checkLoginStatus();
    await ensureGuestId();

    if (isLoggedIn && !wasLoggedIn) {
      await mergeGuestCart();
    }

    // ✅ já sincroniza do servidor na inicialização
    cartItems = await fetchCart();
    renderCart();

    console.log(
      "[Carrinho] Inicializado - Logado:",
      isLoggedIn,
      "Itens:",
      cartItems.length
    );
  }

  await initializeCart();

  if (cupomAtivo && resumoServidor) {
    setCouponFeedback(
      "success",
      `Cupom ${cupomAtivo.codigo} já está aplicado! Desconto de ${formatBRL(
        resumoServidor.desconto
      )} 🎉`
    );
    updateResumo();
  }

  /* ================== Finalizar Compra ================== */
  const finalizar = document.getElementById("finalizar");

  if (finalizar) {
    finalizar.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const aindaLogado = res.ok;

        if (!aindaLogado) {
          const modal = document.getElementById("modalLogin");
          if (modal) {
            modal.classList.add("show");
            const btnIrLogin = document.getElementById("btnIrLogin");
            const btnFecharModal = document.getElementById("btnFecharModal");
            btnIrLogin &&
              (btnIrLogin.onclick = () => (window.location.href = "/login"));
            btnFecharModal &&
              (btnFecharModal.onclick = () =>
                modal.classList.remove("show"));
          } else {
            window.location.href = "/login";
          }
          return;
        }

        if (!cartItems || cartItems.length === 0) {
          const modal = document.getElementById("modalCarrinhoVazio");
          if (modal) {
            modal.classList.add("show");
            const btnFecharCarrinho =
              document.getElementById("btnFecharCarrinho");
            btnFecharCarrinho &&
              (btnFecharCarrinho.onclick = () =>
                modal.classList.remove("show"));
          }
          return;
        }

        window.location.href = "/endereco";
      } catch (err) {
        console.error("[Checkout] Erro ao finalizar compra:", err);
      }
    });
  }
}
/* ================================================
   ACORDEÃO DA SIDEBAR DE FILTROS
================================================ */
function initFilterAccordion() {
  const groups = document.querySelectorAll(".filters .filter-group");
  if (!groups.length) return;

  function applyResponsiveState() {
    const isMobile = window.innerWidth <= 900;

    groups.forEach(group => {
      const body = group.querySelector(".filter-group-body");
      if (!body) return;

      if (isMobile) {
        // Em mobile, começa tudo fechado (a não ser que já tenha sido aberto pelo usuário)
        if (group.classList.contains("open")) {
          body.style.maxHeight = body.scrollHeight + "px";
        } else {
          body.style.maxHeight = "0px";
        }
      } else {
        // Em desktop, tudo aberto por padrão
        group.classList.add("open");
        body.style.maxHeight = body.scrollHeight + "px";
      }
    });
  }

  groups.forEach(group => {
    const header = group.querySelector(".filter-group-header");
    const body = group.querySelector(".filter-group-body");
    if (!header || !body) return;

    // Estado inicial será aplicado depois via applyResponsiveState()

    header.addEventListener("click", () => {
      const isOpen = group.classList.toggle("open");

      if (isOpen) {
        // Expande suavemente
        body.style.maxHeight = body.scrollHeight + "px";
      } else {
        // Fecha
        body.style.maxHeight = "0px";
      }
    });
  });

  // Aplica estado inicial (mobile x desktop)
  applyResponsiveState();
  window.addEventListener("resize", applyResponsiveState);
}


/* ================================================
   INICIALIZAÇÃO
================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initPromocoes();
  initBusca();
  initMenu();
  checkLoginStatus();
  initCategoriaProdutos();
  initBtnTopo();
  initCart();
  initFilterAccordion();
});