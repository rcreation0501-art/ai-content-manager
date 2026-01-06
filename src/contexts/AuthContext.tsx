import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setTenant(null);
  };

  useEffect(() => {
    const loadUser = async (sessionUser: User | null) => {
      if (!sessionUser) {
        setUser(null);
        setUserRole(null);
        setTenant(null);
        setLoading(false);
        return;
      }

      setUser(sessionUser);

      // 🔹 LOAD PROFILE (ROLE)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, tenant_id")
        .eq("user_id", sessionUser.id)
        .single();

      setUserRole(profile?.role ?? "user");

      // 🔹 LOAD TENANT
      if (profile?.tenant_id) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", profile.tenant_id)
          .single();

        setTenant(tenantData);
      } else {
        setTenant(null);
      }

      setLoading(false);
    };

    // Initial session
    supabase.auth.getSession().then(({ data }) => {
      loadUser(data.session?.user ?? null);
    });

    // Auth listener
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
