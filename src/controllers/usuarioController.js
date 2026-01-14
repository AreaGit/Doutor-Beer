const Usuario = require("../models/Usuario");
const Cart = require("../models/carrinho");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const gerarCodigo2FA = require("../utils/gerarCodigo2FA");
const enviarEmail = require("../utils/email");
const Pedido = require("../models/Pedido");
const PedidoItem = require("../models/PedidoItem");
const Produto = require("../models/Produto");
const { criarClienteAsaas } = require("../services/asaas.services");

// ==================== CRIAR USUÁRIO ====================
exports.criarUsuario = async (req, res) => {
  try {
    const {
      nome, cpf, celular, telefone, sexo, data_de_nascimento,
      cep, endereco, numero, complemento, referencia,
      bairro, cidade, estado, email, senha
    } = req.body;

    const existingEmail = await Usuario.findOne({ where: { email } });
    if (existingEmail) return res.status(409).json({ message: "Email já cadastrado" });

    const existingCpf = await Usuario.findOne({ where: { cpf } });
    if (existingCpf) return res.status(409).json({ message: "Cpf já cadastrado" });

    const senhaHash = await bcrypt.hash(senha, 10);

    // CRIAÇÃO DO CLIENTE ASAAS
    const dadosCliente = {
      name: nome,
      cpfCnpj: cpf,
      email: email,
      phone: celular,
      mobilePhone: celular,
      address: endereco,
      addressNumber: numero,
      complement: complemento,
      province: bairro,
      postalCode: cep,
    };

    const clienteAsaas = await criarClienteAsaas(dadosCliente);

    const novoUsuario = await Usuario.create({
      customer_asaas_id: clienteAsaas.id,
      nome,
      cpf,
      celular,
      telefone,
      sexo,
      data_de_nascimento,
      cep,
      endereco,
      numero,
      complemento,
      referencia,
      bairro,
      cidade,
      estado,
      email,
      senha: senhaHash
    });

    res.status(201).json({ message: "Usuário criado com sucesso!", usuario: novoUsuario });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ message: "Erro ao criar usuário", error });
  }
};

// ==================== LOGIN PASSO 1 ====================
exports.login = async (req, res) => {
  const { email, senha, guestCart = [] } = req.body

  try {
    const usuario = await Usuario.findOne({ where: { email } })
    if (!usuario) return res.status(400).json({ message: "Usuário não encontrado" })

    const senhaValida = await bcrypt.compare(senha, usuario.senha)
    if (!senhaValida) return res.status(400).json({ message: "Senha incorreta" })

    if (usuario.autenticado2FA) {
      // Usuário já autenticado anteriormente, fazer login direto
      req.session.user = {
        id: usuario.id,
        nome: usuario.nome,
        email,
        isAdmin: usuario.isAdmin,
      }

      // Processar mesclagem do carrinho se houver
      let mergedItems = 0
      if (guestCart.length > 0) {
        console.log(`[Login Direto] Iniciando mesclagem de ${guestCart.length} itens do carrinho guest`)

        for (const item of guestCart) {
          try {
            const produtoExistente = await require("../models/Produto").findByPk(item.id)
            if (!produtoExistente) {
              continue
            }

            const existente = await Cart.findOne({
              where: { usuarioId: usuario.id, produtoId: item.id },
            })

            if (existente) {
              existente.quantidade += item.quantidade || 1
              await existente.save()
              console.log(`[Login Direto] Item ${item.id} atualizado: quantidade ${existente.quantidade}`)
            } else {
              await Cart.create({
                usuarioId: usuario.id,
                produtoId: item.id,
                quantidade: item.quantidade || 1,
              })
            }
            mergedItems++
          } catch (itemError) {
            console.error(`[Login Direto] Erro ao processar item ${item.id}:`, itemError)
          }
        }
        
      }

      return res.json({
        message: "Login realizado com sucesso!",
        mergedItems,
        loginDireto: true,
        redirectTo: usuario.isAdmin ? "/painel-adm" : "/",
      })
    }

    // Gerar código 2FA e enviar para o e-mail (já salva no usuário)
    await gerarCodigo2FA(usuario)

    // Salvar guestCart temporário na sessão para mesclar após 2FA
    req.session.tempLogin = { email, guestCart }

    res.json({
      message: "Código enviado para seu e-mail",
      loginDireto: false,
    })
  } catch (error) {
    console.error("Erro no login:", error)
    res.status(500).json({ message: "Erro no login", error })
  }
}

