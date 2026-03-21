const express = require('express');
const router = express.Router();
const mercadopago = require('../config/mercadopago');
const pool = require('../config/database');
const autenticar = require('../middleware/auth');

// ─── Planos disponíveis ────────────────────────────────────────────────────────
const PLANOS = {
  mensal: {
    nome: 'Anúncio Mensal',
    valor: 99.90,         // ← Altere para o valor real
    frequency: 1,
    frequency_type: 'months',
  },
  anual: {
    nome: 'Anúncio Anual',
    valor: 899.90,        // ← Altere para o valor real
    frequency: 12,
    frequency_type: 'months',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mapeia o status do Mercado Pago para o status interno do sistema.
 *
 * MP status  → status_assinatura interno
 * pending    → aguardando
 * authorized → analise
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
 *     tags: [Pagamentos]
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
 *                 example: 1
 *               cardTokenId:
 *                 type: string
 *                 example: "abc123tokenGeradoNoFrontend"
 *               emailPagador:
 *                 type: string
 *                 example: "pagador@email.com"
 *               plano:
 *                 type: string
 *                 enum: [mensal, anual]
 *                 example: "mensal"
 *     responses:
 *       201:
 *         description: Assinatura criada com sucesso
 *       400:
 *         description: Parâmetros inválidos
 *       404:
 *         description: Empresa não encontrada
 *       500:
 *         description: Erro ao processar assinatura
 */
router.post('/assinar', async (req, res) => {
  const { empresaId, cardTokenId, emailPagador, plano } = req.body;

  // Validações
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

  // Verificar se empresa existe
  const { rows } = await pool.query(
    'SELECT id, email FROM empresas WHERE id = $1',
    [empresaId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ sucesso: false, mensagem: 'Empresa não encontrada' });
  }

  const dadosPlano = PLANOS[plano];
console.log('Body recebido:', req.body);
console.log('Access Token configurado:', process.env.MP_ACCESS_TOKEN?.slice(0, 20) + '...');
  try {
  const fetch = require('node-fetch');

  const resposta = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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
      status: 'authorized',
    }),
  });

  const assinatura = await resposta.json();
  console.log('Resposta MP:', JSON.stringify(assinatura, null, 2));

  if (!resposta.ok) {
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Falha ao processar assinatura',
      detalhe: assinatura?.message || assinatura?.error || 'Erro desconhecido',
    });
  }

  const statusInterno = mapearStatusMP(assinatura.status);

  await pool.query(
    `UPDATE empresas
        SET status_assinatura = $1,
            mp_assinatura_id  = $2,
            mp_plano          = $3,
            updated_at        = NOW()
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
  console.error('Erro completo:', JSON.stringify(erro, null, 2));
  return res.status(500).json({
    sucesso: false,
    mensagem: 'Falha ao processar assinatura',
    detalhe: erro?.message || 'Erro desconhecido',
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
 *       de uma assinatura muda.
 *       Configure no painel do MP → Webhooks → subscription_preapproval
 *     tags: [Pagamentos]
 *     responses:
 *       200:
 *         description: Webhook processado
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

    // Buscar dados atualizados da assinatura no MP (SDK v1)
    const assinatura = await mercadopago.preapproval.get(assinaturaId);

    const statusInterno = mapearStatusMP(assinatura.body.status);

    // Buscar empresa vinculada
    const { rows } = await pool.query(
      'SELECT id FROM empresas WHERE mp_assinatura_id = $1',
      [assinaturaId]
    );

    if (rows.length === 0) {
      return res.status(200).json({ ignorado: true, motivo: 'assinatura não vinculada' });
    }

    const empresaId = rows[0].id;

    // Atualizar status
    await pool.query(
      `UPDATE empresas
          SET status_assinatura = $1,
              updated_at        = NOW()
        WHERE id = $2`,
      [statusInterno, empresaId]
    );

    console.log(`[Webhook MP] Empresa #${empresaId} → status: ${statusInterno} (MP: ${assinatura.body.status})`);

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
router.get('/assinatura/:empresaId', async (req, res) => {
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
    // Buscar dados frescos no MP (SDK v1)
    const assinatura = await mercadopago.preapproval.get(empresa.mp_assinatura_id);

    return res.json({
      sucesso: true,
      dados: {
        empresaId: empresa.id,
        plano: empresa.mp_plano,
        statusInterno: empresa.status_assinatura,
        statusMP: assinatura.body.status,
        proximaCobranca: assinatura.body.next_payment_date,
        valorRecorrente: assinatura.body.auto_recurring?.transaction_amount,
        dataInicio: assinatura.body.date_created,
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
router.patch('/cancelar/:empresaId', async (req, res) => {
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
    // Cancelar no MP (SDK v1)
    await mercadopago.preapproval.update({
      id: assinaturaId,
      status: 'cancelled',
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