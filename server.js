require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const sequelize = require("./src/config/database");

const pagesRoutes   = require("./src/routes/pages.routes");
const usuarioRoutes = require("./src/routes/usuarioRoutes");
const produtoRoutes = require("./src/routes/produtoRoutes");
const adminRoutes   = require("./src/routes/adminRoutes"); 
const carrinhoRoutes = require("./src/routes/carrinhoRoutes");
const freteRoutes = require("./src/routes/freteRoutes");

// ================= Middleware =================
app.use(express.json());

// Sessão (antes das rotas)
app.use(session({
  secret: "chave-super-secreta",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,            // true se usar HTTPS
    maxAge: 1000 * 60 * 60,   // 1h
    sameSite: "lax"           // ou "none" se front/back em domínios diferentes
  }
}));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// ================= Rotas =================
app.use("/", pagesRoutes);
app.use("/api/auth", usuarioRoutes);
app.use("/api/produtos", produtoRoutes);
app.use("/api/admin", adminRoutes); 
app.use("/api/carrinho", carrinhoRoutes);
app.use("/api/frete", freteRoutes);

// ================= Banco =================
sequelize.sync({ alter: true })
  .then(() => console.log("✅ Tabelas sincronizadas com o banco de dados"))
  .catch((err) => console.error("❌ Erro ao sincronizar as tabelas:", err));

// ================= Servidor =================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
