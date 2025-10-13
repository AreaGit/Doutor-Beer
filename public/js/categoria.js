

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
  const header = document.querySelector(".category-header h2");
  const sortSelect = document.querySelector(".sort");
  const params = new URLSearchParams(window.location.search);
  const categoria = params.get("categoria");

  if (!categoria) return grid.innerHTML = "<p>Nenhuma categoria informada.</p>";
  header.textContent = categoria.replace(/_/g, " ").toUpperCase();

  async function carregarProdutos(ordenar = "relevance") {
    try {
      const resp = await fetch(`/api/produtos/categoria/${categoria}?ordenar=${ordenar}`);
      if (!resp.ok) throw new Error();

      const produtos = await resp.json();
      if (!produtos.length) return grid.innerHTML = "<p>Nenhum produto encontrado.</p>";

      grid.innerHTML = produtos.map(prod => `
        <a href="/detalhes-produto?id=${prod.id}" class="produto">
          <img src="${prod.imagem[0]}" alt="${prod.nome}">
          <h3>${prod.nome}</h3>
          <p class="preco">
            ${prod.preco ? `<span class="antigo">${prod.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>` : ""}
            <span class="novo">${prod.precoPromocional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </p>
        </a>
      `).join("");
    } catch {
      grid.innerHTML = "<p>Erro ao carregar os produtos.</p>";
    }
  }

  carregarProdutos();
  sortSelect?.addEventListener("change", () => carregarProdutos(sortSelect.value));
}