// ==================== LOGIN PASSO 2: VERIFICAR CÓDIGO 2FA ====================
exports.verificar2FA = async (req, res) => {
  const { email, codigo } = req.body

  try {
    const usuario = await Usuario.findOne({ where: { email } })
    if (!usuario) return res.status(400).json({ message: "Usuário não encontrado" })

    const agora = new Date()
    const expira = usuario.expira2FA ? new Date(usuario.expira2FA) : null

    if (!usuario.codigo2FA || !expira || agora > expira) {
      return res.status(400).json({ message: "Código expirado. Faça login novamente." })
    }

    if (String(usuario.codigo2FA) !== String(codigo)) {
      return res.status(400).json({ message: "Código inválido." })
    }

    if (!req.session.tempLogin || req.session.tempLogin.email !== email) {
      return res.status(400).json({ message: "Fluxo de login inválido." })
    }

    console.log("[v0] Antes de atualizar - autenticado2FA:", usuario.autenticado2FA)

    usuario.autenticado2FA = true
    // Limpar campos 2FA
    usuario.codigo2FA = null
    usuario.expira2FA = null

    await usuario.save()

    console.log("[v0] Depois de salvar - autenticado2FA:", usuario.autenticado2FA)

    // Verificar se realmente salvou no banco
    const usuarioVerificacao = await Usuario.findOne({ where: { email } })
    console.log("[v0] Verificação no banco - autenticado2FA:", usuarioVerificacao.autenticado2FA)

    // Criar sessão do usuário
    req.session.user = { id: usuario.id, nome: usuario.nome, email, isAdmin: usuario.isAdmin }

    // ==================== MESCLAGEM MELHORADA ====================
    const guestCart = req.session.tempLogin.guestCart || []
    let mergedItems = 0

    if (guestCart.length > 0) {
      console.log(`[Login] Iniciando mesclagem de ${guestCart.length} itens do carrinho guest`)

      for (const item of guestCart) {
        try {
          // Verificar se o produto existe
          const produtoExistente = await require("../models/Produto").findByPk(item.id)
          if (!produtoExistente) {
            console.log(`[Login] Produto ${item.id} não encontrado, ignorando`)
            continue
          }

          const existente = await Cart.findOne({
            where: { usuarioId: usuario.id, produtoId: item.id },
          })

          if (existente) {
            // Somar quantidades se já existir
            existente.quantidade += item.quantidade || 1
            await existente.save()
            console.log(`[Login] Item ${item.id} atualizado: quantidade ${existente.quantidade}`)
          } else {
            // Criar novo item para o usuário
            await Cart.create({
              usuarioId: usuario.id,
              produtoId: item.id,
              quantidade: item.quantidade || 1,
            })
            console.log(`[Login] Item ${item.id} adicionado ao carrinho do usuário`)
          }
          mergedItems++
        } catch (itemError) {
          console.error(`[Login] Erro ao processar item ${item.id}:`, itemError)
        }
      }
      console.log(`[Login] Mesclagem concluída: ${mergedItems} itens processados`)
    }

    // Limpar tempLogin
    delete req.session.tempLogin

    res.json({
      message: "Login realizado com sucesso!",
      mergedItems,
      redirectTo: usuario.isAdmin ? "/painel-adm" : "/",
    })
  } catch (error) {
    console.error("Erro ao verificar 2FA:", error)
    res.status(500).json({ message: "Erro ao verificar código", error })
  }
}

// ==================== REENVIO DE CÓDIGO 2FA ====================
exports.reenviarCodigo2FA = async (req, res) => {
  const { email } = req.body

  try {
    const usuario = await Usuario.findOne({ where: { email } })
    if (!usuario) return res.status(400).json({ message: "Usuário não encontrado." })

    await gerarCodigo2FA(usuario)

    res.json({ message: "Código reenviado para seu e-mail." })
  } catch (err) {
    console.error("Erro ao reenviar código 2FA:", err)
    res.status(500).json({ message: "Erro ao reenviar código." })
  }
}

