const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const autenticar = require('../middleware/auth');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

/**
 * @swagger
 * /api/auth/registro:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *               - confirmarSenha
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: senha123
 *               confirmarSenha:
 *                 type: string
 *                 format: password
 *                 example: senha123
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email já cadastrado
 */
router.post('/registro', autenticar, async (req, res) => {
  try {
    const { nome, email, senha, confirmarSenha } = req.body;

    // Validações
    if (!nome || !email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome, email e senha são obrigatórios'
      });
    }

    if (senha !== confirmarSenha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'As senhas não conferem'
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'A senha deve ter no mínimo 6 caracteres'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email inválido'
      });
    }

    // Verificar se email já existe
    const usuarioExistente = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (usuarioExistente.rows.length > 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: 'Email já cadastrado'
      });
    }

    // Criptografar senha com bcrypt
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    // Inserir usuário no banco
    const query = `
      INSERT INTO usuarios (nome, email, senha, ativo)
      VALUES ($1, $2, $3, TRUE)
      RETURNING id
    `;

    const resultado = await pool.query(query, [nome, email, senhaHash]);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Usuário registrado com sucesso',
      id: resultado.rows[0].id
    });

  } catch (erro) {
    console.error('Erro ao registrar usuário:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao registrar usuário'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Fazer login
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 mensagem:
 *                   type: string
 *                 token:
 *                   type: string
 *                 usuario:
 *                   type: object
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validações
    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário
    const query = `
      SELECT id, nome, email, senha, ativo
      FROM usuarios
      WHERE email = $1
    `;

    const resultado = await pool.query(query, [email]);

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Email ou senha incorretos'
      });
    }

    const usuario = resultado.rows[0];

    // Verificar se usuário está ativo
    if (!usuario.ativo) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Usuário inativo. Entre em contato com o administrador'
      });
    }

    // Verificar senha com bcrypt
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Email ou senha incorretos'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    });

  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao fazer login'
    });
  }
});

/**
 * @swagger
 * /api/auth/perfil:
 *   get:
 *     summary: Obter perfil do usuário logado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 dados:
 *                   $ref: '#/components/schemas/Usuario'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/perfil', autenticar, async (req, res) => {
  try {
    const query = `
      SELECT id, nome, email, ativo
      FROM usuarios
      WHERE id = $1
    `;

    const resultado = await pool.query(query, [req.usuario.id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    res.json({
      sucesso: true,
      dados: resultado.rows[0]
    });

  } catch (erro) {
    console.error('Erro ao buscar perfil:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar perfil'
    });
  }
});

/**
 * @swagger
 * /api/auth/perfil:
 *   put:
 *     summary: Atualizar perfil do usuário logado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva Santos
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao.novo@exemplo.com
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email já cadastrado por outro usuário
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/perfil', autenticar, async (req, res) => {
  try {
    const { nome, email } = req.body;

    // Validações
    if (!nome && !email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Informe pelo menos um campo para atualizar'
      });
    }

    // Validar formato de email se fornecido
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Email inválido'
        });
      }

      // Verificar se email já existe para outro usuário
      const emailExistente = await pool.query(
        'SELECT id FROM usuarios WHERE email = $1 AND id != $2',
        [email, req.usuario.id]
      );

      if (emailExistente.rows.length > 0) {
        return res.status(409).json({
          sucesso: false,
          mensagem: 'Email já cadastrado por outro usuário'
        });
      }
    }

    // Montar query dinâmica
    const camposAtualizacao = [];
    const valores = [];
    let contador = 1;

    if (nome) {
      camposAtualizacao.push(`nome = $${contador}`);
      valores.push(nome);
      contador++;
    }

    if (email) {
      camposAtualizacao.push(`email = $${contador}`);
      valores.push(email);
      contador++;
    }

    valores.push(req.usuario.id);

    const query = `
      UPDATE usuarios 
      SET ${camposAtualizacao.join(', ')}
      WHERE id = $${contador}
      RETURNING id, nome, email, ativo
    `;

    const resultado = await pool.query(query, valores);

    res.json({
      sucesso: true,
      mensagem: 'Perfil atualizado com sucesso',
      dados: resultado.rows[0]
    });

  } catch (erro) {
    console.error('Erro ao atualizar perfil:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao atualizar perfil'
    });
  }
});

/**
 * @swagger
 * /api/auth/alterar-senha:
 *   put:
 *     summary: Alterar senha do usuário logado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senhaAtual
 *               - novaSenha
 *               - confirmarNovaSenha
 *             properties:
 *               senhaAtual:
 *                 type: string
 *                 format: password
 *                 example: senha123
 *               novaSenha:
 *                 type: string
 *                 format: password
 *                 example: novaSenha456
 *               confirmarNovaSenha:
 *                 type: string
 *                 format: password
 *                 example: novaSenha456
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Senha atual incorreta
 */
