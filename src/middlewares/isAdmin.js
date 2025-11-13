module.exports = function isAdmin(req, res, next) {
  const user = req.session?.user;

  // não está logado
  if (!user) {
    return res.redirect("/login");
  }

  // logado mas não é admin
  if (!user.isAdmin) {
    return res.status(403).send("Acesso restrito a administradores.");
  }

  next();
};