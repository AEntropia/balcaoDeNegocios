const { executarAgora } = require('../jobs/verificarAssinaturas');

// Executar teste
executarAgora()
  .then(() => {
    console.log('Teste concluído');
    process.exit(0);
  })
  .catch(err => {
    console.error('Erro no teste:', err);
    process.exit(1);
  });