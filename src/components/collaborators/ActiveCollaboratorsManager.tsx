import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Eye,
  Mail,
  Building2,
  Search,
  Phone,
  MapPin,
  Calendar,
  User,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Activity,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SmoothTransition } from "@/components/ui/smooth-transition";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { Activity as FullActivity } from "@/hooks/useActivities";
import { SkeletonCard, SkeletonContent } from "@/components/ui/skeleton-card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
// import { CollaboratorDetailsModal } from "./CollaboratorDetailsModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Collaborator {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: "manager" | "collaborator";
  sector_id: string;
  subsector_id?: string;
  is_approved?: boolean;
  created_at: string;
  updated_at: string;
  sectors?: {
    name: string;
  };
  subsectors?: {
    name: string;
  };
}

const ActiveCollaboratorsManager: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [query, setQuery] = useState("");
  const [subsectorFilter, setSubsectorFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] =
    useState<Collaborator | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  type LocalActivity = {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    due_date?: string | null;
    created_at: string;
    completed_at?: string | null;
    estimated_time?: number | null;
    list_id?: string | null;
    subsectors?: { name?: string | null } | null;
    subtasks?: Array<{ id: string; title: string; is_completed: boolean }>;
  };
  const [activities, setActivities] = useState<LocalActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const fetchCollaborators = useCallback(async () => {
    if (!profile?.sector_id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          email,
          full_name,
          avatar_url,
          role,
          sector_id,
          subsector_id,
          created_at,
          updated_at,
          sectors!inner (
            name
          ),
          subsectors (
            name
          )
        `
        )
        .eq("sector_id", profile.sector_id)
        .order("full_name");

      if (fetchError) throw fetchError;

      setCollaborators(data || []);
    } catch (err: unknown) {
      const error = err as Error;
      setError("Erro ao carregar colaboradores: " + error.message);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os colaboradores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.sector_id, toast]);

  useEffect(() => {
    fetchCollaborators();
  }, [profile?.sector_id, fetchCollaborators]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collaborators.filter((c) => {
      const matchName = q ? c.full_name.toLowerCase().includes(q) : true;
      const matchSub =
        subsectorFilter === "all" || !subsectorFilter
          ? true
          : (c.subsectors?.name || "") === subsectorFilter;
      return matchName && matchSub;
    });
  }, [collaborators, query, subsectorFilter]);

  const fetchCollaboratorActivities = useCallback(
    async (userId: string) => {
      if (!userId) return;

      setActivitiesLoading(true);
      try {
        // Buscar atividades reais do colaborador
        const { data: activitiesData, error: activitiesError } = await supabase
          .from("activities")
          .select(
            `
          id,
          title,
          description,
          status,
          priority,
          due_date,
          created_at,
          completed_at,
          estimated_time,
          list_id,
          subsectors (
            name
          ),
          subtasks (
            id,
            title,
            is_completed
          )
        `
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (activitiesError) {
          console.error("Erro ao buscar atividades:", activitiesError);
          toast({
            title: "Erro ao carregar atividades",
            description:
              "Não foi possível carregar as atividades do colaborador.",
            variant: "destructive",
          });
          setActivities([]);
          return;
        }

        setActivities((activitiesData as unknown as LocalActivity[]) || []);
      } catch (error) {
        console.error("Erro ao buscar atividades:", error);
        toast({
          title: "Erro ao carregar atividades",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive",
        });
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    },
    [toast]
  );

  const handleViewDetails = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setModalOpen(true);
    // Buscar atividades quando abrir o modal
    fetchCollaboratorActivities(collaborator.id);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getActivitiesStats = () => {
    if (!activities.length)
      return { completed: 0, inProgress: 0, pending: 0, total: 0 };

    const completed = activities.filter(
      (activity) => activity.status === "completed"
    ).length;
    const inProgress = activities.filter(
      (activity) => activity.status === "in_progress"
    ).length;
    const pending = activities.filter(
      (activity) => activity.status === "pending"
    ).length;

    return { completed, inProgress, pending, total: activities.length };
  };

  const getOverallProgress = () => {
    if (!activities.length) return 0;
    const completed = activities.filter(
      (activity) => activity.status === "completed"
    ).length;
    return Math.round((completed / activities.length) * 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-[#09b230]" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-[#09b230]" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "archived":
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[#09b230]/10 text-[#09b230] dark:bg-[#09b230]/20 dark:text-[#09b230] border-[#09b230]/30 dark:border-[#09b230]/50";
      case "in_progress":
        return "bg-[#09b230]/10 text-[#09b230] dark:bg-[#09b230]/20 dark:text-[#09b230] border-[#09b230]/30 dark:border-[#09b230]/50";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "low":
        return "bg-[#09b230]/10 text-[#09b230] dark:bg-[#09b230]/20 dark:text-[#09b230] border-[#09b230]/30 dark:border-[#09b230]/50";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800";
    }
  };

  const getCompletedSubtasks = (subtasks: Array<{ is_completed: boolean }>) => {
    if (!Array.isArray(subtasks)) return 0;
    return subtasks.filter((subtask) => subtask.is_completed).length;
  };

  const getTotalSubtasks = (subtasks: Array<{ is_completed: boolean }>) => {
    if (!Array.isArray(subtasks)) return 0;
    return subtasks.length;
  };

  const getActivityProgress = (activity: {
    status: string;
    subtasks?: Array<{ is_completed: boolean }>;
  }) => {
    const total = getTotalSubtasks(activity.subtasks || []);
    if (total === 0) {
      return activity.status === "completed" ? 100 : 0;
    }
    const completed = getCompletedSubtasks(activity.subtasks || []);
    return Math.round((completed / total) * 100);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress":
        return "Em Andamento";
      case "completed":
        return "Concluída";
      case "pending":
        return "Pendente";
      case "archived":
        return "Arquivada";
      default:
        return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high":
        return "Alta";
      case "medium":
        return "Média";
      case "low":
        return "Baixa";
      default:
        return priority;
    }
  };

  // Note: Do not early-return on error to keep hook order consistent.

  const loadingFallback = (
    <SkeletonCard>
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-muted rounded animate-pulse-glow" />
          <div className="h-6 w-48 bg-muted rounded animate-pulse-glow" />
          <div className="h-6 w-8 bg-muted rounded animate-pulse-glow" />
        </div>
        <div className="h-4 w-64 bg-muted rounded animate-pulse-glow" />
      </div>
      <div className="px-6 pb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-lg border bg-card p-4 animate-slide-in"
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 bg-muted rounded-full animate-pulse-glow" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse-glow" />
                    <div className="h-5 w-16 bg-muted rounded animate-pulse-glow" />
                  </div>
                  <div className="h-3 w-32 bg-muted rounded animate-pulse-glow" />
                  <div className="h-3 w-28 bg-muted rounded animate-pulse-glow" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="h-3 w-24 bg-muted rounded animate-pulse-glow" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonCard>
  );

  const uniqueSubsectors = useMemo(
    () =>
      Array.from(
        new Set(
          collaborators
            .map((c) => c.subsectors?.name || "")
            .filter((n) => n && n.length)
        )
      ).sort(),
    [collaborators]
  );

  const groupedByDate = useMemo(() => {
    const acc: Record<string, LocalActivity[]> = {};
    activities.forEach((a) => {
      const key = new Date(a.created_at).toLocaleDateString("pt-BR");
      (acc[key] = acc[key] || []).push(a);
    });
    return Object.entries(acc).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [activities]);

  const content =
    filtered.length === 0 ? (
      <Card className="dark:bg-[#0f0f0f] dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Colaboradores Ativos
          </CardTitle>
          <CardDescription>
            Veja todos os colaboradores aprovados e ativos do seu setor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <input
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                placeholder="Buscar por nome"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={subsectorFilter}
              onChange={(e) => setSubsectorFilter(e.target.value)}
            >
              <option value="all">Todos os subsetores</option>
              {uniqueSubsectors.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhum colaborador ativo encontrado no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    ) : (
      <>
        <Card className="dark:bg-[#0f0f0f] dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Colaboradores Ativos
              <Badge variant="secondary">{filtered.length}</Badge>
            </CardTitle>
            <CardDescription>
              Veja todos os colaboradores aprovados e ativos do seu setor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <input
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  placeholder="Buscar por nome"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={subsectorFilter}
                onChange={(e) => setSubsectorFilter(e.target.value)}
              >
                <option value="all">Todos os subsetores</option>
                {uniqueSubsectors.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="group relative overflow-hidden rounded-lg border bg-card p-4 hover-transition hover:bg-[#09b230]/5 cursor-pointer hover:border-[#09b230]/30 animate-fade-in dark:bg-[#1f1f1f] dark:border-gray-800"
                  onClick={() => handleViewDetails(collaborator)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={collaborator.avatar_url} />
                      <AvatarFallback className="bg-[#09b230]/10 text-[#09b230] font-medium">
                        {getInitials(collaborator.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">
                          {collaborator.full_name}
                        </h3>
                        <Badge
                          variant={
                            collaborator.role === "manager"
                              ? "default"
                              : "secondary"
                          }
                          className={cn(
                            "text-xs",
                            collaborator.role === "manager" &&
                              "bg-[#09b230] hover:bg-[#09b230]/90 text-white border-[#09b230]"
                          )}
                        >
                          {collaborator.role === "manager"
                            ? "Gestor"
                            : "Colaborador"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{collaborator.email}</span>
                      </div>

                      {collaborator.subsectors && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">
                            {collaborator.subsectors.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(collaborator);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Membro desde{" "}
                      {format(new Date(collaborator.created_at), "MMM yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Modal with Modern UI/UX */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
              className="bg-background border shadow-2xl rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b bg-muted/30 px-6 py-4 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {selectedCollaborator && (
                      <>
                        <Avatar className="h-16 w-16 ring-4 ring-primary/20">
                          <AvatarImage
                            src={selectedCollaborator.avatar_url}
                            alt={selectedCollaborator.full_name}
                          />
                          <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                            {selectedCollaborator.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-2xl font-bold text-foreground">
                            {selectedCollaborator.full_name}
                          </h2>
                          <p className="text-muted-foreground">
                            {selectedCollaborator.email}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge
                              variant="secondary"
                              className="capitalize font-medium"
                            >
                              <User className="h-3 w-3 mr-1" />
                              {selectedCollaborator.role}
                            </Badge>
                            {selectedCollaborator.sectors && (
                              <Badge
                                variant="outline"
                                className="border-[#09b230]/20 text-[#09b230]"
                              >
                                {selectedCollaborator.sectors.name}
                              </Badge>
                            )}
                            {selectedCollaborator.subsectors && (
                              <Badge
                                variant="outline"
                                className="border-secondary/20"
                              >
                                {selectedCollaborator.subsectors.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setModalOpen(false)}
                    className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh] dark:bg-[#0f0f0f]">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Total de Atividades: Cinza */}
                  <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-200 dark:border-gray-800/50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">
                        {getActivitiesStats().total}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-400 font-medium">
                        Total de Atividades
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                        {getActivitiesStats().completed}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-400 font-medium">
                        Concluídas
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800/50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                        {getActivitiesStats().inProgress}
                      </div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                        Em Andamento
                      </div>
                    </CardContent>
                  </Card>
                  {/* Pendentes: Azul */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">
                        {getActivitiesStats().pending}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                        Pendentes
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activities */}
                <Card className="dark:bg-[#1f1f1f] dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-[#09b230]" />
                      <span>Atividades Recentes</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activitiesLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09b230] mx-auto"></div>
                        <p className="mt-2 text-gray-600">
                          Carregando atividades...
                        </p>
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          Nenhuma atividade encontrada
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                        {groupedByDate.map(([dateKey, items]) => (
                          <div key={dateKey} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground">
                                {dateKey}
                              </h4>
                              <Badge variant="outline">{items.length}</Badge>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              {items.map((activity) => (
                                <div
                                  key={activity.id}
                                  className="rounded-lg border hover:shadow-sm transition-all dark:bg-[#161616] dark:border-gray-800"
                                >
                                  <div className="p-2">
                                    {/* Board/List tag above the title */}
                                    <div className="mb-1 text-xs text-muted-foreground">
                                      <span className="px-2 py-0.5 rounded-full bg-muted">
                                        {activity.subsectors?.name ||
                                          (activity.list_id
                                            ? "Quadro Privado"
                                            : "")}
                                      </span>
                                    </div>
                                    {/* Lightweight adapt to Activity type for card rendering */}
                                    <ActivityCard
                                      activity={
                                        activity as unknown as FullActivity
                                      }
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Footer */}
              <div className="border-t bg-muted/30 px-6 py-4 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Membro desde{" "}
                    {selectedCollaborator
                      ? format(
                          new Date(
                            selectedCollaborator.created_at || new Date()
                          ),
                          "MMMM 'de' yyyy",
                          { locale: ptBR }
                        )
                      : ""}
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setModalOpen(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );

  return (
    <SmoothTransition
      loading={loading}
      fallback={loadingFallback}
      minLoadingTime={400}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        content
      )}
    </SmoothTransition>
  );
};

export default ActiveCollaboratorsManager;
