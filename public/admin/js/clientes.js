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