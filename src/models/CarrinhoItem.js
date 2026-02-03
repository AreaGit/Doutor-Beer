// models/CarrinhoItem.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Carrinho = require("./carrinho");
const Produto = require("./Produto");

const CarrinhoItem = sequelize.define(
  "CarrinhoItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    carrinhoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    produtoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    cor: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "padrao",
    },

    torneira: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "padrao",
    },

    refil: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },

    // preço unitário final desse item (já com torneira/refil)
    precoFinal: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    arteUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "carrinho_itens",
    timestamps: true,
  }
);

/* ================== RELACIONAMENTOS ================== */

// 1 carrinho -> N itens
Carrinho.hasMany(CarrinhoItem, {
  foreignKey: "carrinhoId",
  as: "itens",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

CarrinhoItem.belongsTo(Carrinho, {
  foreignKey: "carrinhoId",
  as: "Carrinho",
});

// item -> produto
CarrinhoItem.belongsTo(Produto, {
  foreignKey: "produtoId",
  as: "Produto",
});

module.exports = CarrinhoItem;
