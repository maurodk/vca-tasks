import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Shield, Users, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/ui/use-toast";
import { AvatarEditor } from "@/components/ui/avatar-editor";

const profileSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const { profile } = useAuth();
  const { setProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [sectorName, setSectorName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name || "",
    },
  });

  // Fetch sector information
  useEffect(() => {
    const fetchSectorInfo = async () => {
      if (!profile?.sector_id) return;

      try {
        const { data, error } = await supabase
          .from("sectors")
          .select("name")
          .eq("id", profile.sector_id)
          .single();

        if (error) throw error;
        setSectorName(data.name);
      } catch (error) {
        console.error("Error fetching sector:", error);
      }
    };

    fetchSectorInfo();
  }, [profile?.sector_id]);

  if (!profile) return null;

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: data.fullName })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: data.fullName });

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (file: File | null) => {
    setAvatarLoading(true);

    try {
      if (!file) {
        // Remover avatar
        if (profile.avatar_url) {
          // Tentar remover arquivo antigo do storage
          const oldFileName = profile.avatar_url.split("/").pop();
          if (oldFileName) {
            await supabase.storage.from("avatars").remove([oldFileName]);
          }
        }

        // Atualizar perfil removendo avatar_url
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("id", profile.id);

        if (updateError) throw updateError;

        setProfile({ ...profile, avatar_url: null });

        toast({
          title: "Foto removida",
          description: "Sua foto de perfil foi removida com sucesso.",
        });

        return;
      }

      // Upload nova imagem
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Remover pasta 'avatars/' temporariamente

      // Remover arquivo antigo se existir
      if (profile.avatar_url) {
        const oldFileName = profile.avatar_url.split("/").pop();
        if (oldFileName && oldFileName !== fileName) {
          await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }

      // Upload novo arquivo
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Atualizar perfil com nova URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: data.publicUrl });

      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi alterada com sucesso.",
      });
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações pessoais
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Picture */}
        <Card>
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>
              Gerencie sua foto de perfil com ferramentas de edição
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarEditor
              currentAvatar={profile.avatar_url || undefined}
              userName={profile.full_name}
              onAvatarChange={handleAvatarChange}
              loading={avatarLoading}
            />
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Suas informações pessoais e dados da conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  disabled={loading}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Email não pode ser alterado
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="bg-[#09b230] hover:bg-[#09b230]/90 text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Role & Sector */}
        <Card>
          <CardHeader>
            <CardTitle>Função e Setor</CardTitle>
            <CardDescription>Suas informações organizacionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                {profile.role === "manager" ? (
                  <Shield className="h-4 w-4 text-primary" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">
                  {profile.role === "manager" ? "Gestor" : "Colaborador"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Setor</Label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#09b230]/10 to-[#09b230]/5 border border-[#09b230]/20 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-[#09b230]/10 rounded-full">
                  <Building2 className="h-5 w-5 text-[#09b230]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#09b230] uppercase tracking-wide">
                    {sectorName || "Carregando..."}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Setor de Atuação
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle>Segurança da Conta</CardTitle>
            <CardDescription>
              Configurações de segurança e senha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full border-[#09b230] text-[#09b230] hover:bg-[#09b230] hover:text-white"
            >
              Alterar Senha
            </Button>
            <p className="text-sm text-muted-foreground">
              Recomendamos alterar sua senha periodicamente para manter sua
              conta segura.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
