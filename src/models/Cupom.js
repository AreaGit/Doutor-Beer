const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Cupom = sequelize.define("Cupom", {
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  tipo: {
    type: DataTypes.ENUM("fixo", "percentual", "frete_gratis"),
    allowNull: false,
  },
  valor: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  minimo: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  validade: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  limite: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  limite_usuario: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  usos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});


module.exports = Cupom;
