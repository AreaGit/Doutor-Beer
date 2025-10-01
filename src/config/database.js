const { Sequelize } = require("sequelize");

// Conexão com o banco de dados
const sequelize = new Sequelize("infodoutor", "infodoutor", "admBancoD@dos2", {
  host: "infodoutor.mysql.dbaas.com.br",
  dialect: "mysql",
  logging: false, // deixa o console mais limpo (se quiser ver as queries, coloque true)
});
sequelize.authenticate()
.then(function () {
    console.log("✅ Conexão com o banco de dados estabelecida com sucesso!");
}).catch(function () {
    console.log("❌ Erro ao conectar com o banco");
})

module.exports = sequelize;