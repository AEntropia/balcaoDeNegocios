const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const autenticar = require('../middleware/auth');
const nodemailer = require('nodemailer');

// ─────────────────────────────────────────────
// Configuração do Nodemailer
// Ajuste as variáveis de ambiente conforme seu provedor (SMTP, SendGrid, etc.)
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true para porta 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envia e-mail de anúncio deletado
 * @param {string} destinatario - E-mail da empresa
 * @param {string} nomeEmpresa  - Setor (nome) da empresa deletada
 */
const enviarEmailAnuncioDeletado = async (destinatario, nomeEmpresa) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #c0392b;">Seu anúncio foi removido</h2>
      <p>Olá,</p>
      <p>Informamos que o seu anúncio <strong>${nomeEmpresa}</strong> foi <strong>removido</strong> da nossa plataforma.</p>
      <p>Caso não tenha solicitado esta remoção ou acredite que isso ocorreu por engano, entre em contato com o nosso suporte o quanto antes.</p>
      <br>
      <p style="color: #555; font-size: 13px;">Esta é uma mensagem automática. Por favor, não responda diretamente a este e-mail.</p>
    </div>
  `;
  await transporter.sendMail({
    from: `"Plataforma" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: destinatario,
    subject: 'Seu anúncio foi removido',
    html,
  });
};

/**
 * Envia e-mail de anúncio aprovado
 * @param {string} destinatario - E-mail da empresa
 * @param {string} nomeEmpresa  - Setor (nome) da empresa aprovada
 */
const enviarEmailAnuncioAprovado = async (destinatario, nomeEmpresa) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">🎉 Seu anúncio foi aprovado!</h2>
      <p>Olá,</p>
      <p>Temos ótimas notícias! O seu anúncio <strong>${nomeEmpresa}</strong> foi <strong>aprovado</strong> e já está visível na nossa plataforma.</p>
      <p>A partir de agora, potenciais compradores já podem visualizar as informações da sua empresa.</p>
      <br>
      <p style="color: #555; font-size: 13px;">Esta é uma mensagem automática. Por favor, não responda diretamente a este e-mail.</p>
    </div>
  `;
  await transporter.sendMail({
    from: `"Plataforma" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: destinatario,
    subject: '✅ Seu anúncio foi aprovado!',
    html,
  });
};

/**
 * Envia e-mail de anúncio editado (alteração genérica)
 * @param {string} destinatario - E-mail da empresa
 * @param {string} nomeEmpresa  - Setor (nome) da empresa editada
 */
const enviarEmailAnuncioEditado = async (destinatario, nomeEmpresa) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2980b9;">Seu anúncio foi atualizado</h2>
      <p>Olá,</p>
      <p>Informamos que o seu anúncio <strong>${nomeEmpresa}</strong> foi <strong>editado</strong> na nossa plataforma.</p>
      <p>Caso não tenha solicitado esta alteração ou acredite que isso ocorreu por engano, entre em contato com o nosso suporte.</p>
      <br>
      <p style="color: #555; font-size: 13px;">Esta é uma mensagem automática. Por favor, não responda diretamente a este e-mail.</p>
    </div>
  `;
  await transporter.sendMail({
    from: `"Plataforma" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: destinatario,
    subject: 'Seu anúncio foi atualizado',
    html,
  });
};

// Constantes de validação
const MAX_IMAGENS = 5;
const MAX_TAMANHO_BASE64 = 25 * 1024 * 1024; // 5MB em bytes (aproximado após codificação)
const TIPOS_MIME_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Valida uma string Base64 de imagem
 * @param {string} base64String - String Base64 completa (com prefixo data:)
 * @returns {Object} { valido: boolean, erro: string }
 */