router.put('/alterar-senha', autenticar, async (req, res) => {
  try {
    const { senhaAtual, novaSenha, confirmarNovaSenha } = req.body;

    // Validações
    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Todos os campos são obrigatórios'
      });
    }

    if (novaSenha !== confirmarNovaSenha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'As novas senhas não conferem'
      });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'A nova senha deve ter no mínimo 6 caracteres'
      });
    }

    // Buscar usuário
    const resultado = await pool.query(
      'SELECT senha FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    // Verificar senha atual
    const senhaValida = await bcrypt.compare(senhaAtual, resultado.rows[0].senha);

    if (!senhaValida) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Senha atual incorreta'
      });
    }

    // Criptografar nova senha
    const saltRounds = 10;
    const novaSenhaHash = await bcrypt.hash(novaSenha, saltRounds);

    // Atualizar senha
    await pool.query(
      'UPDATE usuarios SET senha = $1 WHERE id = $2',
      [novaSenhaHash, req.usuario.id]
    );

    res.json({
      sucesso: true,
      mensagem: 'Senha alterada com sucesso'
    });

  } catch (erro) {
    console.error('Erro ao alterar senha:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao alterar senha'
    });
  }
});

/**
 * @swagger
 * /api/auth/verificar-token:
 *   post:
 *     summary: Verificar se token é válido
 *     tags: [Autenticação]
 *     requestBody:
 *       required: false
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 *       401:
 *         description: Token inválido ou expirado
 */
router.post('/verificar-token', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token não fornecido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      sucesso: true,
      mensagem: 'Token válido',
      usuario: {
        id: decoded.id,
        nome: decoded.nome,
        email: decoded.email
      }
    });

  } catch (erro) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token inválido ou expirado'
    });
  }
});

/**
 * @swagger
 * /api/auth/usuarios:
 *   get:
 *     summary: Listar todos os usuários
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busca
 *         schema:
 *           type: string
 *         description: Buscar por nome ou email
 *       - in: query
 *         name: ativo
 *         schema:
 *           type: boolean
 *         description: Filtrar por status ativo
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 dados:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Usuario'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/usuarios', autenticar, async (req, res) => {
  try {
    const { busca, ativo } = req.query;

    let query = `
      SELECT id, nome, email, ativo
      FROM usuarios
      WHERE 1=1
    `;
    const valores = [];
    let contador = 1;

    // Filtro de busca
    if (busca) {
      query += ` AND (nome ILIKE $${contador} OR email ILIKE $${contador})`;
      valores.push(`%${busca}%`);
      contador++;
    }

    // Filtro de status ativo
    if (ativo !== undefined) {
      query += ` AND ativo = $${contador}`;
      valores.push(ativo === 'true');
      contador++;
    }

    query += ' ORDER BY nome ASC';

    const resultado = await pool.query(query, valores);

    res.json({
      sucesso: true,
      total: resultado.rows.length,
      dados: resultado.rows
    });

  } catch (erro) {
    console.error('Erro ao listar usuários:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao listar usuários'
    });
  }
});

/**
 * @swagger
 * /api/auth/usuarios/{id}:
 *   get:
 *     summary: Obter usuário por ID
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Usuário retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 dados:
 *                   $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/usuarios/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT id, nome, email, ativo
      FROM usuarios
      WHERE id = $1
    `;

    const resultado = await pool.query(query, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    res.json({
      sucesso: true,
      dados: resultado.rows[0]
    });

  } catch (erro) {
    console.error('Erro ao buscar usuário:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar usuário'
    });
  }
});

const crypto = require('crypto');

/**
 * @swagger
 * /api/auth/esqueci-senha:
 *   post:
 *     summary: Solicitar redefinição de senha
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *     responses:
 *       200:
 *         description: Email enviado com sucesso
 *       404:
 *         description: Email não encontrado
 */
