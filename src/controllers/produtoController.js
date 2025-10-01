const Produto = require("../models/Produto");
const { Op } = require("sequelize");

/* ================== Criar Produto ================== */
exports.criarProduto = async (req, res) => {
  try {
    console.log("[ProdutoController] Criando produto:", req.body.nome);
    const produto = await Produto.create(req.body);
    console.log("[ProdutoController] Produto criado com sucesso:", produto.id);
    res.status(201).json(produto);
  } catch (err) {
    console.error("[ProdutoController] Erro ao criar produto:", err);
    res.status(500).json({ erro: "Não foi possível criar o produto." });
  }
};

/* ================== Listar Todos Produtos ================== */
exports.listarProdutos = async (req, res) => {
  try {
    console.log("[ProdutoController] Listando todos os produtos");
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
    console.log("[ProdutoController] Buscando produto ID:", id);

    const produto = await Produto.findByPk(id);
    if (!produto) {
      console.log("[ProdutoController] Produto não encontrado ID:", id);
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    console.log("[ProdutoController] Produto encontrado:", produto.nome);
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
    console.log("[ProdutoController] Atualizando produto ID:", id);

    const produto = await Produto.findByPk(id);
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });

    await produto.update(req.body);
    console.log("[ProdutoController] Produto atualizado:", produto.nome);
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
    console.log("[ProdutoController] Deletando produto ID:", id);

    const produto = await Produto.findByPk(id);
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });

    await produto.destroy();
    console.log("[ProdutoController] Produto deletado:", produto.nome);
    res.json({ mensagem: "Produto deletado com sucesso" });
  } catch (err) {
    console.error("[ProdutoController] Erro ao deletar produto:", err);
    res.status(500).json({ erro: "Não foi possível deletar o produto." });
  }
};

/* ================== Buscar Produtos por Seção ================== */
exports.buscarPorSecao = async (req, res) => {
  try {
    const { secao } = req.params;
    console.log("[ProdutoController] Buscando produtos na seção:", secao);

    const produtos = await Produto.findAll({ where: { secao } });

    if (!produtos || produtos.length === 0) {
      console.log("[ProdutoController] Nenhum produto encontrado na seção:", secao);
      return res.status(404).json({ erro: "Nenhum produto encontrado para esta seção." });
    }

    console.log(`[ProdutoController] Encontrados ${produtos.length} produtos na seção ${secao}`);
    res.json(produtos);
  } catch (err) {
    console.error("[ProdutoController] Erro ao buscar produtos por seção:", err);
    res.status(500).json({ erro: "Erro ao buscar produtos por seção." });
  }
};

/* ================== Buscar Produtos por Categoria ================== */
exports.buscarPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;
    const { ordenar } = req.query;
    console.log("[ProdutoController] Buscando produtos na categoria:", categoria, "com ordenação:", ordenar);

    let order = [];
    switch (ordenar) {
      case "price-low":
        order = [["precoPromocional", "ASC"]];
        break;
      case "price-high":
        order = [["precoPromocional", "DESC"]];
        break;
      case "newest":
        order = [["createdAt", "DESC"]];
        break;
      case "relevance":
      default:
        order = [["createdAt", "DESC"]];
        break;
    }

    const produtos = await Produto.findAll({
      where: {
        [Op.or]: [
          { categoria },
          { categoria2: categoria },
          { categoria3: categoria }
        ]
      },
      order
    });

    if (!produtos || produtos.length === 0) {
      console.log("[ProdutoController] Nenhum produto encontrado na categoria:", categoria);
      return res.status(404).json({ erro: "Nenhum produto encontrado para esta categoria." });
    }

    console.log(`[ProdutoController] Encontrados ${produtos.length} produtos na categoria ${categoria}`);
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
    console.log("[ProdutoController] Busca global termo:", query);

    if (!query || !query.trim()) {
      console.log("[ProdutoController] Termo de busca vazio");
      return res.status(400).json({ erro: "Informe um termo de busca." });
    }

    const produtos = await Produto.findAll({
      where: {
        [Op.or]: [
          { nome: { [Op.like]: `%${query}%` } },
          { descricao: { [Op.like]: `%${query}%` } }
        ]
      },
      limit: 20
    });

    if (!produtos || produtos.length === 0) {
      console.log("[ProdutoController] Nenhum produto encontrado para a busca:", query);
      return res.status(404).json({ erro: "Nenhum produto encontrado." });
    }

    console.log(`[ProdutoController] Encontrados ${produtos.length} produtos para a busca "${query}"`);
    res.json(produtos);
  } catch (err) {
    console.error("[ProdutoController] Erro ao buscar produtos globalmente:", err);
    res.status(500).json({ erro: "Erro ao buscar produtos." });
  }
};
