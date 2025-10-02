/* ================== Variáveis Globais ================== */
let produtoAtual = null;

/* ================== Promoções ================== */
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

/* ================== Login do usuário ================== */
async function verificarLogin() {
  const notLoggedIn = document.getElementById("notLoggedIn");
  const loggedIn = document.getElementById("loggedIn");
  const loggedSpan = document.getElementById("logged");

  try {
    const res = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
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

/* ================== Barra de pesquisa ================== */
function initSearchBar() {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const suggestionsDiv = document.getElementById("searchSuggestions");
  let debounceTimeout;

  async function buscarProdutoGlobal(termo, showSuggestions = false) {
    termo = termo.trim();
    if (!termo) {
      suggestionsDiv.style.display = "none";
      return;
    }

    try {
      const resp = await fetch(`/api/produtos/busca?query=${encodeURIComponent(termo)}`);
      if (!resp.ok) return suggestionsDiv.style.display = "none";
      const resultados = await resp.json();
      if (!resultados.length) return suggestionsDiv.style.display = "none";

      if (showSuggestions) {
        suggestionsDiv.innerHTML = resultados.map(prod => `
          <div class="suggestion-item" data-id="${prod.id}">
            ${prod.nome}
          </div>
        `).join("");
        suggestionsDiv.style.display = "block";

        document.querySelectorAll(".suggestion-item").forEach(item => {
          item.addEventListener("click", () => {
            window.location.href = `/detalhes-produto?id=${item.dataset.id}`;
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
}

/* ================== Menu Hamburger ================== */
function initMenu() {
  const navToggle = document.querySelector('.nav-toggle');
  const categoriesList = document.querySelector('.categories-list');
  const subMenus = document.querySelectorAll('.has-sub');

  navToggle.addEventListener('click', () => categoriesList.classList.toggle('show'));

  subMenus.forEach(menu => {
    menu.querySelector('a').addEventListener('click', e => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        menu.classList.toggle('open');
      }
    });
  });
}

/* ================== Carrinho ================== */
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

  const couponInput = document.getElementById("coupon-code");
  const applyCouponBtn = document.getElementById("apply-coupon");

  let isLoggedIn = false;
  let cartItems = [];
  let appliedCoupon = null;
  const validCoupons = {
    "DESCONTO10": 0.10,
    "FRETEGRATIS": 0.15,
    "JORGERAMOS69": 0.69
  };

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

  // ================== Atualizar resumo ==================
  function updateResumo() {
    const totalItems = cartItems.length;
    const totalQuantity = cartItems.reduce((acc, i) => acc + i.quantidade, 0);
    let totalPrice = cartItems.reduce((acc, i) => acc + (i.precoPromocional ?? i.preco ?? 0) * i.quantidade, 0);

    if (appliedCoupon) {
      totalPrice = totalPrice * (1 - appliedCoupon.desconto);
    }

    cartCount.textContent = totalQuantity;
    summaryItems.textContent = totalItems;
    summaryQuantity.textContent = totalQuantity;
    summaryTotal.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // ================== Atualizar quantidade ==================
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

  // ================== Remover item ==================
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

  // ================== Aplicar cupom ==================
 function mostrarToast(mensagem, tipo = "sucesso") {
  const toast = document.createElement("div");
  toast.classList.add("toast");

  // Estilos base
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.padding = "15px 25px";
  toast.style.color = "#fff";
  toast.style.fontWeight = "bold";
  toast.style.borderRadius = "10px";
  toast.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(20px)";
  toast.style.transition = "all 0.4s ease";
  toast.style.zIndex = "9999";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "10px";

  // Ícones
  let icon = "";
  if (tipo === "sucesso") {
    toast.style.background = "linear-gradient(90deg, #2ecc71, #27ae60)";
    icon = "✔️"; // check
  } else {
    toast.style.background = "linear-gradient(90deg, #e74c3c, #c0392b)";
    icon = "❌"; // x
  }

  toast.innerHTML = `<span>${icon}</span> <span>${mensagem}</span>`;
  document.body.appendChild(toast);

  // Mostrar e animar
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 10);

  // Remover após 3 segundos
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

  function aplicarCupom(codigo) {
    const valorInput = codigo.trim().toUpperCase();

    if (!valorInput) return mostrarToast("Digite um cupom!", "erro");

    if (validCoupons[valorInput]) {
      appliedCoupon = { codigo: valorInput, desconto: validCoupons[valorInput] };
      mostrarToast(`Cupom ${valorInput} aplicado!`, "sucesso");
    } else {
      appliedCoupon = null;
      mostrarToast("Cupom inválido!", "erro");
    }

    updateResumo();
  }

  applyCouponBtn.addEventListener("click", () => {
    aplicarCupom(couponInput.value);
  });

  renderCart();
}

/* ================== Botão Voltar ao Topo ================== */
function initBtnTop() {
  const btnTop = document.getElementById("btnTop");
  window.addEventListener("scroll", () => btnTop.classList.toggle("show", window.scrollY > 300));
  btnTop.addEventListener("click", e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); });
}

/* ================== Alterar Imagem Principal ================== */
window.mudarImagem = element => document.getElementById("imagemPrincipal").src = element.src;

/* ================== Alterar Quantidade ================== */
window.alterarQuantidade = valor => {
  const input = document.getElementById("quantidade");
  let novaQuantidade = parseInt(input.value) + valor;
  if (novaQuantidade < 1) novaQuantidade = 1;
  input.value = novaQuantidade;
};

/* ================== Animar e Adicionar ao Carrinho ================== */
async function animarEAdicionarAoCarrinho(produto, irParaCheckout = false) {
  try {
    const imgFly = document.createElement("img");
    imgFly.src = produto.imagem;
    imgFly.className = "fly-to-cart";
    document.body.appendChild(imgFly);

    const imgRect = document.getElementById("imagemPrincipal").getBoundingClientRect();
    imgFly.style.left = imgRect.left + "px";
    imgFly.style.top = imgRect.top + "px";

    const cartRect = document.getElementById("cart-button").getBoundingClientRect();
    imgFly.getBoundingClientRect(); // reflow
    imgFly.style.transform = `translate(${cartRect.left - imgRect.left}px, ${cartRect.top - imgRect.top}px) scale(0.1)`;
    imgFly.style.opacity = 0.5;

    await new Promise(resolve => setTimeout(resolve, 800));
    imgFly.remove();

    await addToCart(produto);
    if (irParaCheckout) window.location.href = "/endereco";
  } catch {
    alert("Não foi possível adicionar o produto ao carrinho.");
  }
}

/* ================== Botões Comprar e Adicionar ================== */
document.querySelector(".btn-comprar").addEventListener("click", () => {
  if (!produtoAtual) return alert("Produto não carregado.");
  const produto = { ...produtoAtual, quantidade: parseInt(document.getElementById("quantidade").value), imagem: document.getElementById("imagemPrincipal").src };
  animarEAdicionarAoCarrinho(produto, true);
});

document.querySelector(".btn-carrinho").addEventListener("click", () => {
  if (!produtoAtual) return alert("Produto não carregado.");
  const produto = { ...produtoAtual, quantidade: parseInt(document.getElementById("quantidade").value), imagem: document.getElementById("imagemPrincipal").src };
  animarEAdicionarAoCarrinho(produto, false);
});

/* ================== Calcular Frete ================== */
document.getElementById("calcularFrete").addEventListener("click", async () => {
  const cep = document.getElementById("cepInput").value.trim();
  const resultadoDiv = document.getElementById("freteResultado");

  if (!cep) return resultadoDiv.textContent = "Digite um CEP válido.";
  if (!produtoAtual) return resultadoDiv.textContent = "Produto não carregado.";

  try {
    const produtos = [{
      id: String(produtoAtual.id),
      width: produtoAtual.largura || 20,
      height: produtoAtual.altura || 20,
      length: produtoAtual.comprimento || 20,
      weight: produtoAtual.peso || 1,
      insurance_value: produtoAtual.precoPromocional || produtoAtual.preco || 50,
      quantity: parseInt(document.getElementById("quantidade").value) || 1
    }];

    const resp = await fetch("/api/frete/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cepDestino: cep, produtos })
    });

    if (!resp.ok) throw new Error("Erro ao calcular frete");

    const opcoes = await resp.json();

    if (!opcoes.length) return resultadoDiv.textContent = "Nenhuma opção de frete encontrada.";

    // Corrige campos faltantes
    resultadoDiv.innerHTML = opcoes.map(o => {
      const nomeEmpresa = o.company?.name || o.empresa || "Transportadora";
      const nomeFrete = o.name || o.servico || "Serviço";
      const valor = parseFloat(o.price || o.valor) || 0;
      const prazo = o.delivery_time || o.prazo || "N/A";

      return `
        <p>
          <strong>${nomeEmpresa} - ${nomeFrete}</strong><br>
          Valor: ${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} <br>
          Prazo: ${prazo} dias úteis
        </p>
      `;
    }).join("");
  } catch (err) {
    console.error("[Frete] Erro:", err);
    resultadoDiv.textContent = "Não foi possível calcular o frete. Tente novamente.";
  }
});

/* ================== Carregar Produto ================== */
async function carregarProduto() {
  const produtoId = new URLSearchParams(window.location.search).get("id");
  if (!produtoId) return console.error("ID do produto não fornecido");

  try {
    const resp = await fetch(`/api/produtos/${produtoId}`);
    if (!resp.ok) throw new Error("Produto não encontrado");
    const produto = await resp.json();

    produtoAtual = produto; // Salva produto atual

    document.getElementById("imagemPrincipal").src = produto.imagem[0];
    document.querySelector(".produto-imagens .miniaturas").innerHTML =
      produto.imagem.map(img => `<img src="${img}" alt="Miniatura" onclick="mudarImagem(this)">`).join("");

    document.querySelector(".produto-detalhes h1").textContent = produto.nome;
    document.querySelector(".produto-detalhes .preco .antigo").textContent =
      produto.preco ? produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "";
    document.querySelector(".produto-detalhes .preco .novo").textContent =
      produto.precoPromocional ? produto.precoPromocional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "";

    document.querySelector(".produto-detalhes .descricao").innerHTML = `
      <h3>Descrição</h3>
      <p>${produto.descricao}</p>
      <p>${produto.caracteristicas}</p>
      <p>${produto.informacoesTecnicas}</p>
    `;

    // Produtos relacionados
    const categorias = [produto.categoria, produto.categoria2, produto.categoria3].filter(Boolean);
    let relacionados = [];
    for (const cat of categorias) {
      if (relacionados.length >= 4) break;
      const relResp = await fetch(`/api/produtos/categoria/${encodeURIComponent(cat)}`);
      if (!relResp.ok) continue;
      const produtosCat = await relResp.json();
      produtosCat.forEach(p => { if (p.id !== produto.id && !relacionados.find(r => r.id === p.id)) relacionados.push(p); });
    }
    relacionados = relacionados.slice(0, 4);

    const grid = document.querySelector(".relacionados .produtos-grid");
    grid.innerHTML = relacionados.length ? relacionados.map(p => `
      <a href="/detalhes-produto?id=${p.id}" class="produto">
        <img src="${p.imagem[0]}" alt="${p.nome}">
        <h3>${p.nome}</h3>
        <p class="preco">
          <span class="antigo">${p.preco ? p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ""}</span>
          <span class="novo">${p.precoPromocional ? p.precoPromocional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ""}</span>
        </p>
      </a>
    `).join("") : `<p>Nenhum produto relacionado encontrado.</p>`;
  } catch (err) {
    console.error("[Detalhes Produto] Erro:", err);
    alert("Produto não encontrado.");
  }
}

/* ================== Inicialização ================== */
document.addEventListener("DOMContentLoaded", () => {
  verificarLogin();
  initSearchBar();
  initMenu();
  initCart();
  initBtnTop();
  carregarProduto();
});
