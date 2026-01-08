import { useState } from "react";
import {
  Calendar,
  Edit,
  Gift,
  Library,
  Home,
  LogOut,
  Building2,
  Shield,
  Sparkles, // ✨ Added: Icon for Upgrade
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { MilitaryLogo } from "./ui/ghost-logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import PricingModal from "./PricingModal"; // 👈 Added: Import your Modal

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Create Post", url: "/create-post", icon: Edit },
  { title: "Lead Magnet AI", url: "/lead-magnet", icon: Gift },
  { title: "Post Library", url: "/post-library", icon: Library },
  { title: "Content Calendar", url: "/content-calendar", icon: Calendar },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenant, user, userRole, loading, signOut } = useAuth();
  
  // ✨ Added: State to control the Pricing Modal
  const [showPricing, setShowPricing] = useState(false);

  if (loading) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      <Sidebar className="w-64 border-r border-border flex flex-col">
        <SidebarHeader className="p-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <MilitaryLogo size="md" />
            <div>
              <h1 className="font-mono font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                Ghost Protocol
              </h1>
              <p className="text-sm text-muted-foreground">LEAD MAGNET AI</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="flex-1">
          <SidebarGroup>
            <SidebarGroupLabel>NAVIGATION MATRIX</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <NavLink to={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {userRole === "admin" && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin">
                        <Shield className="h-5 w-5 text-red-500" />
                        <span className="text-red-500">Admin Panel</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 space-y-4">
          
          {/* ✨ UPGRADE BUTTON INSERTED HERE ✨ */}
          <Button 
            onClick={() => setShowPricing(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-blue-500/20"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade to Pro
          </Button>

          {tenant && (
            <div>
              <p className="text-xs text-muted-foreground">Workspace</p>
              <p className="text-sm">{tenant.name}</p>
            </div>
          )}

          {user && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}

          <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </SidebarFooter>
      </Sidebar>

      {/* ✨ RENDER MODAL ✨ */}
      {showPricing && (
        <PricingModal 
          user={user} 
          onClose={() => setShowPricing(false)} 
        />
      )}
    </>
  );
}