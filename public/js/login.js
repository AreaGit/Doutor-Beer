function toggleSenha(idCampo, img) {
  const campo = document.getElementById(idCampo);

  img.classList.add("animar");
  setTimeout(() => img.classList.remove("animar"), 200);

  if (campo.type === "password") {
    campo.type = "text";
    img.src = "https://i.imgur.com/6NC923g.png"; // olho aberto
    img.alt = "Esconder senha";
  } else {
    campo.type = "password";
    img.src = "https://i.imgur.com/DFXi1i0.png"; // olho fechado
    img.alt = "Mostrar senha";
  }
}

const loginForm = document.getElementById("loginForm");
const loadingOverlay = document.getElementById("loadingOverlay");

// Cria container para caixinha de erro
const registroContainer = document.querySelector(".registro-container");
let caixaErro = document.createElement("div");
caixaErro.id = "caixaErro";
caixaErro.style.display = "none"; // inicialmente escondida
registroContainer.insertBefore(caixaErro, loginForm);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");

  try {
    // Limpa mensagem anterior
    caixaErro.style.display = "none";
    caixaErro.textContent = "";

    // Mostra o loading
    loadingOverlay.style.display = "flex";

    // Envia dados de login
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput.value,
        senha: senhaInput.value
      }),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    // Salva email para 2FA
    sessionStorage.setItem("loginTempEmail", emailInput.value);

    // Redireciona para a página de autenticação
    window.location.href = "/autenticacao";

  } catch (err) {
    // Esconde o loading
    loadingOverlay.style.display = "none";

    // Exibe caixinha de erro
    caixaErro.textContent = err.message || "Erro ao realizar login. Verifique seu e-mail e senha.";
    caixaErro.style.display = "flex";
  }
});
