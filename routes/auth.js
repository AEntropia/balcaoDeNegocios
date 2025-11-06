//routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const autenticar = require('../middleware/auth');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
router.post('/registro', async (req, res) => {
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
 * @route   PUT /api/auth/alterar-senha
 * @desc    Alterar senha do usuário logado
 * @access  Private
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
 * @route   POST /api/auth/verificar-token
 * @desc    Verificar se token é válido
 * @access  Public
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
 * @route   GET /api/auth/usuarios
 * @desc    Listar todos os usuários
 * @access  Private
 */
router.get('/usuarios', autenticar, async (req, res) => {
  try {
    const query = `
      SELECT id, nome, email, ativo
      FROM usuarios
      ORDER BY nome ASC
    `;

    const resultado = await pool.query(query);

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


module.exports = router;