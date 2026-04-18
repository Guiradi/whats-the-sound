import { GuessResult, LEVENSHTEIN_THRESHOLDS } from '@wts/shared';
import type { GuessVerificationResult } from '@wts/shared';

const LEADING_ARTICLES = /^(the|o|a|os|as|um|uma)\s+/;

/**
 * Normalize text for comparison: lowercase, strip diacritics, strip
 * non-alphanumeric, collapse whitespace, remove leading articles.
 */
export function normalizeText(text: string): string {
  return (
    text
      .toLowerCase()
      // Decompose accented chars then strip combining marks
      .normalize('NFD')
      .replace(/\p{Mn}/gu, '')
      // Strip non-alphanumeric (keep spaces)
      .replace(/[^a-z0-9\s]/g, '')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Strip leading articles
      .replace(LEADING_ARTICLES, '')
  );
}

/**
 * Standard Levenshtein distance via dynamic programming. O(n*m) — fine for
 * short strings like music titles.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Optimizations for trivial cases
  if (a === b) return 0;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row optimization (only keep previous row)
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1, // deletion
        (curr[j - 1] ?? 0) + 1, // insertion
        (prev[j - 1] ?? 0) + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n] ?? 0;
}

/**
 * Scale threshold for longer candidates (>20 chars). Multiplies by
 * ceil(length / 20) so longer titles are more forgiving.
 */
function scaleThreshold(base: number, candidateLength: number): number {
  if (candidateLength <= 20) return base;
  return base * Math.ceil(candidateLength / 20);
}

/**
 * Find the best (minimum distance) match among a list of candidates.
 */
function findBestMatch(
  normalizedGuess: string,
  candidates: string[],
): { distance: number; candidate: string } | null {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestCandidate = '';

  for (const raw of candidates) {
    const normalized = normalizeText(raw);
    const dist = levenshteinDistance(normalizedGuess, normalized);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestCandidate = raw;
    }
  }

  if (bestCandidate === '') return null;
  return { distance: bestDistance, candidate: bestCandidate };
}

/**
 * Verify a guess against accepted titles and artists for multiplayer mode.
 */
export function verifyGuess(
  guess: string,
  acceptedTitles: string[],
  acceptedArtists: string[],
): GuessVerificationResult {
  const normalizedGuess = normalizeText(guess);
  const thresholds = LEVENSHTEIN_THRESHOLDS.multiplayer;

  // Check titles first
  const titleMatch = findBestMatch(normalizedGuess, acceptedTitles);
  if (titleMatch) {
    const scaledCorrect = scaleThreshold(
      thresholds.correct,
      normalizeText(titleMatch.candidate).length,
    );
    const scaledHot = scaleThreshold(thresholds.hot, normalizeText(titleMatch.candidate).length);
    const scaledWarm = scaleThreshold(thresholds.warm, normalizeText(titleMatch.candidate).length);

    if (titleMatch.distance <= scaledCorrect) {
      return {
        result: GuessResult.CORRECT,
        distance: titleMatch.distance,
        matchedCandidate: titleMatch.candidate,
      };
    }
    if (titleMatch.distance <= scaledHot) {
      return {
        result: GuessResult.HOT,
        distance: titleMatch.distance,
        matchedCandidate: titleMatch.candidate,
      };
    }
    if (titleMatch.distance <= scaledWarm) {
      return {
        result: GuessResult.WARM,
        distance: titleMatch.distance,
        matchedCandidate: titleMatch.candidate,
      };
    }
  }

  // Check artists for artist_match
  const artistMatch = findBestMatch(normalizedGuess, acceptedArtists);
  if (artistMatch) {
    const scaledCorrect = scaleThreshold(
      thresholds.correct,
      normalizeText(artistMatch.candidate).length,
    );
    if (artistMatch.distance <= scaledCorrect) {
      return {
        result: GuessResult.ARTIST_MATCH,
        distance: artistMatch.distance,
        matchedCandidate: artistMatch.candidate,
      };
    }
  }

  return { result: GuessResult.WRONG };
}

/**
 * Verify a guess for daily mode. Uses daily-specific thresholds:
 * - correct: distance <= 2
 * - almost (HOT): distance <= 3 (does NOT consume attempt)
 * - artist_match: exact artist match
 * - wrong: everything else
 */
export function verifyDailyGuess(
  guess: string,
  acceptedTitles: string[],
  acceptedArtists: string[],
): GuessVerificationResult {
  const normalizedGuess = normalizeText(guess);
  const thresholds = LEVENSHTEIN_THRESHOLDS.daily;

  // Check titles first
  const titleMatch = findBestMatch(normalizedGuess, acceptedTitles);
  if (titleMatch) {
    const scaledCorrect = scaleThreshold(
      thresholds.correct,
      normalizeText(titleMatch.candidate).length,
    );
    const scaledAlmost = scaleThreshold(
      thresholds.almost,
      normalizeText(titleMatch.candidate).length,
    );

    if (titleMatch.distance <= scaledCorrect) {
      return {
        result: GuessResult.CORRECT,
        distance: titleMatch.distance,
        matchedCandidate: titleMatch.candidate,
      };
    }
    if (titleMatch.distance <= scaledAlmost) {
      return {
        result: GuessResult.HOT,
        distance: titleMatch.distance,
        matchedCandidate: titleMatch.candidate,
      };
    }
  }

  // Check artists for artist_match
  const artistMatch = findBestMatch(normalizedGuess, acceptedArtists);
  if (artistMatch) {
    const scaledCorrect = scaleThreshold(
      thresholds.correct,
      normalizeText(artistMatch.candidate).length,
    );
    if (artistMatch.distance <= scaledCorrect) {
      return {
        result: GuessResult.ARTIST_MATCH,
        distance: artistMatch.distance,
        matchedCandidate: artistMatch.candidate,
      };
    }
  }

  return { result: GuessResult.WRONG };
}
