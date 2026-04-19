const LEADING_ARTICLES = /^(the|o|a|os|as|um|uma)\s+/i;

export function generateAcceptedVariations(original: string): string[] {
  if (!original.trim()) return [''];

  const seen = new Set<string>();
  const results: string[] = [];

  function add(s: string): void {
    const trimmed = s.replace(/\s+/g, ' ').trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      results.push(trimmed);
    }
  }

  add(original);

  const lower = original.toLowerCase();
  add(lower);

  const noDiacritics = lower.normalize('NFD').replace(/\p{Mn}/gu, '');
  add(noDiacritics);

  const noApostrophe = noDiacritics.replace(/[''`]/g, '');
  add(noApostrophe);

  const noHyphens = noApostrophe.replace(/-/g, ' ').replace(/\s+/g, ' ');
  add(noHyphens);

  const alphanumOnly = noHyphens
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  add(alphanumOnly);

  const noArticle = alphanumOnly.replace(LEADING_ARTICLES, '').trim();
  if (noArticle !== alphanumOnly) {
    add(noArticle);
  }

  if (original.includes('&')) {
    add(alphanumOnly.replace(/&/g, 'and'));
    add(alphanumOnly.replace(/&/g, 'e'));
  }
  if (lower.includes(' and ')) {
    add(alphanumOnly.replace(/\band\b/g, 'e'));
  }
  if (lower.includes(' e ')) {
    add(alphanumOnly.replace(/\be\b/g, 'and'));
  }

  const featPattern = /\s*(feat\.?|ft\.?|featuring)\s+.+$/i;
  if (featPattern.test(original)) {
    add(alphanumOnly.replace(featPattern, '').trim());
  }

  return results;
}
