const formProduto   = document.getElementById("formProduto");
const produtosList  = document.getElementById("produtosList");
const btnToggleForm = document.getElementById("toggleForm");
const btnSubmit     = formProduto.querySelector("button[type='submit']");
let editId = null;

// Abrir/fechar formulário
btnToggleForm.addEventListener("click", () => {
  formProduto.style.display =
    formProduto.style.display === "none" ? "block" : "none";
  if(!editId) btnSubmit.textContent = "Cadastrar Produto";
});

// Helpers para pegar valores de checkboxes
function getCheckedValues(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} input:checked`))
              .map(chk => chk.value);
}

// Listar produtos
async function listarProdutos() {
  const res = await fetch("/api/produtos");
  const produtos = await res.json();

  produtosList.innerHTML = produtos.map(prod => `
    <div class="produto-card" 
         data-id="${prod.id}"
         data-nome="${prod.nome}"
         data-descricao="${prod.descricao}"
         data-preco="${prod.preco}"
         data-imagem="${prod.imagem}"
         data-categorias='${JSON.stringify(prod.categorias || [])}'
         data-cores='${JSON.stringify(prod.cores || [])}'
         data-torneiras='${JSON.stringify(prod.torneiras || [])}'>
      <img src="${prod.imagem}" alt="${prod.nome}">
      <h3>${prod.nome}</h3>
      <p>${prod.descricao}</p>
      <p>R$ ${parseFloat(prod.preco).toFixed(2)}</p>
      <small>Categorias: ${(prod.categorias||[]).join(", ")}</small>
      <small>Cores: ${(prod.cores||[]).join(", ")}</small>
      <small>Torneiras: ${(prod.torneiras||[]).join(", ")}</small>
      <div class="acoes">
        <button class="btn-editar">Editar</button>
        <button class="btn-deletar">Deletar</button>
      </div>
    </div>
  `).join('');

  addEventosEditar();
  addEventosDeletar();
}

// Cadastro / edição
formProduto.addEventListener("submit", async e => {
  e.preventDefault();
  const produtoData = {
    nome: document.getElementById("nome").value,
    descricao: document.getElementById("descricao").value,
    preco: parseFloat(document.getElementById("preco").value).toFixed(2),
    imagem: document.getElementById("imagem").value,
    categorias: getCheckedValues("categoriasBox"),
    cores: getCheckedValues("coresBox"),
    torneiras: getCheckedValues("torneirasBox")
  };

  const url = editId ? `/api/produtos/${editId}` : "/api/produtos";
  const method = editId ? "PUT" : "POST";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(produtoData)
  });

  editId = null;
  btnSubmit.textContent = "Cadastrar Produto";
  formProduto.reset();
  listarProdutos();
  formProduto.style.display = "none";
});

// Editar
function addEventosEditar() {
  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".produto-card");
      editId = card.dataset.id;

      document.getElementById("nome").value = card.dataset.nome;
      document.getElementById("descricao").value = card.dataset.descricao;
      document.getElementById("preco").value = card.dataset.preco;
      document.getElementById("imagem").value = card.dataset.imagem;

      // Marcar checkboxes
      const categorias = JSON.parse(card.dataset.categorias);
      const cores = JSON.parse(card.dataset.cores);
      const torneiras = JSON.parse(card.dataset.torneiras);

      ["categoriasBox","coresBox","torneirasBox"].forEach(id=>{
        document.querySelectorAll(`#${id} input`).forEach(chk=>{
          chk.checked = (id==="categoriasBox" ? categorias :
                        id==="coresBox" ? cores : torneiras).includes(chk.value);
        });
      });

      btnSubmit.textContent = "Salvar Alterações";
      formProduto.style.display = "block";
    });
  });
}

// Deletar (exemplo simples)
function addEventosDeletar() {
  document.querySelectorAll(".btn-deletar").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".produto-card").dataset.id;
      if(confirm("Deseja excluir este produto?")){
        await fetch(`/api/produtos/${id}`, { method: "DELETE" });
        listarProdutos();
      }
    });
  });
}

// Inicial
listarProdutos();

// Accordion simples para abrir/fechar grupos de checkbox
document.querySelectorAll(".accordion-header").forEach(header => {
  header.addEventListener("click", () => {
    const targetId = header.dataset.target;
    const content  = document.getElementById(targetId);

    header.classList.toggle("active");
    content.classList.toggle("open");
  });
});