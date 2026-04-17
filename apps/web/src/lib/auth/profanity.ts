const BLOCKED = new Set<string>([
  'admin',
  'administrator',
  'mod',
  'moderator',
  'system',
  'bot',
  'staff',
  'support',
  'owner',
  'root',
  'null',
  'undefined',
  'anonymous',
  'fuck',
  'fucking',
  'shit',
  'bitch',
  'cunt',
  'asshole',
  'porra',
  'caralho',
  'merda',
  'puta',
  'foda',
  'fodido',
]);

export function isBlockedNickname(nickname: string): boolean {
  return BLOCKED.has(nickname.toLowerCase());
}
