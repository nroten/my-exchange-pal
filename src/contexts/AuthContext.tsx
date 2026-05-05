import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  role: string;
  setup_complete: boolean;
  tracking_mode?: 'exchanges' | 'macros';
}

type ActiveView = 'tracker' | 'supporter';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  activeView: ActiveView;
  hasTrackerRole: boolean;
  hasSupporterRole: boolean;
  setActiveView: (view: ActiveView) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('tracker');
  const [hasSupporterRole, setHasSupporterRole] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    setProfile(data);
    return data;
  };

  const checkSupporterRole = async (userId: string) => {
    const { data } = await supabase
      .from('parent_connections')
      .select('id')
      .eq('parent_user_id', userId)
      .eq('status', 'active')
      .limit(1);
    const isSupporter = !!(data && data.length > 0);
    setHasSupporterRole(isSupporter);
    return isSupporter;
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  const refreshRoles = async () => {
    if (session?.user?.id) {
      await checkSupporterRole(session.user.id);
    }
  };

  useEffect(() => {
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          setTimeout(async () => {
            const prof = await fetchProfile(session.user.id);
            await checkSupporterRole(session.user.id);
            // Only set initial view once — never override an explicit user switch
            if (!initialized) {
              initialized = true;
              if (prof?.role === 'parent') {
                setActiveView('supporter');
              }
            }
          }, 0);
        } else {
          setProfile(null);
          setHasSupporterRole(false);
          initialized = false;
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const prof = await fetchProfile(session.user.id);
        await checkSupporterRole(session.user.id);
        if (!initialized) {
          initialized = true;
          if (prof?.role === 'parent') {
            setActiveView('supporter');
          }
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasTrackerRole = profile?.role === 'daughter' || (profile?.role === 'parent' && profile?.setup_complete);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setHasSupporterRole(false);
    setActiveView('tracker');
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      activeView,
      hasTrackerRole: profile?.role === 'daughter' || (profile?.role === 'parent' && profile?.setup_complete === true),
      hasSupporterRole: hasSupporterRole || profile?.role === 'parent',
      setActiveView,
      signOut,
      refreshProfile,
      refreshRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
