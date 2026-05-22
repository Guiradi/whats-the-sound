'use client';

import { GuestHomeDashboard } from '@/components/home/guest-home-dashboard';
import { useAuth } from '@/hooks/use-auth';
import type { ReactNode } from 'react';

interface GuestOrLandingProps {
  landing: ReactNode;
}

export function GuestOrLanding({ landing }: GuestOrLandingProps) {
  const { guest, isLoading } = useAuth();

  if (isLoading) return <>{landing}</>;
  if (guest) return <GuestHomeDashboard nickname={guest.nickname} />;
  return <>{landing}</>;
}
