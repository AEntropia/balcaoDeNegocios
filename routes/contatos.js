const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const autenticar = require('../middleware/auth');

// Validação de email
const validarEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validação de telefone (formato brasileiro)
const validarTelefone = (telefone) => {
  const regex = /^(\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}$/;
  return regex.test(telefone);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Contato:
 *       type: object
 *       required:
 *         - nome
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: ID do contato
 *         nome:
 *           type: string
 *           description: Nome do contato
 *         email:
 *           type: string
 *           format: email
 *           description: Email do contato
 *         telefone:
 *           type: string
 *           description: Telefone do contato
 *         cidade:
 *           type: string
 *           description: Cidade do contato
 *         tipo:
 *           type: string
 *           enum: [cliente, fornecedor, parceiro]
 *           description: Tipo do contato
 *         criado_em:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *       example:
 *         id: 1
 *         nome: João Silva
 *         email: joao@exemplo.com
 *         telefone: (15) 99999-9999
 *         cidade: Sorocaba
 *         tipo: cliente
 */

/**
 * @swagger
 * /api/contato:
 *   post:
 *     summary: Criar novo contato (público)
 *     tags: [Contatos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *               telefone:
 *                 type: string
 *                 example: (15) 99999-9999
 *               cidade:
 *                 type: string
 *                 example: Sorocaba
 *               tipo:
 *                 type: string
 *                 enum: [cliente, fornecedor, parceiro]
 *                 example: cliente
 *     responses:
 *       201:
 *         description: Contato criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 mensagem:
 *                   type: string
 *                 id:
 *                   type: integer
 *       400:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 mensagem:
 *                   type: string
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/', async (req, res) => {
  try {
    const { nome, email, telefone, cidade, tipo } = req.body;

    // Validações
    if (!nome || !email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome e email são obrigatórios'
      });
    }

    if (!validarEmail(email)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email inválido'
      });
    }

    if (telefone && !validarTelefone(telefone)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Telefone inválido'
      });
    }

    if (nome.length < 3 || nome.length > 100) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome deve ter entre 3 e 100 caracteres'
      });
    }

    // Inserir no banco de dados
    const query = `
      INSERT INTO contatos (nome, email, telefone, cidade, tipo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const resultado = await pool.query(query, [
      nome,
      email,
      telefone || null,
      cidade || null,
      tipo || 'cliente'
    ]);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Contato cadastrado com sucesso!',
      id: resultado.rows[0].id
    });

  } catch (erro) {
    console.error('Erro ao processar contato:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao processar sua solicitação'
    });
  }
});

/**
 * @swagger
 * /api/contato:
 *   get:
 *     summary: Lista todos os contatos
 *     tags: [Contatos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [cliente, fornecedor, parceiro]
 *         description: Filtrar por tipo de contato
 *       - in: query
 *         name: cidade
 *         schema:
 *           type: string
 *         description: Filtrar por cidade
 *     responses:
 *       200:
 *         description: Lista de contatos
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
 *                     $ref: '#/components/schemas/Contato'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', autenticar, async (req, res) => {
  try {
    const { tipo, cidade } = req.query;
    
    let query = 'SELECT * FROM contatos WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (tipo) {
      query += ` AND tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }

    if (cidade) {
      query += ` AND cidade ILIKE $${paramIndex}`;
      params.push(`%${cidade}%`);
      paramIndex++;
    }

    query += ' ORDER BY id DESC';

    const resultado = await pool.query(query, params);

    res.json({
      sucesso: true,
      total: resultado.rows.length,
      dados: resultado.rows
    });

  } catch (erro) {
    console.error('Erro ao listar contatos:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar contatos'
    });
  }
});

/**
 * @swagger
 * /api/contato/{id}:
 *   get:
 *     summary: Buscar contato por ID
 *     tags: [Contatos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do contato
 *     responses:
 *       200:
 *         description: Contato encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 dados:
 *                   $ref: '#/components/schemas/Contato'
 *       404:
 *         description: Contato não encontrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM contatos WHERE id = $1';
    const resultado = await pool.query(query, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Contato não encontrado'
      });
    }

    res.json({
      sucesso: true,
      dados: resultado.rows[0]
    });

  } catch (erro) {
    console.error('Erro ao buscar contato:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar contato'
    });
  }
});

/**
 * @swagger
 * /api/contato/{id}:
 *   put:
 *     summary: Atualizar contato
 *     tags: [Contatos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do contato
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               telefone:
 *                 type: string
 *               cidade:
 *                 type: string
 *               tipo:
 *                 type: string
 *                 enum: [cliente, fornecedor, parceiro]
 *     responses:
 *       200:
 *         description: Contato atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 mensagem:
 *                   type: string
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Contato não encontrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, cidade, tipo } = req.body;

    if (!nome || !email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome e email são obrigatórios'
      });
    }

    const query = `
      UPDATE contatos
      SET nome = $1, email = $2, telefone = $3, cidade = $4, tipo = $5
      WHERE id = $6
    `;

    const resultado = await pool.query(query, [
      nome,
      email,
      telefone,
      cidade,
      tipo,
      id
    ]);

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Contato não encontrado'
      });
    }

    res.json({
      sucesso: true,
      mensagem: 'Contato atualizado com sucesso'
    });

  } catch (erro) {
    console.error('Erro ao atualizar contato:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao atualizar contato'
    });
  }
});

/**
 * @swagger
 * /api/contato/{id}:
 *   delete:
 *     summary: Deletar contato
 *     tags: [Contatos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do contato
 *     responses:
 *       200:
 *         description: Contato deletado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 mensagem:
 *                   type: string
 *       404:
 *         description: Contato não encontrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'DELETE FROM contatos WHERE id = $1',
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Contato não encontrado'
      });
    }

    res.json({
      sucesso: true,
      mensagem: 'Contato deletado com sucesso'
    });

  } catch (erro) {
    console.error('Erro ao deletar contato:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao deletar contato'
    });
  }
});

module.exports = router;