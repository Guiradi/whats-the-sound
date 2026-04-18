import {
  GameStatus,
  MAX_PLAYERS_PER_ROOM,
  PLAYER_DISCONNECT_GRACE_MS,
  ROOM_CLEANUP_EMPTY_MS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from '@wts/shared';
import type {
  ChatMessage,
  RoomConfig,
  RoomPlayer,
  RoomStateSnapshot,
  RoundSnapshot,
} from '@wts/shared';
import type { ServerPlayer, ServerRoomState } from '../types/room.js';

const MAX_CHAT_MESSAGES = 50;
const MAX_CODE_ATTEMPTS = 100;

// ─── In-memory store ───────────────────────────────────────────

const rooms = new Map<string, ServerRoomState>();

// ─── Room code generation ──────────────────────────────────────

function generateRoomCode(): string {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error('Failed to generate unique room code');
}

// ─── Snapshot serialization ────────────────────────────────────

function playerToWire(p: ServerPlayer): RoomPlayer {
  return {
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    isGuest: p.isGuest,
    totalScore: p.totalScore,
    correctCount: p.correctCount,
    connected: p.connected,
    joinedAt: p.joinedAt,
    level: p.level,
    isReady: p.isReady,
  };
}

function roundToSnapshot(room: ServerRoomState): RoundSnapshot | null {
  const r = room.round;
  if (!r) return null;
  return {
    current: r.current,
    total: r.total,
    midiId: r.midi.id,
    phase: r.phase,
    phaseStartAt: r.phaseStartAt,
    phaseEndAt: r.phaseEndAt,
    correctPlayerIds: r.correctAnswers.map((a) => a.playerId),
    artistMatchPlayerIds: r.artistMatchAnswers.map((a) => a.playerId),
    phaseAudioData: null, // Audio data is sent via phase:start, not snapshots
  };
}

/** Convert server state to a client-safe snapshot (no midi answers, no timers). */
export function toSnapshot(room: ServerRoomState): RoomStateSnapshot {
  return {
    room: {
      code: room.code,
      hostId: room.hostId,
      config: room.config,
      status: room.status,
      createdAt: room.createdAt,
    },
    players: Array.from(room.players.values()).map(playerToWire),
    round: roundToSnapshot(room),
    chat: room.chat.slice(-MAX_CHAT_MESSAGES),
    version: room.version,
  };
}

// ─── Cleanup helpers ───────────────────────────────────────────

function clearAllTimers(room: ServerRoomState): void {
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }
  if (room.round?.phaseTimer) {
    clearTimeout(room.round.phaseTimer);
    room.round.phaseTimer = null;
  }
  if (room.round?.tickInterval) {
    clearInterval(room.round.tickInterval);
    room.round.tickInterval = null;
  }
  for (const player of room.players.values()) {
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
  }
}

function scheduleCleanup(code: string): void {
  const room = rooms.get(code);
  if (!room) return;

  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
  }

  room.cleanupTimer = setTimeout(() => {
    const current = rooms.get(code);
    if (!current) return;
    clearAllTimers(current);
    rooms.delete(code);
  }, ROOM_CLEANUP_EMPTY_MS);
}

// ─── Public API ────────────────────────────────────────────────

export function createRoom(
  hostId: string,
  hostPlayer: Omit<ServerPlayer, 'disconnectTimer'>,
  config: RoomConfig,
): ServerRoomState {
  const code = generateRoomCode();
  const room: ServerRoomState = {
    code,
    hostId,
    config,
    status: GameStatus.LOBBY,
    createdAt: new Date().toISOString(),
    players: new Map(),
    round: null,
    chat: [],
    version: 1,
    cleanupTimer: null,
    playlist: [],
    currentRoundIndex: 0,
    gameSessionId: null,
  };

  room.players.set(hostId, { ...hostPlayer, disconnectTimer: null });
  rooms.set(code, room);
  return room;
}

