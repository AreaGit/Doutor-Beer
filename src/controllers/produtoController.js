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

/* ================== Listar Produtos Ativos (Site Público) ================== */
exports.listarProdutosAtivos = async (req, res) => {
  try {
    const produtos = await Produto.findAll({
      where: { ativo: true },
      order: [["createdAt", "DESC"]],
    });

    res.json(produtos);
  } catch (err) {
    console.error("[ProdutoController] Erro ao listar produtos ativos:", err);
    res.status(500).json({ erro: "Erro ao listar produtos ativos." });
  }
};

/* ================== Buscar Produto por ID ================== */
exports.buscarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);
    if (!produto)
      return res.status(404).json({ erro: "Produto não encontrado" });
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
    if (!produto)
      return res.status(404).json({ erro: "Produto não encontrado" });

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
    if (!produto)
      return res.status(404).json({ erro: "Produto não encontrado" });

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
    const produtos = await Produto.findAll({
      where: { ativo: true },
    });

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
        return secoes.some((s) => String(s).toLowerCase().trim() === secaoAlvo);
      }

      // Qualquer outro tipo, compara string bruta
      return String(secoes).toLowerCase().trim() === secaoAlvo;
    });

    if (!produtosFiltrados.length) {
      return res
        .status(404)
        .json({ erro: "Nenhum produto encontrado para esta seção." });
    }

    res.json(produtosFiltrados);
  } catch (err) {
    console.error(
      "[ProdutoController] Erro ao buscar produtos por seção:",
      err
    );
    res.status(500).json({ erro: "Erro ao buscar produtos por seção." });
  }
};

/* ================== Buscar Produtos por Categoria ================== */
exports.buscarPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;
    const produtos = await Produto.findAll({
      where: {
        ativo: true,
        [Op.or]: [
          { categoria },
          { categoria2: categoria },
          { categoria3: categoria },
          { marca: categoria },
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!produtos || produtos.length === 0)
      return res
        .status(404)
        .json({ erro: "Nenhum produto encontrado para esta categoria." });

    res.json(produtos);
  } catch (err) {
    console.error(
      "[ProdutoController] Erro ao buscar produtos por categoria:",
      err
    );
    res.status(500).json({ erro: "Erro ao buscar produtos por categoria." });
  }
};

/* ================== Buscar Produtos Globalmente (Barra de Pesquisa) ================== */
exports.buscarProdutos = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim())
      return res.status(400).json({ erro: "Informe um termo de busca." });

    const produtos = await Produto.findAll({
      where: {
        ativo: true,
        [Op.or]: [
          { nome: { [Op.like]: `%${query}%` } },
          { descricao: { [Op.like]: `%${query}%` } },
        ],
      },
      limit: 20,
    });

    if (!produtos || produtos.length === 0)
      return res.status(404).json({ erro: "Nenhum produto encontrado." });

    res.json(produtos);
  } catch (err) {
    console.error(
      "[ProdutoController] Erro ao buscar produtos globalmente:",
      err
    );
    res.status(500).json({ erro: "Erro ao buscar produtos." });
  }
};

// Buscar produto público

exports.buscarProdutoPublico = async (req, res) => {
  try {
    const { id } = req.params;

    const produto = await Produto.findOne({
      where: {
        id,
        ativo: true,
      },
    });

    if (!produto)
      return res.status(404).json({ erro: "Produto não encontrado" });

    res.json(produto);
  } catch (err) {
    console.error("[ProdutoController] Erro ao buscar produto público:", err);
    res.status(500).json({ erro: "Erro ao buscar produto." });
  }
};


/* ================== Preparar Dados do Produto para Frete ================== */
exports.getProdutoParaFrete = async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);

    if (!produto)
      return res.status(404).json({ erro: "Produto não encontrado" });

    // Campos obrigatórios para cálculo de frete
    const dadosFrete = {
      id: produto.id,
      width: produto.largura || 20,
      height: produto.altura || 20,
      length: produto.comprimento || 20,
      weight: produto.peso || 1,
      insurance_value: produto.precoPromocional || produto.preco || 50,
    };

    res.json(dadosFrete);
  } catch (err) {
    console.error(
      "[ProdutoController] Erro ao preparar produto para frete:",
      err
    );
    res.status(500).json({ erro: "Erro ao obter dados para frete." });
  }
};

/* ================== Ativar / Desativar Produto ================== */
exports.toggleStatusProduto = async (req, res) => {
  try {
    const { id } = req.params;

    const produto = await Produto.findByPk(id);
    if (!produto)
      return res.status(404).json({ erro: "Produto não encontrado" });

    produto.ativo = !produto.ativo;
    await produto.save();

    res.json({
      id: produto.id,
      ativo: produto.ativo,
    });
  } catch (err) {
    console.error("[ProdutoController] Erro ao alterar status:", err);
    res.status(500).json({ erro: "Erro ao alterar status do produto." });
  }
};

