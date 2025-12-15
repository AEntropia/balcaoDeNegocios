// =====================================================
// ARQUIVO: src/jobs/verificarAssinaturas.js
// Cron job para verificar e atualizar status de assinaturas
// =====================================================

const cron = require('node-cron');
const nodemailer = require('nodemailer');
const pool = require('../config/database');

// Configurar o transporte de email (ajuste com suas credenciais)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER, // seu email
    pass: process.env.SMTP_PASS  // senha de app do gmail
  }
});

// Função para enviar email de aviso
async function enviarEmailAviso(empresa) {
  try {
    const diasRestantes = empresa.dias_restantes;
    const dataFim = new Date(empresa.data_fim_assinatura).toLocaleDateString('pt-BR');

    const mailOptions = {
      from: `"Sistema de Empresas" <${process.env.SMTP_USER}>`,
      to: empresa.email,
      subject: '⚠️ Sua assinatura está expirando em breve',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff9800;">Aviso de Vencimento de Assinatura</h2>
          
          <p>Olá, <strong>${empresa.nome}</strong>!</p>
          
          <p>Sua assinatura está próxima do vencimento:</p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Data de vencimento:</strong> ${dataFim}</p>
            <p style="margin: 5px 0;"><strong>Dias restantes:</strong> ${diasRestantes} dia(s)</p>
          </div>
          
          <p>Para continuar aproveitando nossos serviços sem interrupções, renove sua assinatura o quanto antes.</p>
          
          <a href="${process.env.APP_URL}/renovar-assinatura" 
             style="display: inline-block; background-color: #4CAF50; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 5px; 
                    margin: 20px 0;">
            Renovar Agora
          </a>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Se você já renovou, desconsidere este email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            Este é um email automático, por favor não responda.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado para: ${empresa.email}`);
    
    return true;
  } catch (erro) {
    console.error(`❌ Erro ao enviar email para ${empresa.email}:`, erro.message);
    return false;
  }
}

// Função para enviar email de expiração
async function enviarEmailExpiracao(empresa) {
  try {
    const mailOptions = {
      from: `"Sistema de Empresas" <${process.env.SMTP_USER}>`,
      to: empresa.email,
      subject: '🔴 Sua assinatura expirou',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Assinatura Expirada</h2>
          
          <p>Olá, <strong>${empresa.nome}</strong>!</p>
          
          <div style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;">Sua assinatura expirou e seu anúncio foi desativado.</p>
          </div>
          
          <p>Para reativar seu anúncio e continuar aproveitando nossos serviços, renove sua assinatura agora mesmo.</p>
          
          <a href="${process.env.APP_URL}/renovar-assinatura" 
             style="display: inline-block; background-color: #f44336; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 5px; 
                    margin: 20px 0;">
            Renovar Assinatura
          </a>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            Este é um email automático, por favor não responda.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de expiração enviado para: ${empresa.email}`);
    
    return true;
  } catch (erro) {
    console.error(`❌ Erro ao enviar email de expiração para ${empresa.email}:`, erro.message);
    return false;
  }
}

// Função principal de verificação
async function verificarAssinaturas() {
  console.log('🔍 Iniciando verificação de assinaturas...');
  console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`);

  try {
    // 1. Encontrar assinaturas expirando (7 dias ou menos)
    const empresasExpirando = await pool.query(`
      SELECT id, nome, email, data_fim_assinatura,
             (data_fim_assinatura - CURRENT_DATE) as dias_restantes
      FROM empresas
      WHERE ativo = TRUE
        AND data_fim_assinatura - CURRENT_DATE <= 7
        AND data_fim_assinatura - CURRENT_DATE > 0
        AND status_assinatura = 'ativa'
    `);

    console.log(`⚠️  Empresas expirando: ${empresasExpirando.rows.length}`);

    // Atualizar status para 'expirando' e enviar emails
    for (const empresa of empresasExpirando.rows) {
      // Atualizar status
      await pool.query(`
        UPDATE empresas
        SET status_assinatura = 'expirando'
        WHERE id = $1
      `, [empresa.id]);

      // Enviar email de aviso
      await enviarEmailAviso(empresa);
      
      console.log(`  📧 ${empresa.nome} - ${empresa.dias_restantes} dia(s) restantes`);
    }

    // 2. Encontrar assinaturas expiradas
    const empresasExpiradas = await pool.query(`
      SELECT id, nome, email, data_fim_assinatura
      FROM empresas
      WHERE data_fim_assinatura < CURRENT_DATE
        AND status_assinatura != 'expirada'
    `);

    console.log(`❌ Empresas expiradas: ${empresasExpiradas.rows.length}`);

    // Bloquear empresas expiradas
    for (const empresa of empresasExpiradas.rows) {
      await pool.query(`
        UPDATE empresas
        SET status_assinatura = 'expirada',
            ativo = FALSE
        WHERE id = $1
      `, [empresa.id]);

      // Enviar email de expiração
      await enviarEmailExpiracao(empresa);
      
      console.log(`  🔒 ${empresa.nome} - Bloqueada`);
    }

    // 3. Estatísticas gerais
    const estatisticas = await pool.query(`
      SELECT 
        status_assinatura,
        COUNT(*) as quantidade
      FROM empresas
      GROUP BY status_assinatura
      ORDER BY quantidade DESC
    `);

    console.log('\n📊 Estatísticas:');
    estatisticas.rows.forEach(stat => {
      console.log(`  ${stat.status_assinatura}: ${stat.quantidade}`);
    });

    console.log('\n✅ Verificação concluída com sucesso!\n');

  } catch (erro) {
    console.error('❌ Erro na verificação de assinaturas:', erro);
  }
}

// Configurar cron job para rodar todo dia às 00:00 (meia-noite)
function iniciarCronJob() {
  // Formato: segundo minuto hora dia mês dia-da-semana
  // '0 0 * * *' = todo dia às 00:00
  cron.schedule('0 0 * * *', async () => {
    await verificarAssinaturas();
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });

  console.log('✅ Cron job de assinaturas iniciado');
  console.log('⏰ Rodará todo dia às 00:00 (horário de Brasília)');
}

// Executar imediatamente ao iniciar (opcional, para testes)
async function executarAgora() {
  console.log('🚀 Executando verificação manual...\n');
  await verificarAssinaturas();
}

module.exports = {
  iniciarCronJob,
  executarAgora,
  verificarAssinaturas
};
