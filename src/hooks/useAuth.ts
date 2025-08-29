import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const { user, session, profile, loading, setAuth, setProfile, setLoading } = useAuthStore();
  const { setNotifications } = useNotificationStore();

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setAuth(session?.user ?? null, session);

        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

              if (error) {
                console.error('Error fetching profile:', error);
                if (mounted) setProfile(null);
                return;
              }

              if (mounted) {
                setProfile(profileData);
                
                // Only fetch notifications if profile exists
                if (profileData) {
                  const { data: notifications } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });

                  if (notifications && mounted) {
                    setNotifications(notifications);
                  }
                }
              }
            } catch (error) {
              console.error('Error in profile fetch:', error);
              if (mounted) setProfile(null);
            }
          }, 0);
        } else {
          if (mounted) {
            setProfile(null);
            setNotifications([]);
          }
        }

        if (mounted) setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setAuth(session?.user ?? null, session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setAuth, setProfile, setLoading, setNotifications]);

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
    isManager: profile?.role === 'manager',
  };
};