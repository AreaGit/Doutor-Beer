document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTopbarDate();
  initLogout();
  initModals();
  initProdutoCadastro();
  initProdutoEdicao();
  initBuscaProdutos();
  initChart();
  initMascarasECEPClienteModal();
  // As abas carregam dados sob demanda:
  // - produtos: carregarProdutos()
  // - pedidos: carregarPedidos()
  // - clientes: carregarClientes()
});

/* =====================
 * UTILIDADES GERAIS
 * ===================== */

function showToast(message, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast toast-${type} show`;
  setTimeout(() => {
    el.classList.remove("show");
  }, 2500);
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

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

/* =====================
 * DATA NO TOPO
 * ===================== */

function initTopbarDate() {
  const dateEl = document.getElementById("topbarDate");
  if (!dateEl) return;

  const hoje = new Date();
  const formatado = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  dateEl.textContent = formatado;
}

/* =====================
 * LOGOUT
 * ===================== */

function initLogout() {
  const btnLogout = document.getElementById("btnLogout");
  if (!btnLogout) return;

  btnLogout.addEventListener("click", () => {
    if (confirm("Deseja sair do painel administrativo?")) {
      fetch("/api/auth/logout", { method: "POST" })
        .finally(() => {
          window.location.href = "/login";
        });
    }
  });
}

/* =====================
 * MODAIS (GENÉRICO)
 * ===================== */

function initModals() {
  // Fecha modais pelos botões com data-modal-close
  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-modal-close]");
    if (closeBtn) {
      const modal = closeBtn.closest(".modal");
      if (modal) modal.style.display = "none";
    }
  });

  // Fecha clicando no overlay
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });

  // Modal "Novo Produto" tem abertura por botão
  const modalNovoProduto = document.getElementById("modalNovoProduto");
  const btnNovoProduto = document.getElementById("btnNovoProduto");

  if (btnNovoProduto && modalNovoProduto) {
    btnNovoProduto.addEventListener("click", () => {
      modalNovoProduto.style.display = "block";
    });
  }
}

/* =====================
 * PRODUTOS - CADASTRO
 * ===================== */

function initProdutoCadastro() {
  const formCadastro = document.getElementById("formCadastrarProduto");
  const btnCadastrarProduto = document.getElementById("btnCadastrarProduto");
  const textareaImagens = document.getElementById("imagemProduto");
  const previewContainer = document.getElementById("previewImagensNovo");

  if (!formCadastro || !btnCadastrarProduto) return;

  // 🔹 Array em memória que guarda as URLs já adicionadas
  let imagensArray = [];
  let dragSrcIndex = null; // índice da imagem que está sendo arrastada

  // ---------- PRÉ-VISUALIZAÇÃO DE IMAGENS ----------
  function renderPreviewImagensNovo() {
    if (!previewContainer) return;

    if (!imagensArray.length) {
      previewContainer.innerHTML = `
        <span style="font-size:0.78rem;color:#77778f;">
          Nenhuma imagem adicionada ainda.
        </span>`;
      return;
    }

    previewContainer.innerHTML = imagensArray.map((url, index) => `
      <div class="imagem-preview-item" draggable="true" data-index="${index}">
        <button type="button" class="imagem-remove-btn" data-index="${index}">&times;</button>
        <img src="${url}" alt="Pré-visualização">
      </div>
    `).join("");

    // Eventos de remover
    previewContainer.querySelectorAll(".imagem-remove-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.index);
        imagensArray.splice(idx, 1);
        renderPreviewImagensNovo();
      });
    });

    // Eventos de drag & drop
    previewContainer.querySelectorAll(".imagem-preview-item").forEach(item => {
      item.addEventListener("dragstart", (e) => {
        dragSrcIndex = Number(item.dataset.index);
        e.dataTransfer.effectAllowed = "move";
        item.classList.add("dragging");
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault(); // necessário pra permitir drop
        e.dataTransfer.dropEffect = "move";
      });

      item.addEventListener("drop", (e) => {
        e.preventDefault();
        const targetIndex = Number(item.dataset.index);
        if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

        // Reordena o array
        const moved = imagensArray.splice(dragSrcIndex, 1)[0];
        imagensArray.splice(targetIndex, 0, moved);
        dragSrcIndex = null;

        // Re-renderiza tudo
        renderPreviewImagensNovo();
      });
    });
  }

  // Adiciona URLs ao array a partir de um texto bruto
  function adicionarUrlsDeTexto(raw) {
    if (!raw) return;

    const urls = raw
      .split(/[\n,; ]+/)              // quebra por vírgula, enter, espaço, ponto e vírgula
      .map((u) => u.trim())
      .filter((u) => u && /^https?:\/\//i.test(u)); // só http/https

    if (!urls.length) return;

    // Evita duplicadas
    urls.forEach((u) => {
      if (!imagensArray.includes(u)) {
        imagensArray.push(u);
      }
    });

    // Limpa o campo de texto (é aqui que o link "some")
    textareaImagens.value = "";

    // Atualiza o preview
    renderPreviewImagensNovo();
  }

  // Estado inicial do preview
  renderPreviewImagensNovo();

  if (textareaImagens && previewContainer) {
    // Quando apertar ENTER no campo, processa o texto e limpa
    textareaImagens.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        adicionarUrlsDeTexto(textareaImagens.value);
      }
    });

    // Se o usuário sair do campo com algo digitado, processa também
    textareaImagens.addEventListener("blur", () => {
      adicionarUrlsDeTexto(textareaImagens.value);
    });
  }

  // ---------- SUBMIT DO FORM ----------
  btnCadastrarProduto.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const nome = document.getElementById("nomeProduto").value.trim();
      const descricao = document.getElementById("descricaoProduto").value.trim();
      const preco = parseFloat(document.getElementById("precoProduto").value);
      const precoPromocional = parseFloat(document.getElementById("precoPromocionalProduto").value) || null;
      const categoria = document.getElementById("categoriaProduto").value.trim() || null;
      const categoria2 = document.getElementById("categoria2Produto").value.trim() || null;
      const categoria3 = document.getElementById("categoria3Produto").value.trim() || null;
      const secoesSelecionadas = Array.from(
        document.querySelectorAll("input[name='secaoProduto']:checked")
      ).map(el => el.value);

      // Agora `secao` é um array mesmo (JSON), não mais string
      const secao = secoesSelecionadas.length ? secoesSelecionadas : [];
      const altura = parseFloat(document.getElementById("alturaProduto").value) || null;
      const largura = parseFloat(document.getElementById("larguraProduto").value) || null;
      const comprimento = parseFloat(document.getElementById("comprimentoProduto").value) || null;
      const peso = parseFloat(document.getElementById("pesoProduto").value) || null;

      const cores = Array.from(
        document.querySelectorAll("input[name='coresProduto']:checked")
      ).map(el => el.value);

      const torneira = Array.from(
        document.querySelectorAll("input[name='torneiraProduto']:checked")
      ).map(el => el.value);

      const capacidade = document.getElementById("capacidadeProduto").value
        .split(",").map(i => i.trim()).filter(i => i);

      const refilValue = document.getElementById("refilProduto").value;
      const refil = refilValue === "" ? null : parseInt(refilValue, 10);

      // 🔹 Usa o array em memória na ordem atual
      const imagem = imagensArray;

      const produtoData = {
        nome,
        descricao,
        preco,
        precoPromocional,
        categoria,
        categoria2,
        categoria3,
        secao,
        altura,
        largura,
        comprimento,
        peso,
        imagem,
        cores,
        torneira,
        capacidade,
        refil,
      };

      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(produtoData)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.erro || "Erro ao criar produto");

      showToast("Produto cadastrado com sucesso!", "success");
      formCadastro.reset();

      // Limpa array e preview depois de cadastrar
      imagensArray = [];
      renderPreviewImagensNovo();
      if (textareaImagens) textareaImagens.value = "";

      document.getElementById("modalNovoProduto").style.display = "none";
      carregarProdutos();
    } catch (err) {
      console.error(err);
      showToast("Erro ao cadastrar produto: " + err.message, "error");
    }
  });
}

/* =====================
 * PRODUTO - EDIÇÃO (UI de imagens)
 * ===================== */

let imagensEditarArray = [];
let dragEditarSrcIndex = null;

function initProdutoEdicao() {
  const textareaImagensEditar = document.getElementById("editarImagemProduto");
  const previewEditar = document.getElementById("previewImagensEditar");

  if (!textareaImagensEditar || !previewEditar) return;

  function renderPreviewImagensEditar() {
    if (!imagensEditarArray.length) {
      previewEditar.innerHTML = `
        <span style="font-size:0.78rem;color:#77778f;">
          Nenhuma imagem adicionada ainda.
        </span>`;
      return;
    }

    previewEditar.innerHTML = imagensEditarArray.map((url, index) => `
      <div class="imagem-preview-item" draggable="true" data-index="${index}">
        <button type="button" class="imagem-remove-btn" data-index="${index}">&times;</button>
        <img src="${url}" alt="Pré-visualização">
      </div>
    `).join("");

    // remover
    previewEditar.querySelectorAll(".imagem-remove-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.index);
        imagensEditarArray.splice(idx, 1);
        renderPreviewImagensEditar();
      });
    });

    // drag & drop
    previewEditar.querySelectorAll(".imagem-preview-item").forEach(item => {
      item.addEventListener("dragstart", (e) => {
        dragEditarSrcIndex = Number(item.dataset.index);
        e.dataTransfer.effectAllowed = "move";
        item.classList.add("dragging");
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      item.addEventListener("drop", (e) => {
        e.preventDefault();
        const targetIndex = Number(item.dataset.index);
        if (dragEditarSrcIndex === null || dragEditarSrcIndex === targetIndex) return;

        const moved = imagensEditarArray.splice(dragEditarSrcIndex, 1)[0];
        imagensEditarArray.splice(targetIndex, 0, moved);
        dragEditarSrcIndex = null;
        renderPreviewImagensEditar();
      });
    });
  }

  function adicionarUrlsDeTextoEditar(raw) {
    if (!raw) return;

    const urls = raw
      .split(/[\n,; ]+/)
      .map((u) => u.trim())
      .filter((u) => u && /^https?:\/\//i.test(u));

    if (!urls.length) return;

    urls.forEach((u) => {
      if (!imagensEditarArray.includes(u)) {
        imagensEditarArray.push(u);
      }
    });

    textareaImagensEditar.value = "";
    renderPreviewImagensEditar();
  }

  // deixa função acessível em outros pontos
  window._renderPreviewImagensEditar = renderPreviewImagensEditar;

  // estado inicial
  renderPreviewImagensEditar();

  // eventos
  textareaImagensEditar.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      adicionarUrlsDeTextoEditar(textareaImagensEditar.value);
    }
  });

  textareaImagensEditar.addEventListener("blur", () => {
    adicionarUrlsDeTextoEditar(textareaImagensEditar.value);
  });
}



/* =====================
 * PRODUTOS - LISTAGEM / EDIÇÃO / REMOÇÃO
 * ===================== */

let produtoAtualId = null;

async function carregarProdutos() {
  const container = document.getElementById("listaProdutos");
  if (!container) return;

  container.innerHTML = "<p class='text-muted'>Carregando produtos...</p>";

  try {
    const response = await fetch("/api/produtos");
    if (!response.ok) throw new Error("Erro ao carregar produtos");

    const produtos = await response.json();
    if (!produtos.length) {
      container.innerHTML = "<p class='text-muted'>Nenhum produto cadastrado.</p>";
      return;
    }

    renderListaProdutos(produtos);
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p class='text-error'>Erro ao carregar produtos.</p>";
  }
}

function renderProdutoCard(p) {
  const imagem = (p.imagem && p.imagem[0]) ? p.imagem[0] : "/images/no-image.png";

  const precoNormal = formatCurrency(p.preco);
  const precoPromo = p.precoPromocional ? formatCurrency(p.precoPromocional) : null;

  return `
    <article class="product-card" data-id="${p.id}">
      <div class="product-thumb">
        <img src="${imagem}" alt="${p.nome}">
      </div>
      <div class="product-body">
        <div class="product-top">
          <h3>${p.nome}</h3>
          <span class="badge badge-success">Ativo</span>
        </div>
        <p class="product-meta">
          ${p.categoria || "Sem categoria"} • Estoque: ${p.estoque ?? "-"} 
        </p>
        <div class="product-price">
          ${
            precoPromo
              ? `<span class="new">${precoPromo}</span><span class="old">${precoNormal}</span>`
              : `<span class="new">${precoNormal}</span>`
          }
        </div>
        <div class="product-actions">
          <button class="btn-outline editar-btn">
            <i class="fa-regular fa-pen-to-square"></i>
            Editar
          </button>
          <button class="btn-danger deletar-btn">
            <i class="fa-regular fa-trash-can"></i>
            Remover
          </button>
        </div>
      </div>
    </article>
  `;
}


function renderListaProdutos(produtos) {
  const container = document.getElementById("listaProdutos");
  if (!container) return;

  container.innerHTML = produtos.map(renderProdutoCard).join("");

  // Eventos de edição / remoção
  container.querySelectorAll(".editar-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const produtoId = btn.closest(".product-card").dataset.id;
      abrirModalEditarProduto(produtoId);
    });
  });

  container.querySelectorAll(".deletar-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const produtoId = btn.closest(".product-card").dataset.id;
      if (confirm("Deseja realmente deletar este produto?")) {
        await deletarProduto(produtoId);
      }
    });
  });

  // ✅ Clique no card redireciona para a página pública (seguindo a lógica do site)
  container.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", (e) => {
      // Evita que o clique nos botões dispare o redirecionamento
      if (e.target.closest(".editar-btn") || e.target.closest(".deletar-btn")) return;

      const produtoId = card.dataset.id;
      if (produtoId) {
        // igual ao front público: /detalhes-produto?id={id}
        window.open(`/detalhes-produto?id=${produtoId}`, "_blank");
      }
    });
  });
}

async function deletarProduto(id) {
  try {
    const response = await fetch(`/api/produtos/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Erro ao deletar produto");
    showToast("Produto deletado com sucesso!", "success");
    carregarProdutos();
  } catch (err) {
    console.error(err);
    showToast("Erro ao deletar produto.", "error");
  }
}

