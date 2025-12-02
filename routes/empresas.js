const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const autenticar = require('../middleware/auth');

// Validação de CNPJ
const validarCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/[^\d]/g, '');
  return cnpj.length === 14;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Empresa:
 *       type: object
 *       required:
 *         - nome
 *         - setor
 *         - cnpj
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: ID da empresa
 *         nome:
 *           type: string
 *           description: Nome da empresa
 *         setor:
 *           type: string
 *           description: Setor de atuação
 *         cnpj:
 *           type: string
 *           description: CNPJ da empresa (apenas números)
 *         razao_social:
 *           type: string
 *           description: Razão social da empresa
 *         email:
 *           type: string
 *           format: email
 *           description: Email da empresa
 *         telefone:
 *           type: string
 *           description: Telefone da empresa
 *         localizacao:
 *           type: string
 *           description: Localização da empresa
 *         info:
 *           type: string
 *           description: Informações adicionais
 *         lucro:
 *           type: number
 *           format: float
 *           description: Lucro em reais
 *         valor:
 *           type: number
 *           format: float
 *           description: Valor em reais
 *         faturamento:
 *           type: number
 *           format: float
 *           description: Faturamento anual em reais
 *         tipo:
 *           type: string
 *           description: Tipo/área da empresa
 *         ano_fundacao:
 *           type: integer
 *           description: Ano de fundação
 *         assinatura:
 *           type: integer
 *           description: Tempo de assinatura em dias
 *         funcionarios:
 *           type: integer
 *           description: Número de funcionários
 *         tipo_imovel:
 *           type: string
 *           description: Tipo do imóvel
 *         dif:
 *           type: string
 *           description: Diferenciais
 *         img:
 *           type: string
 *           description: URL da imagem
 *         ativo:
 *           type: boolean
 *           description: Status da empresa
 *       example:
 *         id: 1
 *         nome: Tech Solutions LTDA
 *         setor: Tecnologia
 *         cnpj: "12345678000190"
 *         razao_social: Tech Solutions Tecnologia LTDA
 *         email: contato@techsolutions.com
 *         telefone: (15) 3333-4444
 *         localizacao: Sorocaba - SP
 *         lucro: 500000.00
 *         faturamento: 1500000.00
 *         ano_fundacao: 2010
 *         assinatura: 365
 *         funcionarios: 50
 *         ativo: true
 */

