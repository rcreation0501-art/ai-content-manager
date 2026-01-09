import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, AuthError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  userRole: string | null;
  tenant: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // 1. SIGN IN
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  // 2. SIGN UP (This was missing!)
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This ensures the profile trigger has data to work with if needed
        data: {
          full_name: email.split("@")[0],
        },
      },
    });

    if (error) throw error;

    // Check if email confirmation is required
    if (data.user && !data.session) {
      toast({
        title: "Check your email",
        description: "We sent you a confirmation link. Please check your spam folder too.",
      });
    }
  };

  // 3. SIGN OUT
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setUserRole(null);
    setTenant(null);
  };

  // 4. LOAD USER SESSION
  useEffect(() => {
    const loadUser = async (sessionUser: User | null) => {
      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        setUserRole(null);
        setTenant(null);
        setLoading(false);
        return;
      }

      setUser(sessionUser);

      // Fetch Profile & Role
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, tenant_id")
        .eq("user_id", sessionUser.id)
        .single();

      setProfile(profileData);
      setUserRole(profileData?.role ?? "member");

      // Fetch Tenant
      if (profileData?.tenant_id) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", profileData.tenant_id)
          .single();
        setTenant(tenantData);
      } else {
        setTenant(null);
      }

      setLoading(false);
    };

    // Initialize
    supabase.auth.getSession().then(({ data }) => {
      loadUser(data.session?.user ?? null);
    });

    // Listen for changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userRole,
        tenant,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}