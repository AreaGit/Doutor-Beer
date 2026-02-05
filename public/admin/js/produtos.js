/* =====================
 * PRODUTOS - CADASTRO
 * ===================== */

/**
 * Inicializa a funcionalidade de "Selecionar Todos" (Todos) para grupos de chips/checkboxes.
 * Procura por checkboxes com a classe .select-all-checkbox e o atributo data-target.
 */
function initSelectAllChips() {
  const selectAllCheckboxes = document.querySelectorAll(".select-all-checkbox");

  selectAllCheckboxes.forEach((allCheckbox) => {
    const targetName = allCheckbox.dataset.target;
    // Garante que não duplique listeners
    if (allCheckbox.dataset.listenerBound === "true") return;
    allCheckbox.dataset.listenerBound = "true";

    // Quando o "Todos" mudar
    allCheckbox.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      const targetCheckboxes = document.querySelectorAll(`input[name="${targetName}"]`);
      targetCheckboxes.forEach((chk) => {
        chk.checked = isChecked;
      });
    });

    // Quando qualquer checkbox individual do grupo mudar
    const updateAllCheckboxState = () => {
      const targetCheckboxes = document.querySelectorAll(`input[name="${targetName}"]`);
      const allChecked = Array.from(targetCheckboxes).every((chk) => chk.checked);
      allCheckbox.checked = allChecked;
    };

    // Monitora as checkboxes individuais (usa delegação no container pai para eficiência)
    const container = allCheckbox.closest(".option-chips");
    if (container) {
      container.addEventListener("change", (e) => {
        if (e.target.name === targetName) {
          updateAllCheckboxState();
        }
      });
    }
  });
}

function initProdutoCadastro() {
  const formCadastro = document.getElementById("formCadastrarProduto");
  const btnCadastrarProduto = document.getElementById("btnCadastrarProduto");
  const textareaImagens = document.getElementById("imagemProduto");
  const previewContainer = document.getElementById("previewImagensNovo");

  if (!formCadastro || !btnCadastrarProduto) return;

  // Inicializa a lógica de "Todos"
  initSelectAllChips();

  // 🔹 Array em memória que guarda as URLs já adicionadas
  let imagensArray = [];
  window._imagensArrayNovo = () => imagensArray;
  window._setImagensArrayNovo = (arr) => { imagensArray = arr; };
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

    previewContainer.innerHTML = imagensArray
      .map(
        (url, index) => `
      <div class="imagem-preview-item" draggable="true" data-index="${index}">
        <button type="button" class="imagem-remove-btn" data-index="${index}">&times;</button>
        <img src="${url}" alt="Pré-visualização">
      </div>
    `
      )
      .join("");

    // Eventos de remover
    previewContainer.querySelectorAll(".imagem-remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.index);
        imagensArray.splice(idx, 1);
        renderPreviewImagensNovo();
      });
    });

    // Eventos de drag & drop
    previewContainer
      .querySelectorAll(".imagem-preview-item")
      .forEach((item) => {
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
  window._renderPreviewImagensNovo = renderPreviewImagensNovo;

  // Adiciona URLs ao array a partir de um texto bruto
  function adicionarUrlsDeTexto(raw) {
    if (!raw) return;

    const urls = raw
      .split(/[\n,; ]+/) // quebra por vírgula, enter, espaço, ponto e vírgula
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
      const descricao = document
        .getElementById("descricaoProduto")
        .value.trim();
      const preco = parseFloat(document.getElementById("precoProduto").value);
      const precoPromocional =
        parseFloat(document.getElementById("precoPromocionalProduto").value) ||
        null;
      const categoria =
        document.getElementById("categoriaProduto").value.trim() || null;
      const categoria2 =
        document.getElementById("categoria2Produto").value.trim() || null;
      const categoria3 =
        document.getElementById("categoria3Produto").value.trim() || null;
      const marca =
        document.getElementById("marcaProduto").value.trim() || null;

      const secoesSelecionadas = Array.from(
        document.querySelectorAll("input[name='secaoProduto']:checked")
      ).map((el) => el.value);

      // Agora `secao` é um array mesmo (JSON), não mais string
      const secao = secoesSelecionadas.length ? secoesSelecionadas : [];
      const altura =
        parseFloat(document.getElementById("alturaProduto").value) || null;
      const largura =
        parseFloat(document.getElementById("larguraProduto").value) || null;
      const comprimento =
        parseFloat(document.getElementById("comprimentoProduto").value) || null;
      const peso =
        parseFloat(document.getElementById("pesoProduto").value) || null;

      const cores = Array.from(
        document.querySelectorAll("input[name='coresProduto']:checked")
      ).map((el) => el.value);

      const torneira = Array.from(
        document.querySelectorAll("input[name='torneiraProduto']:checked")
      ).map((el) => el.value);

      const capacidade = document
        .getElementById("capacidadeProduto")
        .value.split(",")
        .map((i) => i.trim())
        .filter((i) => i);

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
        marca,
        secao,
        altura,
        largura,
        comprimento,
        peso,
        permiteArte: document.getElementById("permiteArteProduto").checked,
        urlGabarito: document.getElementById("urlGabaritoProduto").value,
        imagem,
        cores,
        torneira,
        capacidade,
        refil,
      };

      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(produtoData),
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

      // Reseta os checkboxes de "Todos"
      document.querySelectorAll("#modalNovoProduto .select-all-checkbox").forEach(chk => chk.checked = false);

      // Reload automático após ação impactante
      setTimeout(() => window.location.reload(), 1000);
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

    previewEditar.innerHTML = imagensEditarArray
      .map(
        (url, index) => `
      <div class="imagem-preview-item" draggable="true" data-index="${index}">
        <button type="button" class="imagem-remove-btn" data-index="${index}">&times;</button>
        <img src="${url}" alt="Pré-visualização">
      </div>
    `
      )
      .join("");

    // remover
    previewEditar.querySelectorAll(".imagem-remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.index);
        imagensEditarArray.splice(idx, 1);
        renderPreviewImagensEditar();
      });
    });

    // drag & drop
    previewEditar.querySelectorAll(".imagem-preview-item").forEach((item) => {
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
        if (dragEditarSrcIndex === null || dragEditarSrcIndex === targetIndex)
          return;

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

  // Inicializa a lógica de "Todos"
  initSelectAllChips();
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
      container.innerHTML =
        "<p class='text-muted'>Nenhum produto cadastrado.</p>";
      return;
    }

    renderListaProdutos(produtos);
  } catch (err) {
    console.error(err);
    container.innerHTML =
      "<p class='text-error'>Erro ao carregar produtos.</p>";
  }
}

