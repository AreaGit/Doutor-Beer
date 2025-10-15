

// =========================
// Troca de abas (cards)
// =========================
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        const tabName = card.getAttribute('data-tab');
        abrirTab(tabName);
    });
});

function abrirTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById(tabName);
    if (target) {
        target.classList.add('active');
        if (tabName === "pedidos") carregarPedidos();
        if(tabName === "produtos") carregarProdutos();

    }
}

  // =========================
  // Formulário de cadastro de produto
  // =========================
  const formCadastro = document.getElementById("formCadastrarProduto");
const btnCadastrarProduto = document.getElementById("btnCadastrarProduto");

if (formCadastro) {
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
        const secao = document.getElementById("secaoProduto").value.trim() || null;
        const altura = parseFloat(document.getElementById("alturaProduto").value) || null;
        const largura = parseFloat(document.getElementById("larguraProduto").value) || null;
        const comprimento = parseFloat(document.getElementById("comprimentoProduto").value) || null;
        const peso = parseFloat(document.getElementById("pesoProduto").value) || null;

        // Conversão segura (array de strings)
        const imagem = document.getElementById("imagemProduto").value
          .split(",").map(i => i.trim()).filter(i => i);
        const cores = document.getElementById("coresProduto").value
          .split(",").map(i => i.trim()).filter(i => i);
        const torneira = document.getElementById("torneiraProduto").value
          .split(",").map(i => i.trim()).filter(i => i);
        const capacidade = document.getElementById("capacidadeProduto").value
          .split(",").map(i => i.trim()).filter(i => i);

        const produtoData = {
          nome, descricao, preco, precoPromocional,
          categoria, categoria2, categoria3,
          secao, altura, largura, comprimento, peso,
          imagem, cores, torneira, capacidade
        };

        const res = await fetch("/api/produtos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(produtoData)
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.erro || "Erro ao criar produto");

        alert("✅ Produto cadastrado com sucesso!");
        formCadastro.reset();
        carregarProdutos();

      } catch (err) {
        console.error(err);
        alert("Erro ao cadastrar produto: " + err.message);
      }
    });
  }

// =========================
// Carrega todos produtos
// =========================
async function carregarProdutos() {
  const container = document.getElementById("listaProdutos");
  container.innerHTML = "<p>Carregando produtos...</p>";

  try {
    const response = await fetch("/api/produtos");
    if (!response.ok) throw new Error("Erro ao carregar produtos");

    const produtos = await response.json();
    if (!produtos.length) {
      container.innerHTML = "<p>Nenhum produto cadastrado.</p>";
      return;
    }

    container.innerHTML = produtos.map(p => `
      <div class="produto-card" data-id="${p.id}">
        <img src="${p.imagem?.[0] ?? '/images/no-image.png'}" alt="${p.nome}">
        <div class="produto-info">
          <h3>${p.nome}</h3>
          <p>${p.descricao.substring(0, 80)}${p.descricao.length>80?'...':''}</p>
          <p>R$ ${p.preco.toFixed(2)} ${p.precoPromocional ? `<span class="promocao">R$ ${p.precoPromocional.toFixed(2)}</span>` : ""}</p>
          <div class="produto-acoes">
            <button class="editar-btn"><i class="fa fa-edit"></i> Editar</button>
            <button class="deletar-btn"><i class="fa fa-trash"></i> Deletar</button>
          </div>
        </div>
      </div>
    `).join("");

    // Eventos de ação
    container.querySelectorAll(".editar-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const produtoId = btn.closest(".produto-card").dataset.id;
        abrirModalEditarProduto(produtoId);
      });
    });

    container.querySelectorAll(".deletar-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const produtoId = btn.closest(".produto-card").dataset.id;
        if (confirm("Deseja realmente deletar este produto?")) {
          await deletarProduto(produtoId);
        }
      });
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Erro ao carregar produtos.</p>";
  }
}

