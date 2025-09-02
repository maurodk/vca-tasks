-- Adicionar subsetores para todos os setores existentes
-- Esta migração garante que todos os setores tenham pelo menos alguns subsetores

-- Primeiro, vamos buscar todos os setores existentes e adicionar subsetores genéricos
DO $$
DECLARE
    sector_record RECORD;
BEGIN
    -- Para cada setor existente, criar subsetores padrão se não existirem
    FOR sector_record IN SELECT id, name FROM sectors LOOP
        -- Verificar se já existem subsetores para este setor
        IF NOT EXISTS (SELECT 1 FROM subsectors WHERE sector_id = sector_record.id) THEN
            -- Criar subsetores genéricos baseados no nome do setor
            INSERT INTO subsectors (id, name, description, sector_id, created_at, updated_at) VALUES
                (gen_random_uuid(), sector_record.name || ' - Operações', 'Operações gerais do setor', sector_record.id, NOW(), NOW()),
                (gen_random_uuid(), sector_record.name || ' - Análise', 'Análise e planejamento', sector_record.id, NOW(), NOW()),
                (gen_random_uuid(), sector_record.name || ' - Gestão', 'Gestão e coordenação', sector_record.id, NOW(), NOW());
        END IF;
    END LOOP;
END $$;

-- Se o setor Imobiliário não existir com os subsetores específicos, criar
INSERT INTO sectors (id, name, description, created_at, updated_at)
VALUES (
    'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid,
    'Imobiliário',
    'Setor responsável por todas as operações imobiliárias',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Garantir que o setor Imobiliário tenha os subsetores específicos
INSERT INTO subsectors (id, name, description, sector_id, created_at, updated_at) VALUES
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Sistema', 'Desenvolvimento e manutenção de sistemas', 'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid, NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'Análise', 'Análise de crédito e documentação', 'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Crédito', 'Processamento e aprovação de crédito', 'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid, NOW(), NOW()),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'Contratos', 'Elaboração e gestão de contratos', 'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid, NOW(), NOW()),
    ('55555555-5555-5555-5555-555555555555'::uuid, 'Retenção', 'Retenção e relacionamento com clientes', 'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid, NOW(), NOW()),
    ('66666666-6666-6666-6666-666666666666'::uuid, 'Auditoria', 'Auditoria interna e compliance', 'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid, NOW(), NOW()),
    ('77777777-7777-7777-7777-777777777777'::uuid, 'Expansão', 'Expansão de negócios e novos mercados', 'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();
