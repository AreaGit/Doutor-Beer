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
  let guestId = null;

  // ================== Utilitários ==================
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

  // ================== Detectar login ==================
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

  // ================== Gerenciar Guest ID ==================
  async function ensureGuestId() {
    if (isLoggedIn) {
      guestId = null;
      return null;
    }

    guestId = getCookie("guestId");
    
    if (!guestId) {
      try {
        const resp = await fetch("/api/carrinho/guest", { 
          method: "POST",
          credentials: "include"
        });
        
        if (resp.ok) {
          const data = await resp.json();
          guestId = data.guestId;
          setCookie("guestId", guestId, 30);
          console.log("[Carrinho] Novo guestId criado:", guestId);
        }
      } catch (err) {
        console.error("[Carrinho] Erro ao criar guestId:", err);
      }
    } else {
      console.log("[Carrinho] GuestId recuperado:", guestId);
    }
    
    return guestId;
  }

  // ================== MESCLAR CARRINHO GUEST → USUÁRIO ==================
  async function mergeGuestCart() {
    if (!isLoggedIn || !guestId) return false;
    
    try {
      const resp = await fetch("/api/carrinho/merge-guest", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "X-Guest-Id": guestId 
        },
        credentials: "include"
      });
      
      if (resp.ok) {
        const result = await resp.json();
        console.log("[Carrinho] Mesclagem realizada:", result.merged, "itens");
        
        // Limpar guestId após mesclagem bem-sucedida
        guestId = null;
        document.cookie = "guestId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Carrinho] Erro na mesclagem:", err);
      return false;
    }
  }

  // ================== Headers para requisições ==================
  function getHeaders() {
    const headers = {
      "Content-Type": "application/json"
    };
    
    if (!isLoggedIn && guestId) {
      headers["X-Guest-Id"] = guestId;
    }
    
    return headers;
  }

  // ================== Buscar carrinho do servidor ==================
  async function fetchCart() {
    try {
      const headers = getHeaders();
      const resp = await fetch("/api/carrinho", { 
        headers, 
        credentials: "include" 
      });
      
      if (resp.ok) {
        const data = await resp.json();
        console.log("[Carrinho] Carrinho carregado:", data.length, "itens");
        
        // Verificar se há cupom aplicado nos itens
        checkAppliedCoupon(data);
        
        return data;
      }
      return [];
    } catch (error) {
      console.error("[Carrinho] Erro ao buscar carrinho:", error);
      return [];
    }
  }

  // ================== Verificar cupom aplicado ==================
  function checkAppliedCoupon(items) {
    if (items.length === 0) {
      appliedCoupon = null;
      return;
    }
    
    // Verificar se todos os itens têm o mesmo cupom
    const cupons = items.map(item => item.cupom).filter(Boolean);
    if (cupons.length > 0) {
      const cupomUnico = cupons[0];
      const todosIguais = cupons.every(cupom => cupom === cupomUnico);
      
      if (todosIguais) {
        const validCoupons = {
          "DESCONTO10": 0.10,
          "FRETEGRATIS": 0.15,
          "JORGERAMOS69": 0.69,
          "DOUTOR10": 0.10,
          "BEER20": 0.20
        };
        
        const desconto = validCoupons[cupomUnico];
        if (desconto) {
          appliedCoupon = {
            codigo: cupomUnico,
            desconto: desconto
          };
          console.log("[Carrinho] Cupom detectado:", appliedCoupon.codigo);
        }
      }
    } else {
      appliedCoupon = null;
    }
  }

  // ================== CUPOM DE DESCONTO ==================
