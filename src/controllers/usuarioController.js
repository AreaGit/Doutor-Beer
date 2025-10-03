const Usuario = require("../models/Usuario");
const Cart = require("../models/carrinho");
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

    const existingEmail = await Usuario.findOne({ where: { email } });
    if (existingEmail) return res.status(409).json({ message: "Email já cadastrado" });

    const existingCpf = await Usuario.findOne({ where: { cpf } });
    if (existingCpf) return res.status(409).json({ message: "Cpf já cadastrado" });

    const senhaHash = await bcrypt.hash(senha, 10);

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
  const { email, senha, guestCart = [] } = req.body;

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

    // Salvar guestCart temporário na sessão para mesclar após 2FA
    req.session.tempLogin = { email, codigo, guestCart };

    res.json({ message: "Código enviado para seu e-mail" });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ message: "Erro no login", error });
  }
};

// ==================== LOGIN PASSO 2: VERIFICAR CÓDIGO 2FA ====================
exports.verificar2FA = async (req, res) => {
  const { email, codigo } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(400).json({ message: "Usuário não encontrado" });

    const agora = new Date();
    const expira = usuario.expira2FA ? new Date(usuario.expira2FA) : null;

    if (!usuario.codigo2FA || !expira || agora > expira) {
      return res.status(400).json({ message: "Código expirado. Faça login novamente." });
    }

    if (String(usuario.codigo2FA) !== String(codigo)) {
      return res.status(400).json({ message: "Código inválido." });
    }

    if (!req.session.tempLogin || req.session.tempLogin.email !== email) {
      return res.status(400).json({ message: "Fluxo de login inválido." });
    }

    // Limpar campos 2FA
    usuario.codigo2FA = null;
    usuario.expira2FA = null;
    await usuario.save();

    // Criar sessão do usuário
    req.session.user = { id: usuario.id, nome: usuario.nome, email };

    // ==================== MESCLAGEM MELHORADA ====================
    const guestCart = req.session.tempLogin.guestCart || [];
    let mergedItems = 0;

    if (guestCart.length > 0) {
      console.log(`[Login] Iniciando mesclagem de ${guestCart.length} itens do carrinho guest`);
      
      for (const item of guestCart) {
        try {
          // Verificar se o produto existe
          const produtoExistente = await require("../models/Produto").findByPk(item.id);
          if (!produtoExistente) {
            console.log(`[Login] Produto ${item.id} não encontrado, ignorando`);
            continue;
          }

          const existente = await Cart.findOne({
            where: { usuarioId: usuario.id, produtoId: item.id }
          });

          if (existente) {
            // Somar quantidades se já existir
            existente.quantidade += (item.quantidade || 1);
            await existente.save();
            console.log(`[Login] Item ${item.id} atualizado: quantidade ${existente.quantidade}`);
          } else {
            // Criar novo item para o usuário
            await Cart.create({
              usuarioId: usuario.id,
              produtoId: item.id,
              quantidade: item.quantidade || 1
            });
            console.log(`[Login] Item ${item.id} adicionado ao carrinho do usuário`);
          }
          mergedItems++;
        } catch (itemError) {
          console.error(`[Login] Erro ao processar item ${item.id}:`, itemError);
        }
      }
      console.log(`[Login] Mesclagem concluída: ${mergedItems} itens processados`);
    }

    // Limpar tempLogin
    delete req.session.tempLogin;

    res.json({ 
      message: "Login realizado com sucesso!", 
      mergedItems 
    });
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

    await gerarCodigo2FA(usuario);

    res.json({ message: "Código reenviado para seu e-mail." });
  } catch (err) {
    console.error("Erro ao reenviar código 2FA:", err);
    res.status(500).json({ message: "Erro ao reenviar código." });
  }
};

// ==================== SABER QUEM ESTÁ LOGADO ====================
exports.me = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Não foi possível capturar a sessão" });

  const usuario = await Usuario.findByPk(req.session.user.id);

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
};

// ==================== ATUALIZAR DADOS DO USUÁRIO ====================
exports.atualizarUsuario = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Não autenticado" });

  try {
    const usuario = await Usuario.findByPk(req.session.user.id);
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });

    // Campos que podem ser atualizados (não alterar cpf e email)
    const camposAtualizaveis = [
      "nome", "celular", "telefone", "sexo", "data_de_nascimento",
      "cep", "endereco", "numero", "complemento", "referencia",
      "bairro", "cidade", "estado"
    ];

    camposAtualizaveis.forEach(campo => {
      if (req.body[campo] !== undefined) {
        usuario[campo] = req.body[campo];
      }
    });

    await usuario.save();

    res.json({ message: "Dados atualizados com sucesso!", usuario });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({ message: "Erro ao atualizar usuário", error });
  }
};

// ==================== LOGOUT ====================
exports.logout = async (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logout realizado com sucesso!" });
  });
};