const Newsletter = require("../models/Newsletter");

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

exports.cadastrar = async (req, res) => {
  try {
    const { email, origem = "home" } = req.body || {};

    if (!email || !validarEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "E-mail inválido. Confira e tente novamente 😉",
      });
    }

    // normalizar
    const emailNormalizado = email.trim().toLowerCase();

    // Verifica se já existe
    const existente = await Newsletter.findOne({ where: { email: emailNormalizado } });

    if (existente) {
      return res.status(200).json({
        success: true,
        message: "Esse e-mail já está cadastrado na nossa newsletter 😄",
      });
    }

    await Newsletter.create({
      email: emailNormalizado,
      origem,
      confirmado: true, // se quiser double opt-in, pode vir como false e só ativar depois
    });

    return res.status(201).json({
      success: true,
      message: "Cadastro realizado com sucesso! Fique de olho nas novidades 🍻",
    });
  } catch (error) {
    console.error("[Newsletter] Erro ao cadastrar:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao cadastrar. Tente novamente em instantes 🙏",
    });
  }
};


// (Opcional) Listar inscritos (pode proteger por admin depois)
exports.listar = async (req, res) => {
  try {
    // Exemplo simples – você pode colocar validação de admin aqui
    const inscritos = await Newsletter.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json(inscritos);
  } catch (error) {
    console.error("[Newsletter] Erro ao listar inscritos:", error);
    res.status(500).json({ message: "Erro ao listar inscritos" });
  }
};
