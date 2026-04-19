const NAV_HIDDEN_PATH_PREFIXES = ['/login', '/admin', '/auth/callback'];
const ROOM_PATH_PATTERN = /^\/room\/[^/]+/;

export function shouldHideNavOnRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (
    NAV_HIDDEN_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  return ROOM_PATH_PATTERN.test(pathname);
}

export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
