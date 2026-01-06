import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const routeTitles: { [key: string]: string } = {
  "/": "Dashboard",
  "/create-post": "Create Post",
  "/lead-magnet": "Lead Magnet AI",
  "/post-library": "Post Library",
  "/content-calendar": "Content Calendar",
  "/admin": "Admin Panel",
};

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, userRole, loading } = useAuth();

  // 🔒 WAIT FOR AUTH (THIS WAS MISSING)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  // 🔒 NOT LOGGED IN
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            {userRole === "admin" && (
              <div className="mb-4">
                <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                  ADMIN
                </span>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