/* ================== Contar Produtos Ativos (Dashboard) ================== */
exports.contarProdutosAtivos = async (req, res) => {
  try {
    const count = await Produto.count({
      where: { ativo: true }
    });

    res.json({ produtosAtivos: count });
  } catch (err) {
    console.error("[ProdutoController] Erro ao contar produtos ativos:", err);
    res.status(500).json({ erro: "Erro ao contar produtos ativos." });
  }
};

/* ================== Importar Produtos via Excel ================== */
exports.importarProdutos = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: "Nenhum arquivo enviado." });
    }

    const xlsx = require("xlsx");
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data.length) {
      return res.status(400).json({ erro: "A planilha está vazia." });
    }

    const sucessos = [];
    const erros = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const linhaNum = i + 2; // +1 zero-indexed, +1 header row

      try {
        // Validação básica
        if (!row.nome || !row.descricao || !row.preco) {
          throw new Error("Campos obrigatórios ausentes (nome, descricao, preco).");
        }

        // Helper para converter string separada por vírgula em array JSON
        const toArray = (val) => {
          if (!val) return [];
          if (typeof val !== "string") return [String(val)];
          return val.split(",").map(v => v.trim()).filter(Boolean);
        };

        // Helper para converter Sim/Não em Boolean
        const toBool = (val) => {
          if (typeof val === "boolean") return val;
          if (!val) return false;
          const s = String(val).toLowerCase();
          return s === "sim" || s === "true" || s === "s" || s === "1";
        };

        const produtoData = {
          nome: String(row.nome).trim(),
          descricao: String(row.descricao).trim(),
          preco: parseFloat(row.preco),
          precoPromocional: row.precoPromocional ? parseFloat(row.precoPromocional) : null,
          categoria: row.categoria ? String(row.categoria).trim() : null,
          categoria2: row.categoria2 ? String(row.categoria2).trim() : null,
          categoria3: row.categoria3 ? String(row.categoria3).trim() : null,
          marca: row.marca ? String(row.marca).trim() : null,
          secao: toArray(row.secao),
          cores: toArray(row.cores),
          torneira: toArray(row.torneira),
          capacidade: toArray(row.capacidade),
          imagem: toArray(row.imagem),
          refil: row.refil !== undefined ? parseInt(row.refil, 10) : null,
          altura: row.altura ? parseFloat(row.altura) : null,
          largura: row.largura ? parseFloat(row.largura) : null,
          comprimento: row.comprimento ? parseFloat(row.comprimento) : null,
          peso: row.peso ? parseFloat(row.peso) : null,
          permiteArte: toBool(row.permiteArte),
          urlGabarito: row.urlGabarito ? String(row.urlGabarito).trim() : null,
          ativo: row.ativo !== undefined ? toBool(row.ativo) : true
        };

        const produto = await Produto.create(produtoData);
        sucessos.push({ nome: produto.nome, id: produto.id });
      } catch (err) {
        erros.push({ linha: linhaNum, erro: err.message });
      }
    }

    res.json({
      mensagem: "Processamento concluído.",
      total: data.length,
      sucessos: sucessos.length,
      erros: erros.length,
      detalhesErros: erros
    });

  } catch (err) {
    console.error("[ProdutoController] Erro na importação:", err);
    res.status(500).json({ erro: "Erro ao processar a planilha." });
  }
};

/* ================== Baixar Modelo de Planilha Excel ================== */
exports.baixarTemplate = (req, res) => {
  try {
    const xlsx = require("xlsx");

    const headers = [
      "nome", "descricao", "preco", "precoPromocional", "categoria",
      "categoria2", "categoria3", "marca", "cores", "torneira",
      "secao", "peso", "altura", "largura", "comprimento", "imagem",
      "refil", "permiteArte", "ativo"
    ];

    // Cria um exemplo de linha (opcional)
    const example = {
      nome: "Exemplo de Produto",
      descricao: "Descrição completa do produto aqui",
      preco: 199.90,
      precoPromocional: 149.90,
      categoria: "torres",
      marca: "doutor_beer",
      cores: "black,blue,red",
      torneira: "Cromada,Alavanca",
      secao: "lancamentos,mais-vendidos",
      peso: 500,
      altura: 30,
      largura: 20,
      comprimento: 20,
      imagem: "https://i.imgur.com/vXXjFbS.jpeg",
      refil: 2,
      permiteArte: "Sim",
      ativo: "Sim"
    };

    const ws = xlsx.utils.json_to_sheet([example], { header: headers });
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Template_Produtos");

    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", 'attachment; filename="modelo_importacao_produtos.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);

  } catch (err) {
    console.error("[ProdutoController] Erro ao gerar template:", err);
    res.status(500).json({ erro: "Erro ao gerar modelo de planilha." });
  }
};
