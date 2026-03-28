const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const autenticar = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ─── Configuração do transporte de email ────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Constantes ─────────────────────────────────────────────────────────────
const MAX_IMAGENS = 5;
const MAX_TAMANHO_BASE64 = 25 * 1024 * 1024;
const TIPOS_MIME_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const TOKEN_EXPIRACAO_HORAS = 24;
const TOKEN_COOLDOWN_DIAS = 7;

/**
 * Valida uma string Base64 de imagem
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
    return { valido: false, erro: 'Imagem muito grande. Máximo: 5MB' };
  }
  return { valido: true };
};

/**
 * Envia e-mail de anúncio editado
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

// ────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/empresas/{id}/solicitar-token:
 *   post:
 *     summary: Solicitar token de atualização via email
 *     description: |
 *       Gera um hash único e envia para o email cadastrado da empresa.
 *       O token expira em 24h ou após o primeiro uso.
 *       Só pode ser solicitado um novo token a cada 7 dias.
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Token enviado para o email cadastrado
 *       429:
 *         description: Token já foi gerado nos últimos 7 dias
 *       404:
 *         description: Empresa não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/:id/solicitar-token', async (req, res) => {
  try {
    const { id } = req.params;

    const resultEmpresa = await pool.query(
      'SELECT id, email, cnae FROM empresas WHERE id = $1',
      [id]
    );

    if (resultEmpresa.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
    }

    const empresa = resultEmpresa.rows[0];

    const resultUltimoToken = await pool.query(
      `SELECT criado_em
       FROM empresa_update_tokens
       WHERE empresa_id = $1
       ORDER BY criado_em DESC
       LIMIT 1`,
      [id]
    );

    if (resultUltimoToken.rows.length > 0) {
      const ultimoCriadoEm = new Date(resultUltimoToken.rows[0].criado_em);
      const diferencaDias = (new Date() - ultimoCriadoEm) / (1000 * 60 * 60 * 24);

      if (diferencaDias < TOKEN_COOLDOWN_DIAS) {
        const diasRestantes = Math.ceil(TOKEN_COOLDOWN_DIAS - diferencaDias);
        return res.status(429).json({
          sucesso: false,
          mensagem: `Um token já foi gerado recentemente. Aguarde ${diasRestantes} dia(s) para solicitar um novo.`,
          diasRestantes,
        });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + TOKEN_EXPIRACAO_HORAS * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO empresa_update_tokens (empresa_id, token, usado, criado_em, expira_em)
       VALUES ($1, $2, FALSE, NOW(), $3)`,
      [id, token, expiraEm]
    );

    await transporter.sendMail({
      from: `"${process.env.EMAIL_NOME || 'Solid Finance'}" <${process.env.SMTP_USER}>`,
      to: empresa.email,
      subject: 'Código para atualizar seu anúncio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Atualização do seu anúncio</h2>
          <p>Você solicitou a atualização do anúncio <strong>${empresa.cnae}</strong>.</p>
          <p>Use o código abaixo para liberar a edição. Ele é válido por <strong>${TOKEN_EXPIRACAO_HORAS} horas</strong> e pode ser usado apenas uma vez.</p>
          <div style="background: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <p style="margin: 0; font-size: 13px; color: #666;">Seu código de verificação</p>
            <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #111; font-family: monospace;">
              ${token}
            </p>
          </div>
          <p style="color: #888; font-size: 13px;">
            Se você não solicitou essa alteração, ignore este email.
            O próximo código só poderá ser solicitado após ${TOKEN_COOLDOWN_DIAS} dias.
          </p>
        </div>
      `,
    });

    const emailMascarado = empresa.email.replace(
      /(.{2})(.*)(@.*)/,
      (_, a, b, c) => a + '*'.repeat(Math.max(b.length, 3)) + c
    );

    return res.json({
      sucesso: true,
      mensagem: `Código enviado para ${emailMascarado}. Válido por ${TOKEN_EXPIRACAO_HORAS} horas.`,
    });

  } catch (erro) {
    console.error('Erro ao solicitar token:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao solicitar token de atualização',
      erro: erro.message,
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/empresas/{id}/verificar-token:
 *   post:
 *     summary: Verificar se um token é válido (sem consumi-lo)
 *     description: |
 *       Verifica se o token existe, pertence à empresa, não foi usado e não expirou.
 *       Não marca o token como usado — use esta rota para liberar o formulário no frontend
 *       antes de o usuário preencher os dados.
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token válido
 *       400:
 *         description: Token inválido, expirado ou já utilizado
 *       404:
 *         description: Empresa não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/:id/verificar-token', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ sucesso: false, mensagem: 'Token de verificação é obrigatório' });
    }

    const resultEmpresa = await pool.query(
      'SELECT id FROM empresas WHERE id = $1',
      [id]
    );

    if (resultEmpresa.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
    }

    const resultToken = await pool.query(
      `SELECT id, usado, expira_em
       FROM empresa_update_tokens
       WHERE token = $1 AND empresa_id = $2`,
      [token, id]
    );

    if (resultToken.rows.length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Token inválido ou não pertence a este anúncio' });
    }

    const tokenRow = resultToken.rows[0];

    if (tokenRow.usado) {
      return res.status(400).json({ sucesso: false, mensagem: 'Este token já foi utilizado' });
    }

    if (new Date() > new Date(tokenRow.expira_em)) {
      return res.status(400).json({ sucesso: false, mensagem: 'Token expirado. Solicite um novo código.' });
    }

    return res.json({ sucesso: true, mensagem: 'Token válido. Você pode prosseguir com a edição.' });

  } catch (erro) {
    console.error('Erro ao verificar token:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao verificar token',
      erro: erro.message,
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/empresas/{id}/update-com-token:
 *   put:
 *     summary: Atualizar empresa usando token de verificação
 *     description: |
 *       Valida o token novamente (por segurança) e atualiza os dados da empresa.
 *       O token é invalidado após o uso.
 *       O status da assinatura é automaticamente alterado para "analise".
 *       Recomenda-se chamar POST /verificar-token antes para liberar o formulário.
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
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
 *                 nullable: true
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Empresa atualizada com sucesso. Status alterado para "analise".
 *       400:
 *         description: Token inválido, expirado ou já utilizado
 *       404:
 *         description: Empresa não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id/update-com-token', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      token,
      cnae, setor, estado, cidade,
      faturamentoAnual, margemLucro, precoVenda,
      anoFundacao, numeroFuncionarios, tipoImovel,
      destaques, imagens, telefone, email,
    } = req.body;

    // 1. Validar presença do token
    if (!token) {
      await client.query('ROLLBACK');
      return res.status(400).json({ sucesso: false, mensagem: 'Token de verificação é obrigatório' });
    }

    // 2. Buscar e validar o token
    const resultToken = await client.query(
      `SELECT id, usado, expira_em
       FROM empresa_update_tokens
       WHERE token = $1 AND empresa_id = $2`,
      [token, id]
    );

    if (resultToken.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ sucesso: false, mensagem: 'Token inválido ou não pertence a este anúncio' });
    }

    const tokenRow = resultToken.rows[0];

    if (tokenRow.usado) {
      await client.query('ROLLBACK');
      return res.status(400).json({ sucesso: false, mensagem: 'Este token já foi utilizado' });
    }

    if (new Date() > new Date(tokenRow.expira_em)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ sucesso: false, mensagem: 'Token expirado. Solicite um novo código.' });
    }

    // 3. Verificar se a empresa existe e buscar email e setor para o e-mail de notificação
    const resultEmpresa = await client.query(
      'SELECT id, email, setor FROM empresas WHERE id = $1',
      [id]
    );

    if (resultEmpresa.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
    }

    const emailEmpresa = resultEmpresa.rows[0].email;
    // Usa o setor do body se foi alterado, senão mantém o do banco
    const nomeEmpresa = setor || resultEmpresa.rows[0].setor;

    // 4. Validar imagens Base64 (se enviadas)
    let imagensValidadas = [];
    if (imagens && Array.isArray(imagens)) {
      if (imagens.length > MAX_IMAGENS) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          sucesso: false,
          mensagem: `Máximo de ${MAX_IMAGENS} imagens permitidas. Você enviou ${imagens.length}.`,
        });
      }
      for (let i = 0; i < imagens.length; i++) {
        const validacao = validarImagemBase64(imagens[i]);
        if (!validacao.valido) {
          await client.query('ROLLBACK');
          return res.status(400).json({ sucesso: false, mensagem: `Erro na imagem ${i + 1}: ${validacao.erro}` });
        }
        imagensValidadas.push(imagens[i]);
      }
    }

    // 5. Converter arrays para JSON
    const destaquesJson = Array.isArray(destaques) ? JSON.stringify(destaques) : null;
    const imagensJson = imagens !== undefined ? JSON.stringify(imagensValidadas) : null;

    // 6. Atualizar empresa
    await client.query(
      `UPDATE empresas
       SET cnae                  = COALESCE($1,  cnae),
           setor                 = COALESCE($2,  setor),
           estado                = COALESCE($3,  estado),
           cidade                = COALESCE($4,  cidade),
           faturamento_anual     = COALESCE($5,  faturamento_anual),
           margem_lucro          = COALESCE($6,  margem_lucro),
           preco_venda           = COALESCE($7,  preco_venda),
           ano_fundacao          = COALESCE($8,  ano_fundacao),
           numero_funcionarios   = COALESCE($9,  numero_funcionarios),
           tipo_imovel           = COALESCE($10, tipo_imovel),
           destaques             = COALESCE($11, destaques),
           imagens               = COALESCE($12, imagens),
           telefone              = COALESCE($13, telefone),
           email                 = COALESCE($14, email),
           status_assinatura     = 'analise',
           updated_at            = NOW()
       WHERE id = $15`,
      [
        cnae || null, setor || null, estado || null, cidade || null,
        faturamentoAnual || null, margemLucro || null, precoVenda || null,
        anoFundacao || null, numeroFuncionarios || null, tipoImovel || null,
        destaquesJson, imagensJson,
        telefone || null, email || null,
        id,
      ]
    );

    // 7. Invalidar o token
    await client.query(
      `UPDATE empresa_update_tokens SET usado = TRUE, usado_em = NOW() WHERE id = $1`,
      [tokenRow.id]
    );

    await client.query('COMMIT');

    // 8. Enviar e-mail de notificação (sem bloquear a resposta ao cliente)
    enviarEmailAnuncioEditado(emailEmpresa, nomeEmpresa).catch(err =>
      console.error('Erro ao enviar e-mail de edição:', err)
    );

    return res.json({
      sucesso: true,
      mensagem: 'Anúncio atualizado com sucesso. Ele passará por análise antes de ser publicado novamente.',
      totalImagens: imagensValidadas.length,
    });

  } catch (erro) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar empresa com token:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao atualizar empresa',
      erro: erro.message,
    });
  } finally {
    client.release();
  }
});

module.exports = router;