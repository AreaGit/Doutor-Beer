/* ===== Promoções ===== */
const promoMessages = document.querySelectorAll('.promo-message');
let currentPromo = 0;

if (promoMessages.length) {
  promoMessages[0].classList.add('active');
  setInterval(() => {
    promoMessages[currentPromo].classList.remove('active');
    currentPromo = (currentPromo + 1) % promoMessages.length;
    promoMessages[currentPromo].classList.add('active');
  }, 4000);
}

/* ===== Barra de Pesquisas ===== */
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const suggestionsDiv = document.getElementById("searchSuggestions");
  let debounceTimeout;

  async function buscarProdutoGlobal(termo, showSuggestions = false) {
    termo = termo.trim();
    if (!termo) return (suggestionsDiv.style.display = "none");

    try {
      const resp = await fetch(`/api/produtos/busca?query=${encodeURIComponent(termo)}`);
      if (!resp.ok) return (suggestionsDiv.style.display = "none");

      const resultados = await resp.json();
      if (!resultados || resultados.length === 0) return (suggestionsDiv.style.display = "none");

      if (showSuggestions) {
        suggestionsDiv.innerHTML = resultados.map(prod => `
          <div class="suggestion-item" data-id="${prod.id}">${prod.nome}</div>
        `).join("");
        suggestionsDiv.style.display = "block";

        document.querySelectorAll(".suggestion-item").forEach(item => {
          item.addEventListener("click", () => {
            const produtoId = item.dataset.id;
            window.location.href = `/detalhes-produto?id=${produtoId}`;
          });
        });
      } else {
        const primeiraCategoria = resultados[0].categoria;
        window.location.href = `/categoria?categoria=${primeiraCategoria}&search=${encodeURIComponent(termo)}`;
      }
    } catch (err) {
      console.error("[BuscarProdutos] Erro:", err);
      suggestionsDiv.style.display = "none";
    }
  }

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => buscarProdutoGlobal(searchInput.value, true), 300);
  });

  searchInput.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      buscarProdutoGlobal(searchInput.value);
      suggestionsDiv.style.display = "none";
    }
  });

  searchButton.addEventListener("click", () => {
    buscarProdutoGlobal(searchInput.value);
    suggestionsDiv.style.display = "none";
  });

  document.addEventListener("click", e => {
    if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.style.display = "none";
    }
  });
});

/* ===== Menu Hamburger e Submenus ===== */
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

/* ===== Usuário Logado ===== */
document.addEventListener("DOMContentLoaded", async () => {
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
});

/* ===== Carregar Produtos por Categoria ===== */
document.addEventListener("DOMContentLoaded", async () => {
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
      if (!resp.ok) throw new Error("Erro ao carregar produtos");

      const produtos = await resp.json();
      if (!produtos.length) return grid.innerHTML = "<p>Nenhum produto encontrado nesta categoria.</p>";

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
    } catch (err) {
      console.error(err);
      grid.innerHTML = "<p>Erro ao carregar os produtos.</p>";
    }
  }

  carregarProdutos();
  sortSelect?.addEventListener("change", () => carregarProdutos(sortSelect.value));
});

/* ===== Slider Banner ===== */
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const prev = document.querySelector('.prev');
const next = document.querySelector('.next');
let currentIndex = 0;

function showSlide(index) {
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

/* ===== Botão Voltar ao Topo ===== */
const btnTop = document.getElementById("btnTop");
window.addEventListener("scroll", () => {
  btnTop.classList.toggle("show", window.scrollY > 300);
});
btnTop?.addEventListener("click", e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ===== Carrinho Interativo ===== */
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

  async function fetchCart() {
    try {
      const resp = await fetch("/api/carrinho", { credentials: "include" });
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.map(item => ({
        produtoId: item.Produto?.id,
        nome: item.Produto?.nome,
        preco: item.Produto?.precoPromocional || item.Produto?.preco || 0,
        imagem: item.Produto?.imagem?.[0] || "",
        quantidade: item.quantidade
      }));
    } catch (err) { console.error("[Carrinho] Erro:", err); return []; }
  }

  let cartItems = await fetchCart();

  async function renderCart() {
    cartItemsContainer.innerHTML = "";
    if (!cartItems.length) {
      cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio.</p>";
      cartCount.textContent = 0;
      summaryItems && (summaryItems.textContent = 0);
      summaryQuantity && (summaryQuantity.textContent = 0);
      summaryTotal && (summaryTotal.textContent = "R$ 0,00");
      return;
    }

    cartItems.forEach((item, index) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "cart-item";
      itemDiv.innerHTML = `
        <img src="${item.imagem}" alt="${item.nome}">
        <div class="cart-item-info">
          <h4>${item.nome}</h4>
          <p>${item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
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

    // Eventos de quantidade
    document.querySelectorAll(".qty-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.index);
        const novoValor = btn.classList.contains("plus") ? cartItems[idx].quantidade + 1 : Math.max(1, cartItems[idx].quantidade - 1);
        await updateQuantity(cartItems[idx].produtoId, novoValor);
      });
    });

    document.querySelectorAll(".quantity-input").forEach(input => {
      input.addEventListener("change", async () => {
        const idx = parseInt(input.dataset.index);
        let novaQtd = parseInt(input.value);
        if (isNaN(novaQtd) || novaQtd < 1) novaQtd = 1;
        await updateQuantity(cartItems[idx].produtoId, novaQtd);
      });
    });

    document.querySelectorAll(".remove-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.index);
        await removeItem(cartItems[idx].produtoId);
      });
    });

    updateSummary();
  }

  function updateSummary() {
    const totalQuantity = cartItems.reduce((acc, i) => acc + i.quantidade, 0);
    const totalItems = cartItems.length;
    const totalPrice = cartItems.reduce((acc, i) => acc + i.preco * i.quantidade, 0);

    cartCount.textContent = totalQuantity;
    summaryItems && (summaryItems.textContent = totalItems);
    summaryQuantity && (summaryQuantity.textContent = totalQuantity);
    summaryTotal && (summaryTotal.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  }

  async function updateQuantity(produtoId, quantidade) {
    await fetch("/api/carrinho/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ produtoId, quantidade })
    });
    cartItems = await fetchCart();
    renderCart();
  }

  async function removeItem(produtoId) {
    await fetch("/api/carrinho/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ produtoId })
    });
    cartItems = await fetchCart();
    renderCart();
  }

  window.addToCart = async function(produto) {
    await fetch("/api/carrinho/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ produtoId: produto.id, quantidade: produto.quantidade })
    });
    cartItems = await fetchCart();
    renderCart();
  };

  cartButton?.addEventListener('click', async () => { await renderCart(); cartSidebar.classList.add('active'); cartOverlay.classList.add('active'); });
  closeCart?.addEventListener('click', () => { cartSidebar.classList.remove('active'); cartOverlay.classList.remove('active'); });
  cartOverlay?.addEventListener('click', () => { cartSidebar.classList.remove('active'); cartOverlay.classList.remove('active'); });

  renderCart();
}

document.addEventListener("DOMContentLoaded", initCart);
