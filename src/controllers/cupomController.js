const Cupom = require("../models/Cupom");

// Listar todos os cupons
exports.listarCupons = async (req, res) => {
    try {
        const cupons = await Cupom.findAll({
            order: [["createdAt", "DESC"]],
        });
        res.json(cupons);
    } catch (error) {
        console.error("[CupomController] Erro ao listar cupons:", error);
        res.status(500).json({ error: "Erro ao listar cupons" });
    }
};

// Helper para sanitizar números opcionais
const sanitizeNumber = (val) => {
    if (val === "" || val === null || val === undefined) return null;
    return val;
};

// Criar um novo cupom
exports.criarCupom = async (req, res) => {
    try {
        const { codigo, tipo, valor, minimo, validade, limite, limite_usuario, ativo } = req.body;

        // Validar se o código já existe
        const existente = await Cupom.findOne({ where: { codigo: codigo.toUpperCase().trim() } });
        if (existente) {
            return res.status(400).json({ error: "Já existe um cupom com este código" });
        }

        const novoCupom = await Cupom.create({
            codigo: codigo.toUpperCase().trim(),
            tipo,
            valor: valor || 0,
            minimo: minimo || 0,
            validade: validade || null,
            limite: sanitizeNumber(limite),
            limite_usuario: sanitizeNumber(limite_usuario),
            ativo: ativo !== undefined ? ativo : true,
        });

        res.status(201).json(novoCupom);
    } catch (error) {
        console.error("[CupomController] Erro ao criar cupom:", error);
        res.status(500).json({ error: "Erro ao criar cupom" });
    }
};

// Editar um cupom existente
exports.editarCupom = async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo, tipo, valor, minimo, validade, limite, limite_usuario, ativo } = req.body;

        const cupom = await Cupom.findByPk(id);
        if (!cupom) {
            return res.status(404).json({ error: "Cupom não encontrado" });
        }

        // Se mudou o código, verificar se o novo já existe
        if (codigo && codigo.toUpperCase().trim() !== cupom.codigo) {
            const existente = await Cupom.findOne({ where: { codigo: codigo.toUpperCase().trim() } });
            if (existente) {
                return res.status(400).json({ error: "Já existe um outro cupom com este código" });
            }
            cupom.codigo = codigo.toUpperCase().trim();
        }

        if (tipo) cupom.tipo = tipo;
        if (valor !== undefined) cupom.valor = valor;
        if (minimo !== undefined) cupom.minimo = minimo;
        if (validade !== undefined) cupom.validade = validade;
        if (limite !== undefined) cupom.limite = sanitizeNumber(limite);
        if (limite_usuario !== undefined) cupom.limite_usuario = sanitizeNumber(limite_usuario);
        if (ativo !== undefined) cupom.ativo = ativo;

        await cupom.save();
        res.json(cupom);
    } catch (error) {
        console.error("[CupomController] Erro ao editar cupom:", error);
        res.status(500).json({ error: "Erro ao editar cupom" });
    }
};

// Excluir um cupom
exports.excluirCupom = async (req, res) => {
    try {
        const { id } = req.params;
        const cupom = await Cupom.findByPk(id);
        if (!cupom) {
            return res.status(404).json({ error: "Cupom não encontrado" });
        }

        await cupom.destroy();
        res.json({ message: "Cupom excluído com sucesso" });
    } catch (error) {
        console.error("[CupomController] Erro ao excluir cupom:", error);
        res.status(500).json({ error: "Erro ao excluir cupom" });
    }
};

// Alternar status do cupom (Ativar/Desativar)
exports.alternarStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const cupom = await Cupom.findByPk(id);
        if (!cupom) {
            return res.status(404).json({ error: "Cupom não encontrado" });
        }

        cupom.ativo = !cupom.ativo;
        await cupom.save();
        res.json(cupom);
    } catch (error) {
        console.error("[CupomController] Erro ao alternar status do cupom:", error);
        res.status(500).json({ error: "Erro ao alternar status" });
    }
};
