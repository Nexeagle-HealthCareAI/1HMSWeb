import { 
  Calendar, 
  Users, 
  MessageSquare, 
  Bot, 
  Settings,
  Stethoscope,
  FileText,
  BarChart3,
  UserCog
} from "lucide-react";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { 
    title: "Appointment Scheduler", 
    url: "/appointment-scheduler", 
    icon: Calendar,
    description: "Manage appointments"
  },
  { 
    title: "Patients", 
    url: "/patients", 
    icon: Users,
    description: "Patient management"
  },
  { 
    title: "Internal Chat", 
    url: "/chat", 
    icon: MessageSquare,
    description: "Team communication"
  },
  { 
    title: "DocsAI", 
    url: "/docs-ai", 
    icon: Bot,
    description: "AI assistant"
  },
  { 
    title: "Calendar", 
    url: "/calendar", 
    icon: Calendar,
    description: "Doctor calendar"
  },
  { 
    title: "E-Prescription", 
    url: "/prescription", 
    icon: FileText,
    description: "Digital prescriptions"
  },
  { 
    title: "Analytics", 
    url: "/analytics", 
    icon: BarChart3,
    description: "Reports & insights"
  },
  { 
    title: "Admin", 
    url: "/admin", 
    icon: UserCog,
    description: "System administration"
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/appointment-scheduler") {
      return currentPath === path || currentPath.startsWith("/appointment-scheduler");
    }
    return currentPath === path || currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const active = isActive(path);
    return active 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";
  };

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-64"}
      variant="sidebar"
    >
      <SidebarContent className="bg-card border-r">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            {!collapsed && (
              <div>
                <h2 className="font-bold text-lg text-foreground">NexEagle</h2>
                <p className="text-xs text-muted-foreground">EasyHMS</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Main Navigation
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink 
                      to={item.url} 
                      className={getNavClassName(item.url)}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-auto p-4 border-t">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCog className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Dr. Admin</p>
                <p className="text-xs text-muted-foreground">Healthcare Professional</p>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}