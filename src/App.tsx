import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";

import Index from "./pages/Index";
import CreatePost from "./pages/CreatePost";
import LeadMagnet from "./pages/LeadMagnet";
import PostLibrary from "./pages/PostLibrary";
import ContentCalendar from "./pages/ContentCalendar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/AdminPanel"; // ✅ STEP 6 import

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      {!user ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          <Route
            path="/"
            element={
              <Layout>
                <Index />
              </Layout>
            }
          />

          <Route
            path="/create-post"
            element={
              <Layout>
                <CreatePost />
              </Layout>
            }
          />

          <Route
            path="/lead-magnet"
            element={
              <Layout>
                <LeadMagnet />
              </Layout>
            }
          />

          <Route
            path="/post-library"
            element={
              <Layout>
                <PostLibrary />
              </Layout>
            }
          />

          <Route
            path="/content-calendar"
            element={
              <Layout>
                <ContentCalendar />
              </Layout>
            }
          />

          {/* ✅ STEP 7: ADMIN ROUTE */}
          <Route
            path="/admin"
            element={
              <Layout>
                <AdminPanel />
              </Layout>
            }
          />

          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
