import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { supabase } from "@/lib/supabase";

export const useAuth = () => {
  const { user, session, profile, loading, setAuth, setProfile, setLoading } =
    useAuthStore();
  const { setNotifications } = useNotificationStore();

  const handleAuthError = useCallback(
    async (error: Error | string) => {
      console.error("Auth error:", error);
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (signOutError) {
        console.error("Error signing out:", signOutError);
      }
      setProfile(null);
      setAuth(null, null);
      setNotifications([]);
      setLoading(false); // CRITICAL: Always set loading to false after error
    },
    [setAuth, setProfile, setNotifications, setLoading]
  );

  useEffect(() => {
    let mounted = true;
    let isProcessing = false;

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isProcessing) return;

      isProcessing = true;
      console.log("Auth state change:", event, session?.user?.email);

      try {
        setAuth(session?.user ?? null, session);

        if (session?.user) {
          // Verificar se o email foi confirmado
          if (!session.user.email_confirmed_at) {
            console.log("Email não confirmado, fazendo logout");
            await handleAuthError("Email not confirmed");
            return;
          }

          // Fetch user profile
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

              if (emailError || !profileByEmail) {
                console.log(
                  "Nenhum perfil encontrado, fazendo logout do usuário"
                );
                await handleAuthError("Profile not found");
                return;
              }

              if (mounted) setProfile(profileByEmail);
            } else {
              if (mounted) {
                setProfile(profileData);

                // Fetch notifications (don't block loading on this)
                try {
                  const { data: notifications } = await supabase
                    .from("notifications")
                    .select("*")
                    .eq("user_id", session.user.id)
                    .order("created_at", { ascending: false });

                  if (notifications && mounted) {
                    setNotifications(notifications);
                  }
                } catch (notifError) {
                  console.warn("Failed to load notifications:", notifError);
                  // Don't block auth for notifications
                }
              }
            }
          } catch (profileError) {
            console.error("Error in profile fetch:", profileError);
            await handleAuthError(profileError);
            return;
          }
        } else {
          if (mounted) {
            setProfile(null);
            setNotifications([]);
          }
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
        await handleAuthError(error);
      } finally {
        if (mounted) {
          setLoading(false); // CRITICAL: Always set loading to false
          isProcessing = false;
        }
      }
    });

    // Check for existing session
    const initializeAuth = async () => {
      try {
        setLoading(true); // Ensure loading starts
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
          await handleAuthError(error);
          return;
        }
        if (mounted) {
          setAuth(session?.user ?? null, session);
          // If no session, stop loading immediately
          if (!session) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        await handleAuthError(error);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setAuth, setProfile, setLoading, setNotifications, handleAuthError]);

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user && !!profile,
    isManager: profile?.role === "manager",
  };
};
