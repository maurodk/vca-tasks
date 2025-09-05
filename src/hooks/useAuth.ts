import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { supabase } from "@/lib/supabase";

export const useAuth = () => {
  const { user, session, profile, loading, setAuth, setProfile, setLoading } =
    useAuthStore();
  const { setNotifications } = useNotificationStore();

  useEffect(() => {
    let mounted = true;
    let isProcessing = false;

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isProcessing) return;

      isProcessing = true;
      setAuth(session?.user ?? null, session);

      if (session?.user) {
        // Verificar se o email foi confirmado
        if (!session.user.email_confirmed_at) {
          console.log("Email não confirmado, fazendo logout");
          await supabase.auth.signOut();
          if (mounted) {
            setProfile(null);
            setAuth(null, null);
          }
          isProcessing = false;
          return;
        }

        // Fetch user profile with a small delay to prevent multiple calls
        setTimeout(async () => {
          if (!mounted) return;

          try {
            const { data: profileData, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (error) {
              console.error("Error fetching profile:", error);

              // Se não encontrou por ID, tentar por email
              const { data: profileByEmail, error: emailError } = await supabase
                .from("profiles")
                .select("*")
                .eq("email", session.user.email)
                .single();

              console.log("Profile by email query result:", {
                profileByEmail,
                emailError,
              });

              if (emailError || !profileByEmail) {
                console.log(
                  "Nenhum perfil encontrado, fazendo logout do usuário"
                );
                await supabase.auth.signOut();
                if (mounted) {
                  setProfile(null);
                  setAuth(null, null);
                }
                isProcessing = false;
                return;
              }

              if (mounted) setProfile(profileByEmail);
              isProcessing = false;
              return;
            }

            if (mounted) {
              setProfile(profileData);

              // Only fetch notifications if profile exists
              if (profileData) {
                const { data: notifications } = await supabase
                  .from("notifications")
                  .select("*")
                  .eq("user_id", session.user.id)
                  .order("created_at", { ascending: false });

                if (notifications && mounted) {
                  setNotifications(notifications);
                }
              }
            }
          } catch (error) {
            console.error("Error in profile fetch:", error);
            if (mounted) setProfile(null);
          } finally {
            isProcessing = false;
          }
        }, 100);
      } else {
        if (mounted) {
          setProfile(null);
          setNotifications([]);
        }
        isProcessing = false;
      }

      if (mounted) setLoading(false);
    });

    // Check for existing session only once
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setAuth(session?.user ?? null, session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Deixar vazio para executar apenas uma vez

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user && !!profile,
    isManager: profile?.role === "manager",
  };
};
