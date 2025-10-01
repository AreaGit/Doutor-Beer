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
    const resposta = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    if (!resposta.ok) throw new Error("Não foi possível carregar os dados do usuário");

    const usuario = await resposta.json();

    const campos = ["nome","cpf","celular","cep","email","endereco","numero","complemento","bairro","cidade","estado"];
    campos.forEach(campo => {
      const input = document.getElementById(campo);
      if (input) input.value = usuario[campo] || "";
    });

    console.log("✅ Usuário carregado:", usuario);
  } catch (erro) {
    console.error("Erro ao carregar usuário:", erro);
  }
}

// ===================== Carregar pedidos do usuário =====================
async function carregarPedidosUsuario() {
  try {
    const resposta = await fetch("/api/auth/me/pedidos", {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    const pedidosContainer = document.getElementById("pedidos-container");

    if (!resposta.ok) {
      pedidosContainer.innerHTML = `<p class="nenhum-pedido">Não foi possível carregar os pedidos.</p>`;
      return;
    }

    const pedidos = await resposta.json();

    if (!pedidos || pedidos.length === 0) {
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
    document.getElementById("pedidos-container").innerHTML = `<p class="nenhum-pedido">Erro ao carregar os pedidos.</p>`;
  }
}

// ===================== Logout do usuário =====================
async function sairConta() {
  try {
    const resposta = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    if (!resposta.ok) throw new Error("Não foi possível sair da conta.");
    window.location.href = "/";
  } catch (erro) {
    console.error("Erro ao sair da conta:", erro);
    alert("Não foi possível sair da conta. Tente novamente.");
  }
}

// ===================== Editar e salvar dados =====================
function habilitarEdicao() {
  const btnEditar = document.getElementById("btn-editar");
  const campos = document.querySelectorAll(".dados-form input, .dados-form select");

  // Definir campos que não podem ser editados
  const bloqueados = ["cpf", "email"];

  btnEditar.addEventListener("click", async () => {
    const editando = btnEditar.dataset.editando === "true";

    if (!editando) {
      // Ativa edição apenas dos campos que não estão bloqueados
      campos.forEach(c => {
        if (!bloqueados.includes(c.id)) c.disabled = false;
      });
      btnEditar.textContent = "Salvar Alterações";
      btnEditar.dataset.editando = "true";
    } else {
      // Salvar alterações
      const usuarioAtualizado = {};
      campos.forEach(c => {
        if (!bloqueados.includes(c.id)) usuarioAtualizado[c.id] = c.value;
      });

      try {
        const resposta = await fetch("/api/auth/me", {
          method: "PUT", // ou PATCH no backend
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(usuarioAtualizado)
        });

        if (!resposta.ok) throw new Error("Não foi possível salvar os dados");

        campos.forEach(c => c.disabled = true);
        btnEditar.textContent = "Editar Dados";
        btnEditar.dataset.editando = "false";

        alert("✅ Dados atualizados com sucesso!");
      } catch (erro) {
        console.error(erro);
        alert("❌ Erro ao atualizar os dados. Tente novamente.");
      }
    }
  });
}

// ===================== Inicialização =====================
document.addEventListener("DOMContentLoaded", () => {
  carregarDadosUsuario();
  carregarPedidosUsuario();
  habilitarEdicao();

  const btnLogout = document.querySelector(".logout-btn");
  if (btnLogout) btnLogout.addEventListener("click", sairConta);
});
