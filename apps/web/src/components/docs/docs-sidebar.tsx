'use client';

import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface NavItem {
  slugKey: string;
  path: string;
  children?: NavItem[];
}

const NAV: NavItem[] = [
  { slugKey: 'homeLink', path: '/admin/docs' },
  { slugKey: 'sidebar.setup', path: '/admin/docs/setup' },
  {
    slugKey: 'sidebar.architecture',
    path: '/admin/docs/arch/overview',
    children: [
      { slugKey: 'sidebar.monorepo', path: '/admin/docs/arch/monorepo' },
      { slugKey: 'sidebar.database', path: '/admin/docs/arch/database' },
      { slugKey: 'sidebar.audio', path: '/admin/docs/arch/audio' },
    ],
  },
  { slugKey: 'sidebar.conventions', path: '/admin/docs/conventions' },
  { slugKey: 'sidebar.i18n', path: '/admin/docs/conventions/i18n' },
  { slugKey: 'sidebar.troubleshooting', path: '/admin/docs/troubleshooting' },
  { slugKey: 'sidebar.progress', path: '/admin/docs/progress' },
  {
    slugKey: 'sidebar.runbooks',
    path: '/admin/docs/runbooks/supabase-admin',
    children: [{ slugKey: 'sidebar.supabaseAdmin', path: '/admin/docs/runbooks/supabase-admin' }],
  },
];

export function DocsSidebar() {
  const t = useTranslations('docs');
  const pathname = usePathname();

  function isActive(path: string): boolean {
    return pathname === path || pathname.endsWith(path);
  }

  return (
    <nav aria-label="Docs" className="flex flex-col gap-1 text-sm">
      {NAV.map((item) => (
        <div key={item.path} className="flex flex-col gap-0.5">
          <SidebarLink path={item.path} active={isActive(item.path)}>
            {item.slugKey === 'homeLink' ? t('homeLink') : t(item.slugKey as never)}
          </SidebarLink>
          {item.children?.map((child) => (
            <SidebarLink key={child.path} path={child.path} active={isActive(child.path)} indent>
              {t(child.slugKey as never)}
            </SidebarLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function SidebarLink({
  path,
  active,
  indent,
  children,
}: {
  path: string;
  active: boolean;
  indent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={path}
      className={cn(
        'rounded-md px-3 py-1.5 transition-colors',
        indent && 'ml-3',
        active
          ? 'bg-accent-cyan/10 text-accent-cyan'
          : 'text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary',
      )}
    >
      {children}
    </Link>
  );
}
