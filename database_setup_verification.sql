-- SQL para executar no Supabase SQL Editor
-- Execute este comando para aplicar as migrações necessárias

-- 1. Verificar se a tabela invitations já existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'invitations'
);

-- Se a tabela não existir, execute o arquivo de migração:
-- supabase/migrations/20250901180000_create_invitations_table.sql

-- 2. Verificar estrutura da tabela invitations
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invitations' 
ORDER BY ordinal_position;

-- 3. Verificar se as políticas RLS estão configuradas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'invitations';