const validarImagemBase64 = (base64String) => {
  if (!base64String || typeof base64String !== 'string') {
    return { valido: false, erro: 'Imagem inválida' };
  }

  if (!base64String.startsWith('data:image/')) {
    return { valido: false, erro: 'Formato de imagem inválido. Use: data:image/[tipo];base64,...' };
  }

  const matches = base64String.match(/^data:([^;]+);base64,/);
  if (!matches) {
    return { valido: false, erro: 'Formato Base64 inválido' };
  }

  const tipoMime = matches[1];
  if (!TIPOS_MIME_PERMITIDOS.includes(tipoMime)) {
    return { valido: false, erro: `Tipo de imagem não permitido. Use: ${TIPOS_MIME_PERMITIDOS.join(', ')}` };
  }

  const tamanhoEstimado = base64String.length * 0.75;
  if (tamanhoEstimado > MAX_TAMANHO_BASE64) {
    return { valido: false, erro: `Imagem muito grande. Máximo: 5MB` };
  }

  return { valido: true };
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
 *           description: Array de imagens em Base64 (máximo 5 imagens, 5MB cada)
 *           example: ["data:image/jpeg;base64,/9j/4AAQSkZJRg...", "data:image/png;base64,iVBORw0KGgo..."]
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
 *           nullable: true
 *           description: Telefone de contato (opcional)
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
 *       
 *       **Imagens:**
 *       - Envie até 5 imagens em formato Base64
 *       - Formato aceito: data:image/[tipo];base64,[dados]
 *       - Tipos permitidos: jpeg, jpg, png, webp, gif
 *       - Tamanho máximo por imagem: 5MB
 *       
 *       **Exemplo de Base64:**
 *       ```
 *       data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD...
 *       ```
 *       
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
 *                 example: ["data:image/jpeg;base64,/9j/4AAQSkZJRg..."]
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
 *                 nullable: true
 *                 description: Telefone de contato (opcional)
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
router.post('/', async (req, res) => {
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
    if (!cnae || !setor || !estado || !cidade || !email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'CNAE, setor, estado, cidade e email são obrigatórios'
      });
    }

    // Validar imagens Base64
    let imagensValidadas = [];
    if (imagens && Array.isArray(imagens)) {
      if (imagens.length > MAX_IMAGENS) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Máximo de ${MAX_IMAGENS} imagens permitidas. Você enviou ${imagens.length}.`
        });
      }

      for (let i = 0; i < imagens.length; i++) {
        const validacao = validarImagemBase64(imagens[i]);
        if (!validacao.valido) {
          return res.status(400).json({
            sucesso: false,
            mensagem: `Erro na imagem ${i + 1}: ${validacao.erro}`
          });
        }
        imagensValidadas.push(imagens[i]);
      }
    }

    // Processar dados do cartão - POR SEGURANÇA, NÃO ARMAZENAR DADOS COMPLETOS
    let ultimos4Digitos = null;
    if (numeroCartao) {
      const apenasNumeros = numeroCartao.replace(/\D/g, '');
      ultimos4Digitos = apenasNumeros.slice(-4);
    }

    const destaquesJson = Array.isArray(destaques) ? JSON.stringify(destaques) : null;
    const imagensJson = imagensValidadas.length > 0 ? JSON.stringify(imagensValidadas) : JSON.stringify([]);

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
      telefone || null,
      email,
      true,
      data_inicio_assinatura || null,
      data_fim_assinatura || null,
      status_assinatura || 'ativa'
    ]);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Empresa criada com sucesso',
      id: resultado.rows[0].id,
      totalImagens: imagensValidadas.length
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
 *     summary: Listar todas as empresas com paginação e filtros
 *     tags: [Empresas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página (começa em 1)
 *       - in: query
 *         name: cnae
 *         schema:
 *           type: string
 *         description: Filtro por CNAE
 *       - in: query
 *         name: setor
 *         schema:
 *           type: string
 *         description: Filtro por setor
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *         description: Filtro por estado
 *       - in: query
 *         name: cidade
 *         schema:
 *           type: string
 *         description: Filtro por cidade
 *       - in: query
 *         name: precoMin
 *         schema:
 *           type: number
 *         description: Preço mínimo de venda
 *       - in: query
 *         name: precoMax
 *         schema:
 *           type: number
 *         description: Preço máximo de venda
 *       - in: query
 *         name: statusAssinatura
 *         schema:
 *           type: string
 *         description: "Filtro por status da assinatura (ex: ativo, inativo, cancelado)"
 *     responses:
 *       200:
 *         description: Lista de empresas paginada
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
 *                 paginacao:
 *                   type: object
 *                   properties:
 *                     paginaAtual:
 *                       type: integer
 *                     itensPorPagina:
 *                       type: integer
 *                     totalItens:
 *                       type: integer
 *                     totalPaginas:
 *                       type: integer
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', async (req, res) => {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const itensPorPagina = 10;
    const offset = (pagina - 1) * itensPorPagina;

    const { cnae, setor, estado, cidade, precoMin, precoMax, statusAssinatura } = req.query;

    const condicoes = [];
    const valores = [];
    let contadorParametro = 1;

    if (cnae) {
      condicoes.push(`cnae = $${contadorParametro}`);
      valores.push(cnae);
      contadorParametro++;
    }

    if (setor) {
      condicoes.push(`setor ILIKE $${contadorParametro}`);
      valores.push(`%${setor}%`);
      contadorParametro++;
    }

    if (estado) {
      condicoes.push(`estado = $${contadorParametro}`);
      valores.push(estado);
      contadorParametro++;
    }

    if (cidade) {
      condicoes.push(`cidade ILIKE $${contadorParametro}`);
      valores.push(`%${cidade}%`);
      contadorParametro++;
    }

    if (precoMin) {
      condicoes.push(`preco_venda >= $${contadorParametro}`);
      valores.push(parseFloat(precoMin));
      contadorParametro++;
    }

    if (precoMax) {
      condicoes.push(`preco_venda <= $${contadorParametro}`);
      valores.push(parseFloat(precoMax));
      contadorParametro++;
    }

    if (statusAssinatura) {
      condicoes.push(`status_assinatura = $${contadorParametro}`);
      valores.push(statusAssinatura);
      contadorParametro++;
    }

    const clausulaWhere = condicoes.length > 0
      ? `WHERE ${condicoes.join(' AND ')}`
      : '';

    const queryContagem = `
      SELECT COUNT(*) as total
      FROM empresas
      ${clausulaWhere}
    `;

    const resultadoContagem = await pool.query(queryContagem, valores);
    const totalItens = parseInt(resultadoContagem.rows[0].total);
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);

    const query = `
      SELECT id, cnae, setor, estado, cidade, faturamento_anual, margem_lucro,
             preco_venda, ano_fundacao, numero_funcionarios, tipo_imovel,
             destaques, imagens, ultimos_4_digitos_cartao, nome_cartao,
             validade_cartao, telefone, email, ativo,
             data_inicio_assinatura, data_fim_assinatura, status_assinatura
      FROM empresas
      ${clausulaWhere}
      ORDER BY id DESC
      LIMIT $${contadorParametro} OFFSET $${contadorParametro + 1}
    `;

    valores.push(itensPorPagina, offset);

    const resultado = await pool.query(query, valores);

    const dadosFormatados = resultado.rows.map(empresa => {
      let destaques = [];
      let imagens = [];

      try {
        if (empresa.destaques) {
          destaques = typeof empresa.destaques === 'string'
            ? JSON.parse(empresa.destaques)
            : empresa.destaques;
        }
      } catch (e) {
        console.error('Erro ao parsear destaques:', e);
        destaques = [];
      }

      try {
        if (empresa.imagens) {
          imagens = typeof empresa.imagens === 'string'
            ? JSON.parse(empresa.imagens)
            : empresa.imagens;
        }
      } catch (e) {
        console.error('Erro ao parsear imagens:', e);
        imagens = [];
      }

      return {
        ...empresa,
        destaques,
        imagens
      };
    });

    res.json({
      sucesso: true,
      dados: dadosFormatados,
      paginacao: {
        paginaAtual: pagina,
        itensPorPagina,
        totalItens,
        totalPaginas
      }
    });

  } catch (erro) {
    console.error('Erro ao listar empresas:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao listar empresas',
      erro: erro.message
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
router.get('/:id', async (req, res) => {
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
    
    try {
      empresa.destaques = empresa.destaques 
        ? (typeof empresa.destaques === 'string' ? JSON.parse(empresa.destaques) : empresa.destaques)
        : [];
    } catch (e) {
      console.error('Erro ao parsear destaques:', e);
      empresa.destaques = [];
    }

    try {
      empresa.imagens = empresa.imagens 
        ? (typeof empresa.imagens === 'string' ? JSON.parse(empresa.imagens) : empresa.imagens)
        : [];
    } catch (e) {
      console.error('Erro ao parsear imagens:', e);
      empresa.imagens = [];
    }

    res.json({
      sucesso: true,
      dados: empresa
    });

  } catch (erro) {
    console.error('Erro ao buscar empresa:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao buscar empresa',
      erro: erro.message
    });
  }
});

/**
 * @swagger
 * /api/empresas/{id}:
 *   put:
 *     summary: Atualizar empresa
 *     description: |
 *       Atualiza uma empresa existente.
 *       
 *       **Imagens:**
 *       - Envie até 5 imagens em formato Base64
 *       - As imagens enviadas SUBSTITUIRÃO completamente as anteriores
 *       - Para manter imagens existentes, inclua-as no array
 *       
 *       **E-mails automáticos:**
 *       - Se `status_assinatura` for alterado para `aprovado`, um e-mail de aprovação é enviado ao cadastrado.
 *       - Para qualquer outra alteração, um e-mail informando a edição é enviado.
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
 *                 description: Array de imagens Base64 (substitui todas as anteriores)
 *               telefone:
 *                 type: string
 *                 nullable: true
 *                 description: Telefone de contato (opcional)
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
router.put('/:id', async (req, res) => {
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

    // Buscar empresa atual para comparar status e obter e-mail e setor
    const empresaAtual = await pool.query(
      'SELECT id, email, setor, status_assinatura FROM empresas WHERE id = $1',
      [id]
    );

    if (empresaAtual.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada'
      });
    }

    const statusAnterior = empresaAtual.rows[0].status_assinatura;
    const emailEmpresa   = empresaAtual.rows[0].email;
    // Usa o setor do body se foi alterado, senão mantém o do banco
    const nomeEmpresa    = setor || empresaAtual.rows[0].setor;

    // Validar imagens Base64 se foram enviadas
    let imagensValidadas = [];
    if (imagens && Array.isArray(imagens)) {
      if (imagens.length > MAX_IMAGENS) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Máximo de ${MAX_IMAGENS} imagens permitidas. Você enviou ${imagens.length}.`
        });
      }

      for (let i = 0; i < imagens.length; i++) {
        const validacao = validarImagemBase64(imagens[i]);
        if (!validacao.valido) {
          return res.status(400).json({
            sucesso: false,
            mensagem: `Erro na imagem ${i + 1}: ${validacao.erro}`
          });
        }
        imagensValidadas.push(imagens[i]);
      }
    }

    const destaquesJson = Array.isArray(destaques) ? JSON.stringify(destaques) : null;
    const imagensJson = imagens !== undefined 
      ? (imagensValidadas.length > 0 ? JSON.stringify(imagensValidadas) : JSON.stringify([]))
      : null;

    const query = `
      UPDATE empresas
      SET cnae = $1, setor = $2, estado = $3, cidade = $4,
          faturamento_anual = $5, margem_lucro = $6, preco_venda = $7,
          ano_fundacao = $8, numero_funcionarios = $9, tipo_imovel = $10,
          destaques = COALESCE($11, destaques), 
          imagens = COALESCE($12, imagens), 
          telefone = $13, email = $14,
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
      telefone || null,
      email,
      ativo !== undefined ? ativo : true,
      data_inicio_assinatura || null,
      data_fim_assinatura || null,
      status_assinatura || null,
      id
    ]);

    // ── Lógica de e-mail ──────────────────────────────────────────────────────
    const foiAprovado = status_assinatura === 'aprovado' && statusAnterior !== 'aprovado';

    if (foiAprovado) {
      enviarEmailAnuncioAprovado(emailEmpresa, nomeEmpresa).catch(err =>
        console.error('Erro ao enviar e-mail de aprovação:', err)
      );
    } else {
      enviarEmailAnuncioEditado(emailEmpresa, nomeEmpresa).catch(err =>
        console.error('Erro ao enviar e-mail de edição:', err)
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json({
      sucesso: true,
      mensagem: 'Empresa atualizada com sucesso',
      totalImagens: imagensValidadas.length
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
 *     description: Remove a empresa e envia e-mail de notificação ao endereço cadastrado.
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

    // Buscar empresa para obter e-mail e setor ANTES de deletar
    const empresa = await pool.query(
      'SELECT id, email, setor FROM empresas WHERE id = $1',
      [id]
    );

    if (empresa.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada'
      });
    }

    const emailEmpresa = empresa.rows[0].email;
    const nomeEmpresa  = empresa.rows[0].setor;

    // Deletar empresa do banco (as imagens Base64 serão deletadas junto)
    await pool.query('DELETE FROM empresas WHERE id = $1', [id]);

    // Enviar e-mail de notificação (sem bloquear a resposta ao cliente)
    enviarEmailAnuncioDeletado(emailEmpresa, nomeEmpresa).catch(err =>
      console.error('Erro ao enviar e-mail de deleção:', err)
    );

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

/**
 * @swagger
 * /api/empresas/{id}/status-assinatura:
 *   patch:
 *     summary: Alterar status da assinatura de um anúncio
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ativo, expirado, analise]
 *                 description: Novo status da assinatura
 *             example:
 *               status: "ativo"
 *     responses:
 *       200:
 *         description: Status alterado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 mensagem:
 *                   type: string
 *                 dados:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     status_assinatura:
 *                       type: string
 *                     data_atualizacao:
 *                       type: string
 *                       format: date-time
 *             example:
 *               sucesso: true
 *               mensagem: "Status da assinatura alterado com sucesso"
 *               dados:
 *                 id: 123
 *                 status_assinatura: "ativo"
 *                 data_atualizacao: "2026-01-23T14:30:00.000Z"
 *       400:
 *         description: Status inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 mensagem:
 *                   type: string
 *             example:
 *               sucesso: false
 *               mensagem: "Status inválido. Use: ativo, expirado ou analise"
 *       404:
 *         description: Empresa não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 mensagem:
 *                   type: string
 *             example:
 *               sucesso: false
 *               mensagem: "Empresa não encontrada"
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.patch('/:id/status-assinatura', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const statusPermitidos = ['ativo', 'expirado', 'analise'];
    
    if (!status) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'O campo status é obrigatório'
      });
    }

    if (!statusPermitidos.includes(status)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Status inválido. Use: ativo, expirado ou analise'
      });
    }

    const queryVerificar = 'SELECT id FROM empresas WHERE id = $1';
    const resultadoVerificar = await pool.query(queryVerificar, [id]);

    if (resultadoVerificar.rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada'
      });
    }

    const queryAtualizar = `
      UPDATE empresas 
      SET status_assinatura = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, status_assinatura, updated_at
    `;

    const resultadoAtualizar = await pool.query(queryAtualizar, [status, id]);

    res.json({
      sucesso: true,
      mensagem: 'Status da assinatura alterado com sucesso',
      dados: {
        id: resultadoAtualizar.rows[0].id,
        status_assinatura: resultadoAtualizar.rows[0].status_assinatura,
        data_atualizacao: resultadoAtualizar.rows[0].updated_at
      }
    });

  } catch (erro) {
    console.error('Erro ao alterar status da assinatura:', erro);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao alterar status da assinatura',
      erro: erro.message
    });
  }
});

module.exports = router;