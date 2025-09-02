-- Criar setor Imobiliário se não existir
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

-- Criar subsetores predefinidos
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

-- Atualizar perfis existentes para garantir que estão no setor Imobiliário
UPDATE profiles 
SET sector_id = 'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid
WHERE sector_id IS NULL OR sector_id != 'a2c19172-e2c2-41d9-957b-c3f4dadf6755'::uuid;

-- Adicionar constraint para garantir que apenas os roles válidos sejam usados
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('collaborator', 'manager'));
    END IF;
END $$;
