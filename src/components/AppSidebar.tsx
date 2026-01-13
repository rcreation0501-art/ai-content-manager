import { useState, useEffect } from "react";
import {
  Calendar,
  Edit,
  Gift,
  Library,
  Home,
  LogOut,
  Shield,
  Sparkles,
  Clock,
  AlertTriangle,
  Crown, // 👑 Added for the Admin Icon
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
import PricingModal from "./PricingModal";

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
  
  const [showPricing, setShowPricing] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  // 👑 CHECK IF ADMIN
  // We check if the role is 'admin' OR if the email matches your specific master email
  const isAdmin = userRole === 'admin' || user?.email === 'info@aiforfuture.tech';

  // 🕒 Calculate Trial Time Remaining
  useEffect(() => {
    if (user?.subscription_expiry) {
      const expiry = new Date(user.subscription_expiry);
      const now = new Date();
      
      // If Admin, give infinite days visual
      if (isAdmin) {
        setDaysLeft(9999);
        setIsExpired(false);
        return;
      }

      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysLeft(diffDays);
      
      if (diffDays <= 0) {
        setIsExpired(true);
      }
    }
  }, [user, isAdmin]);

  const handleRestrictedClick = (e: any) => {
    // Admins are never restricted
    if (!isAdmin && isExpired) {
      e.preventDefault();
      setShowPricing(true);
    }
  };

  if (loading) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      <Sidebar className="w-64 border-r border-border flex flex-col">
        <SidebarHeader className="p-6 border-b border-border">
          {/* LOGO AREA */}
          <div className="flex items-center space-x-2">
            <MilitaryLogo size="md" />
            <div>
              <h1 className="font-mono font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                Ghost Protocol
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">LEAD MAGNET AI</p>
                {/* 🚨 ADMIN TAG ON HEADER 🚨 */}
                {isAdmin && (
                  <span className="bg-red-600/20 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-600/30">
                    ADMIN
                  </span>
                )}
              </div>
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
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.url}
                      onClick={handleRestrictedClick}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {/* 🛡️ ADMIN PANEL LINK (Only Visible to You) */}
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 mt-4">
                      <NavLink to="/admin">
                        <Shield className="h-5 w-5" />
                        <span className="font-bold">Admin Panel</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 space-y-4">
          
          {/* ✨ TRIAL / STATUS WIDGET ✨ */}
          {user && (
            <div className={`px-4 py-3 rounded-xl border ${
              isAdmin 
                ? 'bg-gradient-to-r from-red-900/40 to-black border-red-500/50' // Special Dark Red for Admin
                : isExpired 
                  ? 'bg-red-500/10 border-red-500/50' 
                  : 'bg-gray-800 border-gray-700'
            }`}>
               <div className="flex items-center justify-between mb-1">
                 <p className="text-xs text-gray-400">Status</p>
                 {isAdmin ? (
                   <Crown size={14} className="text-yellow-500" /> // Crown for Admin
                 ) : isExpired ? (
                   <AlertTriangle size={14} className="text-red-500" />
                 ) : (
                   <Clock size={14} className="text-green-400" />
                 )}
               </div>
               
               <div className="flex items-center justify-between">
                 <span className={`text-sm font-bold ${
                   isAdmin ? 'text-white' : isExpired ? 'text-red-400' : 'text-white'
                 }`}>
                   {isAdmin ? 'Super Admin' : isExpired ? 'Expired' : 'Free Trial'}
                 </span>
                 
                 {!isAdmin && (
                   <span className={`text-xs px-2 py-1 rounded-full ${
                     isExpired ? 'bg-red-500 text-white' : 'bg-green-400/10 text-green-400'
                   }`}>
                     {daysLeft > 0 ? `${daysLeft} Days` : 'Upgrade'}
                   </span>
                 )}
               </div>
            </div>
          )}

          {/* UPGRADE BUTTON (Hidden for Admin) */}
          {!isAdmin && (
            <Button 
              onClick={() => setShowPricing(true)}
              className={`w-full text-white border-0 shadow-lg ${
                isExpired 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
              }`}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isExpired ? 'Reactivate Now' : 'Upgrade to Pro'}
            </Button>
          )}

          {tenant && (
            <div>
              <p className="text-xs text-muted-foreground">Workspace</p>
              <p className="text-sm">{tenant.name}</p>
            </div>
          )}

          {/* User Email Display */}
          {user && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate flex-1">{user.email}</p>
              {/* Extra Mini Badge for Email Line */}
              {isAdmin && <Shield size={12} className="text-red-500 ml-2" />}
            </div>
          )}

          <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </SidebarFooter>
      </Sidebar>
      {/* RENDER MODAL */}
      {showPricing && (
        <PricingModal 
          user={user} 
          onClose={() => !isExpired && setShowPricing(false)} 
        />
      )}
    </>
  );
}