// ==================== REDEFINIR SENHA ====================
exports.resetarSenha = async (req, res) => {
  console.log("[v0] ========== ENDPOINT resetarSenha CHAMADO ==========")
  console.log("[v0] Dados recebidos:", { email: req.body.email, token: req.body.token })

  const { email, token, novaSenha } = req.body

  if (!email || !token || !novaSenha) {
    return res.status(400).json({
      message: "Dados incompletos. Envie e-mail, token e nova senha.",
    })
  }

  try {
    const usuario = await Usuario.findOne({ where: { email } })
    if (!usuario) {
      console.log("[v0] Usuário não encontrado com email:", email)
      return res.status(400).json({ message: "Link inválido ou expirado." })
    }

    console.log("[v0] Usuário encontrado:", email)
    console.log("[v0] Token do banco:", usuario.resetToken)
    console.log("[v0] Token recebido:", token)
    console.log("[v0] Token expira:", usuario.resetTokenExpira)

    // Verifica token e validade
    if (
      !usuario.resetToken ||
      !usuario.resetTokenExpira ||
      usuario.resetToken !== token ||
      new Date() > new Date(usuario.resetTokenExpira)
    ) {
      console.log("[v0] Validação de token falhou")
      return res.status(400).json({ message: "Link inválido ou expirado." })
    }

    console.log("[v0] Token validado com sucesso!")

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10)

    console.log("[v0] Resetando senha - definindo autenticado2FA para false")
    console.log("[v0] Antes de resetar - autenticado2FA:", usuario.autenticado2FA)

    const resultado = await Usuario.update(
      {
        senha: senhaHash,
        resetToken: null,
        resetTokenExpira: null,
        autenticado2FA: false,
      },
      {
        where: { email },
      },
    )

    console.log("[v0] Resultado do update:", resultado)
    console.log("[v0] Update executado diretamente no banco")

    // Verificação no banco após resetar
    const usuarioVerificacao = await Usuario.findOne({ where: { email } })
    console.log("[v0] Verificação no banco após resetar - autenticado2FA:", usuarioVerificacao.autenticado2FA)
    console.log("[v0] ========== FIM DO ENDPOINT resetarSenha ==========")

    return res.json({
      message: "Senha redefinida com sucesso! Você já pode fazer login.",
    })
  } catch (error) {
    console.error("[v0] ERRO no resetarSenha:", error)
    return res.status(500).json({
      message: "Erro ao redefinir senha. Tente novamente.",
    })
  }
}

// ==================== SABER QUEM ESTÁ LOGADO ====================
exports.me = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Não foi possível capturar a sessão" });

  const usuario = await Usuario.findByPk(req.session.user.id);

  res.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cpf: usuario.cpf,
    telefone: usuario.telefone,
    celular: usuario.celular,
    sexo: usuario.sexo,
    data_de_nascimento: usuario.data_de_nascimento,
    endereco: usuario.endereco,
    numero: usuario.numero,
    complemento: usuario.complemento,
    bairro: usuario.bairro,
    cidade: usuario.cidade,
    estado: usuario.estado,
    cep: usuario.cep
  });
};

// ==================== ATUALIZAR DADOS DO USUÁRIO ====================
exports.atualizarUsuario = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Não autenticado" });

  try {
    const usuario = await Usuario.findByPk(req.session.user.id);
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });

    // Campos que podem ser atualizados (não alterar cpf e email)
    const camposAtualizaveis = [
      "nome", "celular", "telefone", "sexo", "data_de_nascimento",
      "cep", "endereco", "numero", "complemento", "referencia",
      "bairro", "cidade", "estado"
    ];

    camposAtualizaveis.forEach(campo => {
      if (req.body[campo] !== undefined) {
        usuario[campo] = req.body[campo];
      }
    });

    await usuario.save();

    res.json({ message: "Dados atualizados com sucesso!", usuario });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({ message: "Erro ao atualizar usuário", error });
  }
};

