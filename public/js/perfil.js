// ===================== Utilitário Toast =====================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

// ===================== Alternar abas =====================
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab)?.classList.add("active");
  });
});

// ===================== Carregar dados do usuário =====================
async function carregarDadosUsuario() {
  try {
    const resposta = await fetch("/api/auth/me", { credentials: "include" });
    if (resposta.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!resposta.ok) throw new Error("Falha ao carregar usuário");

    const usuario = await resposta.json();
    const campos = ["nome","cpf","celular","cep","email","endereco","numero","complemento","bairro","cidade","estado"];
    campos.forEach(campo => {
      const input = document.getElementById(campo);
      if (input) input.value = usuario[campo] || "";
    });
  } catch (erro) {
    console.error("Erro ao carregar usuário:", erro);
    showToast("Não foi possível carregar os dados do usuário", "error");
  }
}

// ===================== Carregar pedidos do usuário =====================
async function carregarPedidosUsuario() {
  const pedidosContainer = document.getElementById("pedidos-container");
  pedidosContainer.innerHTML = `<p class="loading">Carregando pedidos...</p>`;

  try {
    const resposta = await fetch("/api/auth/me/pedidos", { credentials: "include" });
    if (resposta.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!resposta.ok) throw new Error("Falha ao carregar pedidos");

    const pedidos = await resposta.json();

    if (!pedidos.length) {
      pedidosContainer.innerHTML = `<p class="nenhum-pedido">Você ainda não realizou nenhum pedido.</p>`;
      return;
    }

    pedidosContainer.innerHTML = pedidos.map(p => `
      <div class="pedido-card">
        <div class="pedido-header" data-pedido-id="${p.id}">
          <p><strong>Pedido #${p.id}</strong> - ${new Date(p.data).toLocaleDateString()}</p>
          <p>Status: <span class="status ${p.status.replace(" ", "-").toLowerCase()}">${p.status}</span></p>
          <p>Total: <strong>R$ ${p.total.toFixed(2)}</strong></p>
          <button class="toggle-detalhes-btn">Ver detalhes</button>
        </div>
        <div class="pedido-detalhes" style="display:none;">
          <h4>Itens:</h4>
          <ul class="pedido-itens">
            ${p.itens.map(i => `
              <li>
                <img src="${i.imagem || '/images/no-image.png'}" alt="${i.nome}" />
                ${i.nome} x ${i.quantidade} - R$ ${i.precoUnitario.toFixed(2)}
              </li>
            `).join('')}
          </ul>
          <h4>Endereço de entrega:</h4>
          <p>
            ${p.enderecoEntrega.rua || ""}, ${p.enderecoEntrega.numero || ""} - ${p.enderecoEntrega.complemento || ""} ${p.enderecoEntrega.bairro || ""}, ${p.enderecoEntrega.cidade || ""} - ${p.enderecoEntrega.estado || ""} - CEP: ${p.enderecoEntrega.cep || ""}
          </p>
          <h4>Método de pagamento:</h4>
          <p>${p.metodoPagamento}</p>
        </div>
      </div>
    `).join("");

    // Toggle detalhes
    document.querySelectorAll(".toggle-detalhes-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".pedido-card");
        const detalhes = card.querySelector(".pedido-detalhes");
        if (detalhes.style.display === "none") {
          detalhes.style.display = "block";
          btn.textContent = "Ocultar detalhes";
        } else {
          detalhes.style.display = "none";
          btn.textContent = "Ver detalhes";
        }
      });
    });

  } catch (erro) {
    console.error("Erro ao carregar pedidos:", erro);
    pedidosContainer.innerHTML = `<p class="nenhum-pedido">Erro ao carregar os pedidos.</p>`;
  }
}

// ===================== Logout do usuário =====================
async function sairConta() {
  try {
    const resposta = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    if (!resposta.ok) throw new Error("Erro no logout");
    window.location.href = "/";
  } catch (erro) {
    console.error("Erro ao sair da conta:", erro);
    showToast("Não foi possível sair da conta.", "error");
  }
}

// ===================== Editar e salvar dados =====================
function habilitarEdicao() {
  const btnEditar = document.getElementById("btn-editar");
  const campos = document.querySelectorAll(".dados-form input, .dados-form select");
  const bloqueados = ["cpf", "email"];

  btnEditar.addEventListener("click", async () => {
    const editando = btnEditar.dataset.editando === "true";

    if (!editando) {
      campos.forEach(c => { if (!bloqueados.includes(c.id)) c.disabled = false; });
      btnEditar.textContent = "Salvar Alterações";
      btnEditar.dataset.editando = "true";
    } else {
      const usuarioAtualizado = {};
      campos.forEach(c => {
        if (!bloqueados.includes(c.id)) usuarioAtualizado[c.id] = c.value;
      });

      try {
        const resposta = await fetch("/api/auth/me", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(usuarioAtualizado)
        });
        if (!resposta.ok) throw new Error("Erro ao salvar dados");

        campos.forEach(c => c.disabled = true);
        btnEditar.textContent = "Editar Dados";
        btnEditar.dataset.editando = "false";
        showToast("Dados atualizados com sucesso!");
      } catch (erro) {
        console.error(erro);
        showToast("Erro ao atualizar os dados", "error");
      }
    }
  });
}

// Descartar atualizações

function habilitarDescartar() {
  const btnDescartar = document.getElementById("btn-descartar");
  const campos = document.querySelectorAll(".dados-form input, .dados-form select");
  const btnEditar = document.getElementById("btn-editar");

  if (!btnDescartar) return;

  btnDescartar.addEventListener("click", () => {
    // Recarrega os dados do usuário do servidor
    carregarDadosUsuario();

    // Desativa todos os campos
    campos.forEach(c => c.disabled = true);

    // Reseta o botão Editar
    if (btnEditar) {
      btnEditar.textContent = "Editar Dados";
      btnEditar.dataset.editando = "false";
    }

    showToast("Alterações descartadas", "success");
  });
}

// ===================== Autocomplete seguro de CEP =====================
function configurarAutoCompleteCEP() {
  const cepInput = document.getElementById("cep");
  if (!cepInput) return;

  cepInput.addEventListener("blur", async () => {
    const cep = cepInput.value.replace(/\D/g, "");

    // Valida o CEP antes da requisição
    if (!/^\d{8}$/.test(cep)) {
      showToast("CEP inválido. Informe 8 números.", "error");
      return;
    }

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) throw new Error("Erro ao consultar CEP");

      const data = await res.json();
      if (data.erro) {
        showToast("CEP não encontrado.", "error");
        return;
      }

      // Atualiza os campos correspondentes
      const enderecoInput = document.getElementById("endereco");
      if (enderecoInput) enderecoInput.value = data.logradouro || "";

      const bairroInput = document.getElementById("bairro");
      if (bairroInput) bairroInput.value = data.bairro || "";

      const cidadeInput = document.getElementById("cidade");
      if (cidadeInput) cidadeInput.value = data.localidade || "";

      const estadoInput = document.getElementById("estado");
      if (estadoInput) estadoInput.value = data.uf || "";

    } catch (e) {
      console.error("Erro ao buscar CEP:", e);
      showToast("Erro ao consultar CEP.", "error");
    }
  });
}

// ===================== Inicialização =====================
document.addEventListener("DOMContentLoaded", () => {
  carregarDadosUsuario();
  carregarPedidosUsuario();
  habilitarEdicao();
  configurarAutoCompleteCEP();
    habilitarDescartar();
  document.querySelector(".logout-btn")?.addEventListener("click", sairConta);
});
