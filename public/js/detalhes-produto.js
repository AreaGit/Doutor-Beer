/* ================== Variáveis Globais ================== */
let produtoAtual = null;
let currentArteUrl = null;

// Inicialização
let quantidadeDeProdutosNoCarrinho = 0;

/* ================== Promoções ================== */
const promoMessages = document.querySelectorAll(".promo-message");
let currentPromo = 0;

if (promoMessages.length) {
  promoMessages[0].classList.add("active");
  setInterval(() => {
    promoMessages[currentPromo].classList.remove("active");
    currentPromo = (currentPromo + 1) % promoMessages.length;
    promoMessages[currentPromo].classList.add("active");
  }, 4000);
}

const icons = {
  success: "🍺",
  error: "🚫",
  warning: "⚠️",
  info: "✨"
};

function showToast(message, type = "info", title = "") {
  const container = document.querySelector(".toast-container");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <div class="icon">${icons[type] || "✨"}</div>

    <div class="content">
      ${title ? `<div class="title">${title}</div>` : ""}
      <div class="message">${message}</div>
    </div>

    <button class="close" aria-label="Fechar toast">&times;</button>

    <div class="progress"></div>
  `;

  container.appendChild(toast);

  toast.querySelector(".close").addEventListener("click", () => {
    removeToast(toast);
  });

  setTimeout(() => removeToast(toast), 5000);
}

function removeToast(toast) {
  toast.style.animation = "toast-out .3s ease forwards";
  setTimeout(() => toast.remove(), 300);
}

/* ================== Login do usuário ================== */
async function verificarLogin() {
  const notLoggedIn = document.getElementById("notLoggedIn");
  const loggedIn = document.getElementById("loggedIn");
  const loggedSpan = document.getElementById("logged");

  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });
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
      const resp = await fetch(
        `/api/produtos/busca?query=${encodeURIComponent(termo)}`
      );
      if (!resp.ok) return (suggestionsDiv.style.display = "none");
      const resultados = await resp.json();
      if (!resultados.length) return (suggestionsDiv.style.display = "none");

      if (showSuggestions) {
        suggestionsDiv.innerHTML = resultados
          .map(
            (prod) => `
          <div class="suggestion-item" data-id="${prod.id}">
            ${prod.nome}
          </div>
        `
          )
          .join("");
        suggestionsDiv.style.display = "block";

        document.querySelectorAll(".suggestion-item").forEach((item) => {
          item.addEventListener("click", () => {
            window.location.href = `/detalhes-produto?id=${item.dataset.id}`;
          });
        });
      } else {
        const primeiraCategoria = resultados[0].categoria;
        window.location.href = `/categoria?categoria=${primeiraCategoria}&search=${encodeURIComponent(
          termo
        )}`;
      }
    } catch (err) {
      console.error("[BuscarProdutos] Erro:", err);
      suggestionsDiv.style.display = "none";
    }
  }

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(
      () => buscarProdutoGlobal(searchInput.value, true),
      300
    );
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      buscarProdutoGlobal(searchInput.value);
      suggestionsDiv.style.display = "none";
    }
  });

  searchButton.addEventListener("click", () => {
    buscarProdutoGlobal(searchInput.value);
    suggestionsDiv.style.display = "none";
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.style.display = "none";
    }
  });
}

/* ================== Menu Hamburger ================== */
function initMenu() {
  const navToggle = document.querySelector(".nav-toggle");
  const categoriesList = document.querySelector(".categories-list");
  const subMenus = document.querySelectorAll(".has-sub");

  navToggle.addEventListener("click", () =>
    categoriesList.classList.toggle("show")
  );

  subMenus.forEach((menu) => {
    menu.querySelector("a").addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        menu.classList.toggle("open");
      }
    });
  });
}

/* ================== Carrinho ================== */
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
      const produtoId =
        item.produtoId || item.id || (item.produto && item.produto.id);

      const imageSrc = Array.isArray(item.imagem)
        ? item.imagem[0]
        : item.imagemPrincipal || item.imagem || "";

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

          ${item.cor &&
          item.cor !== "padrao" &&
          item.cor !== "default" &&
          item.cor !== ""
          ? `
            <div class="cart-color">
              <span class="color-circle" 
                style="background-color:${typeof item.cor === "object"
            ? item.cor.hex || "#ccc"
            : item.cor
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

          ${item.torneira && item.torneira !== "padrao" && item.torneira !== ""
          ? `
            <div class="cart-torneira">
              <span class="torneira-label">Torneira:</span>
              <span class="torneira-name">${item.torneira}</span>
            </div>
          `
          : ""
        }

          ${item.refil
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
            <input type="number" min="1" value="${item.quantidade
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
    const torneira =
      item.torneira && item.torneira !== "" ? item.torneira : "padrao";
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
    const torneira =
      item.torneira && item.torneira !== "" ? item.torneira : "padrao";
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
      // Validação de Arte OBRIGATÓRIA
      if (produtoAtual && produtoAtual.permiteArte && !currentArteUrl) {
        showToast("Por favor, envie sua arte antes de continuar!", "warning");
        // Focar no container de arte para chamar atenção
        const container = document.getElementById("arteProdutoContainer");
        if (container) {
          container.style.border = "2px solid #ef4444";
          setTimeout(() => container.style.border = "1px dashed #f87171", 2000);
          container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const payload = {
        produtoId: produto.id,
        quantidade: produto.quantidade || 1,
        cor: corSelecionada,
        torneira: torneiraSelecionada,
        refil: produto.refil || null,
        arteUrl: currentArteUrl
      };

      await fetch("/api/carrinho/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
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
              (btnFecharModal.onclick = () => modal.classList.remove("show"));
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

/* ================== Botão Voltar ao Topo ================== */
function initBtnTop() {
  const btnTop = document.getElementById("btnTop");
  window.addEventListener("scroll", () =>
    btnTop.classList.toggle("show", window.scrollY > 300)
  );
  btnTop.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ================== Alterar Imagem Principal ================== */
window.mudarImagem = (element) =>
  (document.getElementById("imagemPrincipal").src = element.src);

/* ================== Alterar Quantidade ================== */
window.alterarQuantidade = (valor) => {
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

    const imgPrincipal = document.getElementById("imagemPrincipal");
    const cartButton = document.getElementById("cart-button");

    if (!imgPrincipal || !cartButton) {
      // se der algum bug de DOM, só adiciona normal
      await addToCart(produto);
      if (irParaCheckout) window.location.href = "/endereco";
      return;
    }

    const imgRect = imgPrincipal.getBoundingClientRect();
    imgFly.style.left = imgRect.left + "px";
    imgFly.style.top = imgRect.top + "px";

    const cartRect = cartButton.getBoundingClientRect();

    // força reflow para aplicar o transition
    imgFly.getBoundingClientRect();

    // animação: voa até o carrinho e encolhe
    imgFly.style.transform = `translate(${cartRect.left - imgRect.left}px, ${cartRect.top - imgRect.top
      }px) scale(0.1)`;
    imgFly.style.opacity = 0.4;

    // pulso no botão do carrinho
    cartButton.classList.add("cart-pulse");
    setTimeout(() => {
      cartButton.classList.remove("cart-pulse");
    }, 450);

    await new Promise((resolve) => setTimeout(resolve, 800));
    imgFly.remove();

    await addToCart(produto);
    if (irParaCheckout) window.location.href = "/endereco";
  } catch (err) {
    console.error("[Animar Carrinho] Erro:", err);
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
      document.getElementById("btnIrLogin").onclick = () =>
        (window.location.href = "/login");
      document.getElementById("btnFecharModal").onclick = () =>
        modal.classList.remove("show");
      return;
    }

    // 🔹 Validação de Cor
    if (produtoAtual.cores && produtoAtual.cores.length > 0 && !produtoAtual.corSelecionada) {
      showToast("Por favor, selecione uma cor!", "error");
      const container = document.getElementById("coresContainer");
      container.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // 🔹 Validação de Torneira
    if (produtoAtual.torneira && produtoAtual.torneira.length > 0 && !produtoAtual.torneiraSelecionada) {
      showToast("Por favor, selecione uma torneira!", "error");
      const sel = document.getElementById("torneiraSelect");
      sel.focus();
      sel.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // 🔹 Validação de Personalização (Arte)
    if (produtoAtual.permiteArte && !currentArteUrl) {
      showToast("Por favor, envie sua arte antes de continuar!", "error");
      const container = document.getElementById("arteProdutoContainer");
      container.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const produto = {
      ...produtoAtual,
      quantidade: parseInt(document.getElementById("quantidade").value),
      imagem: document.getElementById("imagemPrincipal").src,
      cor: produtoAtual.corSelecionada || null,
      torneira: produtoAtual.torneiraSelecionada || null,
      refil: produtoAtual.refilSelecionado || null,
      preco:
        produtoAtual.precoAjustado ||
        produtoAtual.precoPromocional ||
        produtoAtual.preco,
      precoPromocional:
        produtoAtual.precoPromocionalFinal || produtoAtual.precoPromocional,
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

  // 🔹 Validação de Cor
  if (produtoAtual.cores && produtoAtual.cores.length > 0 && !produtoAtual.corSelecionada) {
    showToast("Por favor, selecione uma cor!", "error");
    const container = document.getElementById("coresContainer");
    container.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // 🔹 Validação de Torneira
  if (produtoAtual.torneira && produtoAtual.torneira.length > 0 && !produtoAtual.torneiraSelecionada) {
    showToast("Por favor, selecione uma torneira!", "error");
    const sel = document.getElementById("torneiraSelect");
    sel.focus();
    sel.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // 🔹 Validação de Personalização (Arte)
  if (produtoAtual.permiteArte && !currentArteUrl) {
    showToast("Por favor, envie sua arte antes de continuar!", "error");
    const container = document.getElementById("arteProdutoContainer");
    container.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const produto = {
    ...produtoAtual,
    quantidade: parseInt(document.getElementById("quantidade").value),
    imagem: document.getElementById("imagemPrincipal").src,
    cor: produtoAtual.corSelecionada || null,
    torneira: produtoAtual.torneiraSelecionada || null,
    refil: produtoAtual.refilSelecionado || null,
    preco:
      produtoAtual.precoAjustado ||
      produtoAtual.precoPromocional ||
      produtoAtual.preco,
    precoPromocional:
      produtoAtual.precoPromocionalFinal || produtoAtual.precoPromocional,
  };

  console.log("[DEBUG] Produto enviado ao carrinho:", produto);

  animarEAdicionarAoCarrinho(produto, false);
});

/* =========================
  FORMATAÇÃO DO CAMPO DE CEP 
  ==========================
*/

//Formatando o campo ce CEP
const cepInput = document.getElementById("cepInput");
cepInput.addEventListener('input', () => {
    let cep = cepInput.value.replace(/\D/g, ''); // Remover caracteres não numéricos
    
    // Verificar se o CEP tem o comprimento correto
    if (cep.length === 8) {
        cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2'); // Formatando o CEP com traços
        cepInput.value = cep; // Atualizar o valor do campo de CEP
        // Preencher os outros campos com base no CEP
        cepInput.style.color = 'green';
        validcepInput = true
    } else if (cep.length < 8) {
        cepInput.style.color = 'red';
        validcepInput = false
    }
});

/* ================== Calcular Frete ================== */
async function calcularFreteDetalhes() {
  try {
    const cepDestino = document
      .querySelector("#cepInput")
      .value.replace(/\D/g, "");
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
      preco: produtoAtual.precoPromocional || produtoAtual.preco,
    };

    const response = await fetch("/api/frete/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cepDestino, produtos: [produto] }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao calcular frete");

    const container = document.querySelector("#freteResultado");
    container.innerHTML = "";

    console.log(data);

    data.forEach((opcao) => {
      const valor = Number(opcao.price) || 0;
      const card = document.createElement("div");
      card.className = "frete-card";

      card.innerHTML = `
        <img src="${opcao.company.picture}" class="frete-logo" alt="${opcao.name
        }">
        <div class="frete-info">
          <h4>${opcao.name}</h4>
          <p>Valor: R$ ${valor.toFixed(2).replace(".", ",")}</p>
          <p>Prazo: ${opcao.delivery_time} dias úteis</p>
        </div>
      `;

      // Permite selecionar o frete
      card.addEventListener("click", () => {
        document
          .querySelectorAll(".frete-card")
          .forEach((c) => c.classList.remove("selecionado"));
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
document
  .getElementById("calcularFrete")
  .addEventListener("click", calcularFreteDetalhes);

/* ================== Miniaturas com Navegação ================== */
function initMiniaturas(produto) {
  const container = document.getElementById("miniaturasContainer");
  const btnPrev = document.getElementById("miniaturaAnterior");
  const btnNext = document.getElementById("miniaturaProxima");

  if (!produto || !produto.imagem || !produto.imagem.length) return;

  // 🔥 Quantidade de miniaturas visíveis conforme a largura da tela
  function calcularMaxVisiveis() {
    const w = window.innerWidth;
    if (w >= 1280) return 6; // desktop grande
    if (w >= 992) return 5; // notebook / tablet landscape
    if (w >= 600) return 4; // tablet / mobile grande
    return 3; // mobile menor (mantém usabilidade)
  }

  let maxVisiveis = calcularMaxVisiveis();
  let indexInicial = 0;

  function renderMiniaturas() {
    container.innerHTML = "";

    const miniaturasVisiveis = produto.imagem.slice(
      indexInicial,
      indexInicial + maxVisiveis
    );

    miniaturasVisiveis.forEach((src, idx) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Miniatura do produto";

      // marca a primeira como selecionada na primeira renderização
      if (indexInicial === 0 && idx === 0) {
        img.classList.add("selecionada");
      }

      img.addEventListener("click", () => {
        const imgPrincipal = document.getElementById("imagemPrincipal");
        if (imgPrincipal) {
          imgPrincipal.style.opacity = 0;
          setTimeout(() => {
            imgPrincipal.src = src;
            imgPrincipal.style.opacity = 1;
          }, 120);
        }

        // marca visualmente a miniatura ativa
        container
          .querySelectorAll("img")
          .forEach((i) => i.classList.remove("selecionada"));
        img.classList.add("selecionada");
      });

      container.appendChild(img);
    });

    // habilita/desabilita botões
    btnPrev.disabled = indexInicial === 0;
    btnNext.disabled = indexInicial + maxVisiveis >= produto.imagem.length;
  }

  // Navegação
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

  // Recalcula quando mudar o tamanho da tela (responsivo)
  window.addEventListener("resize", () => {
    const novoMax = calcularMaxVisiveis();
    if (novoMax !== maxVisiveis) {
      maxVisiveis = novoMax;
      indexInicial = 0;
      renderMiniaturas();
    }
  });

  // Primeira renderização
  renderMiniaturas();
}

/* ================== Carregar Produto ================== */
async function carregarProduto() {
  const produtoId = new URLSearchParams(window.location.search).get("id");
  if (!produtoId) return console.error("ID do produto não fornecido");

  try {
    const resp = await fetch(`/api/produtos/public/${produtoId}`);
    if (resp.status === 404) {
      document.body.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      text-align:center;
      font-family:sans-serif;
    ">
      <h1>Produto indisponível</h1>
      <p>Este produto não está mais disponível.</p>
      <a href="/" style="margin-top:20px;color:#000;text-decoration:underline">
        Voltar para a loja
      </a>
    </div>
  `;
      return;
    }

    if (!resp.ok) throw new Error("Erro ao carregar produto");

    const produto = await resp.json();

    // 🔹 Garantir que campos JSON sejam arrays/objetos (caso venham como string)
    const parseSafe = (val) => {
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val;
    };

    produto.imagem = parseSafe(produto.imagem) || [];
    if (typeof produto.imagem === "string") produto.imagem = [produto.imagem]; // fallback

    produto.cores = parseSafe(produto.cores) || [];
    produto.torneira = parseSafe(produto.torneira) || [];
    produto.secao = parseSafe(produto.secao) || [];

    produtoAtual = produto; // Salva produto atual

    // ================== Função central de sincronização de preço ==================
    function atualizarPreco() {
      const precoAntigoEl = document.querySelector(
        ".produto-detalhes .preco .antigo"
      );
      const precoNovoEl = document.querySelector(
        ".produto-detalhes .preco .novo"
      );

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
        let extra = 0;
        if (refil === 2) extra = 5;
        else if (refil === 3) extra = 45;
        else if (refil === 4) extra = 90;
        else if (refil > 4) extra = 90 + (refil - 4) * 45;

        precoFinal += extra;
        if (precoPromoFinal !== null) precoPromoFinal += extra;
      }

      // 🔹 Atualiza DOM - só mostra preço antigo riscado se houver promoção
      if (precoPromoFinal !== null) {
        // Tem promoção: mostra preço normal riscado e preço promocional
        precoAntigoEl.textContent = base
          ? precoFinal.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })
          : "";
        precoNovoEl.textContent = precoPromoFinal.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
      } else {
        // Não tem promoção: mostra apenas o preço normal (sem riscar)
        precoAntigoEl.textContent = "";
        precoNovoEl.textContent = precoFinal.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
      }

      // 🔹 Atualiza produtoAtual globalmente
      produtoAtual.precoAjustado = precoPromoFinal || precoFinal;
      produtoAtual.precoFinal = precoFinal;
      produtoAtual.precoPromocionalFinal = precoPromoFinal;
    }

    document.getElementById("imagemPrincipal").src = produto.imagem[0];

    // Inicializa miniaturas com navegação
    initMiniaturas(produto);

    document.querySelector(".produto-detalhes h1").textContent = produto.nome;

    // Lógica correta: só mostra preço antigo riscado se houver preço promocional
    const precoAntigoEl = document.querySelector(".produto-detalhes .preco .antigo");
    const precoNovoEl = document.querySelector(".produto-detalhes .preco .novo");

    if (produto.precoPromocional) {
      // Tem promoção: mostra preço normal riscado e preço promocional
      precoAntigoEl.textContent = produto.preco
        ? produto.preco.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
        : "";
      precoNovoEl.textContent = produto.precoPromocional.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    } else {
      // Não tem promoção: mostra apenas o preço normal (sem riscar)
      precoAntigoEl.textContent = "";
      precoNovoEl.textContent = produto.preco
        ? produto.preco.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
        : "";
    }

    document.querySelector(".produto-detalhes .descricao").innerHTML = `
      <h3>Descrição</h3>
      <p>${produto.descricao}</p>
    `;

    // Renderizar cores disponíveis (ou esconder o seletor)
    const coresContainer = document.getElementById("coresContainer");
    const coresProdutoSection = document.querySelector(".cores-produto");

    if (produto.cores && produto.cores.length > 0) {
      coresContainer.innerHTML = "";

      produto.cores.forEach((cor) => {
        const div = document.createElement("div");
        div.className = "cor-item";
        div.style.backgroundColor = cor;
        div.title = cor;

        div.addEventListener("click", () => {
          document
            .querySelectorAll(".cor-item")
            .forEach((el) => el.classList.remove("selecionada"));
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
    ${produto.torneira
          .map((t) => `<option value="${t}">${t}</option>`)
          .join("")}
  `;

      torneiraSection.style.display = "flex";

      // 🔹 Mapa único de imagens por tipo de torneira
      const mapaTorneiras = {
        Cromada: "https://i.imgur.com/vXXjFbS.jpeg",
        Alavanca: "https://i.imgur.com/5R4OSsb.jpeg",
        "Tap Handle Prata": "https://i.imgur.com/K9dzoGw.jpeg",
        "Tap Handle Preta": "https://i.imgur.com/awKaFcR.jpeg",
      };

      // Captura a seleção e muda imagem e preço
      torneiraSelect.addEventListener("change", (e) => {
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
      refilSelect.addEventListener("change", (e) => {
        produtoAtual.refilSelecionado = parseInt(e.target.value);
        atualizarPreco();
      });
    } else {
      refilSection.style.display = "none";
    }

    // Exibir Opção de Arte
    const arteContainer = document.getElementById("arteProdutoContainer");
    const downloadGabarito = document.getElementById("downloadGabarito");

    if (produto.permiteArte) {
      arteContainer.style.display = "block";
      if (produto.urlGabarito) {
        downloadGabarito.href = produto.urlGabarito;
        downloadGabarito.style.display = "inline-flex";
      } else {
        downloadGabarito.style.display = "none";
      }
    } else {
      arteContainer.style.display = "none";
    }

    // Carregar Relacionados
    const categorias = [
      produto.categoria,
      produto.categoria2,
      produto.categoria3,
    ].filter(Boolean);
    let relacionados = [];
    for (const cat of categorias) {
      if (relacionados.length >= 4) break;
      const relResp = await fetch(
        `/api/produtos/categoria/${encodeURIComponent(cat)}`
      );
      if (!relResp.ok) continue;
      const produtosCat = await relResp.json();
      produtosCat.forEach((p) => {
        // Safe parse image for related products
        p.imagem = parseSafe(p.imagem) || [];
        if (typeof p.imagem === "string") p.imagem = [p.imagem];

        if (p.id !== produto.id && !relacionados.find((r) => r.id === p.id))
          relacionados.push(p);
      });
    }
    relacionados = relacionados.slice(0, 4);

    const grid = document.querySelector(".relacionados .produtos-grid");
    grid.innerHTML = relacionados.length
      ? relacionados
        .map(
          (p) => `
      <a href="/detalhes-produto?id=${p.id}" class="produto">
        <img src="${p.imagem[0]}" alt="${p.nome}">
        <h3>${p.nome}</h3>
        <p class="preco">
          <span class="antigo">${p.precoPromocional && p.preco
              ? p.preco.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
              : ""
            }</span>
          <span class="novo">${p.precoPromocional
              ? p.precoPromocional.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
              : p.preco
                ? p.preco.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
                : ""
            }</span>
        </p>
      </a>
    `
        )
        .join("")
      : `<p>Nenhum produto relacionado encontrado.</p>`;
  } catch (err) {
    console.error("[Detalhes Produto] Erro:", err);
    alert("Produto não encontrado.");
  }
}

function initArteUpload() {
  const fileInput = document.getElementById("uploadArteInput");
  const fileNameDisplay = document.getElementById("nomeArquivoArte");

  if (!fileInput) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];

    if (!file) {
      currentArteUrl = null;
      fileNameDisplay.textContent = "Nenhum arquivo selecionado";
      return;
    }

    // ====== VALIDAÇÕES (frontend) ======
    if (file.type !== "application/pdf") {
      showToast("Formato inválido! Use apenas PDF.", "error");
      fileInput.value = "";
      fileNameDisplay.textContent = "Erro no formato";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast("Arquivo muito grande! Máximo 50MB.", "error");
      fileInput.value = "";
      fileNameDisplay.textContent = "Arquivo muito grande";
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      showToast("Enviando arte...", "info");

      const response = await fetch("/api/upload/arte", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro no upload");
      }

      // 🔥 Agora usamos a URL REAL do Dropbox
      currentArteUrl = data.url;
      fileNameDisplay.textContent = file.name;
      showToast("Arte enviada com sucesso!", "success");
    } catch (error) {
      console.error(error);
      showToast("Falha ao enviar arte.", "error");
      fileInput.value = "";
      fileNameDisplay.textContent = "Erro no upload";
      currentArteUrl = null;
    }
  });
}

/* ================== Inicialização ================== */
document.addEventListener("DOMContentLoaded", () => {
  verificarLogin();
  initSearchBar();
  initMenu();
  initCart();
  initBtnTop();
  initArteUpload();
  carregarProduto();
});
