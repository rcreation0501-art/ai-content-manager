import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const routeTitles: { [key: string]: string } = {
  "/": "Dashboard",
  "/create-post": "Create Post",
  "/lead-magnet": "Lead Magnet AI",
  "/post-library": "Post Library",
  "/content-calendar": "Content Calendar",
};

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { profile } = useAuth();
  const currentTitle = routeTitles[location.pathname] || "Content Hub";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            {profile?.role === "admin" && (
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
