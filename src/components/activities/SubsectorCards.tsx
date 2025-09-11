import React, { useEffect, useState } from "react";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { Activity } from "@/hooks/useActivities";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuthFinal";
import { Plus } from "lucide-react";

interface Subsector {
  id: string;
  name: string;
}

interface SubsectorCardsProps {
  activities: Activity[];
  onAddActivity: (subsectorId: string, subsectorName: string) => void;
  onEditActivity: (activity: Activity) => void;
  hideEmpty?: boolean; // quando true, oculta boards sem cards
}

export const SubsectorCards: React.FC<SubsectorCardsProps> = ({
  activities,
  onAddActivity,
  onEditActivity,
  hideEmpty = false,
}) => {
  const [subsectors, setSubsectors] = useState<Subsector[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchSubsectors = async () => {
      if (!profile?.sector_id) return;
      try {
        if (profile.role === "manager") {
          // Gestores veem todos os subsetores do setor
          const { data, error } = await supabase
            .from("subsectors")
            .select("id, name")
            .eq("sector_id", profile.sector_id)
            .order("name");

          if (error) throw error;
          setSubsectors(data || []);
        } else if (profile.role === "collaborator") {
          // Colaboradores veem apenas seu subsetor principal
          if (profile.subsector_id) {
            const { data: primarySubsector, error: primaryError } = await supabase
              .from("subsectors")
              .select("id, name")
              .eq("id", profile.subsector_id)
              .single();

            if (!primaryError && primarySubsector) {
              setSubsectors([primarySubsector]);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao buscar subsetores:", error);
        setSubsectors([]);
      }
    };

    fetchSubsectors();
  }, [profile?.sector_id, profile?.role, profile?.subsector_id, profile?.id]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {subsectors.map((subsector) => {
        const subsectorActivities = activities.filter(
          (a) => a.subsector_id === subsector.id
        );

        if (hideEmpty && subsectorActivities.length === 0) {
          return null;
        }

        return (
          <div
            key={subsector.id}
            className="bg-gray-100 dark:bg-[#1f1f1f] rounded-xl p-3 min-h-[120px] border border-gray-200 dark:border-gray-700 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                {subsector.name}
              </h3>
              <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded-full">
                {subsectorActivities.length}
              </span>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col gap-2 max-h-[65vh] lg:max-h-[70vh] overflow-y-auto pr-1">
              {subsectorActivities.length === 0 ? (
                <button
                  className="mt-1 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150 flex items-center gap-2 text-sm"
                  onClick={() => onAddActivity(subsector.id, subsector.name)}
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar um cartão</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {subsectorActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-white dark:bg-[#161616] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all duration-150 hover:shadow-md overflow-hidden flex-shrink-0"
                      onClick={() => onEditActivity(activity)}
                    >
                      <ActivityCard activity={activity} />
                    </div>
                  ))}

                  <button
                    className="mt-1 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150 flex items-center gap-2 text-sm"
                    onClick={() => onAddActivity(subsector.id, subsector.name)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Adicionar um cartão</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
