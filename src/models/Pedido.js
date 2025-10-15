// backend/models/Pedido.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Usuario = require("./Usuario");
const PedidoItem = require("./PedidoItem"); // <--- IMPORTANTE

const Pedido = sequelize.define("Pedido", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Pendente"
  },
  frete: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  enderecoEntrega: {
    type: DataTypes.JSON,
    allowNull: false
  },
  metodoPagamento: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cupom: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: "pedidos",
  timestamps: true
});

// Relacionamentos
Pedido.belongsTo(Usuario, { foreignKey: "usuarioId", as: "Usuario" });
Pedido.hasMany(PedidoItem, { foreignKey: "pedidoId", as: "Itens" }); 

// Sincroniza tabela
Pedido.sync({ alter: true });

module.exports = Pedido;
