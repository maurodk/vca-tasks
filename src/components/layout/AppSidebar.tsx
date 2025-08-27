import { useState, useEffect } from "react";
import { Calendar, Users, Settings, BarChart3, Building2, ChevronDown, Plus, FolderOpen } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
interface Subsector {
  id: string;
  name: string;
  description?: string;
}
const mainItems = [{
  title: "Calendário",
  url: "/",
  icon: Calendar
}, {
  title: "Equipe",
  url: "/team",
  icon: Users
}, {
  title: "Relatórios",
  url: "/reports",
  icon: BarChart3
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const {
    profile,
    isManager
  } = useAuth();
  const location = useLocation();
  const [subsectors, setSubsectors] = useState<Subsector[]>([]);
  const [subsetoresOpen, setSubsetoresOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-primary text-primary-foreground font-medium shadow-primary" : "hover:bg-secondary-hover text-foreground";
  useEffect(() => {
    const fetchSubsectors = async () => {
      if (!profile?.sector_id) {
        setLoading(false);
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.from('subsectors').select('*').eq('sector_id', profile.sector_id).order('name');
        if (error) throw error;
        setSubsectors(data || []);
      } catch (error) {
        console.error('Error fetching subsectors:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubsectors();
  }, [profile?.sector_id]);
  const createSubsector = async () => {
    if (!isManager || !profile?.sector_id) return;
    const name = prompt('Nome do novo subsetor:');
    if (!name?.trim()) return;
    try {
      const {
        data,
        error
      } = await supabase.from('subsectors').insert({
        name: name.trim(),
        sector_id: profile.sector_id
      }).select().single();
      if (error) throw error;
      setSubsectors(prev => [...prev, data]);
    } catch (error) {
      console.error('Error creating subsector:', error);
      alert('Erro ao criar subsetor. Tente novamente.');
    }
  };
  return <Sidebar className={`${collapsed ? "w-14" : "w-64"} border-r border-border bg-card`} collapsible="icon">
      <SidebarContent className="p-2">
        {/* Logo */}
        <div className={`${collapsed ? "px-2" : "px-4"} py-6 border-b border-border mb-4`}>
          {collapsed ? <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div> : <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">TaskFlow</h2>
                <p className="text-xs text-muted-foreground">Gestão de Atividades</p>
              </div>
            </div>}
        </div>

        {/* Menu Principal */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="ml-2 text-slate-950">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subsetores */}
        {!collapsed && !loading && <Collapsible open={subsetoresOpen} onOpenChange={setSubsetoresOpen}>
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between">
                  <SidebarGroupLabel className="flex items-center cursor-pointer hover:text-primary transition-colors">
                    Subsetores
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${subsetoresOpen ? "rotate-180" : ""}`} />
                  </SidebarGroupLabel>
                  {isManager && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={createSubsector} title="Criar novo subsetor">
                      <Plus className="h-3 w-3" />
                    </Button>}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {subsectors.map(subsector => <SidebarMenuItem key={subsector.id}>
                        <SidebarMenuButton asChild className="h-9">
                          <NavLink to={`/subsector/${subsector.id}`} className={({
                      isActive
                    }) => `flex items-center gap-3 ${isActive ? "bg-secondary text-secondary-foreground font-medium" : "hover:bg-secondary-hover text-muted-foreground"}`}>
                            <FolderOpen className="w-4 h-4" />
                            <span className="text-sm">{subsector.name}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>)}
                    {subsectors.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">
                        {isManager ? 'Clique em + para criar um subsetor' : 'Nenhum subsetor disponível'}
                      </div>}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>}

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
    </Sidebar>;
}