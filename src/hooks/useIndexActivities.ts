import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Activity } from "@/hooks/useOptimizedActivities";

// Hook simplificado especificamente para a página Index (KPIs + Calendário)
export function useIndexActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.sector_id) return;

    const fetchActivities = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("activities")
          .select(
            `
            *,
            profiles:user_id (
              full_name,
              avatar_url
            ),
            subsectors (
              name
            )
          `
          )
          .eq("sector_id", profile.sector_id)
          .neq("status", "archived")
          .order("created_at", { ascending: false });

        // Filtro para colaboradores
        if (profile.role === "collaborator" && profile.subsector_id) {
          query = query.eq("subsector_id", profile.subsector_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        setActivities((data as unknown as Activity[]) || []);
      } catch (error) {
        console.error("Erro ao carregar atividades:", error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Real-time subscription apenas para esta instância
    const channel = supabase
      .channel(`index_activities_${profile.sector_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
          filter: `sector_id=eq.${profile.sector_id}`,
        },
        () => {
          // Refetch após mudanças
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.sector_id, profile?.role, profile?.subsector_id]);

  return { activities, loading };
}
