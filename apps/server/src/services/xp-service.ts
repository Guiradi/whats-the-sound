import type { SupabaseClient } from '@supabase/supabase-js';
import { XP_DAILY_SAFETY_CAP, levelForXp } from '@wts/shared/constants';
import type { XpAwardResult, XpSource } from '@wts/shared/types';
import type { TypedServer } from '../socket/index.js';

interface AwardXpParams {
  userId: string;
  source: XpSource;
  sourceRef: string;
  amount: number;
  context?: Record<string, unknown>;
}

const NOOP_RESULT: XpAwardResult = {
  previousLevel: 0,
  newLevel: 0,
  xpGained: 0,
  capped: false,
};

function getBRTDateRange(): { start: string; end: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayBRT = formatter.format(now);
  return {
    start: `${todayBRT}T00:00:00-03:00`,
    end: `${todayBRT}T23:59:59-03:00`,
  };
}

export function createXpService(supabase: SupabaseClient) {
  let io: TypedServer | null = null;

  function setIo(server: TypedServer): void {
    io = server;
  }

  function emitToUser(userId: string, event: 'xp:awarded' | 'xp:level_up', payload: unknown) {
    if (!io) return;
    try {
      // biome-ignore lint/suspicious/noExplicitAny: socket.io's emit is dynamically typed here
      (io.to(`user:${userId}`).emit as any)(event, payload);
    } catch {
      // Fire-and-forget: never let socket emission failures break XP persistence.
    }
  }

  async function awardXp(params: AwardXpParams): Promise<XpAwardResult> {
    const { userId, source, sourceRef, amount, context } = params;

    // Guard: reject guests and null users
    if (!userId || userId.startsWith('guest:')) {
      return NOOP_RESULT;
    }

    // Check if user is a guest in the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_guest, xp')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userData) {
      return NOOP_RESULT;
    }

    if (userData.is_guest === true) {
      return NOOP_RESULT;
    }

    const previousXp = (userData as { xp: number }).xp ?? 0;

    // Check daily XP cap
    const { start, end } = getBRTDateRange();
    const { data: todaySum, error: sumError } = await supabase
      .from('xp_events')
      .select('amount')
      .eq('user_id', userId)
      .eq('capped', false)
      .gte('created_at', start)
      .lte('created_at', end);

    if (sumError) {
      return NOOP_RESULT;
    }

    const earnedToday = (todaySum ?? []).reduce(
      (acc: number, row: { amount: number }) => acc + row.amount,
      0,
    );

    if (earnedToday >= XP_DAILY_SAFETY_CAP) {
      // Insert capped event for record-keeping
      await supabase.from('xp_events').insert({
        user_id: userId,
        source,
        source_ref: sourceRef,
        amount,
        capped: true,
        context: context ?? {},
      });

      return {
        previousLevel: levelForXp(previousXp),
        newLevel: levelForXp(previousXp),
        xpGained: 0,
        capped: true,
      };
    }

    // Insert XP event (idempotent via ON CONFLICT)
    const { data: insertData, error: insertError } = await supabase
      .from('xp_events')
      .insert({
        user_id: userId,
        source,
        source_ref: sourceRef,
        amount,
        capped: false,
        context: context ?? {},
      })
      .select('id')
      .maybeSingle();

    if (insertError) {
      // ON CONFLICT DO NOTHING returns no rows — Supabase may return an error or null data
      // If it's a unique constraint violation, treat as duplicate (no-op)
      if (insertError.code === '23505') {
        return {
          previousLevel: levelForXp(previousXp),
          newLevel: levelForXp(previousXp),
          xpGained: 0,
          capped: false,
        };
      }
      return NOOP_RESULT;
    }

    // If no row was inserted (duplicate via ON CONFLICT DO NOTHING), no-op
    if (!insertData) {
      return {
        previousLevel: levelForXp(previousXp),
        newLevel: levelForXp(previousXp),
        xpGained: 0,
        capped: false,
      };
    }

    // Update user XP
    const { data: updatedUser, error: updateError } = await supabase
      .rpc('increment_user_xp', { user_id_param: userId, amount_param: amount })
      .maybeSingle();

    // Fallback: if RPC doesn't exist, do a manual update
    let newXp = previousXp + amount;
    if (updateError) {
      const { data: manualUpdate } = await supabase
        .from('users')
        .update({ xp: previousXp + amount })
        .eq('id', userId)
        .select('xp')
        .single();

      if (manualUpdate) {
        newXp = (manualUpdate as { xp: number }).xp;
      }
    } else if (updatedUser) {
      newXp = (updatedUser as { xp: number }).xp ?? previousXp + amount;
    }

    const previousLevel = levelForXp(previousXp);
    const newLevel = levelForXp(newXp);

    // Fire socket notifications for live UI feedback (toast + level-up modal).
    // Uses per-user room joined at handshake; only reaches connected authenticated users.
    if (amount > 0) {
      emitToUser(userId, 'xp:awarded', {
        amount,
        source,
        newTotal: newXp,
        newLevel,
      });
    }
    if (newLevel > previousLevel) {
      emitToUser(userId, 'xp:level_up', {
        previousLevel,
        newLevel,
        xpGained: amount,
      });
    }

    return {
      previousLevel,
      newLevel,
      xpGained: amount,
      capped: false,
    };
  }

  return { awardXp, setIo };
}

export type XpService = ReturnType<typeof createXpService>;
