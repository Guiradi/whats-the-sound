'use server';

import { isValidNickname } from '@/lib/auth/guest';
import { isBlockedNickname } from '@/lib/auth/profanity';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const nicknameSchema = z.object({
  nickname: z.string().trim(),
});

export type NicknameAvailability =
  | { status: 'available' }
  | { status: 'taken' }
  | { status: 'invalid' }
  | { status: 'profanity' }
  | { status: 'unchanged' };

export type UpdateNicknameResult =
  | { ok: true; nickname: string }
  | { ok: false; reason: 'invalid' | 'profanity' | 'taken' | 'unauthorized' | 'unknown' };

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function checkNicknameAvailability(input: string): Promise<NicknameAvailability> {
  const parsed = nicknameSchema.safeParse({ nickname: input });
  if (!parsed.success) return { status: 'invalid' };
  const nickname = parsed.data.nickname;

  if (!isValidNickname(nickname)) return { status: 'invalid' };
  if (isBlockedNickname(nickname)) return { status: 'profanity' };

  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return { status: 'invalid' };

  const { data: currentProfile } = await supabase
    .from('users')
    .select('nickname')
    .eq('id', user.id)
    .maybeSingle();
  if (currentProfile?.nickname === nickname) {
    return { status: 'unchanged' };
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('nickname', nickname)
    .maybeSingle();
  if (existing && existing.id !== user.id) {
    return { status: 'taken' };
  }
  return { status: 'available' };
}

export async function updateNickname(input: string): Promise<UpdateNicknameResult> {
  const parsed = nicknameSchema.safeParse({ nickname: input });
  if (!parsed.success) return { ok: false, reason: 'invalid' };
  const nickname = parsed.data.nickname;

  if (!isValidNickname(nickname)) return { ok: false, reason: 'invalid' };
  if (isBlockedNickname(nickname)) return { ok: false, reason: 'profanity' };

  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return { ok: false, reason: 'unauthorized' };

  const { error } = await supabase.from('users').update({ nickname }).eq('id', user.id);

  if (error) {
    // Postgres unique violation surfaces as error code "23505".
    if (error.code === '23505') return { ok: false, reason: 'taken' };
    return { ok: false, reason: 'unknown' };
  }

  revalidatePath('/[locale]/profile', 'page');
  return { ok: true, nickname };
}