function abrirModalEditarProduto(id) {
  produtoAtualId = id;
  const modal = document.getElementById("modalEditarProduto");
  if (!modal) return;
  modal.style.display = "block";

  fetch(`/api/produtos/${id}`)
    .then(res => res.json())
    .then(p => {
      // básicos
      document.getElementById("editarNome").value = p.nome || "";
      document.getElementById("editarDescricao").value = p.descricao || "";
      document.getElementById("editarPreco").value = p.preco || "";
      document.getElementById("editarPrecoPromocional").value = p.precoPromocional || "";

      // categorias (selects)
      document.getElementById("editarCategoriaProduto").value = p.categoria || "";
      document.getElementById("editarCategoria2Produto").value = p.categoria2 || "";
      document.getElementById("editarCategoria3Produto").value = p.categoria3 || "";

      // seções (chips)
      const secoes = Array.isArray(p.secao) ? p.secao : (p.secao ? [p.secao] : []);
      document.querySelectorAll("input[name='editarSecaoProduto']").forEach(chk => {
        chk.checked = secoes.includes(chk.value);
      });

      // dimensões / peso
      document.getElementById("editarAltura").value = p.altura || "";
      document.getElementById("editarLargura").value = p.largura || "";
      document.getElementById("editarComprimento").value = p.comprimento || "";
      document.getElementById("editarPeso").value = p.peso || "";

      // refil
      document.getElementById("editarRefil").value =
        p.refil === null || p.refil === undefined ? "" : p.refil;

      // capacidade (array -> string com vírgulas)
      const cap = Array.isArray(p.capacidade) ? p.capacidade : [];
      document.getElementById("editarCapacidadeProduto").value = cap.join(", ");

      // cores (check)
      const cores = Array.isArray(p.cores) ? p.cores : [];
      document.querySelectorAll("input[name='editarCoresProduto']").forEach(chk => {
        chk.checked = cores.includes(chk.value);
      });

      // torneira (check)
      const torneiras = Array.isArray(p.torneira) ? p.torneira : [];
      document.querySelectorAll("input[name='editarTorneiraProduto']").forEach(chk => {
        chk.checked = torneiras.includes(chk.value);
      });

      // imagens (array -> preview)
      imagensEditarArray = Array.isArray(p.imagem) ? [...p.imagem] : [];
      if (typeof window._renderPreviewImagensEditar === "function") {
        window._renderPreviewImagensEditar();
      }

      // limpa textarea de imagens (o usuário só adiciona/edita links novos)
      const textareaImagensEditar = document.getElementById("editarImagemProduto");
      if (textareaImagensEditar) textareaImagensEditar.value = "";
    })
    .catch(err => {
      console.error(err);
      showToast("Erro ao carregar produto.", "error");
      modal.style.display = "none";
    });

  initEditarProdutoSubmit();
}