async function aplicarCupom() {
  const codigo = couponInput.value.trim();
  
  if (!codigo) {
    alert("Por favor, digite um código de cupom");
    return;
  }

  try {
    const headers = getHeaders();
    const resp = await fetch("/api/carrinho/cupom/aplicar", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ codigo })
    });

    if (resp.ok) {
      const result = await resp.json();
      appliedCoupon = result;
      
      // Mostrar mensagem de sucesso
      alert(result.message);
      
      // Atualizar input com código aplicado
      couponInput.value = result.codigo;
      couponInput.disabled = true;
      
      // Mudar texto e função do botão - CORREÇÃO AQUI
      applyCouponBtn.textContent = "Remover";
      applyCouponBtn.removeEventListener('click', aplicarCupom); // Remove listener antigo
      applyCouponBtn.addEventListener('click', removerCupom);   // Adiciona novo listener
      
      // Recarregar carrinho para mostrar descontos
      cartItems = await fetchCart();
      renderCart();
      
    } else {
      const error = await resp.json();
      alert(error.error || "Erro ao aplicar cupom");
    }
  } catch (err) {
    console.error("[Carrinho] Erro ao aplicar cupom:", err);
    alert("Erro ao aplicar cupom");
  }
}

async function removerCupom() {
  try {
    const headers = getHeaders();
    const resp = await fetch("/api/carrinho/cupom/remover", {
      method: "POST",
      headers,
      credentials: "include"
    });

    if (resp.ok) {
      appliedCoupon = null;
      
      // Resetar input e botão - CORREÇÃO AQUI
      couponInput.value = "";
      couponInput.disabled = false;
      applyCouponBtn.textContent = "Aplicar";
      applyCouponBtn.removeEventListener('click', removerCupom); // Remove listener antigo
      applyCouponBtn.addEventListener('click', aplicarCupom);   // Adiciona novo listener
      
      // Recarregar carrinho
      cartItems = await fetchCart();
      renderCart();
      
      alert("Cupom removido com sucesso");
    } else {
      const error = await resp.json();
      alert(error.error || "Erro ao remover cupom");
    }
  } catch (err) {
    console.error("[Carrinho] Erro ao remover cupom:", err);
    alert("Erro ao remover cupom");
  }
}

  // ================== INICIALIZAÇÃO ATUALIZADA ==================
  async function initializeCart() {
    // 1. Verificar status de login ANTES
    const wasLoggedIn = isLoggedIn;
    await checkLoginStatus();
    
    // 2. Garantir que temos guestId (se não logado)
    await ensureGuestId();
    
    // 3. SE o usuário ACABOU DE FAZER LOGIN, mesclar carrinhos
    if (isLoggedIn && !wasLoggedIn && guestId) {
      console.log("[Carrinho] Usuário fez login, mesclando carrinhos...");
      await mergeGuestCart();
    }
    
    // 4. Buscar carrinho do servidor
    cartItems = await fetchCart();
    
    // 5. Configurar cupom se já estiver aplicado
    if (appliedCoupon) {
      couponInput.value = appliedCoupon.codigo;
      couponInput.disabled = true;
      applyCouponBtn.textContent = "Remover";
      applyCouponBtn.onclick = removerCupom;
    }
    
    // 6. Renderizar
    renderCart();
    
    console.log("[Carrinho] Inicializado - Logado:", isLoggedIn, "Itens:", cartItems.length);
  }

  // ================== Renderizar carrinho ==================
  async function renderCart() {
    cartItemsContainer.innerHTML = "";
    
    if (!cartItems.length) {
      cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio.</p>";
      updateResumo();
      return;
    }

    cartItems.forEach((item, index) => {
      const precoFinal = item.precoFinal || item.precoPromocional || item.preco || 0;
      const precoOriginal = item.precoPromocional || item.preco || 0;
      const temDesconto = item.precoFinal && item.precoFinal !== precoOriginal;
      
      const itemDiv = document.createElement("div");
      itemDiv.className = "cart-item";
      itemDiv.innerHTML = `
        <img src="${item.imagem || ''}" alt="${item.nome}" onerror="this.style.display='none'">
        <div class="cart-item-info">
          <h4>${item.nome}</h4>
          ${temDesconto ? `
            <p class="original-price" style="text-decoration: line-through; color: #999; font-size: 0.9em;">
              ${precoOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          ` : ''}
          <p class="final-price" style="color: #e74c3c; font-weight: bold;">
            ${precoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

    // Event listeners para controles de quantidade
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
    
    // Calcular totais
    let subtotal = cartItems.reduce((acc, i) => {
      const precoBase = i.precoPromocional || i.preco || 0;
      return acc + (precoBase * i.quantidade);
    }, 0);
    
    let totalComDesconto = cartItems.reduce((acc, i) => {
      const precoFinal = i.precoFinal || i.precoPromocional || i.preco || 0;
      return acc + (precoFinal * i.quantidade);
    }, 0);
    
    let desconto = subtotal - totalComDesconto;
    
    cartCount.textContent = totalQuantity;
    summaryItems.textContent = totalItems;
    summaryQuantity.textContent = totalQuantity;
    summaryTotal.textContent = totalComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Mostrar desconto se houver
    const discountElement = document.getElementById("summary-discount");
    const subtotalElement = document.getElementById("summary-subtotal");
    
    if (!discountElement && desconto > 0) {
      // Criar elemento de desconto se não existir
      const cartSummary = document.querySelector(".cart-summary");
      const discountLine = document.createElement("p");
      discountLine.id = "summary-discount";
      discountLine.innerHTML = `Desconto: <span style="color: #e74c3c;">-${desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>`;
      cartSummary.insertBefore(discountLine, summaryTotal.parentElement);
    } else if (discountElement) {
      if (desconto > 0) {
        discountElement.innerHTML = `Desconto: <span style="color: #e74c3c;">-${desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>`;
        discountElement.style.display = "block";
      } else {
        discountElement.style.display = "none";
      }
    }
  }

  // ================== Atualizar quantidade ==================
  async function updateQuantity(idx, quantidade) {
    if (idx < 0 || idx >= cartItems.length) return;
    
    cartItems[idx].quantidade = quantidade;
    
    try {
      const headers = getHeaders();
      await fetch("/api/carrinho/update", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ 
          produtoId: cartItems[idx].id, 
          quantidade 
        })
      });
    } catch (err) {
      console.error("[Carrinho] Erro ao atualizar quantidade:", err);
    }
    
    renderCart();
  }

  // ================== Remover item ==================
  async function removeItem(idx) {
    if (idx < 0 || idx >= cartItems.length) return;
    
    const produtoId = cartItems[idx].id;
    cartItems.splice(idx, 1);
    
    try {
      const headers = getHeaders();
      await fetch("/api/carrinho/remove", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ produtoId })
      });
    } catch (err) {
      console.error("[Carrinho] Erro ao remover item:", err);
    }
    
    renderCart();
  }

  // ================== Adicionar produto ==================
  window.addToCart = async function(produto) {
    if (!produto || !produto.id) {
      console.error("[Carrinho] Produto inválido:", produto);
      return;
    }

    // Verificar se já está no carrinho
    const existingIndex = cartItems.findIndex(i => i.id === produto.id);
    
    if (existingIndex >= 0) {
      cartItems[existingIndex].quantidade += (produto.quantidade || 1);
    } else {
      cartItems.push({ 
        ...produto, 
        quantidade: produto.quantidade || 1 
      });
    }

    try {
      const headers = getHeaders();
      await fetch("/api/carrinho/add", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ 
          produtoId: produto.id, 
          quantidade: produto.quantidade || 1 
        })
      });
      
      console.log("[Carrinho] Produto adicionado:", produto.id);
    } catch (err) {
      console.error("[Carrinho] Erro ao adicionar produto:", err);
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

  // ================== EVENT LISTENERS PARA CUPOM ==================
  if (applyCouponBtn && couponInput) {
    // Aplicar cupom ao clicar no botão
    applyCouponBtn.addEventListener('click', aplicarCupom);
    
    // Aplicar cupom ao pressionar Enter
    couponInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        aplicarCupom();
      }
    });
  }

  // ================== INICIALIZAR ==================
  await initializeCart();
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
