function toggleSenha(idCampo, img) {
  const campo = document.getElementById(idCampo);

  // adiciona classe de animação
  img.classList.add("animar");

  // remove a classe depois da animação (200ms)
  setTimeout(() => {
    img.classList.remove("animar");
  }, 200);

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

// Seleciona todos os campos que só podem ter números
const camposNumericos = ["cpf", "celular", "telefone", "cep", "numero"];

camposNumericos.forEach(id => {
  const campo = document.getElementById(id);
  campo.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, ""); // remove tudo que não é número
  });
});

// Função para aplicar máscara dinamicamente
function aplicarMascara(input, tipo) {
  let valor = input.value.replace(/\D/g, ""); // tira tudo que não é número

  if (tipo === "cpf") {
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  if (tipo === "celular") {
    valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
    valor = valor.replace(/(\d{5})(\d{4})$/, "$1-$2");
  }

  if (tipo === "telefone") {
    valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
    valor = valor.replace(/(\d{4})(\d{4})$/, "$1-$2");
  }

  if (tipo === "cep") {
    valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
  }

  if (tipo === "numero") {
    valor = valor.replace(/\D/g, ""); // só número puro
  }

  input.value = valor;
}

// Aplicando em cada campo
document.getElementById("cpf").addEventListener("input", function () {
  aplicarMascara(this, "cpf");
});

document.getElementById("celular").addEventListener("input", function () {
  aplicarMascara(this, "celular");
});

document.getElementById("telefone").addEventListener("input", function () {
  aplicarMascara(this, "telefone");
});

document.getElementById("cep").addEventListener("input", function () {
  aplicarMascara(this, "cep");
});

document.getElementById("numero").addEventListener("input", function () {
  aplicarMascara(this, "numero");
});

//Alertas

document.querySelector("form").addEventListener("submit", function (e) {
  e.preventDefault();

  let valido = true;

  // Remove erros anteriores
  document.querySelectorAll(".erro-msg").forEach(el => el.remove());

  const obrigatorios = document.querySelectorAll("input[required], select[required]");

  obrigatorios.forEach(campo => {
    if (!campo.value.trim()) {
      valido = false;

      // cria a mensagem de erro
      const erro = document.createElement("small");
      erro.classList.add("erro-msg");
      erro.textContent = `Este campo é obrigatório`;

      // adiciona no form-group
      campo.parentElement.appendChild(erro);

      // animação no campo
      campo.classList.add("erro");
      setTimeout(() => campo.classList.remove("erro"), 800);
    }
  });
});

// Enviar dados para o backend

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formRegistro");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // evita o envio tradicional

    // Pegando os valores dos campos
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

    // Validar senha

    function mostrarToast(mensagem, tipo = "sucesso") {
      const toast = document.createElement("div");
      toast.classList.add("toast");
      if (tipo === "erro") toast.style.background = "linear-gradient(90deg, #E74C3C, #C0392B)";
      toast.textContent = mensagem;
      document.body.appendChild(toast);

      // Forçar reflow para animação
      setTimeout(() => toast.classList.add("show"), 10);

      // Remover após 3s
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 500);
      }, 3000);
    }

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
        mostrarToast(result.message, "sucesso"); // <-- substituído
        form.reset();
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        mostrarToast(result.message, "erro"); // <-- substituído
      }

    } catch (error) {
      console.error("Erro ao enviar formulário:", error);
      alert("Erro ao enviar formulário");
    }
  });
});
