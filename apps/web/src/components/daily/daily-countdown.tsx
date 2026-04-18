'use client';

import { useEffect, useState } from 'react';

function getTimeUntilNextDaily(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();

  // Next daily is at 00:00 BRT (03:00 UTC)
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(3, 0, 0, 0);

  // If it's already past midnight BRT but before 03:00 UTC, the next daily is today at 03:00 UTC
  if (now.getUTCHours() < 3) {
    tomorrow.setUTCDate(now.getUTCDate());
  }

  const diff = Math.max(0, tomorrow.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function DailyCountdown() {
  const [time, setTime] = useState(getTimeUntilNextDaily);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeUntilNextDaily());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="font-mono text-2xl font-bold text-accent-cyan tabular-nums">
      {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
    </div>
  );
}
