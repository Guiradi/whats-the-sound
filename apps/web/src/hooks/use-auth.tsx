'use client';

import {
  type GuestSession,
  clearGuestSession,
  getGuestSession,
  getOrCreateGuestSession,
  setGuestSession,
} from '@/lib/auth/guest';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { User } from '@supabase/supabase-js';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface UserProfile {
  nickname: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  guest: GuestSession | null;
  isGuest: boolean;
  isLoading: boolean;
  signInWithGoogle: (next?: string) => Promise<void>;
  signInWithDiscord: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
  guestLogin: (nickname: string) => GuestSession;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildRedirectTo(next: string | undefined, guestId?: string): string {
  const base = `${window.location.origin}/auth/callback`;
  const params = new URLSearchParams();
  if (next) params.set('next', next);
  if (guestId) params.set('guest_id', guestId);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const fetchProfile = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from('users')
        .select('nickname, avatar_url')
        .eq('id', uid)
        .maybeSingle();
      if (data) {
        setProfile({ nickname: data.nickname, avatarUrl: data.avatar_url });
      }
    },
    [supabase],
  );

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!initialUser) {
      setGuest(getOrCreateGuestSession());
    } else {
      fetchProfile(initialUser.id);
    }
    setIsHydrated(true);
  }, [initialUser, fetchProfile]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        clearGuestSession();
        setGuest(null);
        fetchProfile(nextUser.id);
      } else {
        setProfile(null);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signInWithGoogle = useCallback(
    async (next?: string) => {
      const guestId = getGuestSession()?.id;
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: buildRedirectTo(next, guestId) },
      });
    },
    [supabase],
  );

  const signInWithDiscord = useCallback(
    async (next?: string) => {
      const guestId = getGuestSession()?.id;
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: buildRedirectTo(next, guestId) },
      });
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearGuestSession();
    setUser(null);
    setGuest(null);
  }, [supabase]);

  const guestLogin = useCallback((nickname: string) => {
    const session = setGuestSession(nickname);
    setGuest(session);
    return session;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      guest,
      isGuest: !user && guest !== null,
      isLoading: !isHydrated,
      signInWithGoogle,
      signInWithDiscord,
      signOut,
      guestLogin,
      refreshProfile,
    }),
    [
      user,
      profile,
      guest,
      isHydrated,
      signInWithGoogle,
      signInWithDiscord,
      signOut,
      guestLogin,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
