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
    allowNull: false
  }
}, {
  tableName: "pedido_items",
  timestamps: true
});

// Relações
PedidoItem.belongsTo(Produto, { foreignKey: "produtoId", as: "Produto" });

module.exports = PedidoItem;