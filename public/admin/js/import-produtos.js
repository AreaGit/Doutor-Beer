/* =========================================================
 * IMPORTAÇÃO DE PRODUTOS — import-produtos.js
 * Lógica para upload de planilha Excel e cadastro em massa
 * ========================================================= */

function initProdutoImport() {
    const btnImportar = document.getElementById("btnImportarProdutos");
    const inputExcel = document.getElementById("inputImportarExcel");

    if (!btnImportar || !inputExcel) return;

    btnImportar.addEventListener("click", () => {
        inputExcel.click();
    });

    inputExcel.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm(`Deseja importar os produtos da planilha "${file.name}"?`)) {
            inputExcel.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("planilha", file);

        try {
            showToast("Processando planilha, aguarde...", "info");

            const res = await fetch("/api/produtos/import", {
                method: "POST",
                body: formData
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.erro || "Erro ao importar produtos.");
            }

            let msg = `Importação concluída! ${result.sucessos} produtos cadastrados.`;
            if (result.erros > 0) {
                msg += ` (${result.erros} erros encontrados)`;
                console.warn("Erros na importação:", result.detalhesErros);

                // Se houver erros, mostra um resumo no alert para o usuário não perder
                const errosResumo = result.detalhesErros
                    .slice(0, 5)
                    .map(e => `Linha ${e.linha}: ${e.erro}`)
                    .join("\n");

                alert(`Importação finalizada com alguns erros:\n\n${errosResumo}${result.erros > 5 ? "\n...veja mais no console." : ""}`);
            }

            showToast(msg, result.erros === 0 ? "success" : "warning");

            // Recarrega a lista de produtos
            if (typeof carregarProdutos === "function") {
                carregarProdutos();
            }

        } catch (err) {
            console.error(err);
            showToast(err.message, "error");
        } finally {
            inputExcel.value = "";
        }
    });
}
