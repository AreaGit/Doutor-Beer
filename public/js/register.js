// ===================== TOGGLE SENHA =====================
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

// ===================== VALIDAÇÃO DE SENHA FORTE =====================
const senhaInput = document.getElementById("senha");
const requisitosEl = document.getElementById("senhaRequisitos");

senhaInput.addEventListener("input", () => {
  const senha = senhaInput.value;

  const temLetraMaiuscula = /[A-Z]/.test(senha);
  const temNumero = /[0-9]/.test(senha);
  const temEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
  const temTamanho = senha.length >= 8;

  let forca = 0;
  if (temLetraMaiuscula) forca++;
  if (temNumero) forca++;
  if (temEspecial) forca++;
  if (temTamanho) forca++;

  if (senha.length === 0) {
    requisitosEl.textContent = "";
    requisitosEl.className = "senha-requisitos";
    return;
  }

  if (forca <= 1) {
    requisitosEl.textContent = "Senha fraca. Use letras, números e símbolos.";
    requisitosEl.className = "senha-requisitos fraca";
  } else if (forca === 2 || forca === 3) {
    requisitosEl.textContent = "Senha média. Adicione mais variação para fortalecê-la.";
    requisitosEl.className = "senha-requisitos media";
  } else if (forca === 4) {
    requisitosEl.textContent = "Senha forte! Boa escolha.";
    requisitosEl.className = "senha-requisitos forte";
  }
});


// ===================== VALIDAÇÃO NOME =====================
const nome = document.getElementById('nome');
let validNome = false;

nome.addEventListener('keyup', () => {
  if (nome.value.length <= 1) {
    nome.style.borderColor = 'red';
    nome.style.color = 'red';
    validNome = false;
  } else {
    nome.style.borderColor = '#F9B000';
    nome.style.color = 'black';
    validNome = true;
  }
});

// ===================== MÁSCARAS =====================
const camposNumericos = ["cpf", "celular", "telefone", "cep", "numero"];
camposNumericos.forEach(id => {
  const campo = document.getElementById(id);
  campo.addEventListener("input", () => campo.value = campo.value.replace(/\D/g, ""));
});

function aplicarMascara(input, tipo) {
  let valor = input.value.replace(/\D/g, "");

  switch(tipo) {
    case "cpf":
      valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
      valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
      valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      break;
    case "celular":
      valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
      valor = valor.replace(/(\d{5})(\d{4})$/, "$1-$2");
      break;
    case "telefone":
      valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
      valor = valor.replace(/(\d{4})(\d{4})$/, "$1-$2");
      break;
    case "cep":
      valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
      break;
    case "numero":
      valor = valor.replace(/\D/g, "");
      break;
  }

  input.value = valor;
}

document.getElementById("cpf").addEventListener("input", () => aplicarMascara(document.getElementById("cpf"), "cpf"));
document.getElementById("celular").addEventListener("input", () => aplicarMascara(document.getElementById("celular"), "celular"));
document.getElementById("telefone").addEventListener("input", () => aplicarMascara(document.getElementById("telefone"), "telefone"));
document.getElementById("cep").addEventListener("input", () => aplicarMascara(document.getElementById("cep"), "cep"));
document.getElementById("numero").addEventListener("input", () => aplicarMascara(document.getElementById("numero"), "numero"));

// ===================== FUNÇÃO TOAST =====================
function mostrarToast(mensagem, tipo = "sucesso") {
  const toast = document.createElement("div");
  toast.classList.add("toast");
  if (tipo === "erro") toast.style.background = "linear-gradient(90deg, #E74C3C, #C0392B)";
  toast.textContent = mensagem;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// ===================== AUTOCOMPLETE CEP =====================
async function buscarCEP(cep) {
  cep = cep.replace(/\D/g, "");
  if (cep.length !== 8) return;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    if (data.erro) return mostrarToast("CEP não encontrado!", "erro");

    const campos = {
      endereco: data.logradouro || "",
      bairro: data.bairro || "",
      cidade: data.localidade || "",
      estado: data.uf || ""
    };

    for (const [id, valor] of Object.entries(campos)) {
      const campo = document.getElementById(id);
      if (campo && !campo.value.trim()) campo.value = valor;
    }

  } catch (err) {
    console.error(err);
    mostrarToast("Erro ao buscar CEP", "erro");
  }
}

