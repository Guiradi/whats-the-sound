import { DAILY_RESET_CRON_UTC, getTodayBRT } from '@wts/shared';
import { schedule } from 'node-cron';
import type { DailyService } from './daily-service.js';

/**
 * Start the daily MIDI selection cron job.
 * Runs at 03:00 UTC (00:00 BRT) every day.
 */
export function startDailyCron(
  dailyService: DailyService,
  logger: { info: (msg: string) => void; error: (obj: unknown, msg: string) => void },
) {
  logger.info(`Daily cron scheduled: ${DAILY_RESET_CRON_UTC} (UTC)`);

  const task = schedule(
    DAILY_RESET_CRON_UTC,
    async () => {
      const today = getTodayBRT();
      logger.info(`Daily cron fired — selecting MIDI for ${today}`);
      try {
        const midiId = await dailyService.selectDailyMidi(today);
        logger.info(`Daily MIDI selected for ${today}: ${midiId}`);
      } catch (err) {
        logger.error(err, `Daily cron failed for ${today}`);
      }
    },
    { timezone: 'UTC' },
  );

  return task;
}
