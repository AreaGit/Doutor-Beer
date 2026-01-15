/* =====================
 * NEWSLETTER
 * ===================== */

document.addEventListener("DOMContentLoaded", () => {
  initNewsletter();
});

let totalInscritos = 0;

async function initNewsletter() {
  carregarInscritosNewsletter();
  carregarEstatisticasNewsletter();
  initFormNewsletter();
  initPreviewNewsletter();
  initAtualizarLista();
}

// ==========================
// Carregar lista de inscritos
// ==========================
async function carregarInscritosNewsletter() {
  const tbody = document.getElementById("listaNewsletter");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; padding: 20px; color: #9b9bb0;">
        Carregando inscritos...
      </td>
    </tr>
  `;

  try {
    const res = await fetch("/api/newsletter");
    if (!res.ok) throw new Error("Erro ao carregar inscritos");

    const inscritos = await res.json();
    totalInscritos = inscritos.length;

    if (!inscritos.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px; color: #9b9bb0;">
            Nenhum inscrito encontrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = inscritos.map(inscrito => {
      const dataCadastro = inscrito.createdAt
        ? new Date(inscrito.createdAt).toLocaleDateString("pt-BR")
        : "-";
      
      const status = inscrito.confirmado 
        ? '<span class="badge badge-success">Confirmado</span>'
        : '<span class="badge badge-danger">Pendente</span>';

      return `
        <tr>
          <td>#${inscrito.id}</td>
          <td>${inscrito.email}</td>
          <td>${inscrito.origem || "-"}</td>
          <td>${status}</td>
          <td>${dataCadastro}</td>
        </tr>
      `;
    }).join("");

    atualizarEstatisticas();
  } catch (err) {
    console.error("[Newsletter] Erro ao carregar inscritos:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 20px; color: #ff9c9f;">
          Erro ao carregar inscritos.
        </td>
      </tr>
    `;
  }
}

// ==========================
// Carregar estatísticas
// ==========================
async function carregarEstatisticasNewsletter() {
  try {
    const res = await fetch("/api/newsletter");
    if (res.ok) {
      const inscritos = await res.json();
      totalInscritos = inscritos.filter(i => i.confirmado).length;
      atualizarEstatisticas();
    }
  } catch (err) {
    console.error("[Newsletter] Erro ao carregar estatísticas:", err);
  }
}

function atualizarEstatisticas() {
  const statsEl = document.getElementById("newsletterStats");
  if (statsEl) {
    statsEl.innerHTML = `
      <strong style="color: #F9B000;">${totalInscritos}</strong> 
      ${totalInscritos === 1 ? "inscrito confirmado" : "inscritos confirmados"} receberão este email.
    `;
  }
}

// ==========================
// Formulário de envio
// ==========================
function initFormNewsletter() {
  const form = document.getElementById("formNewsletter");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const assunto = document.getElementById("newsletterAssunto").value.trim();
    const conteudoHtml = document.getElementById("newsletterConteudo").value.trim();
    const conteudoTexto = document.getElementById("newsletterConteudoTexto").value.trim();

    if (!assunto || !conteudoHtml) {
      showToast("Preencha o assunto e o conteúdo HTML", "error");
      return;
    }

    if (!confirm(`Deseja enviar este email para ${totalInscritos} ${totalInscritos === 1 ? "inscrito" : "inscritos"}?`)) {
      return;
    }

    const btnEnviar = document.getElementById("btnEnviarNewsletter");
    const btnOriginalText = btnEnviar.innerHTML;
    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    try {
      const res = await fetch("/api/newsletter/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assunto,
          conteudoHtml,
          conteudoTexto: conteudoTexto || undefined
        })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Erro ao enviar emails");
      }

      showToast(
        `Newsletter enviada com sucesso! ${result.enviados} de ${result.total} emails enviados.`,
        "success"
      );

      // Limpa o formulário
      form.reset();

      // Reload automático após ação impactante
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error("[Newsletter] Erro ao enviar:", err);
      showToast("Erro ao enviar newsletter: " + err.message, "error");
      btnEnviar.disabled = false;
      btnEnviar.innerHTML = btnOriginalText;
    }
  });
}

// ==========================
// Pré-visualização
// ==========================
function initPreviewNewsletter() {
  const btnPreview = document.getElementById("btnPreviewNewsletter");
  if (!btnPreview) return;

  btnPreview.addEventListener("click", () => {
    const assunto = document.getElementById("newsletterAssunto").value.trim();
    const conteudoHtml = document.getElementById("newsletterConteudo").value.trim();

    if (!assunto || !conteudoHtml) {
      showToast("Preencha o assunto e o conteúdo HTML para visualizar", "error");
      return;
    }

    // Abre em nova janela
    const previewWindow = window.open("", "_blank", "width=800,height=600");
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pré-visualização: ${assunto}</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
          }
          .preview-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .preview-header {
            border-bottom: 2px solid #F9B000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .preview-header h2 {
            margin: 0;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <div class="preview-header">
            <h2>${assunto}</h2>
          </div>
          <div class="preview-content">
            ${conteudoHtml}
          </div>
        </div>
      </body>
      </html>
    `);
    previewWindow.document.close();
  });
}

// ==========================
// Atualizar lista
// ==========================
function initAtualizarLista() {
  const btnAtualizar = document.getElementById("btnAtualizarListaNewsletter");
  if (!btnAtualizar) return;

  btnAtualizar.addEventListener("click", () => {
    carregarInscritosNewsletter();
    carregarEstatisticasNewsletter();
    showToast("Lista atualizada", "success");
  });
}
