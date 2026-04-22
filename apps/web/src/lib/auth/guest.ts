const GUEST_ID_KEY = 'wts_guest_id';
const GUEST_NICKNAME_KEY = 'wts_guest_nickname';

const NICKNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

function generateGuestNickname(): string {
  const hex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');
  return `Guest_${hex}`;
}

export interface GuestSession {
  id: string;
  nickname: string;
}

export function isValidNickname(nickname: string): boolean {
  return NICKNAME_PATTERN.test(nickname);
}

export function getGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null;
  const id = window.localStorage.getItem(GUEST_ID_KEY);
  const nickname = window.localStorage.getItem(GUEST_NICKNAME_KEY);
  if (!id || !nickname) return null;
  return { id, nickname };
}

export function setGuestSession(nickname: string): GuestSession {
  if (typeof window === 'undefined') {
    throw new Error('setGuestSession called outside browser');
  }
  if (!isValidNickname(nickname)) {
    throw new Error('Invalid guest nickname');
  }
  const existing = window.localStorage.getItem(GUEST_ID_KEY);
  const id = existing ?? crypto.randomUUID();
  window.localStorage.setItem(GUEST_ID_KEY, id);
  window.localStorage.setItem(GUEST_NICKNAME_KEY, nickname);
  return { id, nickname };
}

/**
 * Returns the existing guest session, or creates one automatically with a
 * generated nickname (Guest_XXXX). This ensures every visitor has a session
 * without requiring an explicit "enter nickname" step.
 */
export function getOrCreateGuestSession(): GuestSession {
  if (typeof window === 'undefined') {
    // SSR fallback — caller should only invoke this client-side.
    return { id: 'ssr', nickname: 'Guest' };
  }
  const existing = getGuestSession();
  if (existing) return existing;
  const nickname = generateGuestNickname();
  return setGuestSession(nickname);
}

export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_ID_KEY);
  window.localStorage.removeItem(GUEST_NICKNAME_KEY);
}
