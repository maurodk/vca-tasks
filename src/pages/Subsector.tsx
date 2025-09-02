import { useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { ActivityCalendar } from "@/components/calendar/ActivityCalendar";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { ActivityModal } from "@/components/activities/ActivityModal";
import { useNavigate } from "react-router-dom";

interface SubsectorData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const Subsector = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subsector, setSubsector] = useState<SubsectorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Estabilizar as options para evitar re-renders infinitos
  const activitiesOptions = useMemo(
    () => ({
      subsectorId: id,
      status: ["pending", "in_progress", "completed"] as Array<
        "pending" | "in_progress" | "completed"
      >,
    }),
    [id]
  );

  const {
    activities,
    loading: activitiesLoading,
    refetch,
  } = useActivities(activitiesOptions);

  useEffect(() => {
    if (!id) return;

    const fetchSubsector = async () => {
      try {
        const { data, error } = await supabase
          .from("subsectors")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setSubsector(data);
      } catch (error) {
        console.error("Error fetching subsector:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubsector();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!subsector) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Subsetor não encontrado
          </h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              O subsetor que você está procurando não foi encontrado ou você não
              tem permissão para acessá-lo.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/")}
            >
              Voltar ao Calendário Principal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCounts = {
    pending: activities.filter((a) => a.status === "pending").length,
    in_progress: activities.filter((a) => a.status === "in_progress").length,
    completed: activities.filter((a) => a.status === "completed").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {subsector.name}
            </h1>
            {subsector.description && (
              <p className="text-muted-foreground mt-1">
                {subsector.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{statusCounts.pending}</div>
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                Pendente
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {statusCounts.in_progress}
              </div>
              <Badge
                variant="outline"
                className="bg-yellow-100 text-yellow-800"
              >
                Em andamento
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{statusCounts.completed}</div>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Concluída
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-[#09b230] to-[#4ade80] bg-clip-text text-transparent">
          Calendário de Atividades
        </h2>
        <ActivityCalendar subsectorId={id} />
      </div>

      {/* Activity Modal */}
      <ActivityModal
        open={showActivityModal}
        onOpenChange={setShowActivityModal}
        onSuccess={() => setShowActivityModal(false)}
        defaultSubsectorId={id}
        onRefresh={refetch}
      />
    </div>
  );
};

export default Subsector;
