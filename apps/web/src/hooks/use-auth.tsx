'use client';

import {
  type GuestSession,
  clearGuestSession,
  getGuestSession,
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

interface AuthContextValue {
  user: User | null;
  guest: GuestSession | null;
  isGuest: boolean;
  isLoading: boolean;
  signInWithGoogle: (next?: string) => Promise<void>;
  signInWithDiscord: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
  guestLogin: (nickname: string) => GuestSession;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildRedirectTo(next: string | undefined): string {
  const base = `${window.location.origin}/auth/callback`;
  if (!next) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
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
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!initialUser) {
      setGuest(getGuestSession());
    }
    setIsHydrated(true);
  }, [initialUser]);

  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        clearGuestSession();
        setGuest(null);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(
    async (next?: string) => {
      if (!supabase) return;
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: buildRedirectTo(next) },
      });
    },
    [supabase],
  );

  const signInWithDiscord = useCallback(
    async (next?: string) => {
      if (!supabase) return;
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: buildRedirectTo(next) },
      });
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
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
      guest,
      isGuest: !user && guest !== null,
      isLoading: !isHydrated,
      signInWithGoogle,
      signInWithDiscord,
      signOut,
      guestLogin,
    }),
    [user, guest, isHydrated, signInWithGoogle, signInWithDiscord, signOut, guestLogin],
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
