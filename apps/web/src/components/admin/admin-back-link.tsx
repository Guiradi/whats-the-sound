'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';

export function AdminBackLink() {
  const pathname = usePathname();
  const isAdminRoot = pathname === '/admin';

  return (
    <Link
      href={isAdminRoot ? '/' : '/admin'}
      className="inline-flex items-center gap-2 text-xs text-text-muted transition-colors hover:text-accent-cyan"
    >
      <ArrowLeft className="h-3 w-3" />
      WTS
    </Link>
  );
}
