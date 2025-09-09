import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuthFinal";
import { Activity } from "@/hooks/useOptimizedActivities";

export function useIndexActivitiesStable() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const fetchingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!profile?.sector_id || fetchingRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          ),
          subsectors (
            name
          ),
          subtasks (
            id,
            title,
            is_completed,
            checklist_group,
            order_index
          )
        `)
        .eq("sector_id", profile.sector_id)
        .neq("status", "archived")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setActivities((data as unknown as Activity[]) || []);
    } catch (error) {
      console.error("❌ Erro ao carregar atividades:", error);
      setActivities([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [profile?.sector_id]);

  // Initial fetch
  useEffect(() => {
    if (profile?.sector_id) {
      fetchActivities();
    } else {
      setActivities([]);
      setLoading(false);
    }
  }, [profile?.sector_id, fetchActivities]);

  // Real-time subscription
  useEffect(() => {
    if (!profile?.sector_id) return;

    const channel = supabase
      .channel(`activities_${profile.sector_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
          filter: `sector_id=eq.${profile.sector_id}`,
        },
        () => {
          // Debounce to avoid too many refetches
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fetchActivities();
          }, 300);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subtasks",
        },
        () => {
          // Also listen to subtasks changes
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fetchActivities();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [profile?.sector_id, fetchActivities]);

  return { activities, loading, refetch: fetchActivities };
}