/**
 * Smoke test: verifies that the admin Supabase client can reach the database and
 * that the core schema exists. Run with:
 *   pnpm --filter @wts/server exec tsx scripts/smoke-db.ts
 */
import { getSupabaseAdmin } from '../src/lib/supabase.js';

async function main() {
  const supabase = getSupabaseAdmin();

  // 1. users table reachable
  const { count: usersCount, error: usersError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (usersError) throw new Error(`users: ${usersError.message}`);

  // 2. midi_catalog reachable
  const { count: midiCount, error: midiError } = await supabase
    .from('midi_catalog')
    .select('*', { count: 'exact', head: true });
  if (midiError) throw new Error(`midi_catalog: ${midiError.message}`);

  // 3. xp_events reachable (new from feature 08)
  const { count: xpCount, error: xpError } = await supabase
    .from('xp_events')
    .select('*', { count: 'exact', head: true });
  if (xpError) throw new Error(`xp_events: ${xpError.message}`);

  // 4. daily_schedule reachable
  const { count: scheduleCount, error: scheduleError } = await supabase
    .from('daily_schedule')
    .select('*', { count: 'exact', head: true });
  if (scheduleError) throw new Error(`daily_schedule: ${scheduleError.message}`);

  // 5. storage bucket exists
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) throw new Error(`storage: ${bucketError.message}`);
  const midisBucket = buckets?.find((b) => b.name === 'midis');
  if (!midisBucket) throw new Error('storage: midis bucket missing');

  // 6. auth settings (provider config)
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (authError) throw new Error(`auth: ${authError.message}`);

  console.log('✓ users:', usersCount);
  console.log('✓ midi_catalog:', midiCount);
  console.log('✓ xp_events:', xpCount);
  console.log('✓ daily_schedule:', scheduleCount);
  console.log('✓ storage bucket "midis": present (public:', midisBucket.public, ')');
  console.log('✓ auth.admin reachable, users in system:', authUsers.users.length);
  console.log('\nAll smoke checks passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err.message);
  process.exit(1);
});
