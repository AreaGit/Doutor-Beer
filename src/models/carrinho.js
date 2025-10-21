const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Usuario = require("./Usuario"); // Vincula ao usuário
const Produto = require("./Produto"); // Vincula aos produtos

// Definição do Model Cart
const Cart = sequelize.define("Cart", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  guestId: {
    type: DataTypes.STRING,
    allowNull: true
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

  cor: {
    type: DataTypes.STRING,
    allowNull: true
  }, 
  cupom: {
    type: DataTypes.STRING,
    allowNull: true
  }



}, {
  tableName: "carrinhos",
  timestamps: true
});

// Relacionamentos
Cart.belongsTo(Usuario, { foreignKey: "usuarioId", as: "Usuario" });
Cart.belongsTo(Produto, { foreignKey: "produtoId", as: "Produto" });

// Exporta o model
module.exports = Cart;

