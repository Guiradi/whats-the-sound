import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_MAX_PLAYERS,
  DEFAULT_PHASE_DURATION_SEC,
  DEFAULT_ROUND_COUNT,
  MAX_PLAYERS_PER_ROOM,
  MIN_PLAYERS_PER_ROOM,
  NICKNAME_MAX,
  NICKNAME_MIN,
  NICKNAME_PATTERN,
} from '@wts/shared';
import type { ClientToServerEvents, RoomConfig, ServerToClientEvents } from '@wts/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import type { SocketRateLimiter } from '../middleware/rate-limiter.js';
import * as roomManager from '../services/room-manager.js';
import type { ServerPlayer } from '../types/room.js';
import { emitSocketError, emitSocketRateLimited } from './emit-error.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// ─── Validation ────────────────────────────────────────────────

const roomConfigSchema = z.object({
  category: z.union([
    z.enum([
      'rock',
      'pop',
      'mpb',
      'sertanejo',
      'games',
      'anime',
      'classical',
      'electronic',
      'hiphop',
    ]),
    z.literal('random'),
  ]),
  maxRounds: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(DEFAULT_ROUND_COUNT),
  timePerPhaseSec: z
    .union([z.literal(25), z.literal(35), z.literal(45)])
    .default(DEFAULT_PHASE_DURATION_SEC),
  maxPlayers: z
    .number()
    .int()
    .min(MIN_PLAYERS_PER_ROOM)
    .max(MAX_PLAYERS_PER_ROOM)
    .default(DEFAULT_MAX_PLAYERS),
  isPublic: z.boolean().default(true),
});

const joinPayloadSchema = z.object({
  code: z.string().length(5),
  nickname: z.string().min(NICKNAME_MIN).max(NICKNAME_MAX).regex(NICKNAME_PATTERN).optional(),
});

// ─── Helpers ───────────────────────────────────────────────────

function makeServerPlayer(
  socket: TypedSocket,
  nickname?: string,
): Omit<ServerPlayer, 'disconnectTimer'> {
  return {
    id: socket.data.userId,
    nickname: nickname ?? socket.data.nickname ?? `Player_${socket.id.slice(0, 6)}`,
    avatar: socket.data.avatar ?? null,
    isGuest: socket.data.isGuest,
    totalScore: 0,
    correctCount: 0,
    connected: true,
    joinedAt: new Date().toISOString(),
    socketId: socket.id,
    level: socket.data.isGuest ? null : (socket.data.level ?? null),
    isReady: false,
  };
}

function upsertGuestProfile(supabase: SupabaseClient, guestUserId: string, nickname: string): void {
  const uuid = guestUserId.replace(/^guest:/, '');
  supabase
    .from('guest_profiles')
    .upsert({ id: uuid, nickname }, { onConflict: 'id' })
    .then(undefined, () => {});
}

export function registerRoomEvents(
  socket: TypedSocket,
  io: TypedServer,
  rateLimiter: SocketRateLimiter,
  logger: FastifyBaseLogger,
  supabase: SupabaseClient | null,
): void {
  socket.on('room:create', (rawConfig, ack) => {
    try {
      const rateCheck = rateLimiter.checkRoomCreation(socket.data.userId);
      if (!rateCheck.allowed) {
        emitSocketRateLimited(socket, logger, 'room:create', rateCheck.retryAfterMs);
        return;
      }
      const config = roomConfigSchema.parse(rawConfig) as RoomConfig;
      const player = makeServerPlayer(socket);
      const room = roomManager.createRoom(socket.data.userId, player, config);

      socket.data.roomCode = room.code;
      socket.join(`room:${room.code}`);

      if (typeof ack === 'function') {
        ack({ code: room.code });
      }

      io.to(`room:${room.code}`).emit('room:state', roomManager.toSnapshot(room));
    } catch (err) {
      emitSocketError(
        socket,
        logger,
        'INVALID_CONFIG',
        err instanceof Error ? err.message : 'Invalid room config',
      );
    }
  });

  socket.on('room:join', (payload) => {
    try {
      const { code, nickname } = joinPayloadSchema.parse(payload);

      // Check for reconnection or already-joined (e.g., after room:create)
      const existingRoom = roomManager.getRoom(code);
      if (existingRoom) {
        const existingPlayer = existingRoom.players.get(socket.data.userId);
        if (existingPlayer) {
          if (!existingPlayer.connected) {
            const room = roomManager.reconnectPlayer(code, socket.data.userId, socket.id);
            if (room) {
              socket.data.roomCode = code;
              socket.join(`room:${code}`);
              io.to(`room:${code}`).emit('room:state', roomManager.toSnapshot(room));
              return;
            }
          } else {
            // Player already in room and connected (e.g., creator navigated to room page)
            socket.data.roomCode = code;
            socket.join(`room:${code}`);
            socket.emit('room:state', roomManager.toSnapshot(existingRoom));
            return;
          }
        }
      }

      // Leave current room if in a different one
      if (socket.data.roomCode && socket.data.roomCode !== code) {
        handleLeave(socket, io);
      }

      if (nickname) {
        socket.data.nickname = nickname;
      }

      const player = makeServerPlayer(socket, nickname);
      const room = roomManager.joinRoom(code, player);

      // Persist guest profile so history survives browser data clears.
      if (socket.data.isGuest && supabase) {
        upsertGuestProfile(supabase, socket.data.userId, player.nickname);
      }

      socket.data.roomCode = code;
      socket.join(`room:${code}`);

      io.to(`room:${code}`).emit('room:state', roomManager.toSnapshot(room));
    } catch (err) {
      emitSocketError(
        socket,
        logger,
        'JOIN_FAILED',
        err instanceof Error ? err.message : 'Failed to join room',
      );
    }
  });

  socket.on('player:ready', (ready: boolean) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = roomManager.setPlayerReady(roomCode, socket.data.userId, ready);
    if (room) {
      io.to(`room:${roomCode}`).emit('room:state', roomManager.toSnapshot(room));
    }
  });

  socket.on('room:leave', () => {
    handleLeave(socket, io);
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    roomManager.disconnectPlayer(roomCode, socket.data.userId, () => {
      // Grace period expired — fully leave
      const result = roomManager.leaveRoom(roomCode, socket.data.userId);
      if (result.room) {
        if (result.hostChanged && result.newHostId) {
          io.to(`room:${roomCode}`).emit('room:host_changed', {
            previousHostId: socket.data.userId,
            newHostId: result.newHostId,
          });
        }
        io.to(`room:${roomCode}`).emit('room:state', roomManager.toSnapshot(result.room));
      }
    });

    // Broadcast updated state immediately (player marked disconnected)
    const room = roomManager.getRoom(roomCode);
    if (room) {
      io.to(`room:${roomCode}`).emit('room:state', roomManager.toSnapshot(room));
    }
  });
}

function handleLeave(socket: TypedSocket, io: TypedServer): void {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;

  const result = roomManager.leaveRoom(roomCode, socket.data.userId);
  socket.leave(`room:${roomCode}`);
  socket.data.roomCode = null;

  if (result.room) {
    if (result.hostChanged && result.newHostId) {
      io.to(`room:${roomCode}`).emit('room:host_changed', {
        previousHostId: socket.data.userId,
        newHostId: result.newHostId,
      });
    }
    io.to(`room:${roomCode}`).emit('room:state', roomManager.toSnapshot(result.room));
  }
}
