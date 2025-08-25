import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  estimatedTime: string;
}

interface DayData {
  date: Date;
  activities: Activity[];
  weekNumber: number;
}

const mockActivities: Activity[] = [
  {
    id: "1",
    title: "Revisão de código React",
    description: "Revisar PRs da equipe",
    status: "completed",
    priority: "high",
    estimatedTime: "2h"
  },
  {
    id: "2",
    title: "Reunião diária",
    description: "Daily stand-up com a equipe",
    status: "completed",
    priority: "medium",
    estimatedTime: "30min"
  },
  {
    id: "3",
    title: "Implementar API de notificações",
    description: "Desenvolver endpoint para sistema de notificações",
    status: "in-progress",
    priority: "high",
    estimatedTime: "4h"
  }
];

export const ActivityCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Obter primeiro dia do mês e quantos dias tem
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Obter número da semana
  const getWeekNumber = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  // Navegar entre meses
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Gerar dias do calendário
  const generateCalendarDays = () => {
    const days: (DayData | null)[] = [];
    
    // Adicionar dias vazios no início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Adicionar dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const weekNumber = getWeekNumber(date);
      
      // Mock: adicionar atividades apenas para hoje
      const activities = date.toDateString() === today.toDateString() ? mockActivities : [];
      
      days.push({
        date,
        activities,
        weekNumber
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getStatusIcon = (status: Activity["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 text-accent" />;
      case "in-progress":
        return <Clock className="h-3 w-3 text-warning" />;
      default:
        return <Circle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: Activity["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Calendário Principal */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {monthNames[currentMonth]} {currentYear}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>

          {/* Grid do calendário */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((dayData, index) => (
              <div
                key={index}
                className={`min-h-24 p-2 border rounded-lg transition-all duration-200 cursor-pointer ${
                  dayData
                    ? dayData.date.toDateString() === today.toDateString()
                      ? "bg-primary/10 border-primary"
                      : "bg-card hover:bg-card-hover border-border hover:border-border-hover"
                    : "bg-muted/20"
                } ${selectedDay?.date.toDateString() === dayData?.date.toDateString() ? "ring-2 ring-primary" : ""}`}
                onClick={() => dayData && setSelectedDay(dayData)}
              >
                {dayData && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${
                        dayData.date.toDateString() === today.toDateString()
                          ? "text-primary"
                          : "text-foreground"
                      }`}>
                        {dayData.date.getDate()}
                      </span>
                      {dayData.activities.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {dayData.activities.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayData.activities.slice(0, 2).map(activity => (
                        <div
                          key={activity.id}
                          className="text-xs p-1 bg-secondary rounded text-secondary-foreground truncate"
                        >
                          {activity.title}
                        </div>
                      ))}
                      {dayData.activities.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayData.activities.length - 2} mais
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Painel lateral - Detalhes do dia */}
      <Card className="w-96">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {selectedDay 
                ? `${selectedDay.date.getDate()} de ${monthNames[selectedDay.date.getMonth()]}`
                : "Selecione um dia"
              }
            </CardTitle>
            {selectedDay && (
              <Button size="sm" className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Nova Atividade
              </Button>
            )}
          </div>
          {selectedDay && (
            <p className="text-sm text-muted-foreground">
              Semana {selectedDay.weekNumber} • {selectedDay.activities.length} atividades
            </p>
          )}
        </CardHeader>
        <CardContent>
          {selectedDay ? (
            <div className="space-y-4">
              {selectedDay.activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Circle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma atividade para este dia</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Atividade
                  </Button>
                </div>
              ) : (
                selectedDay.activities.map(activity => (
                  <Card key={activity.id} className="p-4 interactive-card">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(activity.status)}
                          <h4 className="font-medium text-sm">{activity.title}</h4>
                        </div>
                        <Badge className={`text-xs ${getPriorityColor(activity.priority)}`}>
                          {activity.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.estimatedTime}
                        </span>
                        <span className="capitalize">{activity.status.replace("-", " ")}</span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Circle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Clique em um dia do calendário para ver as atividades</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};