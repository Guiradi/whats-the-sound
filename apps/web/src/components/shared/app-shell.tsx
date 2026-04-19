'use client';

import { BottomNav } from '@/components/shared/bottom-nav';
import { shouldHideNavOnRoute } from '@/components/shared/nav-visibility';
import { TopHeader } from '@/components/shared/top-header';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from '@/i18n/navigation';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, guest } = useAuth();
  const pathname = usePathname();
  const isAuthenticated = Boolean(user) || Boolean(guest);
  const hideNav = !isAuthenticated || shouldHideNavOnRoute(pathname);

  if (hideNav) return <>{children}</>;

  return (
    <>
      <TopHeader />
      <div className="pb-24 lg:pb-8">{children}</div>
      <BottomNav />
    </>
  );
}
