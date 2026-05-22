-- Fix-up: `login_streak` is queried directly by the frontend (home `/[locale]/page.tsx`
-- and `/profile/page.tsx` via PROFILE_COLUMNS). It is a game-engagement stat (similar
-- to `daily_streak`, which is already public) so we expose it instead of routing
-- those reads through the backend.
--
-- `last_login_date` stays server-only — that is a timestamped privacy signal, not a
-- game stat, and no client code reads it directly.

grant select (login_streak) on public.users to anon, authenticated;
