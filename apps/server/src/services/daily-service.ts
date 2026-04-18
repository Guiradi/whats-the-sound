import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DAILY_BUFFER_DAYS,
  DAILY_PHASES_TOTAL,
  DAILY_TIMEZONE,
  type DailyAttempt,
  type DailyGuessResponse,
  type DailyHistoryEntry,
  type DailyState,
  GuessResult,
  type MidiCategory,
  WEEKDAY_CATEGORY,
  XP_DAILY_CORRECT,
  XP_DAILY_PARTICIPATION,
  XP_FIRST_MATCH_OF_DAY,
  XP_STREAK_CAP,
  XP_STREAK_MULTIPLIER,
  verifyDailyGuess,
} from '@wts/shared';
import type { ReferralService } from './referral-service.js';
import { SupabaseMidiProvider } from './supabase-midi-provider.js';
import type { XpService } from './xp-service.js';

/**
 * Get today's date string in BRT (America/Sao_Paulo).
 */
export function getTodayBRT(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // YYYY-MM-DD
}

/**
 * Get the day number since epoch for a given date (used as daily number).
 */
function getDayNumber(dateISO: string): number {
  const epoch = new Date('2026-04-01').getTime();
  const target = new Date(dateISO).getTime();
  return Math.floor((target - epoch) / (24 * 60 * 60 * 1000)) + 1;
}

/**
 * Get the BRT weekday (0=Sunday) for a date string.
 */
function getBRTWeekday(dateISO: string): number {
  const date = new Date(`${dateISO}T12:00:00-03:00`);
  return date.getDay();
}

