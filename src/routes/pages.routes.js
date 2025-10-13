const path = require("path");
const express = require("express");
const app = express();

app.use(express.static('public'));

// Função auxiliar
const renderPage = (res, page) => {
    res.sendFile(path.join(__dirname, `../../public/html/${page}.html`));
};

// Rotas
app.get("/", (req, res) => renderPage(res, "inicial"));

app.get("/categoria", (req, res) => renderPage(res, "categoria"));

app.get("/detalhes-produto", (req, res) => renderPage(res, "detalhes-produto"));

app.get("/blog", (req, res) => renderPage(res, "blog"));

app.get("/endereco", (req, res) => renderPage(res, "endereco"));

app.get("/fale-conosco", (req, res) => renderPage(res, "fale-conosco"));

app.get("/login", (req, res) => renderPage(res, "login"));

app.get("/pagamento", (req, res) => renderPage(res, "pagamento"));

app.get("/perfil", (req, res) => renderPage(res, "perfil"));

app.get("/politica-privacidade", (req, res) => renderPage(res, "politica-privacidade"));

app.get("/recuperar-senha", (req, res) => renderPage(res, "recuperar"));

app.get("/redefinir-senha", (req, res) => renderPage(res, "redefinir"));

app.get("/registrar", (req, res) => renderPage(res, "register"));

app.get("/sobre", (req, res) => renderPage(res, "sobre"));

app.get("/autenticacao", (req, res) => renderPage(res, "autenticacao"));

app.get("/painel-adm", (req, res) => renderPage(res, "painel"));

app.get("/pedido/:id", (req, res) => renderPage(res, "pedido"));

module.exports = app;

