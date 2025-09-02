import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasLoggedOut, setWasLoggedOut] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Detectar quando usuário é deslogado automaticamente
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && !session && loading) {
        // Se foi deslogado durante o loading, significa que não tem perfil
        setWasLoggedOut(true);
        setError(
          "Este email não está cadastrado no sistema. Entre em contato com o administrador para ter seu acesso liberado."
        );
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loading]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    setWasLoggedOut(false);

    try {
      // Fazer login diretamente sem verificação prévia de perfil
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Email ou senha incorretos");
        } else if (error.message.includes("Email not confirmed")) {
          setError(
            "Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada e clique no link de confirmação."
          );
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      // Verificar se o email foi confirmado
      if (authData.user && !authData.user.email_confirmed_at) {
        setError(
          "Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada e clique no link de confirmação."
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Se chegou aqui, o login foi bem-sucedido e o email foi confirmado
      // O useAuth vai verificar automaticamente se o perfil existe
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
      console.error("Login error:", err);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          className="focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]/20 focus-visible:border-[#09b230]/70"
          {...register("email")}
          disabled={loading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Sua senha"
            className="focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]/20 focus-visible:border-[#09b230]/70"
            {...register("password")}
            disabled={loading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        style={{ backgroundColor: "#09b230", borderColor: "#09b230" }}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  );
};
