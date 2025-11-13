const FaleConosco = require("../models/FaleConosco");

exports.sendMessage = async (req, res) => {
  try {
    const { nome, email, telefone, pedido, mensagem, conheceu } = req.body;

    // Validação básica
    if (!nome || !email || !mensagem) {
      return res.status(400).json({ error: "Campos obrigatórios não preenchidos." });
    }

    // Salva no banco via Sequelize
    await FaleConosco.create({
      nome,
      email,
      telefone,
      pedido,
      mensagem,
      conheceu
    });

    // Retorna sucesso
    return res.status(200).json({ message: "Mensagem recebida com sucesso!" });

  } catch (err) {
    console.error("Erro ao salvar mensagem:", err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
};
