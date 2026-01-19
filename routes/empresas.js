const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const supabase = require('../config/supabase');
const autenticar = require('../middleware/auth');
const multer = require('multer');

// Configurar multer para memória
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'), false);
    }
  }
});

// Função auxiliar para upload no Supabase
const uploadImagemSupabase = async (file) => {
  try {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `empresas/${fileName}`;

    const { data, error } = await supabase.storage
      .from('empresas-imagens')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data: publicURL } = supabase.storage
      .from('empresas-imagens')
      .getPublicUrl(filePath);

    return publicURL.publicUrl;
  } catch (erro) {
    console.error('Erro no upload:', erro);
    throw erro;
  }
};

// Função auxiliar para deletar imagem do Supabase
const deletarImagemSupabase = async (imagemUrl) => {
  try {
    if (!imagemUrl) return;
    
    const urlParts = imagemUrl.split('/');
    const bucketIndex = urlParts.indexOf('empresas-imagens');
    if (bucketIndex === -1) return;
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    
    await supabase.storage
      .from('empresas-imagens')
      .remove([filePath]);
  } catch (erro) {
    console.error('Erro ao deletar imagem:', erro);
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Empresa:
 *       type: object
 *       required:
 *         - cnae
 *         - setor
 *         - estado
 *         - cidade
 *         - email
 *         - telefone
 *       properties:
 *         id:
 *           type: integer
 *           description: ID da empresa
 *         cnae:
 *           type: string
 *           description: CNAE da empresa (código e descrição)
 *           example: "7420002 - ATIVIDADES DE PRODUÇÃO DE FOTOGRAFIAS AÉREAS E SUBMARINAS"
 *         setor:
 *           type: string
 *           description: Setor de atuação
 *           example: "ATIVIDADES PROFISSIONAIS, CIENTÍFICAS E TÉCNICAS"
 *         estado:
 *           type: string
 *           description: Estado (UF)
 *           example: "MG"
 *         cidade:
 *           type: string
 *           description: Cidade
 *           example: "Além Paraíba"
 *         faturamentoAnual:
 *           type: string
 *           description: Faixa de faturamento anual
 *           example: "Microempresa - Até R$ 360 mil/ano"
 *         margemLucro:
 *           type: string
 *           description: Faixa de margem de lucro
 *           example: "Baixa - De 1% a 10%"
 *         precoVenda:
 *           type: string
 *           description: Preço de venda
 *           example: "R$ 250.000,00"
 *         anoFundacao:
 *           type: string
 *           description: Ano de fundação
 *           example: "2000"
 *         numeroFuncionarios:
 *           type: string
 *           description: Faixa de número de funcionários
 *           example: "6 a 10 funcionários"
 *         tipoImovel:
 *           type: string
 *           description: Tipo do imóvel
 *           example: "Alugado (shopping)"
 *         destaques:
 *           type: array
 *           items:
 *             type: string
 *           description: Lista de destaques da empresa
 *           example: ["Alto fluxo de clientes", "Carteira de clientes fidelizados"]
 *         imagens:
 *           type: array
 *           items:
 *             type: string
 *           description: URLs das imagens
 *           example: []
 *         numeroCartao:
 *           type: string
 *           description: Número do cartão (apenas últimos 4 dígitos serão armazenados)
 *           example: "1234 1234 1234 1234"
 *         nomeCartao:
 *           type: string
 *           description: Nome no cartão
 *           example: "CIANO M SILVA"
 *         validadeCartao:
 *           type: string
 *           description: Validade do cartão
 *           example: "10/40"
 *         cvv:
 *           type: string
 *           description: CVV do cartão (não será armazenado)
 *           example: "123"
 *         telefone:
 *           type: string
 *           description: Telefone de contato
 *           example: "15981156556"
 *         email:
 *           type: string
 *           format: email
 *           description: Email de contato
 *           example: "exemplo@email.com"
 *         ativo:
 *           type: boolean
 *           description: Status da empresa
 *         data_inicio_assinatura:
 *           type: string
 *           format: date
 *           description: Data de início da assinatura (YYYY-MM-DD)
 *         data_fim_assinatura:
 *           type: string
 *           format: date
 *           description: Data de término da assinatura (YYYY-MM-DD)
 *         status_assinatura:
 *           type: string
 *           enum: [ativa, expirando, expirada, cancelada]
 *           description: Status da assinatura
 */

/**
 * @swagger
 * /api/empresas:
 *   post:
 *     summary: Criar nova empresa
 *     description: |
 *       Cria uma nova empresa no sistema. 
 *       ⚠️ IMPORTANTE: Os dados do cartão (numeroCartao, cvv) não serão armazenados por questões de segurança PCI-DSS.
 *       Apenas os últimos 4 dígitos do cartão serão salvos para referência.
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
 *               - cnae
 *               - setor
 *               - estado
 *               - cidade
 *               - email
 *               - telefone
 *             properties:
 *               cnae:
 *                 type: string
 *                 example: "7420002 - ATIVIDADES DE PRODUÇÃO DE FOTOGRAFIAS AÉREAS E SUBMARINAS"
 *               setor:
 *                 type: string
 *                 example: "ATIVIDADES PROFISSIONAIS, CIENTÍFICAS E TÉCNICAS"
 *               estado:
 *                 type: string
 *                 example: "MG"
 *               cidade:
 *                 type: string
 *                 example: "Além Paraíba"
 *               faturamentoAnual:
 *                 type: string
 *                 example: "Microempresa - Até R$ 360 mil/ano"
 *               margemLucro:
 *                 type: string
 *                 example: "Baixa - De 1% a 10%"
 *               precoVenda:
 *                 type: string
 *                 example: "R$ 250.000,00"
 *               anoFundacao:
 *                 type: string
 *                 example: "2000"
 *               numeroFuncionarios:
 *                 type: string
 *                 example: "6 a 10 funcionários"
 *               tipoImovel:
 *                 type: string
 *                 example: "Alugado (shopping)"
 *               destaques:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Alto fluxo de clientes", "Carteira de clientes fidelizados"]
 *               imagens:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: []
 *               numeroCartao:
 *                 type: string
 *                 example: "1234 1234 1234 1234"
 *               nomeCartao:
 *                 type: string
 *                 example: "CIANO M SILVA"
 *               validadeCartao:
 *                 type: string
 *                 example: "10/40"
 *               cvv:
 *                 type: string
 *                 example: "123"
 *               telefone:
 *                 type: string
 *                 example: "15981156556"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "exemplo@email.com"
 *               data_inicio_assinatura:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               data_fim_assinatura:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-01"
 *               status_assinatura:
 *                 type: string
 *                 enum: [ativa, expirando, expirada, cancelada]
 *                 example: ativa
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
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/', autenticar, async (req, res) => {
  try {
    const { 
      cnae,
      setor,
      estado,
      cidade,
      faturamentoAnual,
      margemLucro,
      precoVenda,
      anoFundacao,
      numeroFuncionarios,
      tipoImovel,
      destaques,
      imagens,
      numeroCartao,
      nomeCartao,
      validadeCartao,
      cvv,
      telefone,
      email,
      data_inicio_assinatura,
      data_fim_assinatura,
      status_assinatura
    } = req.body;

    // Validações obrigatórias
    if (!cnae || !setor || !estado || !cidade || !email || !telefone) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CNAE, setor, estado, cidade, email e telefone são obrigatórios'
      });
    }

    // Processar dados do cartão - POR SEGURANÇA, NÃO ARMAZENAR DADOS COMPLETOS
    // Armazenar apenas últimos 4 dígitos para referência
    let ultimos4Digitos = null;
    if (numeroCartao) {
      const apenasNumeros = numeroCartao.replace(/\D/g, '');
      ultimos4Digitos = apenasNumeros.slice(-4);
    }

    // Converter destaques para JSON
    const destaquesJson = Array.isArray(destaques) ? JSON.stringify(destaques) : null;
    
    // Converter imagens para JSON
    const imagensJson = Array.isArray(imagens) ? JSON.stringify(imagens) : JSON.stringify([]);

    // Inserir empresa
    const query = `
      INSERT INTO empresas (
        cnae, setor, estado, cidade, faturamento_anual, margem_lucro,
        preco_venda, ano_fundacao, numero_funcionarios, tipo_imovel,
        destaques, imagens, ultimos_4_digitos_cartao, nome_cartao,
        validade_cartao, telefone, email, ativo,
        data_inicio_assinatura, data_fim_assinatura, status_assinatura
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id
    `;

    const resultado = await pool.query(query, [
      cnae,
      setor,
      estado,
      cidade,
      faturamentoAnual || null,
      margemLucro || null,
      precoVenda || null,
      anoFundacao || null,
      numeroFuncionarios || null,
      tipoImovel || null,
      destaquesJson,
      imagensJson,
      ultimos4Digitos,
      nomeCartao || null,
      validadeCartao || null,
      telefone,
      email,
      true,
      data_inicio_assinatura || null,
      data_fim_assinatura || null,
      status_assinatura || 'ativa'
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
      SELECT id, cnae, setor, estado, cidade, faturamento_anual, margem_lucro,
             preco_venda, ano_fundacao, numero_funcionarios, tipo_imovel,
             destaques, imagens, ultimos_4_digitos_cartao, nome_cartao,
             validade_cartao, telefone, email, ativo,
             data_inicio_assinatura, data_fim_assinatura, status_assinatura
      FROM empresas
      ORDER BY id DESC
    `;

    const resultado = await pool.query(query);

    // Parsear JSON dos campos destaques e imagens
    const dadosFormatados = resultado.rows.map(empresa => ({
      ...empresa,
      destaques: empresa.destaques ? JSON.parse(empresa.destaques) : [],
      imagens: empresa.imagens ? JSON.parse(empresa.imagens) : []
    }));

    res.json({
      sucesso: true,
      dados: dadosFormatados
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

    const empresa = resultado.rows[0];
    
    // Parsear JSON
    empresa.destaques = empresa.destaques ? JSON.parse(empresa.destaques) : [];
    empresa.imagens = empresa.imagens ? JSON.parse(empresa.imagens) : [];

    res.json({
      sucesso: true,
      dados: empresa
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
 *               cnae:
 *                 type: string
 *               setor:
 *                 type: string
 *               estado:
 *                 type: string
 *               cidade:
 *                 type: string
 *               faturamentoAnual:
 *                 type: string
 *               margemLucro:
 *                 type: string
 *               precoVenda:
 *                 type: string
 *               anoFundacao:
 *                 type: string
 *               numeroFuncionarios:
 *                 type: string
 *               tipoImovel:
 *                 type: string
 *               destaques:
 *                 type: array
 *                 items:
 *                   type: string
 *               imagens:
 *                 type: array
 *                 items:
 *                   type: string
 *               telefone:
 *                 type: string
 *               email:
 *                 type: string
 *               ativo:
 *                 type: boolean
 *               data_inicio_assinatura:
 *                 type: string
 *                 format: date
 *               data_fim_assinatura:
 *                 type: string
 *                 format: date
 *               status_assinatura:
 *                 type: string
 *                 enum: [ativa, expirando, expirada, cancelada]
 *     responses:
 *       200:
 *         description: Empresa atualizada com sucesso
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
      cnae,
      setor,
      estado,
      cidade,
      faturamentoAnual,
      margemLucro,
      precoVenda,
      anoFundacao,
      numeroFuncionarios,
      tipoImovel,
      destaques,
      imagens,
      telefone,
      email,
      ativo,
      data_inicio_assinatura,
      data_fim_assinatura,
      status_assinatura
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

    // Converter arrays para JSON
    const destaquesJson = Array.isArray(destaques) ? JSON.stringify(destaques) : null;
    const imagensJson = Array.isArray(imagens) ? JSON.stringify(imagens) : null;

    const query = `
      UPDATE empresas
      SET cnae = $1, setor = $2, estado = $3, cidade = $4,
          faturamento_anual = $5, margem_lucro = $6, preco_venda = $7,
          ano_fundacao = $8, numero_funcionarios = $9, tipo_imovel = $10,
          destaques = $11, imagens = $12, telefone = $13, email = $14,
          ativo = $15, data_inicio_assinatura = $16, data_fim_assinatura = $17,
          status_assinatura = $18
      WHERE id = $19
    `;

    await pool.query(query, [
      cnae,
      setor,
      estado,
      cidade,
      faturamentoAnual,
      margemLucro,
      precoVenda,
      anoFundacao,
      numeroFuncionarios,
      tipoImovel,
      destaquesJson,
      imagensJson,
      telefone,
      email,
      ativo !== undefined ? ativo : true,
      data_inicio_assinatura || null,
      data_fim_assinatura || null,
      status_assinatura || null,
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

    // Verificar se empresa existe
    const empresa = await pool.query(
      'SELECT id FROM empresas WHERE id = $1',
      [id]
    );

    if (empresa.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada'
      });
    }

    // Deletar empresa do banco
    await pool.query('DELETE FROM empresas WHERE id = $1', [id]);

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