function initEditarProdutoSubmit() {
  const formEditarProduto = document.getElementById("formEditarProduto");
  if (!formEditarProduto) return;

  // garante que só tenha um listener
  if (formEditarProduto.dataset.bound === "true") return;
  formEditarProduto.dataset.bound = "true";

  formEditarProduto.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!produtoAtualId) return;

    const refilRaw = document.getElementById("editarRefil").value;
    const refil = refilRaw === "" ? null : parseInt(refilRaw, 10);

    const secoesSelecionadas = Array.from(
      document.querySelectorAll("input[name='editarSecaoProduto']:checked")
    ).map(el => el.value);
    const secao = secoesSelecionadas.length ? secoesSelecionadas : [];

    const cores = Array.from(
      document.querySelectorAll("input[name='editarCoresProduto']:checked")
    ).map(el => el.value);

    const torneira = Array.from(
      document.querySelectorAll("input[name='editarTorneiraProduto']:checked")
    ).map(el => el.value);

    const capacidade = document.getElementById("editarCapacidadeProduto").value
      .split(",")
      .map(i => i.trim())
      .filter(i => i);

    // usa o array de imagens da edição
    const imagem = imagensEditarArray;

    const data = {
      nome: document.getElementById("editarNome").value,
      descricao: document.getElementById("editarDescricao").value,
      preco: parseFloat(document.getElementById("editarPreco").value),
      precoPromocional: parseFloat(document.getElementById("editarPrecoPromocional").value) || null,
      categoria: document.getElementById("editarCategoriaProduto").value || null,
      categoria2: document.getElementById("editarCategoria2Produto").value || null,
      categoria3: document.getElementById("editarCategoria3Produto").value || null,
      secao,
      altura: parseFloat(document.getElementById("editarAltura").value) || null,
      largura: parseFloat(document.getElementById("editarLargura").value) || null,
      comprimento: parseFloat(document.getElementById("editarComprimento").value) || null,
      peso: parseFloat(document.getElementById("editarPeso").value) || null,
      imagem,
      cores,
      torneira,
      capacidade,
      refil,
    };

    try {
      const res = await fetch(`/api/produtos/${produtoAtualId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao atualizar produto");

      showToast("Produto atualizado com sucesso!", "success");
      document.getElementById("modalEditarProduto").style.display = "none";
      carregarProdutos();
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar produto.", "error");
    }
  });
}


/* =====================
 * BUSCA DE PRODUTOS
 * ===================== */

function initBuscaProdutos() {
  const searchBtn = document.getElementById("searchProdutoBtn");
  const searchInput = document.getElementById("searchProdutoInput");

  if (!searchBtn || !searchInput) return;

  searchBtn.addEventListener("click", () => buscarProdutos(searchInput.value.trim()));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarProdutos(searchInput.value.trim());
    }
  });
}

async function buscarProdutos(query) {
  if (!query) {
    return carregarProdutos();
  }

  const container = document.getElementById("listaProdutos");
  if (!container) return;

  container.innerHTML = "<p class='text-muted'>Buscando produtos...</p>";

  try {
    const res = await fetch(`/api/produtos/busca?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Erro na busca de produtos");
    const produtos = await res.json();

    if (!produtos.length) {
      container.innerHTML = "<p class='text-muted'>Nenhum produto encontrado.</p>";
      return;
    }

    renderListaProdutos(produtos);
  } catch (err) {
    console.error(err);
    showToast("Erro na busca de produtos.", "error");
  }
}

