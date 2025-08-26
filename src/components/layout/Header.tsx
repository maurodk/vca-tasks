import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { UserMenu } from "@/components/layout/UserMenu";

export const Header = () => {
  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="h-8 w-8" />
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar atividades, usuários..."
            className="pl-10 w-80 bg-background/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationCenter />
        <UserMenu />
      </div>
    </header>
  );
};