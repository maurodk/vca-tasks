-- Criar função RPC para gestores verem todos os perfis
-- Esta função bypassa RLS de forma segura

CREATE OR REPLACE FUNCTION get_all_profiles_for_manager()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ,
  sector_id UUID,
  sectors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual é um gestor
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'manager'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only managers can access this function';
  END IF;

  -- Retornar todos os perfis com dados dos setores
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.created_at,
    p.sector_id,
    CASE 
      WHEN s.name IS NOT NULL THEN 
        jsonb_build_object('id', s.id, 'name', s.name)
      ELSE NULL
    END as sectors
  FROM profiles p
  LEFT JOIN sectors s ON p.sector_id = s.id
  ORDER BY p.full_name;
END;
$$;
