import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/hooks/use-toast';

const INACTIVITY_TIME = 1 * 60 * 60 * 1000; // 1 hora em ms
const WARNING_TIME = 5 * 60 * 1000; // 5 minutos antes do logout

export const useAutoLogout = () => {
  const { signOut, user } = useAuthStore();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();
    
    // Limpa timers existentes
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    // Timer de aviso (5 min antes do logout)
    warningTimeoutRef.current = setTimeout(() => {
      toast({
        title: "Sessão expirando",
        description: "Sua sessão expirará em 5 minutos por inatividade. Mova o mouse para continuar.",
        variant: "destructive",
      });
    }, INACTIVITY_TIME - WARNING_TIME);

    // Timer de logout
    timeoutRef.current = setTimeout(async () => {
      toast({
        title: "Sessão expirada",
        description: "Você foi desconectado por inatividade.",
        variant: "destructive",
      });
      await signOut();
    }, INACTIVITY_TIME);
  }, [user, signOut]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => resetTimer();

    // Adiciona listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Inicia o timer
    resetTimer();

    return () => {
      // Remove listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      // Limpa timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [user, resetTimer]);
};