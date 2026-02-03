const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Produto = require("./Produto");

const PedidoItem = sequelize.define("PedidoItem", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  pedidoId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  produtoId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantidade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  precoUnitario: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  cor: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "padrao"
  },
  torneira: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "padrao"
  },
  refil: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  arteUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: "pedido_items",
  timestamps: true
});

// Relação com Produto
PedidoItem.belongsTo(Produto, { foreignKey: "produtoId", as: "Produto" });

module.exports = PedidoItem;