-- Políticas RLS para Activities baseadas na função do usuário

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view activities in their sector" ON activities;
DROP POLICY IF EXISTS "Users can create activities in their sector" ON activities;
DROP POLICY IF EXISTS "Users can update activities in their sector" ON activities;
DROP POLICY IF EXISTS "Users can delete activities in their sector" ON activities;

-- Política para visualização de atividades
-- Colaboradores: apenas do seu subsetor
-- Gestores: todos os subsetores do setor
CREATE POLICY "Role-based activity viewing" ON activities
FOR SELECT TO authenticated
USING (
  CASE 
    WHEN (
      SELECT role FROM profiles 
      WHERE id = auth.uid()
    ) = 'manager' THEN
      -- Gestores podem ver todas as atividades do setor
      sector_id = (
        SELECT sector_id FROM profiles 
        WHERE id = auth.uid()
      )
    ELSE
      -- Colaboradores podem ver apenas atividades do seu subsetor
      subsector_id = (
        SELECT subsector_id FROM profiles 
        WHERE id = auth.uid()
      )
  END
);

-- Política para criação de atividades
CREATE POLICY "Role-based activity creation" ON activities
FOR INSERT TO authenticated
WITH CHECK (
  -- Verificar se o usuário está no mesmo setor
  sector_id = (
    SELECT sector_id FROM profiles 
    WHERE id = auth.uid()
  )
  AND
  CASE 
    WHEN (
      SELECT role FROM profiles 
      WHERE id = auth.uid()
    ) = 'manager' THEN
      -- Gestores podem criar atividades em qualquer subsetor do setor
      subsector_id IN (
        SELECT id FROM subsectors 
        WHERE sector_id = (
          SELECT sector_id FROM profiles 
          WHERE id = auth.uid()
        )
      )
    ELSE
      -- Colaboradores podem criar apenas no seu subsetor
      subsector_id = (
        SELECT subsector_id FROM profiles 
        WHERE id = auth.uid()
      )
  END
);

-- Política para atualização de atividades
CREATE POLICY "Role-based activity updating" ON activities
FOR UPDATE TO authenticated
USING (
  CASE 
    WHEN (
      SELECT role FROM profiles 
      WHERE id = auth.uid()
    ) = 'manager' THEN
      -- Gestores podem atualizar atividades do setor
      sector_id = (
        SELECT sector_id FROM profiles 
        WHERE id = auth.uid()
      )
    ELSE
      -- Colaboradores podem atualizar apenas atividades do seu subsetor
      subsector_id = (
        SELECT subsector_id FROM profiles 
        WHERE id = auth.uid()
      )
  END
);

-- Política para exclusão de atividades
CREATE POLICY "Role-based activity deletion" ON activities
FOR DELETE TO authenticated
USING (
  CASE 
    WHEN (
      SELECT role FROM profiles 
      WHERE id = auth.uid()
    ) = 'manager' THEN
      -- Gestores podem deletar atividades do setor
      sector_id = (
        SELECT sector_id FROM profiles 
        WHERE id = auth.uid()
      )
    ELSE
      -- Colaboradores podem deletar apenas suas próprias atividades
      user_id = auth.uid()
  END
);

-- Políticas para Subtasks (seguem as mesmas regras das atividades)
DROP POLICY IF EXISTS "Users can view subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can create subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can update subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can delete subtasks" ON subtasks;

-- Política para visualização de subtasks
CREATE POLICY "Role-based subtask viewing" ON subtasks
FOR SELECT TO authenticated
USING (
  activity_id IN (
    SELECT id FROM activities 
    WHERE 
      CASE 
        WHEN (
          SELECT role FROM profiles 
          WHERE id = auth.uid()
        ) = 'manager' THEN
          sector_id = (
            SELECT sector_id FROM profiles 
            WHERE id = auth.uid()
          )
        ELSE
          subsector_id = (
            SELECT subsector_id FROM profiles 
            WHERE id = auth.uid()
          )
      END
  )
);

-- Política para criação de subtasks
CREATE POLICY "Role-based subtask creation" ON subtasks
FOR INSERT TO authenticated
WITH CHECK (
  activity_id IN (
    SELECT id FROM activities 
    WHERE 
      sector_id = (
        SELECT sector_id FROM profiles 
        WHERE id = auth.uid()
      )
      AND
      CASE 
        WHEN (
          SELECT role FROM profiles 
          WHERE id = auth.uid()
        ) = 'manager' THEN true
        ELSE
          subsector_id = (
            SELECT subsector_id FROM profiles 
            WHERE id = auth.uid()
          )
      END
  )
);

-- Política para atualização de subtasks
CREATE POLICY "Role-based subtask updating" ON subtasks
FOR UPDATE TO authenticated
USING (
  activity_id IN (
    SELECT id FROM activities 
    WHERE 
      CASE 
        WHEN (
          SELECT role FROM profiles 
          WHERE id = auth.uid()
        ) = 'manager' THEN
          sector_id = (
            SELECT sector_id FROM profiles 
            WHERE id = auth.uid()
          )
        ELSE
          subsector_id = (
            SELECT subsector_id FROM profiles 
            WHERE id = auth.uid()
          )
      END
  )
);

-- Política para exclusão de subtasks
CREATE POLICY "Role-based subtask deletion" ON subtasks
FOR DELETE TO authenticated
USING (
  activity_id IN (
    SELECT id FROM activities 
    WHERE 
      CASE 
        WHEN (
          SELECT role FROM profiles 
          WHERE id = auth.uid()
        ) = 'manager' THEN
          sector_id = (
            SELECT sector_id FROM profiles 
            WHERE id = auth.uid()
          )
        ELSE
          user_id = auth.uid() -- Colaboradores só podem deletar subtasks de suas próprias atividades
      END
  )
);

-- Política para visualização de perfis (gestores podem ver todos do setor)
DROP POLICY IF EXISTS "Users can view profiles in their sector" ON profiles;

CREATE POLICY "Role-based profile viewing" ON profiles
FOR SELECT TO authenticated
USING (
  CASE 
    WHEN (
      SELECT role FROM profiles 
      WHERE id = auth.uid()
    ) = 'manager' THEN
      -- Gestores podem ver todos os perfis do setor
      sector_id = (
        SELECT sector_id FROM profiles 
        WHERE id = auth.uid()
      )
    ELSE
      -- Colaboradores podem ver apenas o próprio perfil
      id = auth.uid()
  END
);
