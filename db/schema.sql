-- ============================================
-- Schema do Banco de Dados
-- ============================================

-- No Supabase NÃO se cria database, já existe o padrão "postgres"
-- Caso queira organizar tudo, você pode criar um schema:
-- CREATE SCHEMA balcao;

-- ============================================
-- Tabela: usuarios
-- ============================================

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

COMMENT ON COLUMN usuarios.senha IS 'Senha criptografada com bcrypt';
COMMENT ON COLUMN usuarios.ativo IS 'Status do usuário';

-- ============================================
-- Tabela: contatos
-- ============================================

CREATE TABLE IF NOT EXISTS contatos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  cidade VARCHAR(100),
  tipo VARCHAR(50)
);

COMMENT ON COLUMN contatos.tipo IS 'Tipo do contato (ex: cliente, fornecedor, parceiro)';

-- ============================================
-- Tabela: empresas
-- ============================================

CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  setor VARCHAR(200) NOT NULL,
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  razao_social VARCHAR(200),
  email VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  localizacao VARCHAR(255),
  info VARCHAR(200),
  lucro DECIMAL(15,2),
  valor DECIMAL(15,2),
  faturamento DECIMAL(15,2),
  tipo VARCHAR(50),
  ano_fundacao INT,
  assinatura INT,
  funcionarios INT,
  tipo_imovel VARCHAR(200),
  dif VARCHAR(500),
  img VARCHAR(500),
  ativo BOOLEAN DEFAULT TRUE
);

COMMENT ON COLUMN empresas.cnpj IS 'CNPJ apenas números';
COMMENT ON COLUMN empresas.lucro IS 'Lucro em reais';
COMMENT ON COLUMN empresas.valor IS 'Valor em reais';
COMMENT ON COLUMN empresas.faturamento IS 'Faturamento em reais';
COMMENT ON COLUMN empresas.tipo IS 'Tipo/ área da empresa';
COMMENT ON COLUMN empresas.assinatura IS 'Tempo em dias';
COMMENT ON COLUMN empresas.ativo IS 'Status da empresa';