/* =====================
 * PEDIDOS
 * ===================== */

async function carregarPedidos() {
  const tabelaBody = document.getElementById("listaPedidos");
  if (!tabelaBody) return;

  tabelaBody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  try {
    const response = await fetch("/api/pedido/admin");
    if (!response.ok) throw new Error("Erro ao carregar pedidos");

    const pedidos = await response.json();

    if (!pedidos.length) {
      tabelaBody.innerHTML = "<tr><td colspan='5'>Nenhum pedido encontrado.</td></tr>";
      return;
    }

    tabelaBody.innerHTML = pedidos.map(p => `
      <tr data-id="${p.id}">
        <td data-label="ID">#${p.id}</td>
        <td data-label="Cliente">${p.usuario?.nome ?? "Cliente removido"}</td>
        <td data-label="Status">${p.status}</td>
        <td data-label="Total">${formatCurrency(p.total)}</td>
        <td data-label="Data">${new Date(p.criadoEm).toLocaleDateString("pt-BR")}</td>
      </tr>
    `).join("");

    tabelaBody.querySelectorAll("tr").forEach(tr => {
      tr.addEventListener("click", () => {
        const pedidoId = tr.getAttribute("data-id");
        const pedido = pedidos.find(p => p.id == pedidoId);
        abrirModalPedido(pedido);
      });
    });
  } catch (err) {
    console.error(err);
    tabelaBody.innerHTML = "<tr><td colspan='5'>Erro ao carregar pedidos.</td></tr>";
  }
}

