import { randomUUID } from 'node:crypto';
import { type BotEventParams, encodeBotEvent } from '@wts/shared';
import type { ChatMessage } from '@wts/shared';
import type { TypedServer } from '../socket/index.js';
import * as roomManager from './room-manager.js';

function emitChatMessage(io: TypedServer, roomCode: string, message: ChatMessage): void {
  roomManager.addChatMessage(roomCode, message);
  io.to(`room:${roomCode}`).emit('chat:message', message);
}

export function broadcastBotEvent(
  io: TypedServer,
  roomCode: string,
  key: string,
  params: BotEventParams = {},
): void {
  emitChatMessage(io, roomCode, {
    id: randomUUID(),
    authorId: 'bot',
    text: encodeBotEvent(key, params),
    kind: 'bot',
    at: Date.now(),
  });
}

export function broadcastPlayerMessage(
  io: TypedServer,
  roomCode: string,
  authorId: string,
  text: string,
): void {
  emitChatMessage(io, roomCode, {
    id: randomUUID(),
    authorId,
    text,
    kind: 'player',
    at: Date.now(),
  });
}
