// models/Carrinho.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Usuario = require("./Usuario");

const Carrinho = sequelize.define(
  "Carrinho",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Usuário dono do carrinho (apenas logado)
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Código do cupom aplicado nesse carrinho (se houver)
    cupomCodigo: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Valor absoluto de desconto em R$ (ex: 150)
    desconto: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    // Soma de (precoFinal * quantidade) de TODOS os itens (sem frete)
    subtotal: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    // subtotal - desconto (sem frete)
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    // ABERTO, FINALIZADO, CANCELADO, etc.
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "ABERTO",
    },
  },
  {
    tableName: "carrinhos",
    timestamps: true,
  }
);

// 1 usuário -> N carrinhos (em geral você vai usar só 1 "ABERTO")
Carrinho.belongsTo(Usuario, {
  foreignKey: "usuarioId",
  as: "Usuario",
});

module.exports = Carrinho;