/**
 * @swagger
 * /api/empresas:
 *   post:
 *     summary: Criar nova empresa
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - setor
 *               - cnpj
 *               - email
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Tech Solutions LTDA
 *               setor:
 *                 type: string
 *                 example: Tecnologia
 *               cnpj:
 *                 type: string
 *                 example: "12345678000190"
 *               razao_social:
 *                 type: string
 *                 example: Tech Solutions Tecnologia LTDA
 *               email:
 *                 type: string
 *                 format: email
 *                 example: contato@techsolutions.com
 *               telefone:
 *                 type: string
 *                 example: (15) 3333-4444
 *               localizacao:
 *                 type: string
 *                 example: Sorocaba - SP
 *               info:
 *                 type: string
 *                 example: Empresa consolidada no mercado
 *               lucro:
 *                 type: number
 *                 format: float
 *                 example: 500000.00
 *               valor:
 *                 type: number
 *                 format: float
 *                 example: 2000000.00
 *               faturamento:
 *                 type: number
 *                 format: float
 *                 example: 1500000.00
 *               tipo:
 *                 type: string
 *                 example: Desenvolvimento de Software
 *               ano_fundacao:
 *                 type: integer
 *                 example: 2010
 *               assinatura:
 *                 type: integer
 *                 example: 365
 *               funcionarios:
 *                 type: integer
 *                 example: 50
 *               tipo_imovel:
 *                 type: string
 *                 example: Comercial
 *               dif:
 *                 type: string
 *                 example: Carteira de clientes consolidada
 *               img:
 *                 type: string
 *                 example: https://exemplo.com/imagem.jpg
 *     responses:
 *       201:
 *         description: Empresa criada com sucesso
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
 *       409:
 *         description: CNPJ já cadastrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/', autenticar, async (req, res) => {
  try {
    const { 
      nome, setor, cnpj, razao_social, email, telefone, 
      localizacao, info, lucro, valor, faturamento, tipo,
      ano_fundacao, assinatura, funcionarios, 
      tipo_imovel, dif, img
    } = req.body;

    // Validações
    if (!nome || !setor || !cnpj || !email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome, setor, CNPJ e email são obrigatórios'
      });
    }

    if (!validarCNPJ(cnpj)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CNPJ inválido'
      });
    }

    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');

    // Verificar se CNPJ já existe
    const empresaExistente = await pool.query(
      'SELECT id FROM empresas WHERE cnpj = $1',
      [cnpjLimpo]
    );

    if (empresaExistente.rows.length > 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: 'CNPJ já cadastrado'
      });
    }

    // Inserir empresa
    const query = `
      INSERT INTO empresas (
        nome, setor, cnpj, razao_social, email, telefone, 
        localizacao, info, lucro, valor, faturamento, tipo,
        ano_fundacao, assinatura, funcionarios, 
        tipo_imovel, dif, img, ativo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id
    `;

    const resultado = await pool.query(query, [
      nome,
      setor,
      cnpjLimpo,
      razao_social || null,
      email,
      telefone || null,
      localizacao || null,
      info || null,
      lucro || null,
      valor || null,
      faturamento || null,
      tipo || null,
      ano_fundacao || null,
      assinatura || null,
      funcionarios || null,
      tipo_imovel || null,
      dif || null,
      img || null,
      true
    ]);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Empresa criada com sucesso',
      id: resultado.rows[0].id
    });

  } catch (erro) {
    console.error('Erro ao criar empresa:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao criar empresa',
      erro: erro.message
    });
  }
});

/**
 * @swagger
 * /api/empresas:
 *   get:
 *     summary: Listar todas as empresas
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de empresas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 dados:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Empresa'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', autenticar, async (req, res) => {
  try {
    const query = `
      SELECT id, nome, setor, cnpj, razao_social, email, telefone, 
             localizacao, info, lucro, valor, faturamento, tipo,
             ano_fundacao, assinatura, funcionarios, 
             tipo_imovel, dif, img, ativo
      FROM empresas
      ORDER BY nome ASC
    `;

    const resultado = await pool.query(query);

    res.json({
      sucesso: true,
      dados: resultado.rows
    });

  } catch (erro) {
    console.error('Erro ao listar empresas:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao listar empresas'
    });
  }
});

/**
 * @swagger
 * /api/empresas/{id}:
 *   get:
 *     summary: Buscar empresa por ID
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da empresa
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 dados:
 *                   $ref: '#/components/schemas/Empresa'
 *       404:
 *         description: Empresa não encontrada
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM empresas WHERE id = $1';
    const resultado = await pool.query(query, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada'
      });
    }

    res.json({
      sucesso: true,
      dados: resultado.rows[0]
    });

  } catch (erro) {
    console.error('Erro ao buscar empresa:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar empresa'
    });
  }
});

/**
 * @swagger
 * /api/empresas/{id}:
 *   put:
 *     summary: Atualizar empresa
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da empresa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               setor:
 *                 type: string
 *               razao_social:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               telefone:
 *                 type: string
 *               localizacao:
 *                 type: string
 *               info:
 *                 type: string
 *               lucro:
 *                 type: number
 *                 format: float
 *               valor:
 *                 type: number
 *                 format: float
 *               faturamento:
 *                 type: number
 *                 format: float
 *               tipo:
 *                 type: string
 *               ano_fundacao:
 *                 type: integer
 *               assinatura:
 *                 type: integer
 *               funcionarios:
 *                 type: integer
 *               tipo_imovel:
 *                 type: string
 *               dif:
 *                 type: string
 *               img:
 *                 type: string
 *               ativo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Empresa atualizada com sucesso
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
 *         description: Empresa não encontrada
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome, setor, razao_social, email, telefone, 
      localizacao, info, lucro, valor, faturamento, tipo,
      ano_fundacao, assinatura, funcionarios, 
      tipo_imovel, dif, img, ativo 
    } = req.body;

    // Verificar se empresa existe
    const empresaExistente = await pool.query(
      'SELECT id FROM empresas WHERE id = $1',
      [id]
    );

    if (empresaExistente.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada'
      });
    }

    const query = `
      UPDATE empresas
      SET nome = $1, setor = $2, razao_social = $3, email = $4, 
          telefone = $5, localizacao = $6, info = $7, lucro = $8, valor = $9, 
          faturamento = $10, tipo = $11, ano_fundacao = $12, 
          assinatura = $13, funcionarios = $14, 
          tipo_imovel = $15, dif = $16, img = $17, ativo = $18
      WHERE id = $19
    `;

    await pool.query(query, [
      nome,
      setor,
      razao_social,
      email,
      telefone,
      localizacao,
      info,
      lucro,
      valor,
      faturamento,
      tipo,
      ano_fundacao,
      assinatura,
      funcionarios,
      tipo_imovel,
      dif,
      img,
      ativo !== undefined ? ativo : true,
      id
    ]);

    res.json({
      sucesso: true,
      mensagem: 'Empresa atualizada com sucesso'
    });

  } catch (erro) {
    console.error('Erro ao atualizar empresa:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao atualizar empresa'
    });
  }
});

/**
 * @swagger
 * /api/empresas/{id}:
 *   delete:
 *     summary: Deletar empresa
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da empresa
 *     responses:
 *       200:
 *         description: Empresa deletada com sucesso
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
 *         description: Empresa não encontrada
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'DELETE FROM empresas WHERE id = $1',
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada'
      });
    }

    res.json({
      sucesso: true,
      mensagem: 'Empresa deletada com sucesso'
    });

  } catch (erro) {
    console.error('Erro ao deletar empresa:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao deletar empresa'
    });
  }
});

module.exports = router;