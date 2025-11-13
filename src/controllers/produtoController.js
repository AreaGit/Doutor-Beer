const Produto = require("../models/Produto");
const { Op } = require("sequelize");

/* ================== Criar Produto ================== */
exports.criarProduto = async (req, res) => {
  try {
    console.log("[DEBUG] Dados recebidos:", req.body); // 👈 log pra ver o que o front está mandando
    const produto = await Produto.create(req.body);
    console.log("[DEBUG] Produto criado:", produto.toJSON()); // 👈 log pra ver se criou
    res.status(201).json(produto);
  } catch (err) {
    console.error("[ProdutoController] Erro ao criar produto:", err);
    res.status(500).json({ erro: "Não foi possível criar o produto." });
  }
};

/* ================== Listar Todos Produtos ================== */
exports.listarProdutos = async (req, res) => {
  try {
    const produtos = await Produto.findAll();
    res.json(produtos);
  } catch (err) {
    console.error("[ProdutoController] Erro ao listar produtos:", err);
    res.status(500).json({ erro: "Não foi possível listar os produtos." });
  }
};

/* ================== Buscar Produto por ID ================== */
exports.buscarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });
    res.json(produto);
  } catch (err) {
    console.error("[ProdutoController] Erro ao buscar produto:", err);
    res.status(500).json({ erro: "Erro ao buscar produto." });
  }
};

/* ================== Atualizar Produto ================== */
exports.atualizarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });

    await produto.update(req.body);
    res.json(produto);
  } catch (err) {
    console.error("[ProdutoController] Erro ao atualizar produto:", err);
    res.status(500).json({ erro: "Não foi possível atualizar o produto." });
  }
};

/* ================== Deletar Produto ================== */
exports.deletarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });

    await produto.destroy();
    res.json({ mensagem: "Produto deletado com sucesso" });
  } catch (err) {
    console.error("[ProdutoController] Erro ao deletar produto:", err);
    res.status(500).json({ erro: "Não foi possível deletar o produto." });
  }
};

/* ================== Buscar Produtos por Seção ================== */
exports.buscarPorSecao = async (req, res) => {
  try {
    const { secao } = req.params; // ex: "Lançamentos"
    const secaoAlvo = String(secao).toLowerCase().trim();

    // Busca todos e filtra na mão (independente se secao é JSON ou string)
    const produtos = await Produto.findAll();

    const produtosFiltrados = produtos.filter((prod) => {
      if (!prod.secao) return false;

      let secoes = prod.secao;

      // Se veio como string (dados antigos), pode ser:
      //  - "Lançamentos"
      //  - '["Lançamentos","Mais vendidos"]'
      if (typeof secoes === "string") {
        // tenta parsear como JSON
        try {
          const parsed = JSON.parse(secoes);
          secoes = parsed;
        } catch {
          // se não for JSON, compara direto como string
          return secoes.toLowerCase().trim() === secaoAlvo;
        }
      }

      // Se for array (JSON)
      if (Array.isArray(secoes)) {
        return secoes.some((s) =>
          String(s).toLowerCase().trim() === secaoAlvo
        );
      }

      // Qualquer outro tipo, compara string bruta
      return String(secoes).toLowerCase().trim() === secaoAlvo;
    });

    if (!produtosFiltrados.length) {
      return res.status(404).json({ erro: "Nenhum produto encontrado para esta seção." });
    }

    res.json(produtosFiltrados);
  } catch (err) {
    console.error("[ProdutoController] Erro ao buscar produtos por seção:", err);
    res.status(500).json({ erro: "Erro ao buscar produtos por seção." });
  }
};

/* ================== Buscar Produtos por Categoria ================== */
exports.buscarPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;
    const produtos = await Produto.findAll({
      where: {
        [Op.or]: [
          { categoria },
          { categoria2: categoria },
          { categoria3: categoria }
        ]
      },
      order: [["createdAt", "DESC"]]
    });

    if (!produtos || produtos.length === 0)
      return res.status(404).json({ erro: "Nenhum produto encontrado para esta categoria." });

    res.json(produtos);
  } catch (err) {
    console.error("[ProdutoController] Erro ao buscar produtos por categoria:", err);
    res.status(500).json({ erro: "Erro ao buscar produtos por categoria." });
  }
};

/* ================== Buscar Produtos Globalmente (Barra de Pesquisa) ================== */
exports.buscarProdutos = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) return res.status(400).json({ erro: "Informe um termo de busca." });

    const produtos = await Produto.findAll({
      where: {
        [Op.or]: [
          { nome: { [Op.like]: `%${query}%` } },
          { descricao: { [Op.like]: `%${query}%` } }
        ]
      },
      limit: 20
    });

    if (!produtos || produtos.length === 0)
      return res.status(404).json({ erro: "Nenhum produto encontrado." });

    res.json(produtos);
  } catch (err) {
    console.error("[ProdutoController] Erro ao buscar produtos globalmente:", err);
    res.status(500).json({ erro: "Erro ao buscar produtos." });
  }
};

/* ================== Preparar Dados do Produto para Frete ================== */
exports.getProdutoParaFrete = async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);

    if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });

    // Campos obrigatórios para cálculo de frete
    const dadosFrete = {
      id: produto.id,
      width: produto.largura || 20,
      height: produto.altura || 20,
      length: produto.comprimento || 20,
      weight: produto.peso || 1,
      insurance_value: produto.precoPromocional || produto.preco || 50
    };

    res.json(dadosFrete);
  } catch (err) {
    console.error("[ProdutoController] Erro ao preparar produto para frete:", err);
    res.status(500).json({ erro: "Erro ao obter dados para frete." });
  }
};