function abrirModalPedido(pedido) {
  const modal = document.getElementById("modalPedido");
  if (!modal) return;

  modal.style.display = "block";

  // Título / cliente
  document.getElementById("modalPedidoId").innerText = "#" + pedido.id;
  document.getElementById("modalClientePed").innerText = pedido.usuario?.nome ?? "Cliente removido";

  // Select de status
  const statusSelect = document.getElementById("modalStatus");
  statusSelect.innerHTML = `
    <option value="Pendente">Pendente</option>
    <option value="Processando">Processando</option>
    <option value="Enviado">Enviado</option>
    <option value="Entregue">Entregue</option>
    <option value="Cancelado">Cancelado</option>
  `;
  statusSelect.value = pedido.status;
  aplicarCorStatusTexto(statusSelect);

  statusSelect.onchange = async () => {
    const novoStatus = statusSelect.value;
    aplicarCorStatusTexto(statusSelect);

    try {
      const response = await fetch(`/api/pedido/admin/${pedido.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao atualizar status");

      console.log("Status atualizado:", data.status);
      carregarPedidos();
      showToast("Status do pedido atualizado.", "success");
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      showToast("Erro ao atualizar status do pedido.", "error");
    }
  };

  // Endereço
  const end = pedido.enderecoEntrega || {};
  document.getElementById("modalEndereco").innerText =
    `${end.rua ?? ""}, ${end.numero ?? ""} - ${end.cidade ?? ""} / ${end.estado ?? ""}, CEP: ${end.cep ?? ""}`;

  // Pagamento (ajustei pra tentar formaPagamento ou metodoPagamento)
  document.getElementById("modalPagamento").innerText =
    pedido.metodoPagamento || pedido.formaPagamento || "-";

  // ===========================
  // ITENS DO PEDIDO (AQUI ESTAVA O ERRO)
  // ===========================
  const itensContainer = document.getElementById("modalItens");

  // Garante que sempre seja um array, mesmo que venha undefined
  const itens = Array.isArray(pedido.itens)
    ? pedido.itens
    : Array.isArray(pedido.Itens)
      ? pedido.Itens
      : [];

  if (!itens.length) {
    itensContainer.innerHTML = `
      <p style="font-size:0.82rem;color:#9b9bb0;">
        Nenhum item encontrado neste pedido.
      </p>
    `;
  } else {
    itensContainer.innerHTML = itens.map(i => {
      const imagem = i.imagem?.[0] ?? "/images/no-image.png";
      const nome = i.nome || i.Produto?.nome || "Produto";
      const qtd = i.quantidade ?? 1;
      const preco = i.precoUnitario ?? i.preco ?? 0;
      console.log(i)
      return `
        <div class="item-card">
          <img src="${i.imagem}" alt="${nome}">
          <div class="item-details">
            <span><strong>${nome}</strong></span>
            <span>Qtd: ${qtd}x</span>
            <span>Unit: ${formatCurrency(preco)}</span>
            <span>Subtotal: ${formatCurrency(preco * qtd)}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // Totais (com fallback pra não quebrar)
  const subtotal = pedido.subtotal ?? pedido.subTotal ?? 0;
  const frete = pedido.frete ?? 0;
  const total = pedido.total ?? (subtotal + frete);

  document.getElementById("modalSubtotal").innerText = subtotal.toFixed(2);
  document.getElementById("modalFrete").innerText = frete.toFixed(2);
  document.getElementById("modalTotal").innerText = total.toFixed(2);
}


function aplicarCorStatusTexto(select) {
  const status = select.value;
  select.style.backgroundColor = "#101018";
  select.style.fontWeight = "600";
  select.style.border = "1px solid rgba(255,255,255,0.06)";
  select.style.borderRadius = "999px";
  select.style.padding = "4px 10px";
  select.style.fontSize = "0.8rem";

  switch (status) {
    case "Pendente":
      select.style.color = "#F9B000";
      break;
    case "Processando":
      select.style.color = "#3498db";
      break;
    case "Enviado":
      select.style.color = "#9b59b6";
      break;
    case "Entregue":
      select.style.color = "#27ae60";
      break;
    case "Cancelado":
      select.style.color = "#e74c3c";
      break;
    default:
      select.style.color = "#ddd";
  }
}

/* =====================
 * CLIENTES
 * ===================== */

async function carregarClientes() {
  const tbody = document.getElementById("listaClientes");
  if (!tbody) {
    console.warn("Elemento #listaClientes não encontrado");
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="7" style="padding:8px 10px;color:#9b9bb0;font-size:0.84rem;">
        Carregando clientes...
      </td>
    </tr>
  `;

  try {
    const res = await fetch("/api/auth/admin");
    if (!res.ok) throw new Error("Erro ao carregar clientes");
    const clientes = await res.json();

    if (!clientes.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding:8px 10px;color:#9b9bb0;font-size:0.84rem;">
            Nenhum cliente encontrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = clientes
      .map((c) => {
        const dataCadastro = c.createdAt
          ? new Date(c.createdAt).toLocaleDateString("pt-BR")
          : "-";

        const cidadeUf = [c.cidade, c.estado].filter(Boolean).join(" / ");

        return `
          <tr data-id="${c.id}">
            <td data-label="#ID">#${c.id}</td>
            <td data-label="Nome">${c.nome}</td>
            <td data-label="E-mail">${c.email}</td>
            <td data-label="CPF">${c.cpf}</td>
            <td data-label="Celular">${c.celular}</td>
            <td data-label="Cidade/UF">${cidadeUf || "-"}</td>
            <td data-label="Cadastrado em">${dataCadastro}</td>
          </tr>
        `;
      })
      .join("");

    // Clique na linha abre o modal de edição
    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        const id = tr.getAttribute("data-id");
        const cliente = clientes.find((c) => String(c.id) === String(id));
        if (cliente) abrirModalCliente(cliente);
      });
    });
  } catch (err) {
    console.error("[CLIENTES] Erro:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding:8px 10px;color:#ff9c9f;font-size:0.84rem;">
          Erro ao carregar clientes.
        </td>
      </tr>
    `;
  }
}

// Inicializa máscaras e autocomplete de CEP no modal de cliente
function initMascarasECEPClienteModal() {
  const inputCep      = document.getElementById("clienteCep");
  const inputCelular  = document.getElementById("clienteCelular");
  const inputTelefone = document.getElementById("clienteTelefone");

  // CEP
  if (inputCep && !inputCep.dataset.inicializado) {
    // máscara CEP em tempo real
    inputCep.addEventListener("input", (e) => {
      e.target.value = aplicarMascaraCEP(e.target.value);
    });

    // autocomplete ao sair do campo
    inputCep.addEventListener("blur", () => {
      buscarCEPCliente(inputCep.value);
    });

    inputCep.dataset.inicializado = "true";
  }

  // Celular
  if (inputCelular && !inputCelular.dataset.inicializado) {
    inputCelular.addEventListener("input", (e) => {
      e.target.value = aplicarMascaraCelular(e.target.value);
    });
    inputCelular.dataset.inicializado = "true";
  }

  // Telefone
  if (inputTelefone && !inputTelefone.dataset.inicializado) {
    inputTelefone.addEventListener("input", (e) => {
      e.target.value = aplicarMascaraTelefone(e.target.value);
    });
    inputTelefone.dataset.inicializado = "true";
  }
}

function abrirModalCliente(cliente) {
  const modal = document.getElementById("modalCliente");
  const form = document.getElementById("formEditarCliente");
  if (!modal || !form) return;

  modal.style.display = "block";

  // Helpers
  const setVal = (id, value = "") => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };

  const normalizeDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      // se vier como "2024-01-01" já está ok
      return String(value).substring(0, 10);
    }
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
  };

  // Hidden + (opcional) pill com o ID
  setVal("clienteId", cliente.id);
  const idDisplay = document.getElementById("clienteIdDisplay");
  if (idDisplay) idDisplay.textContent = `#${cliente.id}`;

  // Preenche campos (já aplicando máscara onde faz sentido)
  setVal("clienteNome", cliente.nome);
  setVal("clienteEmail", cliente.email);

  setVal(
    "clienteCelular",
    cliente.celular ? aplicarMascaraCelular(cliente.celular) : ""
  );
  setVal(
    "clienteTelefone",
    cliente.telefone ? aplicarMascaraTelefone(cliente.telefone) : ""
  );

  setVal("clienteSexo", cliente.sexo);
  setVal("clienteNascimento", normalizeDate(cliente.data_de_nascimento));

  setVal(
    "clienteCep",
    cliente.cep ? aplicarMascaraCEP(cliente.cep) : ""
  );
  setVal("clienteEndereco", cliente.endereco);
  setVal("clienteNumero", cliente.numero);
  setVal("clienteComplemento", cliente.complemento);
  setVal("clienteReferencia", cliente.referencia);
  setVal("clienteBairro", cliente.bairro);
  setVal("clienteCidade", cliente.cidade);
  setVal("clienteEstado", cliente.estado);

  const isAdminInput = document.getElementById("clienteIsAdmin");
  if (isAdminInput) {
    isAdminInput.checked = !!cliente.isAdmin;
  }

  // Inicializa máscaras e autocomplete CEP
  initMascarasECEPClienteModal();

  // Submit (editar)
  form.onsubmit = async (e) => {
    e.preventDefault();

    const dados = {
      nome: document.getElementById("clienteNome").value.trim(),
      email: document.getElementById("clienteEmail").value.trim(),
      celular: soDigitos(
        document.getElementById("clienteCelular").value
      ),
      telefone: soDigitos(
        document.getElementById("clienteTelefone").value
      ),
      sexo: document.getElementById("clienteSexo").value,
      data_de_nascimento:
        document.getElementById("clienteNascimento").value,
      cep: soDigitos(document.getElementById("clienteCep").value),
      endereco: document.getElementById("clienteEndereco").value.trim(),
      numero: document.getElementById("clienteNumero").value.trim(),
      complemento: document
        .getElementById("clienteComplemento")
        .value.trim(),
      referencia: document
        .getElementById("clienteReferencia")
        .value.trim(),
      bairro: document.getElementById("clienteBairro").value.trim(),
      cidade: document.getElementById("clienteCidade").value.trim(),
      estado: document.getElementById("clienteEstado").value.trim(),
      isAdmin: isAdminInput ? isAdminInput.checked : false,
    };

    try {
      const res = await fetch(`/api/auth/admin/${cliente.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || "Erro ao atualizar cliente");

      showToast("Cliente atualizado com sucesso!", "success");
      modal.style.display = "none";
      carregarClientes();
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar alterações: " + err.message, "error");
    }
  };

  // Botão de excluir (se existir no HTML)
  const btnExcluir = document.getElementById("btnExcluirCliente");
  if (btnExcluir) {
    btnExcluir.onclick = async () => {
      const confirmar = confirm(
        `Tem certeza que deseja excluir o cliente "${cliente.nome}"?`
      );
      if (!confirmar) return;

      try {
        const res = await fetch(`/api/auth/admin/${cliente.id}`, {
          method: "DELETE",
        });

        const result = await res.json();
        if (!res.ok)
          throw new Error(result.message || "Erro ao excluir cliente");

        showToast("Cliente excluído com sucesso!", "success");
        modal.style.display = "none";
        carregarClientes();
      } catch (err) {
        console.error(err);
        showToast("Erro ao excluir cliente: " + err.message, "error");
      }
    };
  }
}

/* =====================
 * UTILITÁRIOS DE MÁSCARA
 * ===================== */

function soDigitos(str) {
  return (str || "").replace(/\D/g, "");
}

function aplicarMascaraCEP(valor) {
  const digitos = soDigitos(valor).slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return digitos.slice(0, 5) + "-" + digitos.slice(5);
}

function aplicarMascaraCelular(valor) {
  const digitos = soDigitos(valor).slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }
  if (digitos.length <= 10) {
    // telefone fixo: (11) 2345-6789
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(
      6
    )}`;
  }
  // celular: (11) 91234-5678
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(
    7
  )}`;
}

function aplicarMascaraTelefone(valor) {
  const digitos = soDigitos(valor).slice(0, 10);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(
    6
  )}`;
}

/* =====================
 * AUTOCOMPLETE CEP (PAINEL)
 * ===================== */

async function buscarCEPCliente(cep) {
  cep = (cep || "").replace(/\D/g, ""); // só dígitos

  if (cep.length !== 8) return; // só busca CEP com 8 dígitos

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    if (data.erro) {
      showToast("CEP não encontrado!", "error");
      return;
    }

    // Mapeia campos do ViaCEP -> IDs do modal
    const campos = {
      clienteEndereco: data.logradouro || "",
      clienteBairro:   data.bairro     || "",
      clienteCidade:   data.localidade || "",
      clienteEstado:   data.uf         || ""
    };

    for (const [id, valor] of Object.entries(campos)) {
      const campo = document.getElementById(id);
      // Só preenche se estiver vazio, pra não sobrescrever algo editado na mão
      if (campo && !campo.value.trim()) {
        campo.value = valor;
      }
    }
  } catch (err) {
    console.error("[CEP] Erro ao buscar CEP:", err);
    showToast("Erro ao buscar CEP", "error");
  }
}





