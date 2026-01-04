import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserProfile {
  user_id: string;
  tenant_id: string;
  role: 'admin' | 'member' | 'viewer';
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  subscription_status: string;
  created_at: string;
}

export const authService = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser: async (): Promise<AuthUser | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email!,
    };
  },

  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  getTenant: async (tenantId: string): Promise<Tenant | null> => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  onAuthStateChange: (callback: (user: AuthUser | null) => void) => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email!,
        });
      } else {
        callback(null);
      }
    });

    return data.subscription.unsubscribe;
  },
};
