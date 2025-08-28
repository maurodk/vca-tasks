import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Clock, AlertCircle, User, Archive } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Activity, useActivities } from "@/hooks/useActivities";

const activitySchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  estimated_time: z.number().min(1, "Tempo deve ser maior que 0").optional(),
  due_date: z.date().optional(),
  user_id: z.string().min(1, "Usuário é obrigatório"),
  subsector_id: z.string().optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity;
  onSuccess?: () => void;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'manager' | 'collaborator';
}

interface Subsector {
  id: string;
  name: string;
}

export function ActivityModal({ open, onOpenChange, activity, onSuccess }: ActivityModalProps) {
  const { profile, user, isManager } = useAuth();
  const { toast } = useToast();
  const { archiveActivity } = useActivities();
  const [loading, setLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [subsectors, setSubsectors] = useState<Subsector[]>([]);

  const isEditing = !!activity;

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      estimated_time: undefined,
      due_date: undefined,
      user_id: user?.id || "",
      subsector_id: "",
    },
  });

  // Fetch users in the same sector (only for managers)
  useEffect(() => {
    if (isManager && profile?.sector_id && open) {
      const fetchUsers = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('sector_id', profile.sector_id);

        if (!error && data) {
          setUsers(data);
        }
      };
      fetchUsers();
    }
  }, [isManager, profile?.sector_id, open]);

  // Fetch subsectors
  useEffect(() => {
    if (profile?.sector_id && open) {
      const fetchSubsectors = async () => {
        const { data, error } = await supabase
          .from('subsectors')
          .select('id, name')
          .eq('sector_id', profile.sector_id);

        if (!error && data) {
          setSubsectors(data);
        }
      };
      fetchSubsectors();
    }
  }, [profile?.sector_id, open]);

  // Reset form when activity changes
  useEffect(() => {
    if (activity) {
      form.reset({
        title: activity.title || "",
        description: activity.description || "",
        priority: activity.priority || "medium",
        estimated_time: activity.estimated_time || undefined,
        due_date: activity.due_date ? new Date(activity.due_date) : undefined,
        user_id: activity.user_id || user?.id || "",
        subsector_id: activity.subsector_id || "",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        priority: "medium",
        estimated_time: undefined,
        due_date: undefined,
        user_id: user?.id || "",
        subsector_id: "",
      });
    }
  }, [activity, user?.id, form]);

  const onSubmit = async (data: ActivityFormData) => {
    if (!profile?.sector_id) return;

    setLoading(true);
    try {
      const activityData = {
        ...data,
        sector_id: profile.sector_id,
        created_by: user?.id,
        due_date: data.due_date?.toISOString() || null,
        estimated_time: data.estimated_time || null,
        subsector_id: data.subsector_id || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', activity.id);

        if (error) throw error;

        toast({
          title: "Atividade atualizada",
          description: "A atividade foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('activities')
          .insert(activityData);

        if (error) throw error;

        toast({
          title: "Atividade criada",
          description: "A atividade foi criada com sucesso.",
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar atividade.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!activity) return;

    setArchiveLoading(true);
    try {
      await archiveActivity(activity.id);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao arquivar atividade.",
        variant: "destructive",
      });
    } finally {
      setArchiveLoading(false);
    }
  };

  const priorityColors = {
    low: "text-green-600",
    medium: "text-yellow-600", 
    high: "text-red-600",
  };

  const priorityLabels = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Atividade" : "Nova Atividade"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Edite os detalhes da atividade abaixo."
              : "Preencha os dados para criar uma nova atividade."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título da atividade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva os detalhes da atividade"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <AlertCircle className={cn("h-4 w-4", priorityColors[value as keyof typeof priorityColors])} />
                              {label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo Estimado (horas)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          placeholder="Ex: 2"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Data limite para conclusão da atividade (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isManager && users.length > 0 && (
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atribuir para</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{user.full_name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {subsectors.length > 0 && (
              <FormField
                control={form.control}
                name="subsector_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subsetor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um subsetor (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum subsetor</SelectItem>
                        {subsectors.map((subsector) => (
                          <SelectItem key={subsector.id} value={subsector.id}>
                            {subsector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Associe a atividade a um subsetor específico (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="flex justify-between">
              <div>
                {isEditing && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleArchive}
                    disabled={archiveLoading}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {archiveLoading ? "Arquivando..." : "Arquivar"}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}