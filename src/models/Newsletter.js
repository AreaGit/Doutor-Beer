const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Newsletter = sequelize.define("Newsletter", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true, // não deixa duplicar
    validate: {
      isEmail: true,
    },
  },
  origem: {
    type: DataTypes.STRING(50),
    allowNull: true, // ex: 'home', 'checkout', 'popup'
  },
  confirmado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true, // se depois quiser double opt-in real, é só usar false por padrão
  },
}, {
  tableName: "newsletter_inscritos",
  timestamps: true, // createdAt e updatedAt
});

// cuidado: em projetos maiores é melhor centralizar sync, mas vou seguir seu padrão
Newsletter.sync();
// Newsletter.sync({ alter: true }); // se precisar ajustar estrutura
// Newsletter.sync({ force: true }); // cuidado - recria a tabela

module.exports = Newsletter;
