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
 *         funcionarios: 50
 *         ativo: true
 *         data_inicio_assinatura: "2024-01-01"
 *         data_fim_assinatura: "2025-01-01"
 *         status_assinatura: ativa
 */

/**
 * @swagger
 * /api/empresas:
 *   post:
 *     summary: Criar nova empresa (use Postman/Insomnia para enviar com imagem)
 *     description: |
 *       ⚠️ **UPLOAD DE IMAGENS**: Esta rota aceita multipart/form-data para upload de imagens.
 *       Para testar com imagem, use Postman, Insomnia ou Thunder Client.
 *       
 *       No Swagger você pode criar empresas sem imagem usando JSON.
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
 *               funcionarios:
 *                 type: integer
 *                 example: 50
 *               tipo_imovel:
 *                 type: string
 *                 example: Comercial
 *               dif:
 *                 type: string
 *                 example: Carteira de clientes consolidada
 *               data_inicio_assinatura:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *                 description: Data de início da assinatura (formato YYYY-MM-DD)
 *               data_fim_assinatura:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-01"
 *                 description: Data de término da assinatura (formato YYYY-MM-DD)
 *               status_assinatura:
 *                 type: string
 *                 enum: [ativa, expirando, expirada, cancelada]
 *                 example: ativa
 *                 description: Status da assinatura
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
 *                 imagem_url:
 *                   type: string
 *       400:
 *         description: Erro de validação
 *       409:
 *         description: CNPJ já cadastrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/', autenticar, upload.single('imagem'), async (req, res) => {
  try {
    const { 
      nome, setor, cnpj, razao_social, email, telefone, 
      localizacao, info, lucro, valor, faturamento, tipo,
      ano_fundacao, funcionarios, tipo_imovel, dif,
      data_inicio_assinatura, data_fim_assinatura, status_assinatura
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

    // Upload da imagem (se enviada)
    let imagemUrl = null;
    if (req.file) {
      try {
        imagemUrl = await uploadImagemSupabase(req.file);
      } catch (erroUpload) {
        return res.status(500).json({
          sucesso: false,
          mensagem: 'Erro ao fazer upload da imagem',
          erro: erroUpload.message
        });
      }
    }

    // Inserir empresa
    const query = `
      INSERT INTO empresas (
        nome, setor, cnpj, razao_social, email, telefone, 
        localizacao, info, lucro, valor, faturamento, tipo,
        ano_fundacao, funcionarios, tipo_imovel, dif, img, ativo,
        data_inicio_assinatura, data_fim_assinatura, status_assinatura
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
      funcionarios || null,
      tipo_imovel || null,
      dif || null,
      imagemUrl,
      true,
      data_inicio_assinatura || null,
      data_fim_assinatura || null,
      status_assinatura || 'ativa'
    ]);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Empresa criada com sucesso',
      id: resultado.rows[0].id,
      imagem_url: imagemUrl
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
             ano_fundacao, funcionarios, tipo_imovel, dif, img, ativo,
             data_inicio_assinatura, data_fim_assinatura, status_assinatura
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
 *     summary: Atualizar empresa (use Postman/Insomnia para enviar com imagem)
 *     description: |
 *       ⚠️ **UPLOAD DE IMAGENS**: Esta rota aceita multipart/form-data para upload de imagens.
 *       Para testar com imagem, use Postman, Insomnia ou Thunder Client.
 *       
 *       No Swagger você pode atualizar empresas sem modificar a imagem usando JSON.
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
 *               funcionarios:
 *                 type: integer
 *               tipo_imovel:
 *                 type: string
 *               dif:
 *                 type: string
 *               ativo:
 *                 type: boolean
 *               data_inicio_assinatura:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *                 description: Data de início da assinatura (formato YYYY-MM-DD)
 *               data_fim_assinatura:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-01"
 *                 description: Data de término da assinatura (formato YYYY-MM-DD)
 *               status_assinatura:
 *                 type: string
 *                 enum: [ativa, expirando, expirada, cancelada]
 *                 description: Status da assinatura
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
 *                 imagem_url:
 *                   type: string
 *       404:
 *         description: Empresa não encontrada
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id', autenticar, upload.single('imagem'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome, setor, razao_social, email, telefone, 
      localizacao, info, lucro, valor, faturamento, tipo,
      ano_fundacao, funcionarios, tipo_imovel, dif, ativo,
      data_inicio_assinatura, data_fim_assinatura, status_assinatura
    } = req.body;

    // Verificar se empresa existe e pegar imagem antiga
    const empresaExistente = await pool.query(
      'SELECT img FROM empresas WHERE id = $1',
      [id]
    );

    if (empresaExistente.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada'
      });
    }

    let imagemUrl = empresaExistente.rows[0].img;

    // Se enviou nova imagem, fazer upload e deletar a antiga
    if (req.file) {
      try {
        // Deletar imagem antiga
        if (imagemUrl) {
          await deletarImagemSupabase(imagemUrl);
        }
        
        // Upload da nova imagem
        imagemUrl = await uploadImagemSupabase(req.file);
      } catch (erroUpload) {
        return res.status(500).json({
          sucesso: false,
          mensagem: 'Erro ao processar imagem',
          erro: erroUpload.message
        });
      }
    }

    const query = `
      UPDATE empresas
      SET nome = $1, setor = $2, razao_social = $3, email = $4, 
          telefone = $5, localizacao = $6, info = $7, lucro = $8, valor = $9, 
          faturamento = $10, tipo = $11, ano_fundacao = $12, 
          funcionarios = $13, tipo_imovel = $14, dif = $15, img = $16, ativo = $17,
          data_inicio_assinatura = $18, data_fim_assinatura = $19, status_assinatura = $20
      WHERE id = $21
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
      funcionarios,
      tipo_imovel,
      dif,
      imagemUrl,
      ativo !== undefined ? ativo : true,
      data_inicio_assinatura || null,
      data_fim_assinatura || null,
      status_assinatura || null,
      id
    ]);

    res.json({
      sucesso: true,
      mensagem: 'Empresa atualizada com sucesso',
      imagem_url: imagemUrl
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
 *     summary: Deletar empresa e sua imagem
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

    // Buscar imagem antes de deletar
    const empresa = await pool.query(
      'SELECT img FROM empresas WHERE id = $1',
      [id]
    );

    if (empresa.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada'
      });
    }

    // Deletar imagem do Supabase Storage
    if (empresa.rows[0].img) {
      await deletarImagemSupabase(empresa.rows[0].img);
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