import { PhoneCall, Calendar, LayoutDashboard, ListFilter, Search, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    role: "manager | employee",
  },
  {
    title: "Calllogs",
    url: "/dashboard/calllogs",
    icon: PhoneCall,
    role: "manager | employee",
  },
  {
    title: "CallAnalysis",
    url: "/dashboard/callanalysis",
    icon: ListFilter,
    role: "manager | employee",
  },
  {
    title: "Leaderboard",
    url: "/dashboard/leaderboard",
    icon: Search,
    role: "manager | employee",
  },
  {
    title: "UserManagement",
    url: "/dashboard/usermanagement",
    icon: Settings,
    role: "admin",
  },
];

// Helper function to check if a role is valid for the user.
const isRoleAllowed = (userRole, itemRole) => {
  const roles = itemRole.split(" | ");
  return roles.includes(userRole);
};

export function AppSidebar() {
  const { user } = useAuth();
  
  // Assuming 'user.role' holds the user's role (e.g., 'manager', 'employee', or 'admin')
  const userRole = user?.role || ""; // Default to empty string if no role

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter(item => isRoleAllowed(userRole, item.role)) // Filter items based on user role
                .map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