function renderProdutoCard(p) {
  const imagem = p.imagem && p.imagem[0] ? p.imagem[0] : "/images/no-image.png";

  const precoNormal = formatCurrency(p.preco);
  const precoPromo = p.precoPromocional
    ? formatCurrency(p.precoPromocional)
    : null;

  const ativo = p.ativo !== false; // default true
  const badgeClass = ativo ? "badge-success" : "badge-danger";
  const badgeText = ativo ? "Ativo" : "Inativo";
  const checked = ativo ? "checked" : "";

  return `
    <article class="product-card ${ativo ? "" : "produto-inativo"}" data-id="${p.id
    }">
      <div class="product-thumb">
        <img src="${imagem}" alt="${p.nome}">
      </div>

      <div class="product-body">
        <div class="product-top">
          <h3>${p.nome}</h3>

          <div class="status-toggle">
            <span class="badge ${badgeClass}">${badgeText}</span>
            <label class="switch">
              <input type="checkbox" class="toggle-status" data-id="${p.id
    }" ${checked}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <p class="product-meta">
          ${p.categoria || "Sem categoria"}
          ${p.marca ? ` • <strong>${p.marca}</strong>` : ""}
        </p>

        <div class="product-price">
          ${precoPromo
      ? `<span class="new">${precoPromo}</span><span class="old">${precoNormal}</span>`
      : `<span class="new">${precoNormal}</span>`
    }
        </div>

        <div class="product-actions">
          <button class="btn-outline editar-btn">
            <i class="fa-regular fa-pen-to-square"></i>
            Editar
          </button>
          <button class="btn-outline duplicar-btn">
            <i class="fa-regular fa-copy"></i>
            Duplicar
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

  // Ordena produtos: ativos primeiro, inativos no final
  // Dentro de cada grupo, mantém a ordem original (mais recentes primeiro)
  const produtosOrdenados = [...produtos].sort((a, b) => {
    const aAtivo = a.ativo !== false; // default true
    const bAtivo = b.ativo !== false; // default true

    // Se ambos têm o mesmo status, mantém ordem original
    if (aAtivo === bAtivo) return 0;

    // Ativos (true) vêm antes de inativos (false)
    return aAtivo ? -1 : 1;
  });

  container.innerHTML = produtosOrdenados.map(renderProdutoCard).join("");

  // Eventos de edição / remoção
  container.querySelectorAll(".editar-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const produtoId = btn.closest(".product-card").dataset.id;
      abrirModalEditarProduto(produtoId);
    });
  });

  container.querySelectorAll(".deletar-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const produtoId = btn.closest(".product-card").dataset.id;
      if (confirm("Deseja realmente deletar este produto?")) {
        await deletarProduto(produtoId);
      }
    });
  });

  container.querySelectorAll(".duplicar-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const produtoId = btn.closest(".product-card").dataset.id;
      abrirModalDuplicarProduto(produtoId);
    });
  });

  // ✅ Clique no card redireciona para a página pública (seguindo a lógica do site)
  container.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      // Evita que o clique nos botões dispare o redirecionamento
      if (
        e.target.closest(".editar-btn") ||
        e.target.closest(".deletar-btn") ||
        e.target.closest(".switch")
      )
        return;

      const produtoId = card.dataset.id;
      if (produtoId) {
        // igual ao front público: /detalhes-produto?id={id}
        window.open(`/detalhes-produto?id=${produtoId}`, "_blank");
      }
    });
  });

  // Toggle ativo / inativo
  container.querySelectorAll(".toggle-status").forEach((toggle) => {
    toggle.addEventListener("click", async (e) => {
      e.stopPropagation();

      const produtoId = toggle.dataset.id;

      try {
        const res = await fetch(`/api/produtos/${produtoId}/status`, {
          method: "PATCH",
        });

        if (!res.ok) throw new Error("Erro ao alterar status");

        const result = await res.json();

        // Atualiza visual sem recarregar tudo
        const card = toggle.closest(".product-card");
        const badge = card.querySelector(".badge");

        if (result.ativo) {
          badge.textContent = "Ativo";
          badge.classList.remove("badge-danger");
          badge.classList.add("badge-success");
          card.classList.remove("produto-inativo");

          // Se foi ativado, move para o início da lista (antes do primeiro inativo ou no início)
          const container = document.getElementById("listaProdutos");
          const cards = Array.from(container.querySelectorAll(".product-card"));
          const primeiroInativo = cards.findIndex(c => c.classList.contains("produto-inativo"));

          if (primeiroInativo !== -1) {
            // Insere antes do primeiro inativo (no final da seção de ativos)
            container.insertBefore(card, cards[primeiroInativo]);
          } else {
            // Se não há inativos, move para o início
            container.insertBefore(card, container.firstChild);
          }
        } else {
          badge.textContent = "Inativo";
          badge.classList.remove("badge-success");
          badge.classList.add("badge-danger");
          card.classList.add("produto-inativo");

          // Se foi inativado, move para o final da lista (depois de todos os outros produtos)
          const container = document.getElementById("listaProdutos");
          container.appendChild(card);
        }

        showToast("Status do produto atualizado", "success");
      } catch (err) {
        console.error(err);
        toggle.checked = !toggle.checked; // desfaz
        showToast("Erro ao alterar status", "error");
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

    // Reload automático após ação impactante
    setTimeout(() => window.location.reload(), 1000);
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
    .then((res) => res.json())
    .then((p) => {
      // básicos
      document.getElementById("editarNome").value = p.nome || "";
      document.getElementById("editarDescricao").value = p.descricao || "";
      document.getElementById("editarPreco").value = p.preco || "";
      document.getElementById("editarPrecoPromocional").value =
        p.precoPromocional || "";

      // categorias (selects)
      document.getElementById("editarCategoriaProduto").value =
        p.categoria || "";
      document.getElementById("editarCategoria2Produto").value =
        p.categoria2 || "";
      document.getElementById("editarCategoria3Produto").value =
        p.categoria3 || "";
      document.getElementById("editarMarcaProduto").value = p.marca || "";

      // seções (chips)
      const secoes = Array.isArray(p.secao)
        ? p.secao
        : p.secao
          ? [p.secao]
          : [];
      document
        .querySelectorAll("input[name='editarSecaoProduto']")
        .forEach((chk) => {
          chk.checked = secoes.includes(chk.value);
        });

      // dimensões / peso
      document.getElementById("editarAltura").value = p.altura || "";
      document.getElementById("editarLargura").value = p.largura || "";
      document.getElementById("editarComprimento").value = p.comprimento || "";
      document.getElementById("editarPeso").value = p.peso || "";
      document.getElementById("editarPermiteArte").checked = !!p.permiteArte;
      document.getElementById("editarUrlGabarito").value = p.urlGabarito || "";

      // refil
      document.getElementById("editarRefil").value =
        p.refil === null || p.refil === undefined ? "" : p.refil;

      // capacidade (array -> string com vírgulas)
      const cap = Array.isArray(p.capacidade) ? p.capacidade : [];
      document.getElementById("editarCapacidadeProduto").value = cap.join(", ");

      // cores (check)
      const cores = Array.isArray(p.cores) ? p.cores : [];
      document
        .querySelectorAll("input[name='editarCoresProduto']")
        .forEach((chk) => {
          chk.checked = cores.includes(chk.value);
        });

      // torneira (check)
      const torneiras = Array.isArray(p.torneira) ? p.torneira : [];
      document
        .querySelectorAll("input[name='editarTorneiraProduto']")
        .forEach((chk) => {
          chk.checked = torneiras.includes(chk.value);
        });

      // Atualiza o estado dos checkboxes "Todos" no modal de edição
      document.querySelectorAll("#modalEditarProduto .select-all-checkbox").forEach((allCheckbox) => {
        const targetName = allCheckbox.dataset.target;
        const targetCheckboxes = document.querySelectorAll(`input[name="${targetName}"]`);
        const allChecked = targetCheckboxes.length > 0 && Array.from(targetCheckboxes).every((chk) => chk.checked);
        allCheckbox.checked = allChecked;
      });

      // imagens (array -> preview)
      imagensEditarArray = Array.isArray(p.imagem) ? [...p.imagem] : [];
      if (typeof window._renderPreviewImagensEditar === "function") {
        window._renderPreviewImagensEditar();
      }

      // limpa textarea de imagens (o usuário só adiciona/edita links novos)
      const textareaImagensEditar = document.getElementById(
        "editarImagemProduto"
      );
      if (textareaImagensEditar) textareaImagensEditar.value = "";
    })
    .catch((err) => {
      console.error(err);
      showToast("Erro ao carregar produto.", "error");
      modal.style.display = "none";
    });

  initEditarProdutoSubmit();
}

/**
 * Abre o modal de NOVO produto preenchido com dados de um produto existente
 */
function abrirModalDuplicarProduto(id) {
  const modal = document.getElementById("modalNovoProduto");
  if (!modal) return;

  fetch(`/api/produtos/${id}`)
    .then((res) => res.json())
    .then((p) => {
      modal.style.display = "block";

      // Básicos
      document.getElementById("nomeProduto").value = p.nome ? `${p.nome} (Cópia)` : "";
      document.getElementById("descricaoProduto").value = p.descricao || "";
      document.getElementById("precoProduto").value = p.preco || "";
      document.getElementById("precoPromocionalProduto").value = p.precoPromocional || "";

      // Categorias
      document.getElementById("categoriaProduto").value = p.categoria || "";
      document.getElementById("categoria2Produto").value = p.categoria2 || "";
      document.getElementById("categoria3Produto").value = p.categoria3 || "";
      document.getElementById("marcaProduto").value = p.marca || "";

      // Seções (chips) - name='secaoProduto'
      const secoes = Array.isArray(p.secao) ? p.secao : (p.secao ? [p.secao] : []);
      document.querySelectorAll("input[name='secaoProduto']").forEach((chk) => {
        chk.checked = secoes.includes(chk.value);
      });

      // Dimensões / Peso
      document.getElementById("alturaProduto").value = p.altura || "";
      document.getElementById("larguraProduto").value = p.largura || "";
      document.getElementById("comprimentoProduto").value = p.comprimento || "";
      document.getElementById("pesoProduto").value = p.peso || "";
      document.getElementById("permiteArteProduto").checked = !!p.permiteArte;
      document.getElementById("urlGabaritoProduto").value = p.urlGabarito || "";

      // Refil
      document.getElementById("refilProduto").value = (p.refil === null || p.refil === undefined) ? "" : p.refil;

      // Capacidade
      const cap = Array.isArray(p.capacidade) ? p.capacidade : [];
      document.getElementById("capacidadeProduto").value = cap.join(", ");

      // Cores - name='coresProduto'
      const cores = Array.isArray(p.cores) ? p.cores : [];
      document.querySelectorAll("input[name='coresProduto']").forEach((chk) => {
        chk.checked = cores.includes(chk.value);
      });

      // Torneira - name='torneiraProduto'
      const torneiras = Array.isArray(p.torneira) ? p.torneira : [];
      document.querySelectorAll("input[name='torneiraProduto']").forEach((chk) => {
        chk.checked = torneiras.includes(chk.value);
      });

      // Atualiza o estado dos checkboxes "Todos" no modal de cadastro
      document.querySelectorAll("#modalNovoProduto .select-all-checkbox").forEach((allCheckbox) => {
        const targetName = allCheckbox.dataset.target;
        const targetCheckboxes = document.querySelectorAll(`#modalNovoProduto input[name="${targetName}"]`);
        const allChecked = targetCheckboxes.length > 0 && Array.from(targetCheckboxes).every((chk) => chk.checked);
        allCheckbox.checked = allChecked;
      });

      // Imagens - usa o arrayImagens do cadastro através do setter exposto
      if (typeof window._setImagensArrayNovo === "function") {
        const imagensCopiadas = Array.isArray(p.imagem) ? [...p.imagem] : [];
        window._setImagensArrayNovo(imagensCopiadas);

        if (typeof window._renderPreviewImagensNovo === "function") {
          window._renderPreviewImagensNovo();
        }
      }

      showToast("Dados do produto copiados. Verifique e salve o novo produto.", "success");
    })
    .catch((err) => {
      console.error(err);
      showToast("Erro ao carregar dados para duplicação.", "error");
    });
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
    ).map((el) => el.value);
    const secao = secoesSelecionadas.length ? secoesSelecionadas : [];

    const cores = Array.from(
      document.querySelectorAll("input[name='editarCoresProduto']:checked")
    ).map((el) => el.value);

    const torneira = Array.from(
      document.querySelectorAll("input[name='editarTorneiraProduto']:checked")
    ).map((el) => el.value);

    const capacidade = document
      .getElementById("editarCapacidadeProduto")
      .value.split(",")
      .map((i) => i.trim())
      .filter((i) => i);

    // usa o array de imagens da edição
    const imagem = imagensEditarArray;

    const data = {
      nome: document.getElementById("editarNome").value,
      descricao: document.getElementById("editarDescricao").value,
      preco: parseFloat(document.getElementById("editarPreco").value),
      precoPromocional:
        parseFloat(document.getElementById("editarPrecoPromocional").value) ||
        null,
      categoria:
        document.getElementById("editarCategoriaProduto").value || null,
      categoria2:
        document.getElementById("editarCategoria2Produto").value || null,
      categoria3:
        document.getElementById("editarCategoria3Produto").value || null,
      marca: document.getElementById("editarMarcaProduto").value || null,
      secao,
      altura: parseFloat(document.getElementById("editarAltura").value) || null,
      largura:
        parseFloat(document.getElementById("editarLargura").value) || null,
      comprimento:
        parseFloat(document.getElementById("editarComprimento").value) || null,
      peso: parseFloat(document.getElementById("editarPeso").value) || null,
      imagem,
      cores,
      torneira,
      capacidade,
      refil,
      permiteArte: document.getElementById("editarPermiteArte").checked,
      urlGabarito: document.getElementById("editarUrlGabarito").value,
    };

    try {
      const res = await fetch(`/api/produtos/${produtoAtualId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao atualizar produto");

      showToast("Produto atualizado com sucesso!", "success");
      document.getElementById("modalEditarProduto").style.display = "none";
      carregarProdutos();

      // Reload automático após ação impactante
      setTimeout(() => window.location.reload(), 1000);
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

  searchBtn.addEventListener("click", () =>
    buscarProdutos(searchInput.value.trim())
  );
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
    const res = await fetch(
      `/api/produtos/busca?query=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error("Erro na busca de produtos");
    const produtos = await res.json();

    if (!produtos.length) {
      container.innerHTML =
        "<p class='text-muted'>Nenhum produto encontrado.</p>";
      return;
    }

    // Ordena produtos: ativos primeiro, inativos no final
    const produtosOrdenados = [...produtos].sort((a, b) => {
      const aAtivo = a.ativo !== false;
      const bAtivo = b.ativo !== false;
      if (aAtivo === bAtivo) return 0;
      return aAtivo ? -1 : 1;
    });

    renderListaProdutos(produtosOrdenados);
  } catch (err) {
    console.error(err);
    showToast("Erro na busca de produtos.", "error");
  }
}