// ==================== LISTAR PEDIDOS DO USUÁRIO ====================
exports.mePedidos = async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Não autenticado" });

  try {
    const pedidos = await Pedido.findAll({
      where: { usuarioId: req.session.user.id },
      include: [
        {
          model: PedidoItem,
          as: "Itens",
          include: [
            {
              model: Produto,
              as: "Produto",
              attributes: ["id", "nome", "imagem"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const pedidosFormatados = pedidos.map((pedido) => ({
      id: pedido.id,
      status: pedido.status,
      total: pedido.total,
      frete: pedido.frete,
      formaPagamento: pedido.formaPagamento,
      enderecoEntrega: pedido.enderecoEntrega,
      data: pedido.createdAt,
      Itens: pedido.Itens.map((item) => ({
        produtoId: item.produtoId,
        nome: item.Produto?.nome || "Produto não encontrado",
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        imagem: item.Produto?.imagem || "/images/no-image.png",
        cor: item.cor || "padrao",
        torneira: item.torneira || "padrao",
        refil: item.refil || 0
      }))
    }));

    res.json(pedidosFormatados);
  } catch (error) {
    console.error("Erro ao buscar pedidos do usuário:", error);
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
};

// ==================== LISTAR TODOS USUÁRIOS (ADMIN) ====================
exports.listarUsuariosAdmin = async (req, res) => {
  try {
    // precisa estar logado
    if (!req.session.user) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // precisa ser admin
    if (!req.session.user.isAdmin) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const usuarios = await Usuario.findAll({
      order: [["createdAt", "DESC"]],
    });

    // Não enviar senha, 2FA etc
    const usuariosSanitizados = usuarios.map(u => ({
      id: u.id,
      isAdmin: u.isAdmin,
      customer_asaas_id: u.customer_asaas_id,
      nome: u.nome,
      cpf: u.cpf,
      celular: u.celular,
      telefone: u.telefone,
      sexo: u.sexo,
      data_de_nascimento: u.data_de_nascimento,
      cep: u.cep,
      endereco: u.endereco,
      numero: u.numero,
      complemento: u.complemento,
      referencia: u.referencia,
      bairro: u.bairro,
      cidade: u.cidade,
      estado: u.estado,
      email: u.email,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));

    res.json(usuariosSanitizados);
  } catch (error) {
    console.error("Erro ao listar usuários (admin):", error);
    res.status(500).json({ message: "Erro ao listar usuários" });
  }
};

// ==================== ATUALIZAR USUÁRIO (ADMIN) ====================
exports.atualizarUsuarioAdmin = async (req, res) => {
  try {
    // Garantir que o admin está autenticado
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const { id } = req.params;
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });

    // Campos que o admin pode atualizar
    const camposPermitidos = [
      "nome", "email", "celular", "telefone", "sexo", "data_de_nascimento",
      "cep", "endereco", "numero", "complemento", "referencia",
      "bairro", "cidade", "estado", "isAdmin"
    ];

    camposPermitidos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        usuario[campo] = req.body[campo];
      }
    });

    await usuario.save();

    res.json({ message: "Cliente atualizado com sucesso!", usuario });
  } catch (error) {
    console.error("Erro ao atualizar cliente (admin):", error);
    res.status(500).json({ message: "Erro ao atualizar cliente", error });
  }
};

// ==================== DELETAR USUÁRIO (ADMIN) ====================
exports.deletarUsuarioAdmin = async (req, res) => {
  try {
    // Garantir que o admin está autenticado
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // 1) Apagar itens de carrinho desse usuário (se houver)
    await Cart.destroy({
      where: { usuarioId: id }
    });

    // 2) Buscar pedidos desse usuário
    const pedidos = await Pedido.findAll({
      where: { usuarioId: id }
    });

    if (pedidos.length > 0) {
      const pedidoIds = pedidos.map(p => p.id);

      // 2.1) Apagar itens dos pedidos
      await PedidoItem.destroy({
        where: { pedidoId: pedidoIds }
      });

      // 2.2) Apagar os pedidos
      await Pedido.destroy({
        where: { id: pedidoIds }
      });
    }

    // 3) Agora sim, apagar o usuário
    await usuario.destroy();

    return res.json({ message: "Cliente excluído com sucesso!" });
  } catch (error) {
    console.error("Erro ao excluir cliente (admin):", error);
    return res.status(500).json({ message: "Erro ao excluir cliente", error });
  }
};

// ==================== SOLICITAR RECUPERAÇÃO DE SENHA ====================
exports.solicitarRecuperacaoSenha = async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ message: "Informe um e-mail válido." })
  }

  try {
    const usuario = await Usuario.findOne({ where: { email } })

    if (!usuario) {
      return res.json({
        message: "Se o e-mail estiver cadastrado, enviaremos instruções para recuperação.",
      })
    }

    const token = require("crypto").randomBytes(32).toString("hex")
    const expira = new Date(Date.now() + 60 * 60 * 1000)

    console.log("[v0] Recuperação solicitada - definindo autenticado2FA para false")
    console.log("[v0] Antes:", usuario.autenticado2FA)

    usuario.resetToken = token
    usuario.resetTokenExpira = expira
    usuario.autenticado2FA = false

    await usuario.save()

    console.log("[v0] Depois de salvar:", usuario.autenticado2FA)

    const baseUrl = process.env.APP_URL || "http://localhost:3000"
    const linkReset = `${baseUrl}/redefinir-senha?token=${token}&email=${encodeURIComponent(email)}`

    const assunto = "Recuperação de senha - Doutor Beer"

    const corpoTexto = `
Olá, ${usuario.nome}!

Recebemos uma solicitação para redefinir a senha da sua conta na Doutor Beer.

Para criar uma nova senha, acesse o link abaixo:
${linkReset}

Se você não fez essa solicitação, pode ignorar este e-mail.
Este link é válido por 1 hora.
    `.trim()

    const corpoHtml = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <title>${assunto}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:30px 15px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,0.08);">
          
          <tr>
            <td align="center" style="background:#F9B000;padding:18px 20px;">
              <h1 style="margin:0;font-size:20px;color:#4d1818;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
                Doutor Beer
              </h1>
              <p style="margin:4px 0 0;font-size:12px;color:#4d1818;opacity:.9;">
                Recuperação de senha
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 24px 10px 24px;">
              <p style="margin:0 0 10px 0;font-size:15px;color:#333333;">
                Olá, <strong>${usuario.nome}</strong>!
              </p>
              <p style="margin:0 0 14px 0;font-size:14px;color:#555555;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta na 
                <strong>Doutor Beer</strong>.
              </p>
              <p style="margin:0 0 18px 0;font-size:14px;color:#555555;line-height:1.6;">
                Para continuar, clique no botão abaixo e escolha uma nova senha com segurança:
              </p>

              <p style="margin:0 0 18px 0;text-align:center;">
                <a href="${linkReset}"
                   style="
                     display:inline-block;
                     padding:12px 26px;
                     background:#F9B000;
                     color:#4d1818;
                     text-decoration:none;
                     border-radius:999px;
                     font-weight:bold;
                     font-size:14px;
                     box-shadow:0 6px 14px rgba(249,176,0,0.45);
                   ">
                  Redefinir minha senha
                </a>
              </p>

              <p style="margin:0 0 10px 0;font-size:12px;color:#777777;line-height:1.6;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin:0 0 16px 0;font-size:11px;color:#999999;word-break:break-all;">
                ${linkReset}
              </p>

              <p style="margin:0 0 4px 0;font-size:12px;color:#777777;">
                ⏱ Este link é válido por <strong>1 hora</strong>.
              </p>
              <p style="margin:0;font-size:12px;color:#777777;">
                Se você não fez essa solicitação, nenhuma ação é necessária.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 24px 20px 24px;border-top:1px solid #eeeeee;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#999999;">
                Este é um e-mail automático, por favor não responda.
              </p>
              <p style="margin:0;font-size:11px;color:#b3b3b3;">
                © ${new Date().getFullYear()} Doutor Beer. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    await enviarEmail(email, assunto, corpoTexto, corpoHtml)

    return res.json({
      message: "Se o e-mail estiver cadastrado, enviaremos instruções para recuperação.",
    })
  } catch (error) {
    console.error("Erro ao solicitar recuperação de senha:", error)
    return res.status(500).json({
      message: "Erro ao solicitar recuperação de senha. Tente novamente.",
    })
  }
}

// ==================== RESETAR SENHA COM TOKEN ====================
exports.resetarSenha = async (req, res) => {
  const { email, token, novaSenha } = req.body;

  if (!email || !token || !novaSenha) {
    return res.status(400).json({
      message: "Dados incompletos. Envie e-mail, token e nova senha."
    });
  }

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return res.status(400).json({ message: "Link inválido ou expirado." });
    }

    // Verifica token e validade
    if (
      !usuario.resetToken ||
      !usuario.resetTokenExpira ||
      usuario.resetToken !== token ||
      new Date() > new Date(usuario.resetTokenExpira)
    ) {
      return res.status(400).json({ message: "Link inválido ou expirado." });
    }

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    usuario.senha = senhaHash;
    usuario.resetToken = null;
    usuario.resetTokenExpira = null;

    await usuario.save();

    return res.json({
      message: "Senha redefinida com sucesso! Você já pode fazer login."
    });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return res.status(500).json({
      message: "Erro ao redefinir senha. Tente novamente."
    });
  }
};


// ==================== LOGOUT ====================
exports.logout = async (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logout realizado com sucesso!" });
  });
};