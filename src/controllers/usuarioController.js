const Usuario = require("../models/Usuario");
const bcrypt = require("bcrypt");
const gerarCodigo2FA = require("../utils/gerarCodigo2FA");
const enviarEmail = require("../utils/email");

// ==================== CRIAR USUÁRIO ====================
exports.criarUsuario = async (req, res) => {
  try {
    const {
      nome, cpf, celular, telefone, sexo, data_de_nascimento,
      cep, endereco, numero, complemento, referencia,
      bairro, cidade, estado, email, senha
    } = req.body;

    // Check if the email already exists in the database
    const existingEmail = await Usuario.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ message: "Email já cadastrado" });
    }

    // Check if the CPF already exists in the database
    const existingCpf = await Usuario.findOne({ where: { cpf } });
    if (existingCpf) {
      return res.status(409).json({ message: "Cpf já cadastrado" });
    }

    // Criptografar a senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Create the new user
    const novoUsuario = await Usuario.create({
      nome,
      cpf,
      celular,
      telefone,
      sexo,
      data_de_nascimento,
      cep,
      endereco,
      numero,
      complemento,
      referencia,
      bairro,
      cidade,
      estado,
      email,
      senha: senhaHash
    });

    res.status(201).json({ message: "Usuário criado com sucesso!", usuario: novoUsuario });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ message: "Erro ao criar usuário", error });
  }
};
// ==================== LOGIN PASSO 1 ====================
exports.login = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(400).json({ message: "Usuário não encontrado" });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(400).json({ message: "Senha incorreta" });

    // Gerar código 2FA e enviar para o e-mail
    const codigo = await gerarCodigo2FA(usuario);

    usuario.codigo2FA = codigo;
    usuario.expira2FA = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
    await usuario.save();

    req.session.tempLogin = { email, codigo };

    console.log("Sessão Temporária: ", req.session.tempLogin);

    res.json({ message: "Código enviado para seu e-mail" });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ message: "Erro no login", error });
  }
};

// ==================== LOGIN PASSO 2: VERIFICAR CÓDIGO 2FA ====================
exports.verificar2FA = async (req, res) => {
  const { email, codigo } = req.body;

  console.log("📩 Requisição recebida:", req.body);
  console.log("Sessão Completa: ", req.session);

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(400).json({ message: "Usuário não encontrado" });

    // Garantir que expira2FA é Date
    const agora = new Date();
    const expira = usuario.expira2FA ? new Date(usuario.expira2FA) : null;

    console.log("Agora:", agora);
    console.log("Expira no banco:", usuario.expira2FA);


    if (!usuario.codigo2FA || !expira || agora > expira) {
      return res.status(400).json({ message: "Código expirado. Faça login novamente." });
    }

    // Corrigido: comparar sempre como string
    if (String(usuario.codigo2FA) !== String(codigo)) {
      return res.status(400).json({ message: "Código inválido." });
    }

    // Código válido: limpa e cria sessão real
    usuario.codigo2FA = null;
    usuario.expira2FA = null;
    await usuario.save();

    if (!req.session.tempLogin || req.session.tempLogin.email !== email) {
    return res.status(400).json({ message: "Fluxo de login inválido." });
  }

  if (req.session.tempLogin.codigo !== codigo) {
    return res.status(401).json({ message: "Código 2FA inválido." });
  }

  // Agora o login é válido: criamos a sessão do usuário
  req.session.user = { id: usuario.id, nome: usuario.nome, email };

  // Limpamos o tempLogin
  delete req.session.tempLogin;

    console.log(`✅ Usuário ${usuario.email} logado com sucesso!`);
    console.log(`✅ Sessão do Usuário ${req.session.user} logado com sucesso!`);
    res.json({ message: "Login realizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao verificar 2FA:", error);
    res.status(500).json({ message: "Erro ao verificar código", error });
  }
};


// ==================== REENVIO DE CÓDIGO 2FA ====================
exports.reenviarCodigo2FA = async (req, res) => {
  const { email } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(400).json({ message: "Usuário não encontrado." });

    // Gerar novo código e enviar para o e-mail
    await gerarCodigo2FA(usuario);

    res.json({ message: "Código reenviado para seu e-mail." });
  } catch (err) {
    console.error("Erro ao reenviar código 2FA:", err);
    res.status(500).json({ message: "Erro ao reenviar código." });
  }
};

// ==================== SABER QUEM ESTÁ LOGADO ====================
exports.me = async (req, res) => {
  if(!req.session.user) {
    return res.status(401).json({error: "Não foi possível capturar a sessão"});
  }

  const usuario = await Usuario.findByPk(req.session.user.id); // buscar todos os dados do usuário

  res.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cpf: usuario.cpf,
    telefone: usuario.telefone,
    celular: usuario.celular,
    sexo: usuario.sexo,
    data_de_nascimento: usuario.data_de_nascimento,
    endereco: usuario.endereco,
    numero: usuario.numero,
    complemento: usuario.complemento,
    bairro: usuario.bairro,
    cidade: usuario.cidade,
    estado: usuario.estado,
    cep: usuario.cep
  });
}

// ==================== LOGOUT ====================
exports.logout = async (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logout realizado com sucesso!" })
  })
}