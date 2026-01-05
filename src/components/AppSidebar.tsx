import {
  Calendar,
  Edit,
  Gift,
  Library,
  Home,
  LogOut,
  Building2,
  Shield, // ✅ ADDED
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { MilitaryLogo } from "./ui/ghost-logo"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/sidebar"

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Create Post", url: "/create-post", icon: Edit },
  { title: "Lead Magnet AI", url: "/lead-magnet", icon: Gift },
  { title: "Post Library", url: "/post-library", icon: Library },
  { title: "Content Calendar", url: "/content-calendar", icon: Calendar },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  // ✅ UPDATED: include userRole
  const { tenant, user, userRole, signOut } = useAuth()

  const currentPath = location.pathname
  const isActive = (path: string) => currentPath === path

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate("/login")
    } catch (error) {
      console.error("Sign out failed:", error)
    }
  }

  return (
    <Sidebar className="w-64 border-r border-border flex flex-col">
      <SidebarHeader className="p-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <MilitaryLogo size="md" />
          <div>
            <h1 className="font-mono font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 tracking-wider">
              Ghost Protocol
            </h1>
            <p className="text-sm text-muted-foreground tracking-widest uppercase font-medium">
              LEAD MAGNET AI
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-red-400 uppercase tracking-wider text-sm font-bold">
            NAVIGATION MATRIX
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 w-full futuristic-border glow-hover text-base font-medium tracking-wide ${
                          isActive
                            ? "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 font-medium border border-red-500/30"
                            : "text-sidebar-foreground hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-600/10 hover:text-red-300"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={`h-5 w-5 ${
                              isActive
                                ? "text-red-400 scale-110 drop-shadow-glow"
                                : ""
                            }`}
                          />
                          <span className="tracking-wide font-medium">
                            {item.title}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* ✅ ADMIN ONLY LINK */}
              {userRole === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 w-full futuristic-border glow-hover text-base font-medium tracking-wide ${
                          isActive
                            ? "bg-gradient-to-r from-red-600/30 to-red-700/30 text-red-300 border border-red-500/40"
                            : "text-red-300 hover:bg-gradient-to-r hover:from-red-600/20 hover:to-red-700/20"
                        }`
                      }
                    >
                      <Shield className="h-5 w-5 text-red-400" />
                      <span className="tracking-wide font-medium">
                        Admin Panel
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4 space-y-4">
        {tenant && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
              Current Workspace
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <Building2 className="h-4 w-4 text-red-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tenant.name}</p>
                <p className="text-xs text-muted-foreground">
                  {tenant.subscription_status}
                </p>
              </div>
            </div>
          </div>
        )}

        {user && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
              Account
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        )}

        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full justify-start gap-2 futuristic-border glow-hover"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
