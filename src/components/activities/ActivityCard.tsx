import { Database } from "@/types/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { SubtaskPreview } from "@/components/activities/SubtaskPreview";
import { Activity } from "@/hooks/useActivities";

interface ActivityCardProps {
  activity: Activity;
  onClick?: () => void; // Nova prop para o clique
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const getPriorityBadgeVariant = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200"
      style={{
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
        color: "var(--foreground)",
      }}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-gray-900 dark:text-white">
          {activity.title}
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300">
          {activity.profiles?.full_name && (
            <span>Responsável: {activity.profiles.full_name}</span>
          )}
          {!activity.profiles?.full_name && (
            <span>Responsável: Não atribuído</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-400 line-clamp-2">
          {activity.description}
        </p>

        {/* Preview de progresso das subtarefas */}
        {activity.subtasks && activity.subtasks.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                Subtarefas
              </span>
              <span className="text-[#09b230] font-semibold">
                {activity.subtasks.filter((s) => s.is_completed).length}/
                {activity.subtasks.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-[#09b230] h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    activity.subtasks.length > 0
                      ? (activity.subtasks.filter((s) => s.is_completed)
                          .length /
                          activity.subtasks.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="text-xs text-center text-gray-600 dark:text-gray-400">
              {Math.round(
                activity.subtasks.length > 0
                  ? (activity.subtasks.filter((s) => s.is_completed).length /
                      activity.subtasks.length) *
                      100
                  : 0
              )}
              % concluído
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-1">
          <div className="flex gap-2">
            <Badge
              variant="default"
              className="bg-[#09b230] hover:bg-[#08a02b] text-white dark:bg-[#09b230] dark:text-white"
            >
              {activity.status}
            </Badge>
            {activity.priority && (
              <Badge
                variant={getPriorityBadgeVariant(activity.priority)}
                className="dark:text-white"
              >
                {activity.priority}
              </Badge>
            )}
          </div>
          {activity.due_date && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Vence em: {format(new Date(activity.due_date), "dd/MM/yyyy")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