export function createDailyService(
  supabase: SupabaseClient,
  dailySeed: string,
  xpService?: XpService,
  referralService?: ReferralService,
) {
  const midiProvider = new SupabaseMidiProvider(supabase);

  /**
   * Deterministically select the daily MIDI for a given date.
   * Uses HMAC-SHA256 with the daily seed to ensure same result every time.
   */
  async function selectDailyMidi(dateISO: string): Promise<string> {
    // Check if already selected
    const { data: existing } = await supabase
      .from('daily_schedule')
      .select('midi_id')
      .eq('date', dateISO)
      .maybeSingle();

    if (existing?.midi_id) {
      return existing.midi_id as string;
    }

    // Determine category based on weekday
    const weekday = getBRTWeekday(dateISO);
    const category = WEEKDAY_CATEGORY[weekday] ?? 'random';

    // Get recently used MIDI IDs to exclude
    const { data: recentSchedule } = await supabase
      .from('daily_schedule')
      .select('midi_id')
      .order('date', { ascending: false })
      .limit(DAILY_BUFFER_DAYS);

    const excludeIds = (recentSchedule ?? []).map((r: { midi_id: string }) => r.midi_id);

    // Get available MIDIs
    let available = await midiProvider.getAvailableMidis(category, excludeIds);

    // Fallback to random category if no MIDIs available for the day's category
    if (available.length === 0 && category !== 'random') {
      available = await midiProvider.getAvailableMidis('random', excludeIds);
    }

    // Last resort: allow repeats
    if (available.length === 0) {
      available = await midiProvider.getAvailableMidis('random', []);
    }

    if (available.length === 0) {
      throw new Error('No MIDIs available in catalog for daily selection');
    }

    // Deterministic selection via HMAC
    const hash = createHmac('sha256', dailySeed).update(dateISO).digest('hex');
    const index = Number.parseInt(hash.slice(0, 8), 16) % available.length;
    const selected = available[index];
    if (!selected) {
      throw new Error('Failed to select daily MIDI: invalid index');
    }

    // Upsert into daily_schedule
    const { error } = await supabase.from('daily_schedule').upsert(
      {
        date: dateISO,
        midi_id: selected.id,
        category: selected.category,
      },
      { onConflict: 'date' },
    );

    if (error) {
      throw new Error(`Failed to upsert daily_schedule: ${error.message}`);
    }

    return selected.id;
  }

  /**
   * Get the daily state for a user on a given date.
   * Self-heals by calling selectDailyMidi if no entry exists.
   */
  async function getDailyForUser(userId: string | null, dateISO: string): Promise<DailyState> {
    const midiId = await selectDailyMidi(dateISO);
    const midi = await midiProvider.getMidiById(midiId);

    if (!midi) {
      throw new Error(`Daily MIDI ${midiId} not found in catalog`);
    }

    const { data: schedule } = await supabase
      .from('daily_schedule')
      .select('category')
      .eq('date', dateISO)
      .single();

    const dayNumber = getDayNumber(dateISO);

    // Check if user has already played
    interface DailyResultRow {
      phase_guessed: number | null;
      attempts: DailyAttempt[] | null;
      completed: boolean;
    }

    let existingResult: DailyResultRow | null = null;

    if (userId) {
      const { data } = await supabase
        .from('daily_results')
        .select('phase_guessed, attempts, completed')
        .eq('user_id', userId)
        .eq('date', dateISO)
        .maybeSingle();

      existingResult = data as DailyResultRow | null;
    }

    const completed = existingResult?.completed ?? false;
    const isCorrect = existingResult?.phase_guessed != null;
    const attempts = existingResult?.attempts ?? [];

    // Determine current phase from attempts
    let currentPhase: 1 | 2 | 3 | 4 = 1;
    if (!completed) {
      // Count wrong attempts (each wrong = used a phase)
      const wrongAttempts = attempts.filter((a) =>
        a.result === GuessResult.CORRECT
          ? false
          : a.result !== GuessResult.WARM && a.result !== GuessResult.HOT,
      ).length;
      currentPhase = Math.min(wrongAttempts + 1, DAILY_PHASES_TOTAL) as 1 | 2 | 3 | 4;
    }

    // Get audio data for the current phase (never send all phases)
    const phaseKey = `phase${currentPhase}` as keyof typeof midi.phases;
    const phaseAudioData = completed ? null : midi.phases[phaseKey];

    return {
      midiId: midi.id,
      date: dateISO,
      dayNumber,
      category: (schedule?.category as MidiCategory) ?? midi.category,
      currentPhase,
      attempts,
      completed,
      isCorrect,
      phaseAudioData,
      midiFileUrl: completed ? null : midi.midiFileUrl,
    };
  }

  /**
   * Submit a guess for the daily challenge.
   */
  async function submitGuess(
    userId: string,
    dateISO: string,
    phase: 1 | 2 | 3 | 4,
    guess: string,
  ): Promise<DailyGuessResponse> {
    const midiId = await selectDailyMidi(dateISO);
    const midi = await midiProvider.getMidiById(midiId);

    if (!midi) {
      throw new Error(`Daily MIDI ${midiId} not found`);
    }

    // Check existing result
    const { data: existingRaw } = await supabase
      .from('daily_results')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateISO)
      .maybeSingle();

    const existing = existingRaw as {
      completed: boolean;
      phase_guessed: number | null;
      attempts: DailyAttempt[] | null;
      midi_id: string;
    } | null;

    if (existing?.completed) {
      return {
        result: GuessResult.WRONG,
        completed: true,
        isCorrect: existing.phase_guessed != null,
        nextPhase: null,
        nextPhaseAudioData: null,
        title: midi.title,
        artist: midi.artist,
      };
    }

    // Verify the guess
    const verification = verifyDailyGuess(guess, midi.acceptedTitles, midi.acceptedArtists);

    const attempts: DailyAttempt[] = existing?.attempts ?? [];
    const newAttempt: DailyAttempt = { phase, guess, result: verification.result };
    attempts.push(newAttempt);

    const isCorrect = verification.result === GuessResult.CORRECT;

    // "Almost" (HOT/WARM) don't consume the attempt — player can try again on same phase
    const consumesAttempt =
      verification.result !== GuessResult.HOT && verification.result !== GuessResult.WARM;

    // Determine next phase and completion
    let nextPhase: 1 | 2 | 3 | 4 | null = null;
    let completed = false;

    if (isCorrect) {
      completed = true;
    } else if (consumesAttempt) {
      if (phase >= DAILY_PHASES_TOTAL) {
        completed = true; // Ran out of phases
      } else {
        nextPhase = (phase + 1) as 1 | 2 | 3 | 4;
      }
    } else {
      // HOT/WARM — stay on same phase
      nextPhase = phase;
    }

    // Upsert daily_results
    const resultRow = {
      user_id: userId,
      midi_id: midiId,
      date: dateISO,
      phase_guessed: isCorrect ? phase : null,
      attempts,
      completed,
    };

    const isFirstAttemptToday = !existing;
    const justCompleted = completed && !existing?.completed;

    if (existing) {
      const { error } = await supabase
        .from('daily_results')
        .update({
          phase_guessed: isCorrect ? phase : existing.phase_guessed,
          attempts,
          completed,
        })
        .eq('user_id', userId)
        .eq('date', dateISO);

      if (error) {
        throw new Error(`Failed to update daily_results: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from('daily_results').insert(resultRow);
      if (error) {
        throw new Error(`Failed to insert daily_results: ${error.message}`);
      }
    }

    // Award XP — requires xpService (skipped when Supabase is not configured in tests).
    // Idempotent via source_ref; guest/unknown users are filtered inside xp-service.
    if (xpService) {
      if (justCompleted) {
        if (isCorrect) {
          await xpService.awardXp({
            userId,
            source: 'daily_correct',
            sourceRef: `daily_correct_${dateISO}_${userId}`,
            amount: XP_DAILY_CORRECT[phase] ?? 0,
            context: { phase, date: dateISO },
          });
        } else {
          await xpService.awardXp({
            userId,
            source: 'daily_participation',
            sourceRef: `daily_participation_${dateISO}_${userId}`,
            amount: XP_DAILY_PARTICIPATION,
            context: { date: dateISO },
          });
        }

        // First match of the day bonus — fires once per user per BRT day regardless of
        // whether they came in via daily or MP. Idempotent via source_ref, so subsequent
        // completions are no-ops.
        await xpService.awardXp({
          userId,
          source: 'first_match_of_day',
          sourceRef: `first_match_${dateISO}_${userId}`,
          amount: XP_FIRST_MATCH_OF_DAY,
          context: { date: dateISO, matchSource: 'daily' },
        });
      }

      // Streak bonus: only fires on the first attempt of the day, when the INSERT
      // trigger has just bumped `users.daily_streak`. Skipped on subsequent
      // guesses of the same day (UPDATE doesn't re-trigger the streak function).
      if (isFirstAttemptToday) {
        const { data: streakRow } = await supabase
          .from('users')
          .select('daily_streak')
          .eq('id', userId)
          .maybeSingle();
        const newStreak = (streakRow as { daily_streak: number } | null)?.daily_streak ?? 0;
        if (newStreak >= 2) {
          await xpService.awardXp({
            userId,
            source: 'daily_streak_bonus',
            sourceRef: `daily_streak_${dateISO}_${userId}`,
            amount: XP_STREAK_MULTIPLIER * Math.min(newStreak, XP_STREAK_CAP),
            context: { streak: newStreak, date: dateISO },
          });
        }
      }
    }

    // Referral reward: if this user was referred, this completion triggers the bonus
    // to the referrer. Idempotent — only fires on the invitee's first successful match.
    if (referralService && justCompleted) {
      referralService.maybeRewardReferrer(userId).catch(() => {
        // Best-effort; never break the guess response because of a referral failure.
      });
    }

    // Get next phase audio data
    let nextPhaseAudioData = null;
    if (nextPhase) {
      const phaseKey = `phase${nextPhase}` as keyof typeof midi.phases;
      nextPhaseAudioData = midi.phases[phaseKey];
    }

    const response: DailyGuessResponse = {
      result: verification.result,
      completed,
      isCorrect,
      nextPhase,
      nextPhaseAudioData,
    };

    // Reveal title/artist only on completion
    if (completed) {
      response.title = midi.title;
      response.artist = midi.artist;
    }

    return response;
  }

  /**
   * Get a user's result for a specific date.
   */
  async function getResultForUser(userId: string, dateISO: string) {
    const { data, error } = await supabase
      .from('daily_results')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateISO)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch daily result: ${error.message}`);
    }

    if (!data) return null;

    // Get the MIDI info for the reveal (only if completed)
    let title: string | undefined;
    let artist: string | undefined;

    if (data.completed) {
      const midi = await midiProvider.getMidiById(data.midi_id as string);
      title = midi?.title;
      artist = midi?.artist;
    }

    return {
      ...data,
      title,
      artist,
      dayNumber: getDayNumber(dateISO),
    };
  }

  /**
   * Get paginated history for a user.
   */
  async function getHistory(userId: string, limit = 90, offset = 0): Promise<DailyHistoryEntry[]> {
    const { data, error } = await supabase
      .from('daily_results')
      .select(`
        date,
        midi_id,
        phase_guessed,
        completed,
        midi_catalog!inner(title, artist, category)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch daily history: ${error.message}`);
    }

    return (data ?? []).map((row: Record<string, unknown>) => {
      const catalog = row.midi_catalog as {
        title: string;
        artist: string;
        category: MidiCategory;
      };
      return {
        date: row.date as string,
        dayNumber: getDayNumber(row.date as string),
        midiId: row.midi_id as string,
        title: catalog.title,
        artist: catalog.artist,
        category: catalog.category,
        phaseGuessed: row.phase_guessed as number | null,
        completed: row.completed as boolean,
        isCorrect: row.phase_guessed != null,
      };
    });
  }

  /**
   * Get user's streak info from the users table.
   */
  async function getStreakInfo(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('daily_streak, max_daily_streak')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch streak: ${error.message}`);
    }

    return {
      currentStreak: (data?.daily_streak as number) ?? 0,
      maxStreak: (data?.max_daily_streak as number) ?? 0,
    };
  }

  return {
    selectDailyMidi,
    getDailyForUser,
    submitGuess,
    getResultForUser,
    getHistory,
    getStreakInfo,
    getTodayBRT,
  };
}

export type DailyService = ReturnType<typeof createDailyService>;
