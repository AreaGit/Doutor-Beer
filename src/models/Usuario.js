const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Definição do Model Usuario
const Usuario = sequelize.define("Usuario", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  customer_asaas_id: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  cpf: {
    type: DataTypes.STRING(14),
    allowNull: false,
  },
  celular: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  telefone: {
    type: DataTypes.STRING(14),
    allowNull: true
  },
  sexo: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  data_de_nascimento: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  cep: {
    type: DataTypes.STRING(9),
    allowNull: false
  },
  endereco: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  numero: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  complemento: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  referencia: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  bairro: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  cidade: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  senha: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  codigo2FA: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  expira2FA: {
    type: DataTypes.DATE,
    allowNull: true    
  },

  resetToken: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  resetTokenExpira: {
    type: DataTypes.DATE,
    allowNull: true
  }

}, {
  tableName: "usuarios", // nome da tabela no banco
  timestamps: true       // cria createdAt e updatedAt automaticamente
});

// Cria a tabela se não existir
//Usuario.sync({ alter: true });
// Reseta a tabela
//Usuario.sync({ force: true });
// Sincroniza a tabela
Usuario.sync();

module.exports = Usuario;