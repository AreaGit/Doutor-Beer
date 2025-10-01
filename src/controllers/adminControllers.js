// src/controllers/adminControllers.js
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin"); // ✅ seu model Admin

// ==================== CRIAR ADMIN ====================
exports.criarAdmin = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Validação simples
    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
    }

    // Verifica se já existe
    const adminExistente = await Admin.findOne({ where: { email } });
    if (adminExistente) {
      return res.status(400).json({ message: "Já existe um administrador com este e-mail." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const novoAdmin = await Admin.create({
      nome,
      email,
      senha: senhaHash
    });

    res.status(201).json({ message: "Administrador criado com sucesso!", admin: novoAdmin });
  } catch (error) {
    console.error("Erro ao criar admin:", error);
    res.status(500).json({ message: "Erro ao criar administrador", error });
  }
};

// ==================== LOGIN ADMIN ====================
exports.login = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) return res.status(400).json({ message: "Administrador não encontrado." });

    const senhaValida = await bcrypt.compare(senha, admin.senha);
    if (!senhaValida) return res.status(400).json({ message: "Senha incorreta." });

    // Cria sessão do administrador
    req.session.admin = {
      id: admin.id,
      nome: admin.nome,
      email: admin.email
    };

    console.log(`✅ Admin ${admin.email} logado com sucesso`);
    res.json({ message: "Login realizado com sucesso!" });
  } catch (error) {
    console.error("Erro no login do admin:", error);
    res.status(500).json({ message: "Erro no login do administrador", error });
  }
};

// ==================== QUEM ESTÁ LOGADO ====================
exports.me = async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ message: "Nenhum administrador logado" });
  }

  const admin = await Admin.findByPk(req.session.admin.id);

  res.json({
    id: admin.id,
    nome: admin.nome,
    email: admin.email
  });
};

// ==================== LOGOUT ====================
exports.logout = async (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logout realizado com sucesso!" });
  });
};

