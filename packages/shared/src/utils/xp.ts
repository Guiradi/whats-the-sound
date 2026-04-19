export function sumXpEvents(events: ReadonlyArray<{ amount: number }> | null): number {
  if (!events) return 0;
  let total = 0;
  for (const event of events) total += event.amount;
  return total;
}
