const ClubeVip = require("../models/ClubeVip");

exports.criarCadastro = async (req, res) => {
  try {
    const { nome, cpfCnpj, whatsapp, email, origem } = req.body;

    // validação básica
    if (!nome || !cpfCnpj || !whatsapp || !email) {
      return res.status(400).json({
        success: false,
        message: "Por favor, preencha todos os campos obrigatórios."
      });
    }

    // opcional: evitar duplicidade por e-mail + whatsapp
    const existente = await ClubeVip.findOne({ where: { email, whatsapp } });
    if (existente) {
      return res.status(409).json({
        success: false,
        message: "Este contato já está cadastrado no Clube VIP."
      });
    }

    const cadastro = await ClubeVip.create({
      nome: nome.trim(),
      cpfCnpj: cpfCnpj.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      origem: origem || "landing-beneficio"
    });

    return res.status(201).json({
      success: true,
      message: "Cadastro realizado com sucesso no Clube VIP!",
      data: cadastro
    });
  } catch (error) {
    console.error("Erro ao criar cadastro Clube VIP:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao salvar seus dados. Tente novamente.",
    });
  }
};