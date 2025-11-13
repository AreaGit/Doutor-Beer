const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Definição do Model FaleConosco
const FaleConosco = sequelize.define("FaleConosco", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      isEmail: { msg: "E-mail inválido." }
    }
  },
  telefone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  pedido: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  mensagem: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  conheceu: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  data_envio: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: "fale_conosco",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

module.exports = FaleConosco;
