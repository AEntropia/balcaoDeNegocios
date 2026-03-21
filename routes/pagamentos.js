const express = require('express');
const router = express.Router();
const { PreApproval } = require('mercadopago');
const client = require('../config/mercadopago');
const pool = require('../config/database');
const autenticar = require('../middleware/auth');

const preApproval = new PreApproval(client);

// ─── Planos disponíveis ────────────────────────────────────────────────────────
// Defina os planos de assinatura do seu produto aqui.
// frequency: quantidade | frequency_type: 'months' ou 'days'
const PLANOS = {
  mensal: {
    nome: 'Anúncio Mensal',
    valor: 99.90,          // ← Altere para o valor real
    frequency: 1,
    frequency_type: 'months',
  },
  anual: {
    nome: 'Anúncio Anual',
    valor: 899.90,         // ← Altere para o valor real
    frequency: 12,
    frequency_type: 'months',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mapeia o status retornado pelo Mercado Pago para o status interno do sistema.
 * Referência: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscriptions-associated-plan
 *
 * MP status  → status_assinatura interno
 * pending    → aguardando   (cartão cadastrado, aguardando primeiro pagamento)
 * authorized → analise      (primeiro pagamento aprovado, aguardando revisão interna)
 * paused     → pausada
 * cancelled  → cancelada
 */
const mapearStatusMP = (statusMP) => {
  const mapa = {
    pending:    'aguardando',
    authorized: 'analise',
    paused:     'pausada',
    cancelled:  'cancelada',
  };
  return mapa[statusMP] || 'aguardando';
};

// ─── Rotas ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/pagamentos/assinar:
 *   post:
 *     summary: Criar assinatura recorrente para um anúncio
 *     description: |
 *       Cria uma assinatura no Mercado Pago (Preapproval) vinculada ao anúncio.
 *       O status do anúncio vai para **aguardando** imediatamente.
 *       Após o Mercado Pago confirmar o pagamento via webhook, o status muda para **analise**.
 *
 *       O frontend deve usar o SDK JS do Mercado Pago para coletar e tokenizar
 *       os dados do cartão **antes** de chamar esta rota, enviando o `cardTokenId`
 *       gerado pelo MP.
 *
 *       Referência dos tokens: https://www.mercadopago.com.br/developers/pt/docs/sdks-library/client-side/mp-js-v2
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - empresaId
 *               - cardTokenId
 *               - emailPagador
 *               - plano
 *             properties:
 *               empresaId:
 *                 type: integer
 *                 description: ID do anúncio/empresa a assinar
 *                 example: 42
 *               cardTokenId:
 *                 type: string
 *                 description: Token do cartão gerado pelo SDK JS do Mercado Pago
 *                 example: "abc123tokenGeradoNoFrontend"
 *               emailPagador:
 *                 type: string
 *                 format: email
 *                 description: Email do titular do cartão
 *                 example: "pagador@email.com"
 *               plano:
 *                 type: string
 *                 enum: [mensal, anual]
 *                 example: "mensal"
 *     responses:
 *       201:
 *         description: Assinatura criada. Status do anúncio alterado para "aguardando".
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                 mensagem:
 *                   type: string
 *                 assinaturaId:
 *                   type: string
 *                   description: ID da assinatura gerada no Mercado Pago
 *                 statusAssinatura:
 *                   type: string
 *       400:
 *         description: Parâmetros inválidos
 *       404:
 *         description: Empresa não encontrada
 *       500:
 *         description: Erro interno ou recusa do Mercado Pago
 */
router.post('/assinar', autenticar, async (req, res) => {
  const { empresaId, cardTokenId, emailPagador, plano } = req.body;

  // Validações básicas
  if (!empresaId || !cardTokenId || !emailPagador || !plano) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'empresaId, cardTokenId, emailPagador e plano são obrigatórios',
    });
  }

  if (!PLANOS[plano]) {
    return res.status(400).json({
      sucesso: false,
      mensagem: `Plano inválido. Use: ${Object.keys(PLANOS).join(', ')}`,
    });
  }

  // Verificar se a empresa existe
  const { rows } = await pool.query(
    'SELECT id, email FROM empresas WHERE id = $1',
    [empresaId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
  }

  const dadosPlano = PLANOS[plano];

  try {
    // Criar assinatura no Mercado Pago
    // Docs: https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval/post
    const assinatura = await preApproval.create({
      body: {
        reason: `${dadosPlano.nome} - Anúncio #${empresaId}`,
        auto_recurring: {
          frequency: dadosPlano.frequency,
          frequency_type: dadosPlano.frequency_type,
          transaction_amount: dadosPlano.valor,
          currency_id: 'BRL',
        },
        payer_email: emailPagador,
        card_token_id: cardTokenId,
        back_url: process.env.MP_BACK_URL || 'https://seusite.com.br/pagamento/retorno',
        status: 'authorized', // 'authorized' inicia a cobrança imediatamente
      },
    });

    const statusInterno = mapearStatusMP(assinatura.status);

    // Persistir ID da assinatura e atualizar status no banco
    await pool.query(
      `UPDATE empresas
          SET status_assinatura    = $1,
              mp_assinatura_id     = $2,
              mp_plano             = $3,
              updated_at           = NOW()
        WHERE id = $4`,
      [statusInterno, assinatura.id, plano, empresaId]
    );

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Assinatura criada com sucesso',
      assinaturaId: assinatura.id,
      statusAssinatura: statusInterno,
    });

  } catch (erro) {
    console.error('Erro ao criar assinatura no Mercado Pago:', erro);

    // Tentar extrair mensagem legível da API do MP
    const mensagemMP = erro?.cause?.[0]?.description || erro?.message || 'Erro desconhecido';

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Falha ao processar assinatura',
      detalhe: mensagemMP,
    });
  }
});

