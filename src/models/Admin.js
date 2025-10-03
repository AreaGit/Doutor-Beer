const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Definição do Model Administrador
const Admin = sequelize.define("Admin", {
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
  },
  senha: {
    type: DataTypes.STRING(200), // senha já criptografada (hash)
    allowNull: false
  },

}, {
  tableName: "administradores", // nome da tabela no banco
  timestamps: true              // cria createdAt e updatedAt automaticamente
});

// Cria a tabela se não existir
//Admin.sync({ alter: true });
//Admin.sync({ force: true });
//Admin.sync();

module.exports = Admin;
