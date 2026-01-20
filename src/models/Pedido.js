// backend/models/Pedido.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Usuario = require("./Usuario");
const PedidoItem = require("./PedidoItem");

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
  formaPagamento: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cupom: {
    type: DataTypes.STRING,
    allowNull: true
  },

  descontoCupom: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },

  // Snapshot dos dados do cliente (para histórico imutável)
  clienteNome: { type: DataTypes.STRING, allowNull: true },
  clienteEmail: { type: DataTypes.STRING, allowNull: true },
  clienteCpf: { type: DataTypes.STRING, allowNull: true },
  clienteCelular: { type: DataTypes.STRING, allowNull: true },
  clienteTelefone: { type: DataTypes.STRING, allowNull: true },
  clienteDataNascimento: { type: DataTypes.DATEONLY, allowNull: true },

  // Campos adicionados para integração ASAAS
  paymentId: { type: DataTypes.STRING, allowNull: true }, // ID da cobrança no ASAAS
  paymentStatus: { type: DataTypes.STRING, allowNull: true }, // Ex: RECEIVED, PENDING, OVERDUE, etc
  paymentDate: { type: DataTypes.DATE, allowNull: true }, // Data de pagamento
  paymentType: { type: DataTypes.STRING, allowNull: true }, // PIX, BOLETO, CREDIT_CARD, etc
  externalReference: { type: DataTypes.STRING, allowNull: true }, // ID interno de controle
  qrCodePayload: { type: DataTypes.TEXT, allowNull: true }, // Código "copia e cola" PIX
  qrCodeImage: { type: DataTypes.TEXT("long"), allowNull: true } // Imagem Base64 (pode ser grande)
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
