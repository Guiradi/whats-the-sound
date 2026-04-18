import { LEVENSHTEIN_THRESHOLDS } from '../constants/index.js';
import { GuessResult } from '../enums/index.js';
import type { GuessVerificationResult } from '../types/index.js';

const LEADING_ARTICLES = /^(the|o|a|os|as|um|uma)\s+/;

/**
 * Normalize text for comparison: lowercase, strip diacritics, strip
 * non-alphanumeric, collapse whitespace, remove leading articles.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(LEADING_ARTICLES, '');
}

/**
 * Standard Levenshtein distance via dynamic programming. O(n*m) — fine for
 * short strings like music titles.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (a === b) return 0;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n] ?? 0;
}

function scaleThreshold(base: number, candidateLength: number): number {
  if (candidateLength <= 20) return base;
  return base * Math.ceil(candidateLength / 20);
}

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
