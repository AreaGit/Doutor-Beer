// ===================== Utilitário Toast =====================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
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
    document.getElementById(btn.dataset.tab).classList.add("active");
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
        <p><strong>Pedido #${p.id}</strong> - ${new Date(p.data).toLocaleDateString()}</p>
        <p>Status: <span class="status ${p.status.replace(" ", "-").toLowerCase()}">${p.status}</span></p>
        <p>Total: <strong>R$ ${p.total.toFixed(2)}</strong></p>
      </div>
    `).join("");
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

// ===================== Inicialização =====================
document.addEventListener("DOMContentLoaded", () => {
  carregarDadosUsuario();
  carregarPedidosUsuario();
  habilitarEdicao();
  document.querySelector(".logout-btn")?.addEventListener("click", sairConta);
});
