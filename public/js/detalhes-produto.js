

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
      // 🔹 Usa o preço que já veio ajustado (sem somar nada)
      const preco = item.preco ?? item.precoPromocional ?? 0;

      // 🔹 Garante o ID do produto para o link
      const produtoId = item.produtoId || item.id || (item.produto && item.produto.id);

      const itemDiv = document.createElement("div");
      itemDiv.className = "cart-item";

      itemDiv.innerHTML = `
      <a 
        href="${produtoId ? `/detalhes-produto?id=${produtoId}` : '#'}" 
        class="cart-item-image-link"
      >
        <img src="${item.imagem || ''}" alt="${item.nome}">
      </a>
      <div class="cart-item-info">
        <h4>${item.nome}</h4>
        ${item.cor && item.cor !== "padrao" && item.cor !== "default" && item.cor !== "" ? `
          <div class="cart-color">
            <span class="color-circle" 
              style="background-color:${typeof item.cor === "object" ? (item.cor.hex || "#ccc") : item.cor};">
            </span>
            <span class="color-name">
              ${(() => {
            const corEn = typeof item.cor === "object" ? (item.cor.nome || item.cor.hex || "") : item.cor;
            const corKey = corEn?.toLowerCase().trim();
            return colorTranslations[corKey] || corEn;
          })()}
            </span>
          </div>
        ` : ""}

        ${item.torneira && item.torneira !== "padrao" && item.torneira !== "" ? `
          <div class="cart-torneira">
            <span class="torneira-label">Torneira:</span>
            <span class="torneira-name">${item.torneira}</span>
          </div>
        ` : ""}

        ${item.refil ? `
          <div class="cart-refil">
            <span class="refil-label">Refis:</span>
            <span class="refil-count">${item.refil}</span>
          </div>
        ` : ""}

        <p class="cart-price">
          ${preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>

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

    // 🔹 O preço já vem ajustado do produtoAtual (com torneira/refil incluídos)
    const total = cartItems.reduce((acc, i) => {
      const precoBase = i.preco ?? i.precoPromocional ?? 0;
      return acc + (precoBase * i.quantidade);
    }, 0);

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

    const item = cartItems[idx];
    const produtoId = item.produtoId || item.id || item.produto?.id;
    const cor = item.cor && item.cor !== "" ? item.cor : "padrao";
    const torneira = item.torneira && item.torneira !== "" ? item.torneira : "padrao";
    const refil = item.refil || null;

    console.log("[Carrinho] Atualizando quantidade:", { produtoId, cor, torneira, quantidade });

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
            refil
          })
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

    const item = cartItems[idx];
    const cartItemId =
      item.cartItemId ||
      item.idCarrinho ||
      item.carrinhoId ||
      item.idCarrinhoItem ||
      item.cartId ||
      item.id;

    // 🔹 Garante que cor e torneira tenham valor padrão
    const produtoId = item.produtoId || item.id || item.produto?.id;
    const cor = item.cor && item.cor !== "" ? item.cor : "padrao";
    const torneira = item.torneira && item.torneira !== "" ? item.torneira : "padrao";
    const refil = item.refil || null;

    console.log("[Carrinho] Removendo item:", { produtoId, cor, torneira });

    // Remove visualmente do array primeiro
    cartItems.splice(idx, 1);
    renderCart();

    if (isLoggedIn) {
      try {
        const response = await fetch("/api/carrinho/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ produtoId, cor, torneira, refil })
        });

        if (!response.ok) {
          console.error("[Carrinho] Falha ao remover do servidor:", response.status);
        } else {
          console.log("[Carrinho] Item removido do banco:", cartItemId);
        }
      } catch (err) {
        console.error("[Carrinho] Erro ao remover item:", err);
      }
    } else {
      saveGuestCartToLocalStorage();
    }
  }

  /* ================== Adicionar produto ================== */
  window.addToCart = async function (produto) {
    if (!produto || !produto.id) return;

    const corSelecionada = produto.cor?.hex || produto.cor || produto.corSelecionada || "padrao";
    const torneiraSelecionada = produto.torneira || produto.torneiraSelecionada || "padrao";

    // 🔹 Verifica se já existe o mesmo produto com MESMA cor e MESMA torneira
    const existingIndex = cartItems.findIndex(i =>
      i.id === produto.id &&
      (i.cor?.hex || i.cor || "padrao") === corSelecionada &&
      (i.torneira || "padrao") === torneiraSelecionada &&
      (Number(i.refil) || 1) === (Number(produto.refil) || 1)
    );


    if (existingIndex >= 0) {
      // Se for o mesmo produto + mesma variação → soma a quantidade
      cartItems[existingIndex].quantidade += (produto.quantidade || 1);
    } else {
      // Se for variação diferente → cria novo item
      cartItems.push({
        ...produto,
        quantidade: produto.quantidade || 1,
        cor: corSelecionada,
        torneira: torneiraSelecionada
      });
    }

    // 🔹 Se estiver logado → sincroniza com o backend
    if (isLoggedIn) {
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
            refil: produto.refil || null
          })
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
      const modal = document.getElementById("modalLogin");
      modal.classList.add("show");
      document.getElementById("btnIrLogin").onclick = () => window.location.href = "/login";
      document.getElementById("btnFecharModal").onclick = () => modal.classList.remove("show");
      return;
    }

    const produto = {
      ...produtoAtual,
      quantidade: parseInt(document.getElementById("quantidade").value),
      imagem: document.getElementById("imagemPrincipal").src,
      cor: produtoAtual.corSelecionada || null,
      torneira: produtoAtual.torneiraSelecionada || null,
      refil: produtoAtual.refilSelecionado || null,
      preco: produtoAtual.precoAjustado || produtoAtual.precoPromocional || produtoAtual.preco,
      precoPromocional: produtoAtual.precoPromocionalFinal || produtoAtual.precoPromocional
    };

    console.log("[DEBUG] Produto enviado ao carrinho:", produto);

    animarEAdicionarAoCarrinho(produto, true);
  } catch (err) {
    console.error("Erro ao verificar login:", err);
    window.location.href = "/login";
  }
});

document.querySelector(".btn-carrinho").addEventListener("click", () => {
  if (!produtoAtual) return alert("Produto não carregado.");

  const produto = {
    ...produtoAtual,
    quantidade: parseInt(document.getElementById("quantidade").value),
    imagem: document.getElementById("imagemPrincipal").src,
    cor: produtoAtual.corSelecionada || null,
    torneira: produtoAtual.torneiraSelecionada || null,
    refil: produtoAtual.refilSelecionado || null,
    preco: produtoAtual.precoAjustado || produtoAtual.precoPromocional || produtoAtual.preco,
    precoPromocional: produtoAtual.precoPromocionalFinal || produtoAtual.precoPromocional
  };

  console.log("[DEBUG] Produto enviado ao carrinho:", produto);

  animarEAdicionarAoCarrinho(produto, false);
});




/* ================== Calcular Frete ================== */
async function calcularFreteDetalhes() {
  try {
    const cepDestino = document.querySelector("#cepInput").value.replace(/\D/g, "");
    if (!cepDestino) {
      alert("Por favor, informe um CEP válido.");
      return;
    }

    if (!produtoAtual) {
      alert("Produto não carregado. Tente novamente.");
      return;
    }

    const produto = {
      id: produtoAtual.id,
      nome: produtoAtual.nome,
      quantidade: 1,
      weight: produtoAtual.weight || 0.3,
      width: produtoAtual.width || 10,
      height: produtoAtual.height || 10,
      length: produtoAtual.length || 10,
      preco: produtoAtual.precoPromocional || produtoAtual.preco
    };

    const response = await fetch("/api/frete/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cepDestino, produtos: [produto] })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao calcular frete");

    const container = document.querySelector("#freteResultado");
    container.innerHTML = "";

    console.log(data);

    data.forEach(opcao => {
      const valor = Number(opcao.price) || 0;
      const card = document.createElement("div");
      card.className = "frete-card";

      card.innerHTML = `
        <img src="${opcao.company.picture}" class="frete-logo" alt="${opcao.name}">
        <div class="frete-info">
          <h4>${opcao.name}</h4>
          <p>Valor: R$ ${valor.toFixed(2).replace(".", ",")}</p>
          <p>Prazo: ${opcao.delivery_time} dias úteis</p>
        </div>
      `;

      // Permite selecionar o frete
      card.addEventListener("click", () => {
        document.querySelectorAll(".frete-card").forEach(c => c.classList.remove("selecionado"));
        card.classList.add("selecionado");
      });

      container.appendChild(card);
    });

  } catch (error) {
    console.error("[Detalhes] Erro ao calcular frete:", error);
    alert("Não foi possível calcular o frete. Tente novamente mais tarde.");
  }
}

// Evento do botão
document.getElementById("calcularFrete").addEventListener("click", calcularFreteDetalhes);

/* ================== Miniaturas com Navegação ================== */
function initMiniaturas(produto) {
  const container = document.getElementById("miniaturasContainer");
  const btnPrev = document.getElementById("miniaturaAnterior");
  const btnNext = document.getElementById("miniaturaProxima");
  const maxVisiveis = 3;
  let indexInicial = 0;

  function renderMiniaturas() {
    container.innerHTML = "";
    const miniaturasVisiveis = produto.imagem.slice(indexInicial, indexInicial + maxVisiveis);
    miniaturasVisiveis.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Miniatura";
      img.onclick = () => document.getElementById("imagemPrincipal").src = src;
      container.appendChild(img);
    });

    btnPrev.disabled = indexInicial === 0;
    btnNext.disabled = indexInicial + maxVisiveis >= produto.imagem.length;
  }

  btnPrev.onclick = () => {
    if (indexInicial > 0) {
      indexInicial--;
      renderMiniaturas();
    }
  };
  btnNext.onclick = () => {
    if (indexInicial + maxVisiveis < produto.imagem.length) {
      indexInicial++;
      renderMiniaturas();
    }
  };

  renderMiniaturas();
}


/* ================== Carregar Produto ================== */
async function carregarProduto() {
  const produtoId = new URLSearchParams(window.location.search).get("id");
  if (!produtoId) return console.error("ID do produto não fornecido");

  try {
    const resp = await fetch(`/api/produtos/${produtoId}`);
    if (!resp.ok) throw new Error("Produto não encontrado");
    const produto = await resp.json();

    produtoAtual = produto; // Salva produto atual

    // ================== Função central de sincronização de preço ==================
    function atualizarPreco() {
      const precoAntigoEl = document.querySelector(".produto-detalhes .preco .antigo");
      const precoNovoEl = document.querySelector(".produto-detalhes .preco .novo");

      const base = Number(produtoAtual.preco) || 0;
      const promo = Number(produtoAtual.precoPromocional) || null;
      let precoFinal = base;
      let precoPromoFinal = promo;

      // 🔹 Adiciona preço da torneira
      const torneira = produtoAtual.torneiraSelecionada;
      if (torneira === "Tap Handle Prata" || torneira === "Tap Handle Preta") {
        precoFinal += 15;
        if (precoPromoFinal !== null) precoPromoFinal += 15;
      }

      // 🔹 Adiciona preço de refil
      const refil = Number(produtoAtual.refilSelecionado) || 1;
      if (refil > 1) {
        const extra = (refil - 1) * 40;
        precoFinal += extra;
        if (precoPromoFinal !== null) precoPromoFinal += extra;
      }

      // 🔹 Atualiza DOM
      precoAntigoEl.textContent = base
        ? precoFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "";

      precoNovoEl.textContent = precoPromoFinal
        ? precoPromoFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : precoFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      // 🔹 Atualiza produtoAtual globalmente
      produtoAtual.precoAjustado = precoPromoFinal || precoFinal;
      produtoAtual.precoFinal = precoFinal;
      produtoAtual.precoPromocionalFinal = precoPromoFinal;
    }


    document.getElementById("imagemPrincipal").src = produto.imagem[0];

    // Inicializa miniaturas com navegação
    initMiniaturas(produto);

    document.querySelector(".produto-detalhes h1").textContent = produto.nome;
    document.querySelector(".produto-detalhes .preco .antigo").textContent =
      produto.preco ? produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "";
    document.querySelector(".produto-detalhes .preco .novo").textContent =
      produto.precoPromocional ? produto.precoPromocional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "";

    document.querySelector(".produto-detalhes .descricao").innerHTML = `
      <h3>Descrição</h3>
      <p>${produto.descricao}</p>
    `;

    // Renderizar cores disponíveis (ou esconder o seletor)
    const coresContainer = document.getElementById("coresContainer");
    const coresProdutoSection = document.querySelector(".cores-produto");

    if (produto.cores && produto.cores.length > 0) {
      coresContainer.innerHTML = "";

      produto.cores.forEach(cor => {
        const div = document.createElement("div");
        div.className = "cor-item";
        div.style.backgroundColor = cor;
        div.title = cor;

        div.addEventListener("click", () => {
          document.querySelectorAll(".cor-item").forEach(el => el.classList.remove("selecionada"));
          div.classList.add("selecionada");
          produtoAtual.corSelecionada = cor;
        });

        coresContainer.appendChild(div);
      });

      // Garante que o seletor apareça
      coresProdutoSection.style.display = "block";
    } else {
      // Esconde o seletor completamente
      coresProdutoSection.style.display = "none";
    }

    // ================== Renderizar variações de torneira ==================
    const torneiraSection = document.querySelector(".torneira-produto");
    const torneiraSelect = document.getElementById("torneiraSelect");

    if (produto.torneira && produto.torneira.length > 0) {
      torneiraSelect.innerHTML = `
    <option value="">Selecione uma torneira</option>
    ${produto.torneira.map(t => `<option value="${t}">${t}</option>`).join("")}
  `;

      torneiraSection.style.display = "flex";

      // 🔹 Mapa único de imagens por tipo de torneira
      const mapaTorneiras = {
        "Cromada": "https://i.imgur.com/vXXjFbS.jpeg",
        "Alavanca": "https://i.imgur.com/5R4OSsb.jpeg",
        "Tap Handle Prata": "https://i.imgur.com/K9dzoGw.jpeg",
        "Tap Handle Preta": "https://i.imgur.com/awKaFcR.jpeg"
      };

      // Captura a seleção e muda imagem e preço
      torneiraSelect.addEventListener("change", e => {
        const selecionada = e.target.value;
        produtoAtual.torneiraSelecionada = selecionada;

        // troca imagem da torneira usando mapa único
        const imagemCorrespondente = mapaTorneiras[selecionada];
        if (imagemCorrespondente) {
          const imgEl = document.getElementById("imagemPrincipal");
          imgEl.style.opacity = 0;
          setTimeout(() => {
            imgEl.src = imagemCorrespondente;
            imgEl.style.opacity = 1;
          }, 150);
        }

        // 🔹 Chama função central
        atualizarPreco();
      });

    } else {
      torneiraSection.style.display = "none";
    }

    // ================== Renderizar opção de refil ==================
    const refilSection = document.querySelector(".refil-produto");
    const refilSelect = document.getElementById("refilSelect");

    // Exibe o seletor APENAS se o produto tiver refil disponível
    if (produto.refil && produto.refil > 0) {
      refilSection.style.display = "block";

      // 🔹 Gera dinamicamente as opções conforme o valor do banco
      let opcoesRefil = "";
      for (let i = 1; i <= produto.refil; i++) {
        const texto = i === 1 ? "1 refil" : `${i} refis`;
        opcoesRefil += `<option value="${i}">${texto}</option>`;
      }
      refilSelect.innerHTML = opcoesRefil;

      // 🔹 Define refil inicial como 1
      produtoAtual.refilSelecionado = 1;

      // 🔹 Atualiza o preço ao trocar
      refilSelect.addEventListener("change", e => {
        produtoAtual.refilSelecionado = parseInt(e.target.value);
        atualizarPreco();
      });

    } else {
      refilSection.style.display = "none";
    }


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
