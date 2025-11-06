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
 *         - titulo
 *         - nome
 *         - setor
 *         - cnpj
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: ID da empresa
 *         titulo:
 *           type: string
 *           description: Título da empresa
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
 *         descricao:
 *           type: string
 *           description: Descrição detalhada da empresa
 *         ano_fundacao:
 *           type: integer
 *           description: Ano de fundação
 *         tempo_operacao:
 *           type: integer
 *           description: Tempo de operação
 *         assinatura:
 *           type: integer
 *           description: Tempo de assinatura em dias
 *         funcionarios:
 *           type: integer
 *           description: Número de funcionários
 *         area_imovel:
 *           type: number
 *           format: float
 *           description: Área do imóvel
 *         tipo_imovel:
 *           type: string
 *           description: Tipo do imóvel
 *         motivo_venda:
 *           type: string
 *           description: Motivo da venda
 *         dif:
 *           type: string
 *           description: Diferenciais
 *         img:
 *           type: string
 *           description: URL da imagem
 *         ativo:
 *           type: boolean
 *           description: Status da empresa
 *         criado_em:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *       example:
 *         id: 1
 *         titulo: Empresa de Tecnologia em Expansão
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
 *               - titulo
 *               - nome
 *               - setor
 *               - cnpj
 *               - email
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: Empresa de Tecnologia em Expansão
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
 *               descricao:
 *                 type: string
 *                 example: Empresa de tecnologia especializada em desenvolvimento de sistemas
 *               ano_fundacao:
 *                 type: integer
 *                 example: 2010
 *               tempo_operacao:
 *                 type: integer
 *                 example: 15
 *               assinatura:
 *                 type: integer
 *                 example: 365
 *               funcionarios:
 *                 type: integer
 *                 example: 50
 *               area_imovel:
 *                 type: number
 *                 format: float
 *                 example: 500.00
 *               tipo_imovel:
 *                 type: string
 *                 example: Comercial
 *               motivo_venda:
 *                 type: string
 *                 example: Mudança de cidade
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
router.post('/', async (req, res) => {
  try {
    const { 
      titulo, nome, setor, cnpj, razao_social, email, telefone, 
      localizacao, info, lucro, valor, faturamento, tipo, descricao,
      ano_fundacao, tempo_operacao, assinatura, funcionarios, area_imovel, 
      tipo_imovel, motivo_venda, dif, img
    } = req.body;

    // Validações
    if (!titulo || !nome || !setor || !cnpj || !email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Título, nome, setor, CNPJ e email são obrigatórios'
      });
    }

    if (!validarCNPJ(cnpj)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CNPJ inválido'
      });
    }

    // Verificar se CNPJ já existe (PostgreSQL usa $1 ao invés de ?)
    const empresaExistente = await pool.query(
      'SELECT id FROM empresas WHERE cnpj = $1',
      [cnpj.replace(/[^\d]/g, '')]
    );

    if (empresaExistente.rows.length > 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: 'CNPJ já cadastrado'
      });
    }

    // Inserir empresa (PostgreSQL usa $1, $2, etc. e RETURNING ao invés de insertId)
    const query = `
      INSERT INTO empresas (
        titulo, nome, setor, cnpj, razao_social, email, telefone, 
        localizacao, info, lucro, valor, faturamento, tipo, descricao,
        ano_fundacao, tempo_operacao, assinatura, funcionarios, area_imovel, 
        tipo_imovel, motivo_venda, dif, img, ativo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, TRUE)
      RETURNING id
    `;

    const resultado = await pool.query(query, [
      titulo,
      nome,
      setor,
      cnpj.replace(/[^\d]/g, ''),
      razao_social || null,
      email,
      telefone || null,
      localizacao || null,
      info || null,
      lucro || null,
      valor || null,
      faturamento || null,
      tipo || null,
      descricao || null,
      ano_fundacao || null,
      tempo_operacao || null,
      assinatura || null,
      funcionarios || null,
      area_imovel || null,
      tipo_imovel || null,
      motivo_venda || null,
      dif || null,
      img || null
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
      mensagem: 'Erro ao criar empresa'
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
      SELECT id, titulo, nome, setor, cnpj, razao_social, email, telefone, 
             localizacao, info, lucro, valor, faturamento, tipo, descricao,
             ano_fundacao, tempo_operacao, assinatura, funcionarios, area_imovel, 
             tipo_imovel, motivo_venda, dif, img, ativo
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
 *               titulo:
 *                 type: string
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
 *               descricao:
 *                 type: string
 *               ano_fundacao:
 *                 type: integer
 *               tempo_operacao:
 *                 type: integer
 *               assinatura:
 *                 type: integer
 *               funcionarios:
 *                 type: integer
 *               area_imovel:
 *                 type: number
 *                 format: float
 *               tipo_imovel:
 *                 type: string
 *               motivo_venda:
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
      titulo, nome, setor, razao_social, email, telefone, 
      localizacao, info, lucro, valor, faturamento, tipo, descricao,
      ano_fundacao, tempo_operacao, assinatura, funcionarios, area_imovel, 
      tipo_imovel, motivo_venda, dif, img, ativo 
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
      SET titulo = $1, nome = $2, setor = $3, razao_social = $4, email = $5, 
          telefone = $6, localizacao = $7, info = $8, lucro = $9, valor = $10, 
          faturamento = $11, tipo = $12, descricao = $13, ano_fundacao = $14, 
          tempo_operacao = $15, assinatura = $16, funcionarios = $17, area_imovel = $18, 
          tipo_imovel = $19, motivo_venda = $20, dif = $21, img = $22, ativo = $23
      WHERE id = $24
    `;

    await pool.query(query, [
      titulo,
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
      descricao,
      ano_fundacao,
      tempo_operacao,
      assinatura,
      funcionarios,
      area_imovel,
      tipo_imovel,
      motivo_venda,
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