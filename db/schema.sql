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

CREATE TABLE empresas (
  id SERIAL PRIMARY KEY,
  
  -- Informações principais
  cnae VARCHAR(255) NOT NULL,
  setor VARCHAR(200) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  
  -- Informações financeiras
  faturamento_anual VARCHAR(100),
  margem_lucro VARCHAR(100),
  preco_venda VARCHAR(50),
  
  -- Informações da empresa
  ano_fundacao VARCHAR(10),
  numero_funcionarios VARCHAR(100),
  tipo_imovel VARCHAR(200),
  
  -- Arrays armazenados como JSONB
  destaques JSONB,
  imagens JSONB,
  
  -- Dados de pagamento (APENAS ÚLTIMOS 4 DÍGITOS - PCI-DSS Compliance)
  ultimos_4_digitos_cartao VARCHAR(4),
  nome_cartao VARCHAR(100),
  validade_cartao VARCHAR(7),
  
  -- Contato
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  
  -- Status e controle
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Campos de controle de assinatura
  data_inicio_assinatura DATE,
  data_fim_assinatura DATE,
  status_assinatura VARCHAR(20) DEFAULT 'ativa',
  
  -- Timestamps automáticos
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PASSO 2: Adicionar comentários nas colunas
-- =====================================================

COMMENT ON TABLE empresas IS 'Tabela de empresas cadastradas no sistema';
COMMENT ON COLUMN empresas.cnae IS 'Código e descrição CNAE da empresa (ex: 7420002 - ATIVIDADES DE PRODUÇÃO DE FOTOGRAFIAS)';
COMMENT ON COLUMN empresas.setor IS 'Setor de atuação da empresa';
COMMENT ON COLUMN empresas.estado IS 'Sigla do estado (UF)';
COMMENT ON COLUMN empresas.cidade IS 'Nome da cidade';
COMMENT ON COLUMN empresas.faturamento_anual IS 'Faixa de faturamento anual (ex: Microempresa - Até R$ 360 mil/ano)';
COMMENT ON COLUMN empresas.margem_lucro IS 'Faixa de margem de lucro (ex: Baixa - De 1% a 10%)';
COMMENT ON COLUMN empresas.preco_venda IS 'Preço de venda da empresa (ex: R$ 250.000,00)';
COMMENT ON COLUMN empresas.ano_fundacao IS 'Ano de fundação da empresa';
COMMENT ON COLUMN empresas.numero_funcionarios IS 'Faixa de número de funcionários (ex: 6 a 10 funcionários)';
COMMENT ON COLUMN empresas.tipo_imovel IS 'Tipo do imóvel (ex: Alugado (shopping), Próprio)';
COMMENT ON COLUMN empresas.destaques IS 'Array JSON com destaques da empresa';
COMMENT ON COLUMN empresas.imagens IS 'Array JSON com URLs das imagens da empresa';
COMMENT ON COLUMN empresas.ultimos_4_digitos_cartao IS 'Últimos 4 dígitos do cartão para referência (PCI-DSS compliance - NÃO armazena número completo)';
COMMENT ON COLUMN empresas.nome_cartao IS 'Nome impresso no cartão';
COMMENT ON COLUMN empresas.validade_cartao IS 'Validade do cartão (formato MM/AA)';
COMMENT ON COLUMN empresas.telefone IS 'Telefone de contato';
COMMENT ON COLUMN empresas.email IS 'Email de contato';
COMMENT ON COLUMN empresas.ativo IS 'Status da empresa (ativo/inativo)';
COMMENT ON COLUMN empresas.data_inicio_assinatura IS 'Data de início da assinatura atual';
COMMENT ON COLUMN empresas.data_fim_assinatura IS 'Data de término da assinatura';
COMMENT ON COLUMN empresas.status_assinatura IS 'Status: ativa, expirando, expirada, cancelada';

-- =====================================================
-- PASSO 3: Criar índices para otimização
-- =====================================================

CREATE INDEX idx_empresas_assinatura 
ON empresas(data_fim_assinatura, ativo) 
WHERE ativo = TRUE;

CREATE INDEX idx_empresas_email 
ON empresas(email);

CREATE INDEX idx_empresas_estado_cidade 
ON empresas(estado, cidade);

CREATE INDEX idx_empresas_setor 
ON empresas(setor);

CREATE INDEX idx_empresas_status_assinatura 
ON empresas(status_assinatura);

-- Índice GIN para busca nos arrays JSON
CREATE INDEX idx_empresas_destaques 
ON empresas USING GIN (destaques);

CREATE INDEX idx_empresas_imagens 
ON empresas USING GIN (imagens);

-- =====================================================
-- PASSO 4: Criar trigger para atualizar updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_empresas_updated_at 
  BEFORE UPDATE ON empresas 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PASSO 5: Criar view para cálculo automático de status
-- =====================================================

CREATE OR REPLACE VIEW empresas_com_status AS
SELECT 
  *,
  CASE 
    WHEN data_fim_assinatura IS NULL THEN 'sem_assinatura'
    WHEN data_fim_assinatura < CURRENT_DATE THEN 'expirada'
    WHEN (data_fim_assinatura - CURRENT_DATE) <= 7 THEN 'expirando'
    ELSE 'ativa'
  END as status_calculado,
  CASE 
    WHEN data_fim_assinatura IS NULL THEN NULL
    ELSE (data_fim_assinatura - CURRENT_DATE)
  END as dias_restantes
FROM empresas;

COMMENT ON VIEW empresas_com_status IS 'View que inclui cálculo automático do status da assinatura baseado na data de término';

-- =====================================================
-- PASSO 6: Dados de exemplo (OPCIONAL - Remova se não quiser)
-- =====================================================

-- Exemplo de insert com o novo formato
/*
INSERT INTO empresas (
  cnae, setor, estado, cidade, faturamento_anual, margem_lucro,
  preco_venda, ano_fundacao, numero_funcionarios, tipo_imovel,
  destaques, imagens, ultimos_4_digitos_cartao, nome_cartao,
  validade_cartao, telefone, email, data_inicio_assinatura,
  data_fim_assinatura, status_assinatura
) VALUES (
  '7420002 - ATIVIDADES DE PRODUÇÃO DE FOTOGRAFIAS AÉREAS E SUBMARINAS',
  'ATIVIDADES PROFISSIONAIS, CIENTÍFICAS E TÉCNICAS',
  'MG',
  'Além Paraíba',
  'Microempresa - Até R$ 360 mil/ano',
  'Baixa - De 1% a 10%',
  'R$ 250.000,00',
  '2000',
  '6 a 10 funcionários',
  'Alugado (shopping)',
  '["Alto fluxo de clientes", "Carteira de clientes fidelizados", "Teste de destaque personalizado"]'::jsonb,
  '[]'::jsonb,
  '1234',
  'CIANO M SILVA',
  '10/40',
  '15981156556',
  'exemplo@email.com',
  '2024-01-01',
  '2025-01-01',
  'ativa'
);
*/