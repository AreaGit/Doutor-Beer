const { Dropbox } = require('dropbox');
require('dotenv').config();

const fetch = require('isomorphic-fetch');
const dbx = new Dropbox({
  clientId: process.env.DROPBOX_APP_KEY,
  clientSecret: process.env.DROPBOX_APP_SECRET,
  refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
  fetch
});

/**
 * Faz o upload de um arquivo para o Dropbox e retorna um link de compartilhamento público.
 * @param {string} fileName Nome original do arquivo
 * @param {Buffer} buffer Conteúdo do arquivo em buffer
 * @returns {Promise<string>} URL de compartilhamento pública
 */
async function uploadFile(fileName, buffer) {
  try {
    const dropboxPath = `/artes-clientes/${Date.now()}_${fileName}`;

    // 1. Upload do arquivo
    const uploadResponse = await dbx.filesUpload({
      path: dropboxPath,
      contents: buffer
    });

    console.log('Upload concluído:', uploadResponse.result.name);

    // 2. Tenta criar um link de compartilhamento público
    try {
      const shareResponse = await dbx.sharingCreateSharedLinkWithSettings({
        path: dropboxPath,
        settings: { requested_visibility: 'public' }
      });
      return shareResponse.result.url.replace('?dl=0', '?dl=1'); // Altera para download direto
    } catch (shareError) {
      // Se o link já existir, busca o link existente
      if (shareError.error && shareError.error.error_summary && shareError.error.error_summary.includes('shared_link_already_exists')) {
        const linksResponse = await dbx.sharingListSharedLinks({ path: dropboxPath });
        if (linksResponse.result.links.length > 0) {
          return linksResponse.result.links[0].url.replace('?dl=0', '?dl=1');
        }
      }
      throw shareError;
    }
  } catch (error) {
    console.error('Erro no upload para o Dropbox:', error);
    throw error;
  }
}

module.exports = { uploadFile };