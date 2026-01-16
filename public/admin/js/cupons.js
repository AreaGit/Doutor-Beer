/**
 * Módulo: Gestão de Cupons
 * Responsável por listar, criar, editar e excluir cupons no painel administrativo.
 */

document.addEventListener("DOMContentLoaded", () => {
    const listaCupons = document.getElementById("listaCupons");
    const btnNovoCupom = document.getElementById("btnNovoCupom");
    const modalCupom = document.getElementById("modalCupom");
    const formCupom = document.getElementById("formCupom");
    const cupomTipo = document.getElementById("cupomTipo");
    const rowValor = document.getElementById("rowValor");

    if (!listaCupons) return;

    // --- Helpers ---
    function formatBRL(valor) {
        return (valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function formatDate(dateString) {
        if (!dateString) return "Indefinida";
        const date = new Date(dateString);
        return date.toLocaleDateString("pt-BR");
    }

    // Esconder/Mostrar campo de valor dependendo do tipo
    cupomTipo.addEventListener("change", () => {
        if (cupomTipo.value === "frete_gratis") {
            rowValor.style.display = "none";
        } else {
            rowValor.style.display = "block";
        }
    });

    // --- API Calls ---

    async function carregarCupons() {
        try {
            listaCupons.innerHTML = "<tr><td colspan='9' style='text-align:center;'>Carregando cupons...</td></tr>";
            const res = await fetch("/api/cupons");
            if (!res.ok) throw new Error("Erro ao carregar cupons");
            const cupons = await res.json();

            renderCupons(cupons);
        } catch (error) {
            console.error(error);
            listaCupons.innerHTML = "<tr><td colspan='9' style='text-align:center; color:red;'>Erro ao carregar cupons.</td></tr>";
        }
    }

    function renderCupons(cupons) {
        if (cupons.length === 0) {
            listaCupons.innerHTML = "<tr><td colspan='9' style='text-align:center;'>Nenhum cupom cadastrado.</td></tr>";
            return;
        }

        listaCupons.innerHTML = cupons.map(c => {
            const tipoLabel = {
                fixo: "Fixo (R$)",
                percentual: "Percentual (%)",
                frete_gratis: "Frete Grátis"
            }[c.tipo];

            const valorDisplay = c.tipo === "percentual" ? `${c.valor}%` : c.tipo === "fixo" ? formatBRL(c.valor) : "–";

            return `
                <tr>
                    <td>${c.id}</td>
                    <td><strong>${c.codigo}</strong></td>
                    <td>${tipoLabel}</td>
                    <td>${valorDisplay}</td>
                    <td>${formatBRL(c.minimo)}</td>
                    <td>${formatDate(c.validade)}</td>
                    <td>
                        <div style="font-size:0.85rem">Global: ${c.usos} / ${c.limite || "∞"}</div>
                        <div style="font-size:0.8rem; color:#888;">Cliente: ${c.limite_usuario || "∞"}</div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <button class="btn-icon" onclick="alternarStatusCupom(${c.id})" title="${c.ativo ? 'Desativar' : 'Ativar'}" style="padding:0; background:none; border:none; cursor:pointer;">
                                <i class="fa-solid ${c.ativo ? 'fa-toggle-on' : 'fa-toggle-off'}" style="color: ${c.ativo ? '#2ecc71' : '#ccc'}; font-size: 1.4rem;"></i>
                            </button>
                            <span>${c.ativo ? 'Ativo' : 'Inativo'}</span>
                        </div>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon btn-edit" onclick="editarCupom(${c.id})" title="Editar">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="excluirCupom(${c.id})" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // --- Modal Actions ---

    btnNovoCupom.addEventListener("click", () => {
        formCupom.reset();
        document.getElementById("cupomId").value = "";
        document.getElementById("tituloModalCupom").innerText = "Cadastrar Cupom";
        rowValor.style.display = "block";
        abrirModal(modalCupom);
    });

    formCupom.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(formCupom);
        const data = Object.fromEntries(formData.entries());
        data.ativo = document.getElementById("cupomAtivo").checked;
        data.id = document.getElementById("cupomId").value;

        try {
            const method = data.id ? "PUT" : "POST";
            const url = data.id ? `/api/cupons/${data.id}` : "/api/cupons";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erro ao salvar cupom");
            }

            fecharModal(modalCupom);
            carregarCupons();
            window.showToast?.("Cupom salvo com sucesso!", "success");
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    // --- Global Actions (attached to window for onclick) ---

    window.editarCupom = async (id) => {
        try {
            const res = await fetch("/api/cupons");
            const cupons = await res.json();
            const cupom = cupons.find(c => c.id === id);

            if (!cupom) return;

            document.getElementById("cupomId").value = cupom.id;
            document.getElementById("cupomCodigo").value = cupom.codigo;
            document.getElementById("cupomTipo").value = cupom.tipo;
            document.getElementById("cupomValor").value = cupom.valor;
            document.getElementById("cupomMinimo").value = cupom.minimo;
            document.getElementById("cupomValidade").value = cupom.validade ? cupom.validade.split("T")[0] : "";
            document.getElementById("cupomLimite").value = cupom.limite || "";
            document.getElementById("cupomLimiteUsuario").value = cupom.limite_usuario || "";
            document.getElementById("cupomAtivo").checked = cupom.ativo;

            document.getElementById("tituloModalCupom").innerText = "Editar Cupom";

            if (cupom.tipo === "frete_gratis") {
                rowValor.style.display = "none";
            } else {
                rowValor.style.display = "block";
            }

            abrirModal(modalCupom);
        } catch (error) {
            console.error(error);
        }
    };

    window.alternarStatusCupom = async (id) => {
        try {
            const res = await fetch(`/api/cupons/${id}/status`, { method: "PATCH" });
            if (!res.ok) throw new Error("Erro ao alternar status");
            carregarCupons();
            window.showToast?.("Status atualizado!", "success");
        } catch (error) {
            console.error(error);
            window.showToast?.("Erro ao atualizar status.", "error");
        }
    };

    window.excluirCupom = async (id) => {
        if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
        try {
            const res = await fetch(`/api/cupons/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Erro ao excluir cupom");
            carregarCupons();
            window.showToast?.("Cupom excluído!", "success");
        } catch (error) {
            console.error(error);
            window.showToast?.("Erro ao excluir cupom.", "error");
        }
    };

    function abrirModal(modal) {
        modal.style.display = "block";
    }
    function fecharModal(modal) {
        modal.style.display = "none";
    }

    // Close buttons logic for our specific modal
    modalCupom.querySelectorAll("[data-modal-close]").forEach(btn => {
        btn.addEventListener("click", () => fecharModal(modalCupom));
    });

    // Initial load
    carregarCupons();
});
