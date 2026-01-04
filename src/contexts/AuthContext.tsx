import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser, UserProfile, Tenant } from '@/lib/authService';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  tenant: Tenant | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userProfile = await authService.getUserProfile(currentUser.id);
          setProfile(userProfile);

          if (userProfile) {
            const userTenant = await authService.getTenant(userProfile.tenant_id);
            setTenant(userTenant);
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
          setProfile(null);
          setTenant(null);
        }
      } else {
        setProfile(null);
        setTenant(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        tenant,
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
