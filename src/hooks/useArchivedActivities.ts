import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types/supabase";

// Tipos específicos para atividades arquivadas
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ProfileData = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "avatar_url"
>;
type SubsectorData = Pick<
  Database["public"]["Tables"]["subsectors"]["Row"],
  "name"
>;

export type ArchivedActivity = ActivityRow & {
  profiles?: ProfileData | null;
  subsectors?: SubsectorData | null;
};

/**
 * Hook específico para gerenciar APENAS atividades arquivadas
 * Não usa subscription em tempo real para evitar refetch automático
 */
export function useArchivedActivities() {
  const [activities, setActivities] = useState<ArchivedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchArchivedActivities = useCallback(async () => {
    if (!profile?.sector_id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
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
          )
        `
        )
        .eq("sector_id", profile.sector_id)
        .eq("status", "archived")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setActivities((data as unknown as ArchivedActivity[]) || []);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: "Erro ao carregar atividades arquivadas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile, toast]);

  const deleteActivity = useCallback(
    async (activityId: string) => {
      try {
        // Usar RPC para deletar (bypassa políticas RLS)
        const { data, error } = await supabase.rpc("delete_activity", {
          activity_id: activityId,
        });

        if (error) {
          throw error;
        }

        // Verificar se a exclusão foi bem-sucedida
        if (!data) {
          throw new Error(
            "Não foi possível excluir a atividade. Verifique se você tem permissão ou se a atividade existe."
          );
        }

        // Atualizar estado local imediatamente
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

  const unarchiveActivity = useCallback(
    async (
      activityId: string,
      newStatus: "pending" | "in_progress" = "pending"
    ) => {
      try {
        const { error } = await supabase
          .from("activities")
          .update({ status: newStatus })
          .eq("id", activityId);

        if (error) throw error;

        // Remove from local state
        setActivities((prev) =>
          prev.filter((activity) => activity.id !== activityId)
        );

        toast({
          title: "Atividade recuperada",
          description: `A atividade foi restaurada como ${
            newStatus === "pending" ? "Pendente" : "Em Andamento"
          }.`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        toast({
          title: "Erro ao recuperar atividade",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Fetch inicial apenas
  useEffect(() => {
    fetchArchivedActivities();
  }, [fetchArchivedActivities]);

  // SEM subscription em tempo real para evitar refetch automático

  return {
    activities,
    loading,
    error,
    deleteActivity,
    unarchiveActivity,
    refetch: fetchArchivedActivities,
  };
}