document.getElementById("cep").addEventListener("blur", () => buscarCEP(document.getElementById("cep").value));

// ===================== VALIDAÇÃO FORMULÁRIO =====================
document.querySelector("form").addEventListener("submit", e => {
  e.preventDefault();
  let valido = true;

  document.querySelectorAll(".erro-msg").forEach(el => el.remove());
  const obrigatorios = document.querySelectorAll("input[required], select[required]");

  obrigatorios.forEach(campo => {
    if (!campo.value.trim()) {
      valido = false;
      const erro = document.createElement("small");
      erro.classList.add("erro-msg");
      erro.textContent = "Este campo é obrigatório";
      campo.parentElement.appendChild(erro);

      campo.classList.add("erro");
      setTimeout(() => campo.classList.remove("erro"), 800);
    }
  });

  if (!valido) return;

  // Verifica se senha é forte antes de enviar
  const senhaValida = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  if (!senhaValida.test(document.getElementById("senha").value)) {
    mostrarToast("A senha deve ter ao menos 8 caracteres, 1 letra maiúscula, 1 número e 1 símbolo.", "erro");
    return;
  }
});


// ===================== ENVIO FORMULÁRIO + TERMOS DE USO =====================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formRegistro");
  let aceitouTermos = false;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    // Exibe o modal se ainda não aceitou os termos
    if (!aceitouTermos) {
      const modal = document.getElementById("modalTermos");
      if (modal) modal.classList.add("show");
      return;
    }

    // Captura dados do formulário
    const formData = {
      nome: document.getElementById("nome").value,
      cpf: document.getElementById("cpf").value,
      celular: document.getElementById("celular").value,
      telefone: document.getElementById("telefone").value,
      sexo: document.getElementById("sexo").value,
      data_de_nascimento: document.getElementById("data-de-nascimento").value,
      cep: document.getElementById("cep").value,
      endereco: document.getElementById("endereco").value,
      numero: document.getElementById("numero").value,
      complemento: document.getElementById("complemento").value,
      referencia: document.getElementById("referencia").value,
      bairro: document.getElementById("bairro").value,
      cidade: document.getElementById("cidade").value,
      estado: document.getElementById("estado").value,
      email: document.getElementById("email").value,
      senha: document.getElementById("senha").value,
      confirmarSenha: document.getElementById("confirmarSenha").value
    };

    if (formData.senha !== formData.confirmarSenha) {
      mostrarToast("As senhas não coincidem!", "erro");
      return;
    }

    try {
      const response = await fetch("/api/auth/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        mostrarToast(result.message || "Conta criada com sucesso!", "sucesso");
        form.reset();
        setTimeout(() => window.location.href = "/login", 2000);
      } else {
        mostrarToast(result.message || "Erro ao criar conta.", "erro");
      }

    } catch (error) {
      console.error("Erro ao enviar formulário:", error);
      mostrarToast("Erro ao enviar formulário", "erro");
    }
  });

  // ====== Controle do modal de Termos ======
  const modalTermos = document.getElementById("modalTermos");
  const btnAceitar = document.getElementById("btnAceitarTermos");
  const btnRecusar = document.getElementById("btnRecusarTermos");

  if (btnAceitar) {
    btnAceitar.addEventListener("click", () => {
      aceitouTermos = true;
      modalTermos.classList.remove("show");
      mostrarToast("Termos aceitos.", "sucesso");
      // Reenvia o formulário automaticamente
      form.dispatchEvent(new Event("submit"));
    });
  }

  if (btnRecusar) {
    btnRecusar.addEventListener("click", () => {
      aceitouTermos = false;
      modalTermos.classList.remove("show");
      mostrarToast("Você precisa aceitar os termos para continuar.", "erro");
    });
  }
});