router.post('/esqueci-senha', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email é obrigatório'
      });
    }

    // Buscar usuário
    const resultado = await pool.query(
      'SELECT id, nome, email, ativo FROM usuarios WHERE email = $1',
      [email]
    );

    // Resposta genérica para não expor se o email existe ou não
    if (resultado.rows.length === 0) {
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Se este email estiver cadastrado, você receberá uma senha temporária em breve'
      });
    }

    const usuario = resultado.rows[0];

    if (!usuario.ativo) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Usuário inativo. Entre em contato com o administrador'
      });
    }

    // Gerar senha aleatória (12 caracteres: letras + números)
    const senhaTemporaria = crypto.randomBytes(9).toString('base64').slice(0, 12);

    // Criptografar e salvar no banco
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senhaTemporaria, saltRounds);

    await pool.query(
      'UPDATE usuarios SET senha = $1 WHERE id = $2',
      [senhaHash, usuario.id]
    );

    // Enviar email com nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER, // seu email
        pass: process.env.SMTP_PASS  // senha de app do gmail
      }
    });

    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: usuario.email,
      subject: 'Sua senha temporária',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Olá, ${usuario.nome}!</h2>
          <p>Recebemos uma solicitação de redefinição de senha para sua conta.</p>
          <p>Sua senha temporária é:</p>
          <div style="
            background-color: #f4f4f4;
            border-left: 4px solid #4A90E2;
            padding: 12px 20px;
            margin: 20px 0;
            font-size: 22px;
            font-weight: bold;
            letter-spacing: 2px;
            font-family: monospace;
          ">
            ${senhaTemporaria}
          </div>
          <p style="color: #e53e3e; font-weight: bold;">
            ⚠️ Por segurança, altere sua senha assim que fizer login.
          </p>
          <p>Acesse o sistema com esta senha temporária e vá em 
            <strong>Perfil → Alterar Senha</strong> para definir uma senha pessoal.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Se você não solicitou a redefinição de senha, ignore este email. 
            Sua senha anterior permaneceu ativa até este momento.
          </p>
        </div>
      `
    });

    res.json({
      sucesso: true,
      mensagem: 'Se este email estiver cadastrado, você receberá uma senha temporária em breve'
    });

  } catch (erro) {
    console.error('Erro ao processar esqueci a senha:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao processar solicitação'
    });
  }
});

/**
 * @swagger
 * /api/auth/usuarios/{id}:
 *   delete:
 *     summary: Deletar usuário
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Usuário deletado com sucesso
 *       400:
 *         description: Não é possível deletar o próprio usuário
 *       404:
 *         description: Usuário não encontrado
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.delete('/usuarios/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se está tentando deletar o administrador do sistema
    if (parseInt(id) === 1) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'O administrador do sistema não pode ser deletado'
      });
    }

    // Verificar se usuário está tentando deletar a si mesmo
    if (parseInt(id) === req.usuario.id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Você não pode deletar seu próprio usuário'
      });
    }

    // Verificar se usuário existe
    const usuarioExiste = await pool.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [id]
    );

    if (usuarioExiste.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    // Deletar usuário
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);

    res.json({
      sucesso: true,
      mensagem: 'Usuário deletado com sucesso'
    });

  } catch (erro) {
    console.error('Erro ao deletar usuário:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao deletar usuário'
    });
  }
});

module.exports = router;