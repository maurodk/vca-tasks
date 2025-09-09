import { useAuth } from "@/hooks/useAuthFinal";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, profile } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Block unapproved users
  if (profile && profile.is_approved === false) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="space-y-3 text-center">
          <h1 className="text-lg font-medium">Aguardando aprovação</h1>
          <p className="text-sm text-muted-foreground">
            Seu acesso ainda não foi aprovado pelo gestor.
          </p>
          <Button
            variant="destructive"
            onClick={async () => {
              try {
                await supabase.auth.signOut();
              } catch (e) {
                console.error("Erro ao sair:", e);
              } finally {
                window.location.assign("/auth");
              }
            }}
          >
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
