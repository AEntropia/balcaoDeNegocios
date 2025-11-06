require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false // Necessário para Supabase
  }
});

// Testar conexão
pool.connect()
  .then(client => {
    console.log('✅ Conectado ao banco de dados PostgreSQL (Supabase)');
    client.release();
  })
  .catch(erro => {
    console.error('❌ Erro ao conectar ao banco de dados:', erro.message);
  });

module.exports = pool;