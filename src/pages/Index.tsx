import { AppLayout } from "@/components/layout/AppLayout";
import { ActivityCalendar } from "@/components/calendar/ActivityCalendar";

const Index = () => {
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <span>Concluído</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-warning rounded-full"></div>
              <span>Em andamento</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
              <span>Pendente</span>
            </div>
          </div>
        </div>
        
        <ActivityCalendar />
      </div>
    </AppLayout>
  );
};

export default Index;
