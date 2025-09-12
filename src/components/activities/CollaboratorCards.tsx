import React, { useEffect, useState } from "react";
import { Activity } from "@/hooks/useActivities";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

interface Collaborator {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface CollaboratorCardsProps {
  activities: Activity[];
  onEditActivity: (activity: Activity) => void;
  subsectorId: string;
  onAddActivity: (userId: string, userName: string) => void;
}

export const CollaboratorCards: React.FC<CollaboratorCardsProps> = ({
  activities,
  onEditActivity,
  subsectorId,
  onAddActivity,
}) => {
  const { profile } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!profile?.sector_id || !subsectorId) return;
      try {
        // Buscar colaboradores que têm este subsetor (nova tabela)
        const { data: profileSubsectors, error: psError } = await supabase
          .from("profile_subsectors")
          .select(`
            profile_id,
            profiles (
              id,
              full_name,
              avatar_url,
              sector_id
            )
          `)
          .eq("subsector_id", subsectorId);

        if (psError) throw psError;

        // Filtrar por setor e extrair profiles
        const collaboratorsFromNew = profileSubsectors
          ?.filter(ps => ps.profiles?.sector_id === profile.sector_id)
          .map(ps => ps.profiles)
          .filter(Boolean) || [];

        // Buscar também colaboradores com subsector_id antigo (compatibilidade)
        const { data: oldCollaborators, error: oldError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("sector_id", profile.sector_id)
          .eq("subsector_id", subsectorId);

        if (oldError) throw oldError;

        // Combinar e remover duplicatas
        const allCollaborators = [...collaboratorsFromNew, ...(oldCollaborators || [])];
        const uniqueCollaborators = allCollaborators.filter((colab, index, arr) => 
          arr.findIndex(c => c.id === colab.id) === index
        );

        setCollaborators(uniqueCollaborators.sort((a, b) => a.full_name.localeCompare(b.full_name)));
      } catch (e) {
        console.error("Erro ao buscar colaboradores:", e);
        setCollaborators([]);
      }
    };
    fetchCollaborators();
  }, [profile?.sector_id, subsectorId]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {collaborators.map((colab) => {
        const colabActivities = activities.filter(
          (a) => a.user_id === colab.id
        );
        return (
          <div
            key={colab.id}
            className="bg-gray-100 dark:bg-[#1f1f1f] rounded-xl p-3 min-h-[120px] border border-gray-200 dark:border-gray-700 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={colab.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {colab.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                  {colab.full_name}
                </span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded-full">
                {colabActivities.length}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-2 max-h-[65vh] lg:max-h-[70vh] overflow-y-auto pr-1">
              {colabActivities.length === 0 ? (
                <button
                  className="mt-1 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150 flex items-center gap-2 text-sm"
                  onClick={() => onAddActivity(colab.id, colab.full_name)}
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar um cartão</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {colabActivities.map((activity) => (
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
                    onClick={() => onAddActivity(colab.id, colab.full_name)}
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
