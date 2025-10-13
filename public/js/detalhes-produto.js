/* ================== Variáveis Globais ================== */
let produtoAtual = null;
let quantidadeDeProdutosNoCarrinho = 0;

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
document.querySelector(".btn-comprar").addEventListener("click", async () => {
  if (!produtoAtual) return alert("Produto não carregado.");

  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });

    if (!res.ok) {
      // Mostra modal em vez de redirecionar direto
      const modal = document.getElementById("modalLogin");
      modal.classList.add("show");

      // Botão ir para login
      document.getElementById("btnIrLogin").onclick = () => {
        window.location.href = "/login";
      };

      // Botão fechar
      document.getElementById("btnFecharModal").onclick = () => {
        modal.classList.remove("show");
      };

      return;
    }

    // Usuário logado → continua o fluxo
    const produto = {
      ...produtoAtual,
      quantidade: parseInt(document.getElementById("quantidade").value),
      imagem: document.getElementById("imagemPrincipal").src
    };
    animarEAdicionarAoCarrinho(produto, true);
  } catch (err) {
    console.error("Erro ao verificar login:", err);
    window.location.href = "/login";
  }
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

  resultadoDiv.innerHTML = ""; // limpa resultados anteriores

  if (!cep) {
    resultadoDiv.innerHTML = `<p style="color:red;">Digite um CEP válido.</p>`;
    return;
  }

  if (!produtoAtual) {
    resultadoDiv.innerHTML = `<p style="color:red;">Produto não carregado.</p>`;
    return;
  }

  try {
    const insuranceValue = produtoAtual.precoPromocional ?? produtoAtual.preco;

    const produtoParaFrete = {
      id: String(produtoAtual.id),
      width: parseFloat(produtoAtual.largura) || 20,
      height: parseFloat(produtoAtual.altura) || 20,
      length: parseFloat(produtoAtual.comprimento) || 20,
      weight: parseFloat(produtoAtual.peso) || 1,
      insurance_value: insuranceValue != null ? parseFloat(insuranceValue) : 0,
      quantity: parseInt(document.getElementById("quantidade").value) || 1
    };

    console.log("Produto para frete:", produtoParaFrete);

    const resp = await fetch("/api/frete/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cepDestino: cep, produtos: [produtoParaFrete] })
    });

    if (!resp.ok) throw new Error("Erro ao calcular frete");
    const opcoes = await resp.json();

    const opcoesValidas = (opcoes || []).filter(o => o.price && !o.error);

    if (!opcoesValidas.length) {
      resultadoDiv.innerHTML = `<p>Nenhuma opção de frete válida encontrada.</p>`;
      return;
    }

    // Renderiza cards estilizados
    resultadoDiv.innerHTML = opcoesValidas
      .map((o, index) => {
        const nomeEmpresa = o.company?.name || "Transportadora";
        const nomeFrete = o.name || "Serviço";
        const valor = parseFloat(o.price);
        const prazo = o.delivery_time || "N/A";
        const logo = o.company?.picture || "/images/default-shipping.png";

        return `
          <div class="frete-card" data-index="${index}">
            <img src="${logo}" alt="${nomeEmpresa}" class="frete-logo">
            <div class="frete-info">
              <h4>${nomeEmpresa} - ${nomeFrete}</h4>
              <p>Valor: <strong>${valor.toLocaleString("pt-BR", { style: 'currency', currency: 'BRL' })}</strong></p>
              <p>Prazo: <strong>${prazo} dias úteis</strong></p>
            </div>
          </div>
        `;
      })
      .join("");

    // Torna os cards clicáveis
    document.querySelectorAll(".frete-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll(".frete-card").forEach(c => c.classList.remove("selecionado"));
        card.classList.add("selecionado");

        const index = card.dataset.index;
        const freteSelecionado = opcoesValidas[index];

        console.log("Frete selecionado:", freteSelecionado);
        // opcional: salve para uso posterior
        window.freteSelecionado = freteSelecionado;
      });
    });
  } catch (err) {
    console.error("[Frete] Erro:", err);
    resultadoDiv.innerHTML = `<p style="color:red;">Não foi possível calcular o frete. Tente novamente.</p>`;
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
