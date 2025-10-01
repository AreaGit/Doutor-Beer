const Usuario = require("../models/Usuario");
const enviarEmail = require("../utils/email");

async function cadastrarUsuario(req, res) {
  try {
    // Cria o usuário
    const usuario = await Usuario.create(req.body);

    // Envia e-mail de boas-vindas
    await enviarEmail(
      usuario.email,
      "Bem-vindo ao Doutor Beer!",
      "Seu cadastro foi realizado com sucesso!",
      "<h1>Parabéns!</h1><p>Seu cadastro foi concluído com sucesso!</p>"
    );

    res.status(201).json({ message: "Usuário criado com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Erro ao criar usuário." });
  }
}

module.exports = {
  cadastrarUsuario
};

// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");

// Login passo 1: email + senha
router.post("/login", usuarioController.login);

// Login passo 2: verificar código 2FA
router.post("/login/2fa", usuarioController.verificar2FA);

module.exports = router;
