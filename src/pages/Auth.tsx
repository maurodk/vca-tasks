import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Auth = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('login');

  // Check for invitation token
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      setActiveTab('register');
    }
  }, [token]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            TaskFlow
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema de Gerenciamento de Atividades
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              {token ? 'Finalizar Registro' : 'Bem-vindo'}
            </CardTitle>
            <CardDescription>
              {token 
                ? 'Complete seu registro para acessar o sistema'
                : 'Entre em sua conta ou registre-se'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {token ? (
              <RegisterForm token={token} />
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="register">Registrar</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="mt-4">
                  <LoginForm />
                </TabsContent>
                <TabsContent value="register" className="mt-4">
                  <RegisterForm />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;