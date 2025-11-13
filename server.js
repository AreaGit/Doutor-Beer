require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const sequelize = require("./src/config/database");

// ================= Rotas =================
const pagesRoutes   = require("./src/routes/pages.routes");
const usuarioRoutes = require("./src/routes/usuarioRoutes");
const produtoRoutes = require("./src/routes/produtoRoutes");
const adminRoutes   = require("./src/routes/adminRoutes"); 
const carrinhoRoutes = require("./src/routes/carrinhoRoutes");
const freteRoutes = require("./src/routes/freteRoutes");
const checkoutRoutes = require("./src/routes/checkoutRoutes");
const pedidoRoutes = require("./src/routes/pedidoRoutes");
const contactRoutes = require("./src/routes/contactRoutes");
const asaasRoutes = require("./src/routes/asaas.routes");
require("./src/jobs/verificarBoletos.job");
// ================= Middleware =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessão (antes das rotas)
app.use(session({
  secret: "chave-super-secreta",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,            // true se usar HTTPS
    maxAge: 1000 * 60 * 60,   // 1h
    sameSite: "lax"
  }
}));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// ================= Banco =================
sequelize.sync({ alter: true })
  .then(() => console.log("✅ Tabelas sincronizadas com o banco de dados"))
  .catch((err) => console.error("❌ Erro ao sincronizar as tabelas:", err));

// ================= Rotas =================
app.use("/", pagesRoutes);
app.use("/api/auth", usuarioRoutes);
app.use("/api/produtos", produtoRoutes);
app.use("/api/admin", adminRoutes); 
app.use("/api/carrinho", carrinhoRoutes);
app.use("/api/frete", freteRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/api/pedido", pedidoRoutes);
app.use("/fale-conosco", contactRoutes);
app.use("/asaas", asaasRoutes);

// ================= Middleware para Guest Cart =================
// Opcional: se quiser adicionar um middleware global para guest cart
// app.use(async (req, res, next) => {
//   const carrinhoController = require("./src/controllers/carrinhoControllers");
//   if (req.session.user) {
//     await carrinhoController.mergeGuestCart(req, res);
//   }
//   next();
// });

// ================= Servidor =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});