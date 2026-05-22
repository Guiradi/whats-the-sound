const GUEST_ID_KEY = 'wts_guest_id';
const GUEST_NICKNAME_KEY = 'wts_guest_nickname';
const GUEST_OPT_OUT_KEY = 'wts_guest_opted_out';

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
  // Explicit guest creation is an opt-in — clear any previous opt-out.
  window.localStorage.removeItem(GUEST_OPT_OUT_KEY);
  return { id, nickname };
}

export function isGuestOptedOut(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(GUEST_OPT_OUT_KEY) === '1';
}

export function setGuestOptedOut(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GUEST_OPT_OUT_KEY, '1');
}

/**
 * Returns the existing guest session, or creates one automatically with a
 * generated nickname (Guest_XXXX). Returns null when the visitor has
 * explicitly opted out (signed out) and hasn't re-entered guest mode yet.
 */
export function getOrCreateGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const existing = getGuestSession();
  if (existing) return existing;
  if (isGuestOptedOut()) return null;
  const nickname = generateGuestNickname();
  return setGuestSession(nickname);
}

export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_ID_KEY);
  window.localStorage.removeItem(GUEST_NICKNAME_KEY);
}
