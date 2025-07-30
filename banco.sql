CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS averbacoes_log (
    id SERIAL PRIMARY KEY,
    numero_nota VARCHAR(50) NOT NULL,
    representante INTEGER,
    tipo_nota INTEGER,
    data_emissao TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    mensagem_retorno TEXT,
    data_processamento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO usuarios (nome, email, senha_hash, role)
VALUES ('Antonio Mafra', 'admin@suaempresa.com', '$2b$10$WU1ZGFq/V0cEzNQi9jz2Xe5x8Vet09mBjyJOGgz7x9O6M3exu/TZS', 'antonio')
ON CONFLICT (email) DO NOTHING;

INSERT INTO averbacoes_log (numero_nota, representante, tipo_nota, data_emissao, status, mensagem_retorno)
VALUES
('385030', 6, 1, NOW(), 'AVERBADA', 'Protocolo AT&M: XYZ123ABC456'),
('385031', 99, 26, NOW(), 'IGNORADA_REGRA', 'Ignorado pela regra: Representante 99 em tipo de nota não permitido.'),
('385032', 12, 1, NOW(), 'ERRO_AVERBACAO', 'Erro 904: Acesso do Webserver não autorizado.');



-- Inserindo duas empresas de exemplo com regras diferentes
INSERT INTO empresas (nome_empresa, cnpj, empresa_id_erp, tipos_nota_considerar, representantes_ignorar, excecao_representante, excecao_tipo_nota)
VALUES 
('Bernardo Rondonia', '05194398000168', 1, '1,3,4,5,6,12,26', '99', '99', '26'),
ON CONFLICT (cnpj) DO NOTHING;