/* =====================
 * GRÁFICO DE FATURAMENTO (fake por enquanto)
 * ===================== */

function initChart() {
  const ctxFat = document.getElementById("chartFaturamento");
  if (!ctxFat || !window.Chart) return;

  const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const valores = [1890, 2150, 1780, 2420, 3100, 2890, 3320]; // fake

  new Chart(ctxFat, {
    type: "line",
    data: {
      labels: dias,
      datasets: [
        {
          label: "Faturamento (R$)",
          data: valores,
          tension: 0.35,
          fill: true,
          borderWidth: 2,
          borderColor: "rgba(249, 176, 0, 1)",
          backgroundColor: "rgba(249, 176, 0, 0.12)",
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "rgba(249, 176, 0, 1)",
          pointBorderColor: "rgba(12, 12, 22, 1)"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "rgba(8,8,16,0.95)",
          borderColor: "rgba(249,176,0,0.6)",
          borderWidth: 1,
          titleColor: "#ffffff",
          bodyColor: "#f5f5f5",
          padding: 8,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: "#b2b2d0",
            font: {
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: "rgba(255,255,255,0.04)"
          },
          ticks: {
            color: "#9b9bb0",
            font: {
              size: 11
            },
            callback: (value) => "R$ " + Number(value).toLocaleString("pt-BR")
          }
        }
      }
    }
  });
}