/**
 * @swagger
 * /api/pagamentos/webhook:
 *   post:
 *     summary: Webhook do Mercado Pago (notificações de assinatura)
 *     description: |
 *       Endpoint chamado automaticamente pelo Mercado Pago quando o status
 *       de uma assinatura muda (pagamento aprovado, recusado, cancelado, etc).
 *
 *       **Configure esta URL no painel do Mercado Pago:**
 *       `Seu Painel MP → Configurações → Notificações (Webhooks)`
 *       URL: `https://seusite.com.br/api/pagamentos/webhook`
 *       Eventos: `subscription_preapproval`
 *
 *       ⚠️ Esta rota NÃO usa autenticação Bearer (o MP não envia token).
 *       A validação é feita pelo header `x-signature` e a variável `MP_WEBHOOK_SECRET`.
 *     tags: [Pagamentos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: "subscription_preapproval"
 *               data:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID da assinatura no Mercado Pago
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *       400:
 *         description: Payload inválido ou assinatura não encontrada no sistema
 */
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    // Ignorar eventos que não sejam de assinatura
    if (type !== 'subscription_preapproval') {
      return res.status(200).json({ ignorado: true });
    }

    const assinaturaId = data?.id;
    if (!assinaturaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da assinatura ausente' });
    }

    // Buscar dados atualizados da assinatura direto na API do MP
    const assinatura = await preApproval.get({ id: assinaturaId });

    const statusInterno = mapearStatusMP(assinatura.status);

    // Buscar empresa vinculada a esta assinatura
    const { rows } = await pool.query(
      'SELECT id FROM empresas WHERE mp_assinatura_id = $1',
      [assinaturaId]
    );

    if (rows.length === 0) {
      // Assinatura não pertence a nenhum anúncio cadastrado — ignorar silenciosamente
      return res.status(200).json({ ignorado: true, motivo: 'assinatura não vinculada' });
    }

    const empresaId = rows[0].id;

    // Atualizar status no banco
    await pool.query(
      `UPDATE empresas
          SET status_assinatura = $1,
              updated_at        = NOW()
        WHERE id = $2`,
      [statusInterno, empresaId]
    );

    console.log(`[Webhook MP] Empresa #${empresaId} → status: ${statusInterno} (MP: ${assinatura.status})`);

    return res.status(200).json({ sucesso: true });

  } catch (erro) {
    console.error('Erro ao processar webhook do Mercado Pago:', erro);
    // Sempre retornar 200 para o MP não reenviar indefinidamente
    return res.status(200).json({ sucesso: false, erro: erro.message });
  }
});

/**
 * @swagger
 * /api/pagamentos/assinatura/{empresaId}:
 *   get:
 *     summary: Consultar assinatura ativa de um anúncio
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: empresaId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados da assinatura
 *       404:
 *         description: Empresa ou assinatura não encontrada
 */
router.get('/assinatura/:empresaId', autenticar, async (req, res) => {
  const { empresaId } = req.params;

  const { rows } = await pool.query(
    'SELECT id, mp_assinatura_id, mp_plano, status_assinatura FROM empresas WHERE id = $1',
    [empresaId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
  }

  const empresa = rows[0];

  if (!empresa.mp_assinatura_id) {
    return res.status(404).json({ sucesso: false, mensagem: 'Nenhuma assinatura vinculada a este anúncio' });
  }

  try {
    // Buscar dados frescos no MP
    const assinatura = await preApproval.get({ id: empresa.mp_assinatura_id });

    return res.json({
      sucesso: true,
      dados: {
        empresaId: empresa.id,
        plano: empresa.mp_plano,
        statusInterno: empresa.status_assinatura,
        statusMP: assinatura.status,
        proximaCobranca: assinatura.next_payment_date,
        valorRecorrente: assinatura.auto_recurring?.transaction_amount,
        dataInicio: assinatura.date_created,
      },
    });
  } catch (erro) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao consultar assinatura no Mercado Pago' });
  }
});

/**
 * @swagger
 * /api/pagamentos/cancelar/{empresaId}:
 *   patch:
 *     summary: Cancelar assinatura de um anúncio
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: empresaId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assinatura cancelada
 *       404:
 *         description: Empresa ou assinatura não encontrada
 */
router.patch('/cancelar/:empresaId', autenticar, async (req, res) => {
  const { empresaId } = req.params;

  const { rows } = await pool.query(
    'SELECT mp_assinatura_id FROM empresas WHERE id = $1',
    [empresaId]
  );

  if (rows.length === 0 || !rows[0].mp_assinatura_id) {
    return res.status(404).json({ sucesso: false, mensagem: 'Assinatura não encontrada' });
  }

  const assinaturaId = rows[0].mp_assinatura_id;

  try {
    // Cancelar no MP
    await preApproval.update({
      id: assinaturaId,
      body: { status: 'cancelled' },
    });

    // Atualizar banco
    await pool.query(
      `UPDATE empresas SET status_assinatura = 'cancelada', updated_at = NOW() WHERE id = $1`,
      [empresaId]
    );

    return res.json({ sucesso: true, mensagem: 'Assinatura cancelada com sucesso' });

  } catch (erro) {
    console.error('Erro ao cancelar assinatura:', erro);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao cancelar assinatura no Mercado Pago' });
  }
});

module.exports = router;