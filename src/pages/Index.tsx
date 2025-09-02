import { useMemo } from "react";
import { ActivityCalendar } from "@/components/calendar/ActivityCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Clock,
  Circle,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { useIndexActivities } from "@/hooks/useIndexActivities";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { profile, loading: authLoading } = useAuth();

  const { activities, loading } = useIndexActivities();

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="text-center space-y-4 glass-effect p-8 rounded-2xl">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não há perfil, o useAuth já vai deslogar automaticamente
  // Só continua se tiver perfil válido
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="text-center space-y-4 glass-effect p-8 rounded-2xl">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const todayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const stats = {
    pending: activities.filter((a) => a.status === "pending").length,
    in_progress: activities.filter((a) => a.status === "in_progress").length,
    completed: activities.filter((a) => a.status === "completed").length,
    today: activities.filter((a) => {
      const createdAt = new Date(a.created_at);
      return createdAt >= todayStart && createdAt < todayEnd;
    }).length,
    overdue: activities.filter((a) => {
      if (a.status === "completed" || !a.due_date) return false;
      return new Date(a.due_date) < new Date();
    }).length,
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#09b230] to-[#4ade80] bg-clip-text text-transparent">
            Calendário de Atividades
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gerencie suas atividades semanais de forma organizada
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="glass-effect border-blue-300/30 hover:border-blue-300/50 transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Criadas Hoje
            </CardTitle>
            <Calendar className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "-" : stats.today}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              atividades criadas hoje
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-yellow-300/30 hover:border-yellow-300/50 transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
            <Circle className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "-" : stats.pending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              atividades aguardando início
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-warning/30 hover:border-warning/50 transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {loading ? "-" : stats.in_progress}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              atividades em execução
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-accent/30 hover:border-accent/50 transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídas
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">
              {loading ? "-" : stats.completed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              atividades finalizadas
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-destructive/30 hover:border-destructive/50 transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atrasadas
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {loading ? "-" : stats.overdue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              atividades vencidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground glass-effect p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-accent rounded-full shadow-sm"></div>
          <span>Concluído</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-warning rounded-full shadow-sm"></div>
          <span>Em andamento</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted-foreground rounded-full shadow-sm"></div>
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-destructive rounded-full shadow-sm"></div>
          <span>Atrasado</span>
        </div>
      </div>

      <div className="glass-effect rounded-3xl p-6 border border-border/50">
        <ActivityCalendar />
      </div>
    </div>
  );
};

export default Index;
