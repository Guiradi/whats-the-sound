import { env } from '@/env';

export const APP_BASE_URL: string = env.NEXT_PUBLIC_APP_URL;

export const APP_DISPLAY_URL: string = (() => {
  try {
    return new URL(env.NEXT_PUBLIC_APP_URL).host;
  } catch {
    return env.NEXT_PUBLIC_APP_URL;
  }
})();
