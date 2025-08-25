import { useState } from "react";
import { Calendar, Users, Settings, BarChart3, Bell, Building2, ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainItems = [
  { title: "Calendário", url: "/", icon: Calendar },
  { title: "Equipe", url: "/team", icon: Users },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
  { title: "Notificações", url: "/notifications", icon: Bell },
];

// Subsetores mock - em produção virão do backend baseado no setor do usuário
const subsetores = [
  { id: 1, name: "Desenvolvimento", color: "bg-blue-500" },
  { id: 2, name: "Design", color: "bg-purple-500" },
  { id: 3, name: "Marketing", color: "bg-green-500" },
  { id: 4, name: "Vendas", color: "bg-orange-500" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [subsetoresOpen, setSubsetoresOpen] = useState(true);

  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium shadow-primary" 
      : "hover:bg-secondary-hover text-foreground";

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} border-r border-border bg-card`} collapsible="icon">
      <SidebarContent className="p-2">
        {/* Logo */}
        <div className={`${collapsed ? "px-2" : "px-4"} py-6 border-b border-border mb-4`}>
          {collapsed ? (
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">TaskFlow</h2>
                <p className="text-xs text-muted-foreground">Gestão de Atividades</p>
              </div>
            </div>
          )}
        </div>

        {/* Menu Principal */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="ml-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subsetores */}
        {!collapsed && (
          <Collapsible open={subsetoresOpen} onOpenChange={setSubsetoresOpen}>
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:text-primary transition-colors">
                  Subsetores
                  <ChevronDown className={`h-4 w-4 transition-transform ${subsetoresOpen ? "rotate-180" : ""}`} />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {subsetores.map((subsetor) => (
                      <SidebarMenuItem key={subsetor.id}>
                        <SidebarMenuButton asChild className="h-9">
                          <NavLink 
                            to={`/setor/${subsetor.id}`} 
                            className={({ isActive }) => 
                              `flex items-center gap-3 ${isActive 
                                ? "bg-secondary text-secondary-foreground font-medium" 
                                : "hover:bg-secondary-hover text-muted-foreground"}`
                            }
                          >
                            <div className={`w-3 h-3 rounded-full ${subsetor.color}`} />
                            <span className="text-sm">{subsetor.name}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Configurações */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/settings" className={getNavCls}>
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span className="ml-2">Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}