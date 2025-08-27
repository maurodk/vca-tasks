import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  estimated_time: number | null;
  due_date: string | null;
  completed_at: string | null;
  user_id: string;
  sector_id: string;
  subsector_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Join fields
  profiles?: any;
  subsectors?: any;
}

interface UseActivitiesOptions {
  subsectorId?: string;
  userId?: string;
  status?: Array<'pending' | 'in_progress' | 'completed' | 'archived'>;
}

export function useActivities(options: UseActivitiesOptions = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
    if (!profile?.sector_id) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('activities')
        .select(`
          *,
          profiles:user_id (full_name, email),
          subsectors:subsector_id (name)
        `)
        .eq('sector_id', profile.sector_id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.subsectorId) {
        query = query.eq('subsector_id', options.subsectorId);
      }

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.status && options.status.length > 0) {
        query = query.in('status', options.status as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      setActivities((data as any) || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Erro ao carregar atividades",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.sector_id, options.subsectorId, options.userId, options.status, toast]);

  const updateActivityStatus = useCallback(async (activityId: string, status: Activity['status']) => {
    try {
      const updateData: any = { status };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', activityId);

      if (error) throw error;

      // Update local state
      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, ...updateData }
            : activity
        )
      );

      toast({
        title: "Atividade atualizada",
        description: `Status alterado para ${getStatusLabel(status)}.`,
      });

    } catch (err: any) {
      toast({
        title: "Erro ao atualizar atividade",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const archiveActivity = useCallback(async (activityId: string) => {
    return updateActivityStatus(activityId, 'archived');
  }, [updateActivityStatus]);

  const deleteActivity = useCallback(async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      // Update local state
      setActivities(prev => prev.filter(activity => activity.id !== activityId));

      toast({
        title: "Atividade excluída",
        description: "A atividade foi excluída permanentemente.",
      });

    } catch (err: any) {
      toast({
        title: "Erro ao excluir atividade",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!profile?.sector_id) return;

    const channel = supabase
      .channel('activities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `sector_id=eq.${profile.sector_id}`,
        },
        () => {
          // Refetch activities when there are changes
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.sector_id, fetchActivities]);

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    updateActivityStatus,
    archiveActivity,
    deleteActivity,
  };
}

function getStatusLabel(status: Activity['status']): string {
  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em andamento',
    completed: 'Concluída',
    archived: 'Arquivada',
  };
  return statusLabels[status];
}