/* ================================================
   SLIDER DE BANNER
================================================ */
function initSlider() {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const prev = document.querySelector('.prev');
  const next = document.querySelector('.next');
  let currentIndex = 0;

  function showSlide(index) {
    if (!slides.length) return;
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    document.querySelector('.slides').style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    currentIndex = index;
  }

  prev?.addEventListener('click', () => showSlide(currentIndex - 1));
  next?.addEventListener('click', () => showSlide(currentIndex + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));

  if (slides.length) { showSlide(0); setInterval(() => showSlide(currentIndex + 1), 5000); }
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
  const cartButton = document.getElementById('cart-button');
  const cartSidebar = document.getElementById('cart-sidebar');
  const closeCart = document.getElementById('close-cart');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartCount = document.getElementById("cart-count");
  const cartItemsContainer = document.querySelector(".cart-items");

  const summaryItems = document.getElementById("summary-items");
  const summaryQuantity = document.getElementById("summary-quantity");
  const summaryTotal = document.getElementById("summary-total");

  let isLoggedIn = false;
  let cartItems = [];
  let guestId = null;

  /* ================== Utilitários ================== */
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days = 30) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value}; path=/; expires=${date.toUTCString()}`;
  }

  function saveGuestCartToLocalStorage() {
    localStorage.setItem('guestCart', JSON.stringify(cartItems));
  }

  function loadGuestCartFromLocalStorage() {
    const data = localStorage.getItem('guestCart');
    return data ? JSON.parse(data) : [];
  }

  /* ================== Detectar login ================== */
  async function checkLoginStatus() {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include"
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
      await Promise.all(guestCart.map(item =>
        fetch("/api/carrinho/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ produtoId: item.id, quantidade: item.quantidade })
        })
      ));

      localStorage.removeItem('guestCart');
      console.log("[Carrinho] Carrinho do guest mesclado ao usuário");
      return true;
    } catch (err) {
      console.error("[Carrinho] Erro ao mesclar carrinho guest:", err);
      return false;
    }
  }

  /* ================== Buscar carrinho ================== */
  async function fetchCart() {
    if (isLoggedIn) {
      try {
        const resp = await fetch("/api/carrinho", { credentials: "include" });
        if (resp.ok) {
          const data = await resp.json();
          return data;
        }
        return [];
      } catch (err) {
        console.error("[Carrinho] Erro ao buscar carrinho do servidor:", err);
        return [];
      }
    } else {
      return loadGuestCartFromLocalStorage();
    }
  }

  /* ================== Renderizar carrinho ================== */
  function renderCart() {
    cartItemsContainer.innerHTML = "";

    if (!cartItems.length) {
      cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio.</p>";
      updateResumo();
      return;
    }

    cartItems.forEach((item, index) => {
      const preco = item.precoPromocional ?? item.preco ?? 0;

      const itemDiv = document.createElement("div");
      itemDiv.className = "cart-item";
      itemDiv.innerHTML = `
    <img src="${item.imagem || ''}" alt="${item.nome}">
    <div class="cart-item-info">
      <h4>${item.nome}</h4>
      <p>${preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      <div class="cart-quantity">
        <button class="qty-btn minus" data-index="${index}">-</button>
        <input type="number" min="1" value="${item.quantidade}" data-index="${index}" class="quantity-input">
        <button class="qty-btn plus" data-index="${index}">+</button>
      </div>
      <button class="remove-btn" data-index="${index}">Remover</button>
    </div>
  `;
      cartItemsContainer.appendChild(itemDiv);
    });

    // Controles de quantidade e remover
    document.querySelectorAll(".qty-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.index);
        const novoValor = btn.classList.contains("plus")
          ? cartItems[idx].quantidade + 1
          : Math.max(1, cartItems[idx].quantidade - 1);
        await updateQuantity(idx, novoValor);
      });
    });

    document.querySelectorAll(".quantity-input").forEach(input => {
      input.addEventListener("change", async () => {
        const idx = parseInt(input.dataset.index);
        let novaQtd = parseInt(input.value);
        if (isNaN(novaQtd) || novaQtd < 1) novaQtd = 1;
        await updateQuantity(idx, novaQtd);
      });
    });

    document.querySelectorAll(".remove-btn").forEach(btn => {
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
    const total = cartItems.reduce((acc, i) => acc + ((i.precoPromocional || i.preco || 0) * i.quantidade), 0);

    cartCount.textContent = totalQuantity;
    summaryItems.textContent = totalItems;
    summaryQuantity.textContent = totalQuantity;
    summaryTotal.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (!isLoggedIn) saveGuestCartToLocalStorage();
  }

  /* ================== Atualizar quantidade ================== */
  async function updateQuantity(idx, quantidade) {
    if (idx < 0 || idx >= cartItems.length) return;

    cartItems[idx].quantidade = quantidade;

    if (isLoggedIn) {
      try {
        await fetch("/api/carrinho/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ produtoId: cartItems[idx].id, quantidade })
        });
      } catch (err) {
        console.error("[Carrinho] Erro ao atualizar quantidade:", err);
      }
    } else {
      saveGuestCartToLocalStorage();
    }

    renderCart();
  }

  /* ================== Remover item ================== */
  async function removeItem(idx) {
    if (idx < 0 || idx >= cartItems.length) return;

    const produtoId = cartItems[idx].id;
    cartItems.splice(idx, 1);

    if (isLoggedIn) {
      try {
        await fetch("/api/carrinho/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ produtoId })
        });
      } catch (err) {
        console.error("[Carrinho] Erro ao remover item:", err);
      }
    } else {
      saveGuestCartToLocalStorage();
    }

    renderCart();
  }

  /* ================== Adicionar produto ================== */
  window.addToCart = async function (produto) {
    if (!produto || !produto.id) return;

    const existingIndex = cartItems.findIndex(i => i.id === produto.id);
    if (existingIndex >= 0) {
      cartItems[existingIndex].quantidade += (produto.quantidade || 1);
    } else {
      cartItems.push({ ...produto, quantidade: produto.quantidade || 1 });
    }

    if (isLoggedIn) {
      try {
        await fetch("/api/carrinho/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ produtoId: produto.id, quantidade: produto.quantidade || 1 })
        });
      } catch (err) {
        console.error("[Carrinho] Erro ao adicionar produto:", err);
      }
    } else {
      saveGuestCartToLocalStorage();
    }

    renderCart();
  };

  /* ================== Abrir/Fechar carrinho ================== */
  cartButton.addEventListener('click', () => {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
  });

  closeCart.addEventListener('click', () => {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
  });

  cartOverlay.addEventListener('click', () => {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
  });

  /* ================== Inicializar ================== */
  async function initializeCart() {
    const wasLoggedIn = isLoggedIn;
    await checkLoginStatus();
    await ensureGuestId();

    if (isLoggedIn && !wasLoggedIn) {
      await mergeGuestCart();
    }

    cartItems = await fetchCart();
    renderCart();

    console.log("[Carrinho] Inicializado - Logado:", isLoggedIn, "Itens:", cartItems.length);
  }

  await initializeCart();

 /* ================== Finalizar Compra ================== */
const finalizar = document.getElementById("finalizar");

finalizar.addEventListener("click", async () => {
  try {
    // Revalida login no momento do clique
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const aindaLogado = res.ok;

    if (!aindaLogado) {
      const modal = document.getElementById("modalLogin");
      modal.classList.add("show");
      document.getElementById("btnIrLogin").onclick = () => window.location.href = "/login";
      document.getElementById("btnFecharModal").onclick = () => modal.classList.remove("show");
      return;
    }

    // Verifica se o carrinho tem itens válidos
    if (!cartItems || cartItems.length === 0) {
      const modal = document.getElementById("modalCarrinhoVazio");
      modal.classList.add("show");
      document.getElementById("btnFecharCarrinho").onclick = () => modal.classList.remove("show");
      return;
    }

    // Tudo certo → segue para checkout
    window.location.href = "/endereco";

  } catch (err) {
    console.error("[Checkout] Erro ao finalizar compra:", err);
  }
});
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCart);
} else {
  initCart();
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
  initSlider();
  initBtnTopo();
  initCart();
});