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

  // ================== Detectar login ==================
  try {
    const res = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
    isLoggedIn = res.ok;
  } catch {}

  // ================== Pegar carrinho ==================
  async function fetchCart() {
    if (isLoggedIn) {
      try {
        const resp = await fetch("/api/carrinho", { credentials: "include" });
        if (!resp.ok) throw new Error("Erro ao carregar carrinho");
        return await resp.json();
      } catch (err) {
        console.error("[Carrinho] Erro:", err);
        return [];
      }
    } else {
      const localCart = localStorage.getItem("guestCart");
      return localCart ? JSON.parse(localCart) : [];
    }
  }

  function saveCart() {
    if (!isLoggedIn) localStorage.setItem("guestCart", JSON.stringify(cartItems));
  }

  // ================== Mesclar carrinho do guest após login ==================
  async function mergeGuestCart() {
    if (!isLoggedIn) return;

    const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    if (!guestCart.length) return;

    for (const item of guestCart) {
      await fetch("/api/carrinho/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ produtoId: item.id, quantidade: item.quantidade })
      });
    }
    localStorage.removeItem("guestCart");
  }

  if (isLoggedIn) await mergeGuestCart();
  cartItems = await fetchCart();

  // ================== Renderizar carrinho ==================
  async function renderCart() {
    cartItemsContainer.innerHTML = "";

    if (!cartItems.length) {
      cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio.</p>";
      cartCount.textContent = 0;
      if (summaryItems) summaryItems.textContent = 0;
      if (summaryQuantity) summaryQuantity.textContent = 0;
      if (summaryTotal) summaryTotal.textContent = "R$ 0,00";
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

    updateSummary();
  }

  function updateSummary() {
    const totalItems = cartItems.length;
    const totalQuantity = cartItems.reduce((acc, i) => acc + i.quantidade, 0);
    const totalPrice = cartItems.reduce((acc, i) => acc + (i.precoPromocional ?? i.preco ?? 0) * i.quantidade, 0);

    cartCount.textContent = totalQuantity;
    if (summaryItems) summaryItems.textContent = totalItems;
    if (summaryQuantity) summaryQuantity.textContent = totalQuantity;
    if (summaryTotal) summaryTotal.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function updateQuantity(idx, quantidade) {
    cartItems[idx].quantidade = quantidade;

    if (isLoggedIn) {
      await fetch("/api/carrinho/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ produtoId: cartItems[idx].id, quantidade })
      });
    } else {
      saveCart();
    }

    renderCart();
  }

  async function removeItem(idx) {
    const produtoId = cartItems[idx].id;
    cartItems.splice(idx, 1);

    if (isLoggedIn) {
      await fetch("/api/carrinho/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ produtoId })
      });
    } else {
      saveCart();
    }

    renderCart();
  }

  // ================== Adicionar produto ==================
  window.addToCart = async function(produto) {
    const existing = cartItems.find(i => i.id === produto.id);
    if (existing) {
      existing.quantidade += produto.quantidade;
    } else {
      cartItems.push({ ...produto });
    }

    if (isLoggedIn) {
      await fetch("/api/carrinho/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ produtoId: produto.id, quantidade: produto.quantidade })
      });
    } else {
      saveCart();
    }

    renderCart();
  };

  // ================== Abrir/Fechar carrinho ==================
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

  renderCart();
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