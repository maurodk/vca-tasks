import { AppLayout } from "@/components/layout/AppLayout";
import { ActivityCalendar } from "@/components/calendar/ActivityCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Circle, AlertTriangle } from "lucide-react";
import { useActivities } from "@/hooks/useActivities";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";

const Index = () => {
  const { profile, loading: authLoading } = useAuth();
  const { signOut } = useAuthStore();
  const { activities, loading } = useActivities();

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show profile incomplete state
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Perfil Incompleto</h1>
          <p className="text-muted-foreground">
            Seu perfil não foi criado corretamente. Entre em contato com o administrador ou tente fazer login novamente.
          </p>
          <Button onClick={signOut} variant="outline">
            Sair e Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const stats = {
    pending: activities.filter(a => a.status === 'pending').length,
    in_progress: activities.filter(a => a.status === 'in_progress').length,
    completed: activities.filter(a => a.status === 'completed').length,
    overdue: activities.filter(a => {
      if (a.status === 'completed' || !a.due_date) return false;
      return new Date(a.due_date) < new Date();
    }).length,
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendário de Atividades</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas atividades semanais de forma organizada
            </p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Circle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                atividades aguardando início
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.in_progress}</div>
              <p className="text-xs text-muted-foreground">
                atividades em execução
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <CheckCircle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                atividades finalizadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{loading ? '-' : stats.overdue}</div>
              <p className="text-xs text-muted-foreground">
                atividades vencidas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Legenda */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-accent rounded-full"></div>
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-warning rounded-full"></div>
            <span>Em andamento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded-full"></div>
            <span>Atrasado</span>
          </div>
        </div>
        
        <ActivityCalendar />
      </div>
    </AppLayout>
  );
};

export default Index;
