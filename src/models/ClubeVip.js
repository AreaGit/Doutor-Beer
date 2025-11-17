// src/models/ClubeVip.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ClubeVip = sequelize.define("ClubeVip", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nome: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  cpfCnpj: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  whatsapp: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  origem: {
    type: DataTypes.STRING(60),
    allowNull: true
  }
}, {
  tableName: "clube_vip",
  timestamps: true
});

// segue o padrão do Usuario.js
ClubeVip.sync();

module.exports = ClubeVip;
