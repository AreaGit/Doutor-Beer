const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile } = require('../services/dropbox.services');

// Configuração do Multer (armazenamento em memória)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Limite de 50MB
});

/**
 * Rota para upload de arte para o Dropbox
 */
router.post('/arte', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const fileName = req.file.originalname;
        const buffer = req.file.buffer;

        // Faz o upload para o Dropbox e obtém o link de compartilhamento
        const publicUrl = await uploadFile(fileName, buffer);

        res.json({ url: publicUrl });
    } catch (error) {
        console.error('Erro na rota de upload:', error);
        res.status(500).json({ error: 'Erro ao processar o upload para o Dropbox.' });
    }
});

module.exports = router;