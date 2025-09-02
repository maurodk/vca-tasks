import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type ActivityStatus = "pending" | "in_progress" | "completed" | "archived";

export function useActivityOperations() {
  const { toast } = useToast();

  const updateActivityStatus = useCallback(
    async (activityId: string, status: ActivityStatus) => {
      try {
        const updateData: {
          status: ActivityStatus;
          completed_at?: string | null;
        } = { status };

        if (status === "completed") {
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }

        const { error } = await supabase
          .from("activities")
          .update(updateData)
          .eq("id", activityId);

        if (error) throw error;

        toast({
          title: "Atividade atualizada",
          description: `Status alterado para ${getStatusLabel(status)}.`,
        });

        return true;
      } catch (error) {
        console.error("Erro ao atualizar atividade:", error);
        toast({
          title: "Erro ao atualizar atividade",
          description: "Não foi possível atualizar o status da atividade.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  const archiveActivity = useCallback(
    async (activityId: string) => {
      return updateActivityStatus(activityId, "archived");
    },
    [updateActivityStatus]
  );

  const unarchiveActivity = useCallback(
    async (activityId: string) => {
      return updateActivityStatus(activityId, "pending");
    },
    [updateActivityStatus]
  );

  return {
    updateActivityStatus,
    archiveActivity,
    unarchiveActivity,
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