// Deleta produto
async function deletarProduto(id) {
  try {
    const response = await fetch(`/api/produtos/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Erro ao deletar produto");
    alert("Produto deletado com sucesso!");
    carregarProdutos();
  } catch (err) {
    console.error(err);
    alert("Erro ao deletar produto.");
  }
}

// Modal editar produto (simples)
let produtoAtualId = null;

function abrirModalEditarProduto(id) {
  produtoAtualId = id;
  const modal = document.getElementById("modalEditarProduto");
  modal.style.display = "block";

  // Fecha modal
  modal.querySelector(".close").onclick = () => modal.style.display = "none";
  window.onclick = e => { if (e.target == modal) modal.style.display = "none"; }

  // Carrega produto do backend
  fetch(`/api/produtos/${id}`)
    .then(res => res.json())
    .then(p => {
      document.getElementById("editarNome").value = p.nome || "";
      document.getElementById("editarDescricao").value = p.descricao || "";
      document.getElementById("editarPreco").value = p.preco || "";
      document.getElementById("editarPrecoPromocional").value = p.precoPromocional || "";
      document.getElementById("editarCategoria").value = p.categoria || "";
      document.getElementById("editarCategoria2").value = p.categoria2 || "";
      document.getElementById("editarCategoria3").value = p.categoria3 || "";
      document.getElementById("editarSecao").value = p.secao || "";
      document.getElementById("editarAltura").value = p.altura || "";
      document.getElementById("editarLargura").value = p.largura || "";
      document.getElementById("editarComprimento").value = p.comprimento || "";
      document.getElementById("editarPeso").value = p.peso || "";
      document.getElementById("editarImagem").value = JSON.stringify(p.imagem || []);
      document.getElementById("editarCores").value = JSON.stringify(p.cores || []);
      document.getElementById("editarTorneira").value = JSON.stringify(p.torneira || []);
      document.getElementById("editarCapacidade").value = JSON.stringify(p.capacidade || []);
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao carregar produto.");
      modal.style.display = "none";
    });
}

// Submissão do formulário
document.getElementById("formEditarProduto").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!produtoAtualId) return;

  const data = {
    nome: document.getElementById("editarNome").value,
    descricao: document.getElementById("editarDescricao").value,
    preco: parseFloat(document.getElementById("editarPreco").value),
    precoPromocional: parseFloat(document.getElementById("editarPrecoPromocional").value) || null,
    categoria: document.getElementById("editarCategoria").value,
    categoria2: document.getElementById("editarCategoria2").value,
    categoria3: document.getElementById("editarCategoria3").value,
    secao: document.getElementById("editarSecao").value,
    altura: parseFloat(document.getElementById("editarAltura").value) || null,
    largura: parseFloat(document.getElementById("editarLargura").value) || null,
    comprimento: parseFloat(document.getElementById("editarComprimento").value) || null,
    peso: parseFloat(document.getElementById("editarPeso").value) || null,
    imagem: JSON.parse(document.getElementById("editarImagem").value || "[]"),
    cores: JSON.parse(document.getElementById("editarCores").value || "[]"),
    torneira: JSON.parse(document.getElementById("editarTorneira").value || "[]"),
    capacidade: JSON.parse(document.getElementById("editarCapacidade").value || "[]")
  };

  try {
    const res = await fetch(`/api/produtos/${produtoAtualId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Erro ao atualizar produto");

    alert("Produto atualizado com sucesso!");
    document.getElementById("modalEditarProduto").style.display = "none";
    carregarProdutos(); // Recarrega lista
  } catch (err) {
    console.error(err);
    alert("Erro ao atualizar produto.");
  }
});


// Pesquisa rápida por produto
document.getElementById("searchProdutoBtn").addEventListener("click", async () => {
  const query = document.getElementById("searchProdutoInput").value.trim();
  if (!query) return carregarProdutos();

  try {
    const res = await fetch(`/api/produtos/busca?query=${encodeURIComponent(query)}`);
    const produtos = await res.json();
    const container = document.getElementById("listaProdutos");

    if (!produtos.length) {
      container.innerHTML = "<p>Nenhum produto encontrado.</p>";
      return;
    }

    container.innerHTML = produtos.map(p => `
      <div class="produto-card" data-id="${p.id}">
        <img src="${p.imagem?.[0] ?? '/images/no-image.png'}" alt="${p.nome}">
        <div class="produto-info">
          <h3>${p.nome}</h3>
          <p>${p.descricao.substring(0, 80)}${p.descricao.length>80?'...':''}</p>
          <p>R$ ${p.preco.toFixed(2)} ${p.precoPromocional ? `<span class="promocao">R$ ${p.precoPromocional.toFixed(2)}</span>` : ""}</p>
          <div class="produto-acoes">
            <button class="editar-btn"><i class="fa fa-edit"></i> Editar</button>
            <button class="deletar-btn"><i class="fa fa-trash"></i> Deletar</button>
          </div>
        </div>
      </div>
    `).join("");

  } catch (err) {
    console.error(err);
    alert("Erro na busca de produtos.");
  }
});

// =========================
// Carrega pedidos do backend
// =========================
async function carregarPedidos() {
    const tabelaBody = document.getElementById('listaPedidos');
    tabelaBody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

    try {
        const response = await fetch("/api/pedido/admin"); // ajuste se estiver usando plural "/api/pedidos/admin"
        if (!response.ok) throw new Error("Erro ao carregar pedidos");

        const pedidos = await response.json();

        if (!pedidos.length) {
            tabelaBody.innerHTML = "<tr><td colspan='5'>Nenhum pedido encontrado.</td></tr>";
            return;
        }

        // Renderiza tabela de pedidos
        tabelaBody.innerHTML = pedidos.map(p => `
      <tr data-id="${p.id}">
      <td data-label="ID">#${p.id}</td>
<td data-label="Cliente">${p.usuario?.nome ?? "Cliente removido"}</td>
<td data-label="Status">${p.status}</td>
<td data-label="Total">R$ ${p.total.toFixed(2)}</td>
<td data-label="Data">${new Date(p.criadoEm).toLocaleDateString("pt-BR")}</td>
      </tr>
    `).join("");

        // Adiciona evento de clique em cada linha para abrir modal
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

// =========================
// Modal de detalhes do pedido
// =========================
async function abrirModalPedido(pedido) {
  const modal = document.getElementById("modalPedido");
  modal.style.display = "block";

  // Informações básicas
  document.getElementById("modalPedidoId").innerText = "#" + pedido.id;
  document.getElementById("modalCliente").innerText = pedido.usuario?.nome ?? "Cliente removido";

  // Preenche o select com os status disponíveis
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

  // Atualiza o status no banco quando o valor muda
 statusSelect.onchange = async () => {
  const novoStatus = statusSelect.value;
  aplicarCorStatusTexto(statusSelect); // muda só a cor do texto

  try {
    const response = await fetch(`/api/pedido/admin/${pedido.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao atualizar status");

    console.log("✅ Status atualizado no banco:", data.status);

    // Recarrega a lista de pedidos para refletir a mudança
    if (typeof carregarPedidos === "function") {
      carregarPedidos(); // função que você já usa para popular a tabela
    }

  } catch (err) {
    console.error("❌ Erro ao atualizar status:", err);
    alert("Erro ao atualizar status do pedido.");
  }
};

  // Endereço e pagamento
  document.getElementById("modalEndereco").innerText =
    `${pedido.enderecoEntrega.rua ?? ""}, ${pedido.enderecoEntrega.numero ?? ""} - ${pedido.enderecoEntrega.cidade ?? ""} / ${pedido.enderecoEntrega.estado ?? ""}, CEP: ${pedido.enderecoEntrega.cep ?? ""}`;

  document.getElementById("modalPagamento").innerText = pedido.metodoPagamento;

  // Itens do pedido
  const itensContainer = document.getElementById("modalItens");
  itensContainer.innerHTML = pedido.itens.map(i => `
    <div class="item-card">
      <img src="${i.imagem?.[0] ?? '/images/no-image.png'}" alt="${i.nome}">
      <div class="item-details">
        <span><strong>${i.nome}</strong></span>
        <span>Qtd: ${i.quantidade}x</span>
        <span>Unit: R$ ${i.precoUnitario.toFixed(2)}</span>
        <span>Subtotal: R$ ${(i.precoUnitario * i.quantidade).toFixed(2)}</span>
      </div>
    </div>
  `).join("");

  // Totais
  document.getElementById("modalSubtotal").innerText = pedido.subtotal.toFixed(2);
  document.getElementById("modalFrete").innerText = pedido.frete.toFixed(2);
  document.getElementById("modalTotal").innerText = pedido.total.toFixed(2);

  // Fecha modal
  modal.querySelector(".close").onclick = () => modal.style.display = "none";
  window.onclick = e => { if (e.target == modal) modal.style.display = "none"; }
}

// =========================
// Aplica cor apenas no texto do status
// =========================
function aplicarCorStatusTexto(select) {
  const status = select.value;
  select.style.backgroundColor = "#fff"; // mantém o fundo branco
  select.style.fontWeight = "bold";
  select.style.border = "1px solid #ddd";
  select.style.borderRadius = "8px";
  select.style.padding = "6px 12px";
  select.style.fontSize = "1rem";

  switch(status) {
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
      select.style.color = "#333";
  }
}


