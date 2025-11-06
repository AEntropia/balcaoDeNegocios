-- ============================================
-- Schema do Banco de Dados
-- ============================================

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS minha_api_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE minha_api_db;

-- ============================================
-- Tabela: usuarios
-- Descrição: Armazena os usuários do sistema
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL COMMENT 'Senha criptografada com bcrypt',
  ativo BOOLEAN DEFAULT TRUE COMMENT 'Status do usuário',
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela de usuários do sistema';

-- ============================================
-- Tabela: contatos
-- Descrição: Armazena contatos enviados pelo site
-- ============================================
CREATE TABLE IF NOT EXISTS contatos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  telefone VARCHAR(20) NULL,
  cidade VARCHAR(100) NULL,
  tipo VARCHAR(50) NULL COMMENT 'Tipo do contato (ex: cliente, fornecedor, parceiro)',
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela de contatos recebidos';

-- ============================================
-- Tabela: empresas
-- Descrição: Armazena informações de empresas
-- ============================================
CREATE TABLE IF NOT EXISTS empresas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  nome VARCHAR(200) NOT NULL,
  setor VARCHAR(200) NOT NULL,
  cnpj VARCHAR(14) UNIQUE NOT NULL COMMENT 'CNPJ apenas números',
  razao_social VARCHAR(200) NULL,
  email VARCHAR(100) NOT NULL,
  telefone VARCHAR(20) NULL,
  localizacao VARCHAR(255) NULL,
  info VARCHAR(200) NULL,
  lucro DECIMAL(15, 2) NULL COMMENT 'Lucro em reais',
  valor DECIMAL(15, 2) NULL COMMENT 'Valor em reais',
  faturamento DECIMAL(15, 2) NULL COMMENT 'Faturamento em reais',
  tipo VARCHAR(50) NULL COMMENT 'Tipo/ área da empresa',
  descricao TEXT NULL COMMENT 'Descrição detalhada da empresa',
  ano_fundacao INT,
  tempo_operacao INT,
  assinatura INT COMMENT 'Tempo em dias',
  funcionarios INT,
  area_imovel DECIMAL(15, 2) NULL,
  tipo_imovel VARCHAR(200) NULL,
  motivo_venda VARCHAR(500) NULL,
  dif VARCHAR(500) NULL,
  img VARCHAR(500) NULL,
  ativo BOOLEAN DEFAULT TRUE COMMENT 'Status da empresa',

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela de empresas cadastradas';

-- ============================================
-- Dados de exemplo (opcional)
-- ============================================

-- Inserir usuário admin de teste
-- Senha: admin123 (você precisará gerar o hash real com bcrypt)
INSERT INTO usuarios (nome, email, senha, ativo) VALUES 
('Administrador', 'admin@exemplo.com', '$2b$10$rX5YqJk5qJHGqZ9nqVz9xO8KqQ7EqJHgqZ9nqVz9xO8KqQ7EqJHgq', TRUE);

-- Inserir alguns contatos de exemplo
INSERT INTO contatos (nome, email, telefone, cidade, tipo) VALUES
('João Silva', 'joao@exemplo.com', '(15) 99999-9999', 'Sorocaba', 'cliente'),
('Maria Santos', 'maria@exemplo.com', '(11) 98888-8888', 'São Paulo', 'parceiro'),
('Pedro Oliveira', 'pedro@exemplo.com', '(19) 97777-7777', 'Campinas', 'fornecedor');

-- Inserir algumas empresas de exemplo
INSERT INTO empresas (nome, cnpj, razao_social, email, telefone, cidade, estado, valor, faturamento, tipo, descricao, ativo) VALUES
('Tech Solutions LTDA', '12345678000190', 'Tech Solutions Tecnologia LTDA', 'contato@techsolutions.com', '(15) 3333-4444', 'Sorocaba', 'SP', 50000.00, 1500000.00, 'cliente', 'Empresa de tecnologia especializada em desenvolvimento de software', TRUE),
('Comércio XYZ', '98765432000180', 'XYZ Comércio e Serviços LTDA', 'comercio@xyz.com', '(11) 2222-3333', 'São Paulo', 'SP', 25000.00, 800000.00, 'parceiro', 'Comércio varejista de produtos diversos', TRUE),
('Indústria ABC', '11223344000155', 'ABC Indústria e Comércio S.A.', 'contato@abc.com', '(19) 3344-5566', 'Campinas', 'SP', 100000.00, 5000000.00, 'fornecedor', 'Indústria de componentes eletrônicos', TRUE);

-- ============================================
-- Verificação final
-- ============================================

SHOW TABLES;

SELECT 'Banco de dados criado com sucesso!' AS status;