export function joinRoom(
  code: string,
  player: Omit<ServerPlayer, 'disconnectTimer'>,
): ServerRoomState {
  const room = rooms.get(code);
  if (!room) throw new Error('Room not found');
  if (
    room.players.size >= room.config.maxPlayers &&
    room.config.maxPlayers <= MAX_PLAYERS_PER_ROOM
  ) {
    throw new Error('Room is full');
  }
  if (room.players.has(player.id)) {
    throw new Error('Player already in room');
  }

  // Cancel cleanup if someone joins an empty-ish room
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }

  room.players.set(player.id, { ...player, disconnectTimer: null });
  room.version++;
  return room;
}

export function leaveRoom(
  code: string,
  playerId: string,
): { room: ServerRoomState | null; hostChanged: boolean; newHostId?: string } {
  const room = rooms.get(code);
  if (!room) return { room: null, hostChanged: false };

  const player = room.players.get(playerId);
  if (player?.disconnectTimer) {
    clearTimeout(player.disconnectTimer);
  }
  room.players.delete(playerId);
  room.version++;

  // If room is now empty, schedule cleanup
  if (room.players.size === 0) {
    scheduleCleanup(code);
    return { room, hostChanged: false };
  }

  // Host migration: pick earliest-joined connected player
  let hostChanged = false;
  let newHostId: string | undefined;
  if (room.hostId === playerId) {
    const connected = Array.from(room.players.values())
      .filter((p) => p.connected)
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

    const nextHost = connected[0];
    if (nextHost) {
      room.hostId = nextHost.id;
      newHostId = room.hostId;
      hostChanged = true;
    }
  }

  return { room, hostChanged, newHostId };
}

export function getRoom(code: string): ServerRoomState | undefined {
  return rooms.get(code);
}

export function listPublicRooms(): RoomStateSnapshot[] {
  const result: RoomStateSnapshot[] = [];
  for (const room of rooms.values()) {
    if (room.config.isPublic && room.status === GameStatus.LOBBY) {
      result.push(toSnapshot(room));
    }
  }
  return result;
}

export function reconnectPlayer(
  code: string,
  playerId: string,
  newSocketId: string,
): ServerRoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;

  const player = room.players.get(playerId);
  if (!player) return undefined;

  if (player.disconnectTimer) {
    clearTimeout(player.disconnectTimer);
    player.disconnectTimer = null;
  }

  player.connected = true;
  player.socketId = newSocketId;
  room.version++;
  return room;
}

export function disconnectPlayer(code: string, playerId: string, onGraceExpired: () => void): void {
  const room = rooms.get(code);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  player.connected = false;
  room.version++;

  player.disconnectTimer = setTimeout(() => {
    onGraceExpired();
  }, PLAYER_DISCONNECT_GRACE_MS);
}

export function setPlayerReady(
  code: string,
  playerId: string,
  ready: boolean,
): ServerRoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  const player = room.players.get(playerId);
  if (!player) return undefined;
  player.isReady = ready;
  room.version++;
  return room;
}

export function resetAllReady(code: string): void {
  const room = rooms.get(code);
  if (!room) return;
  for (const player of room.players.values()) {
    player.isReady = false;
  }
}

export function addChatMessage(code: string, message: ChatMessage): void {
  const room = rooms.get(code);
  if (!room) return;
  room.chat.push(message);
  if (room.chat.length > MAX_CHAT_MESSAGES) {
    room.chat = room.chat.slice(-MAX_CHAT_MESSAGES);
  }
  room.version++;
}

/** Find which room a player is in, by their player ID. */
export function findRoomByPlayerId(playerId: string): ServerRoomState | undefined {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) return room;
  }
  return undefined;
}

/** Destroy a room immediately, clearing all timers. */
export function destroyRoom(code: string): void {
  const room = rooms.get(code);
  if (!room) return;
  clearAllTimers(room);
  rooms.delete(code);
}

/** Get count of active rooms (for monitoring). */
export function getRoomCount(): number {
  return rooms.size;
}
