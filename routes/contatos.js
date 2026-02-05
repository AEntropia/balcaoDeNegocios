const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const autenticar = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Configuração do nodemailer (ajuste conforme sua configuração)
// Se você já tem o transporter configurado em outro arquivo, importe-o
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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
 *         - assunto
 *         - mensagem
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
 *         assunto:
 *           type: string
 *           description: Assunto da mensagem
 *         mensagem:
 *           type: string
 *           description: Conteúdo da mensagem
 *         criado_em:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *       example:
 *         id: 1
 *         nome: João Silva
 *         email: joao@exemplo.com
 *         telefone: (15) 99999-9999
 *         assunto: Solicitação de orçamento
 *         mensagem: Gostaria de solicitar um orçamento para...
 */

/**
 * @swagger
 * /api/contatos:
 *   post:
 *     summary: Criar novo contato e enviar email (público)
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
 *               - assunto
 *               - mensagem
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
 *               assunto:
 *                 type: string
 *                 example: Solicitação de orçamento
 *               mensagem:
 *                 type: string
 *                 example: Gostaria de solicitar um orçamento para serviços de consultoria.
 *     responses:
 *       201:
 *         description: Contato criado e email enviado com sucesso
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
    const { nome, email, telefone, assunto, mensagem } = req.body;

    // Validações
    if (!nome || !email || !assunto || !mensagem) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome, email, assunto e mensagem são obrigatórios'
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

    if (assunto.length < 3 || assunto.length > 200) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Assunto deve ter entre 3 e 200 caracteres'
      });
    }

    if (mensagem.length < 10 || mensagem.length > 5000) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Mensagem deve ter entre 10 e 5000 caracteres'
      });
    }

    // Inserir no banco de dados
    const query = `
      INSERT INTO contatos (nome, email, telefone, assunto, mensagem)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const resultado = await pool.query(query, [
      nome,
      email,
      telefone || null,
      assunto,
      mensagem
    ]);

    const contatoId = resultado.rows[0].id;

    // Enviar email para o administrador
    try {
      const emailAdministrador = process.env.ADMIN_EMAIL || 'mateus287@outlook.com';
      
      const htmlEmail = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e293b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
            .field { margin-bottom: 15px; }
            .field-label { font-weight: bold; color: #1e293b; }
            .field-value { margin-top: 5px; padding: 10px; background-color: white; border-radius: 3px; }
            .message-box { background-color: white; padding: 15px; border-left: 4px solid #1e293b; margin-top: 10px; }
            .footer { background-color: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 5px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📧 Novo Contato Recebido</h2>
            </div>
            <div class="content">
              <p>Um novo contato foi registrado através do formulário do site.</p>
              
              <div class="field">
                <div class="field-label">Nome:</div>
                <div class="field-value">${nome}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value"><a href="mailto:${email}">${email}</a></div>
              </div>
              
              ${telefone ? `
                <div class="field">
                  <div class="field-label">Telefone:</div>
                  <div class="field-value">${telefone}</div>
                </div>
              ` : ''}
              
              <div class="field">
                <div class="field-label">Assunto:</div>
                <div class="field-value">${assunto}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Mensagem:</div>
                <div class="message-box">${mensagem.replace(/\n/g, '<br>')}</div>
              </div>
              
              <p style="margin-top: 20px; font-size: 12px; color: #6c757d;">
                ID do Contato: #${contatoId} | 
                Recebido em: ${new Date().toLocaleString('pt-BR')}
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático. Não responda a esta mensagem.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"Formulário de Contato" <${process.env.SMTP_USER}>`,
        to: emailAdministrador,
        subject: `Novo Contato: ${assunto}`,
        html: htmlEmail,
        text: `
          Novo Contato Recebido
          
          Nome: ${nome}
          Email: ${email}
          Telefone: ${telefone || 'Não informado'}
          Assunto: ${assunto}
          
          Mensagem:
          ${mensagem}
          
          ID do Contato: #${contatoId}
          Recebido em: ${new Date().toLocaleString('pt-BR')}
        `
      });

      console.log(`Email enviado para o administrador sobre o contato #${contatoId}`);
    } catch (erroEmail) {
      console.error('Erro ao enviar email:', erroEmail);
      // Não retornamos erro para o usuário, pois o contato foi salvo
    }

    res.status(201).json({
      sucesso: true,
      mensagem: 'Contato cadastrado com sucesso! Entraremos em contato em breve.',
      id: contatoId
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
 * /api/contatos:
 *   get:
 *     summary: Lista todos os contatos
 *     tags: [Contatos]
 *     security:
 *       - bearerAuth: []
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
    const query = 'SELECT * FROM contatos ORDER BY id DESC';

    const resultado = await pool.query(query);

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
 * /api/contatos/{id}:
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
 * /api/contatos/{id}:
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
 *               - assunto
 *               - mensagem
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               telefone:
 *                 type: string
 *               assunto:
 *                 type: string
 *               mensagem:
 *                 type: string
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
    const { nome, email, telefone, assunto, mensagem } = req.body;

    if (!nome || !email || !assunto || !mensagem) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome, email, assunto e mensagem são obrigatórios'
      });
    }

    const query = `
      UPDATE contatos
      SET nome = $1, email = $2, telefone = $3, assunto = $4, mensagem = $5
      WHERE id = $6
    `;

    const resultado = await pool.query(query, [
      nome,
      email,
      telefone,
      assunto,
      mensagem,
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
 * /api/contatos/{id}:
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