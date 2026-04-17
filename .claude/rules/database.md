---
paths:
  - "supabase/**"
  - "apps/server/src/routes/**"
  - "apps/server/src/services/**"
---

# Database Rules — What's the Sound?

## Schema
- Every table MUST have RLS enabled
- Every FK MUST have ON DELETE defined (CASCADE or SET NULL)
- Every table MUST have created_at TIMESTAMPTZ DEFAULT now()
- Mutable tables MUST have updated_at with auto-update trigger
- Column naming: snake_case always
- Use enums for constrained values (midi_category, game_status, etc)
- JSONB for flexible structures (phases config, attempts)

## RLS Policies
- Public data (midi_catalog, game_sessions): SELECT for all
- User data (daily_results, profiles): SELECT/UPDATE only own data
- Admin data (catalog management): check role = 'admin'
- NEVER use SECURITY DEFINER in policies — only in trigger functions

## Queries (Server-side)
- Use Supabase client with service_role key for server operations
- Use parameterized queries — NEVER string interpolation for SQL
- Always handle errors from Supabase calls
- Use .single() when expecting exactly one row
- Use .maybeSingle() when row might not exist

## Migrations
- One migration per logical change
- Naming: YYYYMMDDHHMMSS_description.sql
- Never modify applied migrations
- Test migrations on local Supabase before pushing

## Sensitive Data
- Accepted answers (titles/artists) MUST NOT be sent to client before round_end
- Service role key MUST NOT be in client-side code
- Use NEXT_PUBLIC_ prefix ONLY for anon key and Supabase URL
