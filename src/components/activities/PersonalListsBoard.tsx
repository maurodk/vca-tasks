import React, { useMemo, useState } from "react";
import { Plus, Trash2, Lock } from "lucide-react";
import { usePersonalLists } from "@/hooks/usePersonalLists";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuthFinal";
import { useToast } from "@/hooks/use-toast";
import { Activity } from "@/hooks/useActivities";
import { ActivityCard } from "@/components/activities/ActivityCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onCreateCard: (listId: string) => void;
  onEditCard: (activity: Activity) => void;
  statusFilter?: "pending" | "in_progress" | "completed" | "archived" | null;
}

export const PersonalListsBoard: React.FC<Props> = ({
  onCreateCard,
  onEditCard,
  statusFilter = null,
}) => {
  const { lists, createList, renameList, deleteList } = usePersonalLists();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activitiesByList, setActivitiesByList] = useState<
    Record<string, Activity[]>
  >({});
  const [loadingLists, setLoadingLists] = useState<Record<string, boolean>>({});
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadActivities = async (listId: string) => {
    setLoadingLists((s) => ({ ...s, [listId]: true }));
    try {
      const { data, error } = await supabase
        .from("activities")
        .select(
          `*, profiles:user_id(full_name, avatar_url), subtasks(id, title, is_completed, checklist_group, order_index)`
        )
        .eq("list_id", listId)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setActivitiesByList((s) => ({
        ...s,
        [listId]: (data as unknown as Activity[]) || [],
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLists((s) => ({ ...s, [listId]: false }));
    }
  };

  const listIds = React.useMemo(
    () => lists.map((l) => l.id).join(","),
    [lists]
  );

  React.useEffect(() => {
    // Initial load for each list
    lists.forEach((l) => loadActivities(l.id));

    // Single realtime channel scoped to the user's personal list activities
    // Triggers on create/update/delete where list_id is not null and created_by is the current user
    const channel = supabase
      .channel(`personal_list_activities_user_${user?.id || "anon"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
          filter: `and(list_id.is.not.null,created_by=eq.${
            user?.id || "00000000-0000-0000-0000-000000000000"
          })`,
        },
        (payload) => {
          const newRow = payload.new as { list_id?: string } | null;
          const oldRow = payload.old as { list_id?: string } | null;
          const listId = newRow?.list_id ?? oldRow?.list_id;
          if (listId) {
            // Reload only the impacted list
            loadActivities(listId);
          } else {
            // Fallback: reload all lists if we can't determine the list id
            lists.forEach((l) => loadActivities(l.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, listIds, lists]);

  // Listen for explicit refresh events to make updates feel instant
  React.useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ listId?: string }>;
      const listId = custom.detail?.listId;
      if (listId) {
        loadActivities(listId);
      } else {
        lists.forEach((l) => loadActivities(l.id));
      }
    };
    window.addEventListener("personal-list-updated", handler as EventListener);
    return () =>
      window.removeEventListener(
        "personal-list-updated",
        handler as EventListener
      );
  }, [lists]);

  const handleAddList = async () => {
    setNewListOpen(true);
  };

  const confirmCreateList = async () => {
    const name = newListName.trim();
    if (!name) return;
    const created = await createList(name);
    if (created) {
      toast({ title: "Lista criada" });
      setNewListName("");
      setNewListOpen(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Seus quadros privados
        </h2>
      </div>

      {/* Grid responsiva: até 4 colunas lado a lado no desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {lists.map((list) => {
          const all = activitiesByList[list.id] || [];
          const items = statusFilter
            ? all.filter((a) => a.status === statusFilter)
            : all;
          if (statusFilter && items.length === 0) return null;
          return (
            <div
              key={list.id}
              className="w-full bg-gray-100 dark:bg-[#1f1f1f] rounded-xl p-3 border border-gray-200 dark:border-gray-700 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  className="font-semibold text-sm text-gray-800 dark:text-gray-200 text-left hover:underline"
                  onClick={() => {
                    setSelectedListId(list.id);
                    setRenameName(list.name);
                    setRenameOpen(true);
                  }}
                >
                  {list.name}
                </button>
                <button
                  className="text-gray-700 dark:text-gray-300 hover:text-red-500"
                  onClick={() => {
                    setSelectedListId(list.id);
                    setDeleteOpen(true);
                  }}
                  title="Excluir quadro"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white dark:bg-[#161616] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all duration-150 hover:shadow-md"
                    onClick={() => onEditCard(a)}
                  >
                    <ActivityCard activity={a} />
                  </div>
                ))}

                <button
                  className="mt-1 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150 flex items-center gap-2 text-sm"
                  onClick={() => onCreateCard(list.id)}
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar um cartão</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Botão para criar nova lista ocupa uma célula da grid */}
        <button
          onClick={handleAddList}
          className="w-full bg-gray-200/70 dark:bg-gray-800/70 hover:bg-gray-200 dark:hover:bg-gray-700 border border-dashed border-gray-400 dark:border-gray-600 rounded-xl p-3 flex items-center gap-2 text-gray-700 dark:text-gray-300 justify-start"
        >
          <Plus className="h-4 w-4" />
          Adicionar outra lista
        </button>
      </div>

      {/* Dialog para nova lista */}
      <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Novo quadro privado</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              placeholder="Nome do quadro"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmCreateList();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewListOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmCreateList} disabled={!newListName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para renomear quadro */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Renomear quadro</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              placeholder="Novo nome do quadro"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && selectedListId && renameName.trim()) {
                  await renameList(selectedListId, renameName.trim());
                  toast({ title: "Quadro renomeado" });
                  setRenameOpen(false);
                  setSelectedListId(null);
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameOpen(false);
                setSelectedListId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (selectedListId && renameName.trim()) {
                  await renameList(selectedListId, renameName.trim());
                  toast({ title: "Quadro renomeado" });
                  setRenameOpen(false);
                  setSelectedListId(null);
                }
              }}
              disabled={!renameName.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para exclusão */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Excluir quadro privado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 text-sm text-muted-foreground">
            <p>
              Tem certeza que deseja excluir este quadro? As atividades serão
              mantidas privadas, porém sem associação a uma lista.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setSelectedListId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (selectedListId) {
                  await deleteList(selectedListId);
                  toast({ title: "Quadro excluído" });
                  setDeleteOpen(false);
                  setSelectedListId(null);
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
