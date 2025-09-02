-- Criar enum para tipos de ação no histórico
CREATE TYPE activity_action AS ENUM (
  'created',
  'status_changed',
  'archived',
  'unarchived',
  'deleted',
  'updated'
);

-- Criar tabela de histórico de atividades
CREATE TABLE activity_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  action activity_action NOT NULL,
  old_status activity_status NULL,
  new_status activity_status NULL,
  performed_by UUID NOT NULL REFERENCES profiles(id),
  activity_title TEXT NOT NULL,
  activity_description TEXT,
  subsector_id UUID REFERENCES subsectors(id),
  sector_id UUID NOT NULL REFERENCES sectors(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_activity_history_activity_id ON activity_history(activity_id);
CREATE INDEX idx_activity_history_performed_by ON activity_history(performed_by);
CREATE INDEX idx_activity_history_sector_id ON activity_history(sector_id);
CREATE INDEX idx_activity_history_subsector_id ON activity_history(subsector_id);
CREATE INDEX idx_activity_history_created_at ON activity_history(created_at DESC);
CREATE INDEX idx_activity_history_action ON activity_history(action);

-- Políticas RLS
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;

-- Política para gestores - podem ver tudo do seu setor
CREATE POLICY "Managers can view all history in their sector" ON activity_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
      AND profiles.sector_id = activity_history.sector_id
    )
  );

-- Política para colaboradores - só podem ver histórico do seu subsetor
CREATE POLICY "Collaborators can view history in their subsector" ON activity_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND profiles.subsector_id = activity_history.subsector_id
    )
  );

-- Política para inserção - qualquer usuário autenticado pode inserir
CREATE POLICY "Authenticated users can insert history" ON activity_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Função para registrar histórico automaticamente
CREATE OR REPLACE FUNCTION log_activity_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Para inserção (criação de atividade)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_history (
      activity_id,
      action,
      new_status,
      performed_by,
      activity_title,
      activity_description,
      subsector_id,
      sector_id,
      details
    ) VALUES (
      NEW.id,
      'created',
      NEW.status,
      NEW.created_by,
      NEW.title,
      NEW.description,
      NEW.subsector_id,
      NEW.sector_id,
      jsonb_build_object(
        'priority', NEW.priority,
        'due_date', NEW.due_date,
        'estimated_time', NEW.estimated_time,
        'assigned_to', NEW.user_id
      )
    );
    RETURN NEW;
  END IF;

  -- Para atualização
  IF TG_OP = 'UPDATE' THEN
    -- Se mudou o status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO activity_history (
        activity_id,
        action,
        old_status,
        new_status,
        performed_by,
        activity_title,
        activity_description,
        subsector_id,
        sector_id,
        details
      ) VALUES (
        NEW.id,
        CASE 
          WHEN NEW.status = 'archived' THEN 'archived'
          WHEN OLD.status = 'archived' AND NEW.status != 'archived' THEN 'unarchived'
          ELSE 'status_changed'
        END,
        OLD.status,
        NEW.status,
        auth.uid(),
        NEW.title,
        NEW.description,
        NEW.subsector_id,
        NEW.sector_id,
        jsonb_build_object(
          'priority', NEW.priority,
          'due_date', NEW.due_date,
          'estimated_time', NEW.estimated_time,
          'assigned_to', NEW.user_id
        )
      );
    -- Se mudou outros campos importantes
    ELSIF (OLD.title IS DISTINCT FROM NEW.title) OR 
          (OLD.description IS DISTINCT FROM NEW.description) OR
          (OLD.priority IS DISTINCT FROM NEW.priority) OR
          (OLD.due_date IS DISTINCT FROM NEW.due_date) OR
          (OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
      INSERT INTO activity_history (
        activity_id,
        action,
        new_status,
        performed_by,
        activity_title,
        activity_description,
        subsector_id,
        sector_id,
        details
      ) VALUES (
        NEW.id,
        'updated',
        NEW.status,
        auth.uid(),
        NEW.title,
        NEW.description,
        NEW.subsector_id,
        NEW.sector_id,
        jsonb_build_object(
          'priority', NEW.priority,
          'due_date', NEW.due_date,
          'estimated_time', NEW.estimated_time,
          'assigned_to', NEW.user_id,
          'changes', jsonb_build_object(
            'title_changed', OLD.title IS DISTINCT FROM NEW.title,
            'description_changed', OLD.description IS DISTINCT FROM NEW.description,
            'priority_changed', OLD.priority IS DISTINCT FROM NEW.priority,
            'due_date_changed', OLD.due_date IS DISTINCT FROM NEW.due_date,
            'assigned_to_changed', OLD.user_id IS DISTINCT FROM NEW.user_id
          )
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Para exclusão
  IF TG_OP = 'DELETE' THEN
    INSERT INTO activity_history (
      activity_id,
      action,
      old_status,
      performed_by,
      activity_title,
      activity_description,
      subsector_id,
      sector_id,
      details
    ) VALUES (
      OLD.id,
      'deleted',
      OLD.status,
      auth.uid(),
      OLD.title,
      OLD.description,
      OLD.subsector_id,
      OLD.sector_id,
      jsonb_build_object(
        'priority', OLD.priority,
        'due_date', OLD.due_date,
        'estimated_time', OLD.estimated_time,
        'assigned_to', OLD.user_id
      )
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para registrar histórico automaticamente
CREATE TRIGGER activity_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW EXECUTE FUNCTION log_activity_history();

-- Comentários para documentação
COMMENT ON TABLE activity_history IS 'Histórico de todas as ações realizadas nas atividades';
COMMENT ON COLUMN activity_history.action IS 'Tipo de ação realizada (created, status_changed, archived, unarchived, deleted, updated)';
COMMENT ON COLUMN activity_history.old_status IS 'Status anterior da atividade (apenas para mudanças de status)';
COMMENT ON COLUMN activity_history.new_status IS 'Novo status da atividade';
COMMENT ON COLUMN activity_history.performed_by IS 'Usuário que realizou a ação';
COMMENT ON COLUMN activity_history.details IS 'Detalhes adicionais da ação em formato JSON';
