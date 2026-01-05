import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService, AuthUser, UserProfile, Tenant } from "@/lib/authService";

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  tenant: Tenant | null;
  userRole: "admin" | "member" | "viewer" | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const hasRedirected = useRef(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (currentUser) => {
      setLoading(true);
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setTenant(null);
        hasRedirected.current = false;
        setLoading(false);
        return;
      }

      try {
        const userProfile = await authService.getUserProfile(currentUser.id);
        console.log("AUTH PROFILE LOADED:", userProfile);

        if (!userProfile) {
          setProfile(null);
          setTenant(null);
          setLoading(false);
          return;
        }

        setProfile(userProfile);

        if (userProfile.tenant_id) {
          const userTenant = await authService.getTenant(userProfile.tenant_id);
          setTenant(userTenant);
        } else {
          setTenant(null);
        }

        // ✅ SAFE REDIRECT (prevents 404)
        if (
          !hasRedirected.current &&
          (location.pathname === "/login" ||
            location.pathname === "/signup" ||
            location.pathname === "/")
        ) {
          hasRedirected.current = true;
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Failed to load auth context:", error);
        setProfile(null);
        setTenant(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  const signUp = async (email: string, password: string) => {
    await authService.signUp(email, password);
  };

  const signIn = async (email: string, password: string) => {
    await authService.signIn(email, password);
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setTenant(null);
    hasRedirected.current = false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        tenant,
        userRole: profile?.role ?? null,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
