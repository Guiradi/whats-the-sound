import { CHAT_RATE_LIMIT } from '@wts/shared';

interface RateLimitCheck {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * In-memory sliding window rate limiter for Socket.io events.
 * Not horizontally scalable — sufficient for single Railway instance.
 */
export class SocketRateLimiter {
  private readonly guessWindows = new Map<string, number[]>();
  private readonly messageWindows = new Map<string, number[]>();
  private readonly roomCreateWindows = new Map<string, number[]>();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Prune stale keys every 60 seconds
    this.cleanupInterval = setInterval(() => this.prune(), 60_000);
  }

  checkGuess(key: string): RateLimitCheck {
    return this.check(this.guessWindows, key, CHAT_RATE_LIMIT.guessesPerSec, 1000);
  }

  checkMessage(key: string): RateLimitCheck {
    return this.check(this.messageWindows, key, CHAT_RATE_LIMIT.messagesPer10s, 10_000);
  }

  checkRoomCreation(key: string): RateLimitCheck {
    return this.check(this.roomCreateWindows, key, CHAT_RATE_LIMIT.roomsPer10min, 10 * 60 * 1000);
  }

  /** Remove all entries for a disconnected socket/user. */
  cleanup(key: string): void {
    this.guessWindows.delete(key);
    this.messageWindows.delete(key);
    this.roomCreateWindows.delete(key);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.guessWindows.clear();
    this.messageWindows.clear();
    this.roomCreateWindows.clear();
  }

  private check(
    windows: Map<string, number[]>,
    key: string,
    limit: number,
    windowMs: number,
  ): RateLimitCheck {
    const now = Date.now();
    const cutoff = now - windowMs;

    let timestamps = windows.get(key);
    if (!timestamps) {
      timestamps = [];
      windows.set(key, timestamps);
    }

    // Remove expired timestamps
    while (timestamps.length > 0 && timestamps[0]! < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= limit) {
      const oldestInWindow = timestamps[0]!;
      const retryAfterMs = oldestInWindow + windowMs - now;
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
    }

    timestamps.push(now);
    return { allowed: true, retryAfterMs: 0 };
  }

  private prune(): void {
    const now = Date.now();
    this.pruneMap(this.guessWindows, now, 1000);
    this.pruneMap(this.messageWindows, now, 10_000);
    this.pruneMap(this.roomCreateWindows, now, 10 * 60 * 1000);
  }

  private pruneMap(windows: Map<string, number[]>, now: number, windowMs: number): void {
    const cutoff = now - windowMs;
    for (const [key, timestamps] of windows) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1]! < cutoff) {
        windows.delete(key);
      }
    }
  }
}
