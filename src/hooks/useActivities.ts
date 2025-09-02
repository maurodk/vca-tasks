import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types/supabase";

// 1. Tipo 'Activity' aprimorado e derivado do Supabase
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type SubtaskRow = Database["public"]["Tables"]["subtasks"]["Row"];
type ProfileData = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "avatar_url"
>;
type SubsectorData = Pick<
  Database["public"]["Tables"]["subsectors"]["Row"],
  "name"
>;

export type Subtask = SubtaskRow;

export type Activity = ActivityRow & {
  profiles?: ProfileData | null;
  subsectors?: SubsectorData | null;
  subtasks?: Subtask[];
};

// 2. Tipo 'ActivityStatus' derivado diretamente do Enum do DB
type ActivityStatus = Database["public"]["Enums"]["activity_status"];

interface UseActivitiesOptions {
  subsectorId?: string;
  userId?: string;
  status?: ActivityStatus[];
  includeArchived?: boolean; // Nova opção para incluir arquivadas
}

export type { UseActivitiesOptions };

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
        .from("activities")
        .select(
          `
          *,
          profiles (
            full_name,
            avatar_url
          ),
          subsectors (
            name
          ),
          subtasks (
            id,
            activity_id,
            title,
            description,
            is_completed,
            order_index,
            created_at,
            updated_at
          )
        `
        )
        .eq("sector_id", profile.sector_id)
        .order("created_at", { ascending: false });

      // Aplicar filtros baseados no role e opções
      if (options.subsectorId) {
        query = query.eq("subsector_id", options.subsectorId);
      } else if (profile.role === "collaborator" && profile.subsector_id) {
        // Colaboradores veem apenas atividades do seu subsetor
        query = query.eq("subsector_id", profile.subsector_id);
      }

      if (options.userId) {
        query = query.eq("user_id", options.userId);
      }

      if (options.status && options.status.length > 0) {
        query = query.in("status", options.status);
      } else if (!options.includeArchived) {
        // Por padrão, excluir atividades arquivadas
        query = query.neq("status", "archived");
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Conversão usando unknown primeiro
      setActivities((data as unknown as Activity[]) || []);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: "Erro ao carregar atividades",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    profile?.sector_id,
    profile?.role,
    profile?.subsector_id,
    options,
    toast,
  ]);

  const updateActivityStatus = useCallback(
    async (activityId: string, status: ActivityStatus) => {
      try {
        const updateData: Partial<ActivityRow> & { status: ActivityStatus } = {
          status,
        };

        if (status === "completed") {
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }

        const { data, error } = await supabase
          .from("activities")
          .update(updateData)
          .eq("id", activityId)
          .select();

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error(
            "Nenhuma linha foi atualizada. Verifique se você tem permissão para editar esta atividade."
          );
        }

        // Update local state
        setActivities((prev) => {
          const updatedActivities = prev.map((activity) =>
            activity.id === activityId
              ? { ...activity, ...updateData }
              : activity
          );

          // Se a atividade foi arquivada e não estamos incluindo arquivadas, remover da lista
          if (status === "archived" && !options.includeArchived) {
            return updatedActivities.filter(
              (activity) => activity.id !== activityId
            );
          }

          return updatedActivities;
        });

        toast({
          title: "Atividade atualizada",
          description: `Status alterado para ${getStatusLabel(status)}.`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        toast({
          title: "Erro ao atualizar atividade",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [toast, options.includeArchived]
  );

  const archiveActivity = useCallback(
    async (activityId: string) => {
      return updateActivityStatus(activityId, "archived");
    },
    [updateActivityStatus]
  );

  const deleteActivity = useCallback(
    async (activityId: string) => {
      try {
        const { error } = await supabase
          .from("activities")
          .delete()
          .eq("id", activityId);

        if (error) throw error;

        // Update local state immediately after success
        setActivities((prev) =>
          prev.filter((activity) => activity.id !== activityId)
        );

        toast({
          title: "Atividade excluída",
          description: "A atividade foi excluída permanentemente.",
        });
      } catch (err: unknown) {
        const error = err as Error;
        toast({
          title: "Erro ao excluir atividade",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Set up real-time subscription - Otimizado para melhor performance
  useEffect(() => {
    if (!profile?.sector_id) return;

    // Não usar subscription para atividades arquivadas para evitar refetch
    if (options.status?.includes("archived" as ActivityStatus)) {
      return;
    }

    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let debounceTimeout: NodeJS.Timeout;

    const setupSubscription = () => {
      channel = supabase
        .channel(`activities_changes_${profile.sector_id}_${Math.random()}`) // Adicionar random para evitar conflitos
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "activities",
            filter: `sector_id=eq.${profile.sector_id}`,
          },
          (payload) => {
            if (mounted) {
              console.log("Real-time event recebido:", payload.eventType);

              // Debounce mais longo para evitar múltiplas chamadas
              clearTimeout(debounceTimeout);
              debounceTimeout = setTimeout(() => {
                if (mounted) {
                  fetchActivities();
                }
              }, 2000); // 2 segundos de debounce
            }
          }
        )
        .subscribe((status) => {
          if (mounted) {
            console.log("Subscription status:", status);
          }
        });
    };

    // Delay na criação da subscription para evitar múltiplas simultâneas
    const subscriptionTimeout = setTimeout(() => {
      if (mounted) {
        setupSubscription();
      }
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(debounceTimeout);
      clearTimeout(subscriptionTimeout);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.sector_id, options.status]); // fetchActivities é estável

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

function getStatusLabel(status: ActivityStatus): string {
  const statusLabels: Record<ActivityStatus, string> = {
    pending: "Pendente",
    in_progress: "Em andamento",
    completed: "Concluída",
    archived: "Arquivada",
  };
  return statusLabels[status];
}
