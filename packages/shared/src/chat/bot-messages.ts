export type BotEventParams = Record<string, string | number>;

export interface BotEvent {
  key: string;
  params: BotEventParams;
}

const PREFIX = 'bot.';
const SEPARATOR = ':';

export function encodeBotEvent(key: string, params: BotEventParams = {}): string {
  const hasParams = Object.keys(params).length > 0;
  return hasParams ? `${PREFIX}${key}${SEPARATOR}${JSON.stringify(params)}` : `${PREFIX}${key}`;
}

export function decodeBotEvent(text: string): BotEvent | null {
  if (!text.startsWith(PREFIX)) return null;
  const body = text.slice(PREFIX.length);
  const sepIdx = body.indexOf(SEPARATOR);
  if (sepIdx === -1) {
    return { key: body, params: {} };
  }
  try {
    const key = body.slice(0, sepIdx);
    const params = JSON.parse(body.slice(sepIdx + 1)) as BotEventParams;
    return { key, params };
  } catch {
    return null;
  }
}
