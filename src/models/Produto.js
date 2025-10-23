const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Produto = sequelize.define("Produto", {
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  preco: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  precoPromocional: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  imagem: {
    type: DataTypes.JSON,
    allowNull: true
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categoria2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categoria3: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cores: {
    type: DataTypes.JSON,
    allowNull: true
  },
  torneira: {
    type: DataTypes.JSON,
    allowNull: true
  },
  refil: {
  type: DataTypes.INTEGER,
  allowNull: true, 
  defaultValue: null 
},
  capacidade: {
    type: DataTypes.JSON,
    allowNull: true
  },
  secao: {
    type: DataTypes.STRING,
    allowNull: true
  },
  altura: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  largura: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  comprimento: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  peso: {
    type: DataTypes.DECIMAL,
    allowNull: true
  }
});

// Associações
Produto.associate = (models) => {
  Produto.hasMany(models.PedidoItem, { foreignKey: "produtoId", as: "ItensPedido" });
};

// Sincroniza a tabela
Produto.sync({ alter: true });

module.exports = Produto;
