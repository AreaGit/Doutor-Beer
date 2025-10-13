const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");

// Rotas
router.post("/usuarios", usuarioController.criarUsuario); // Criar usuário
router.post("/cadastrar", usuarioController.criarUsuario);
router.post("/login", usuarioController.login);
router.post("/login/2fa", usuarioController.verificar2FA);
router.post("/login/reenvio", usuarioController.reenviarCodigo2FA);
router.get("/me", usuarioController.me);
router.post("/logout", usuarioController.logout);
router.put("/me", usuarioController.atualizarUsuario);
router.get("/me/pedidos", usuarioController.mePedidos);

module.exports = router;

    