'use client';

import type { TypedSocket } from '@/lib/socket';
import type { ChatMessage, PhaseConfig, RoomStateSnapshot, XpLevelUpPayload } from '@wts/shared';

export interface PhaseStartPayload {
  phase: 1 | 2 | 3 | 4;
  endsAt: number;
  audioData: PhaseConfig;
  midiFileUrl: string;
}

export interface RoundRevealPayload {
  title: string;
  artist: string;
  correctPlayerIds: string[];
}

export interface RoomListenerHandlers {
  onSnapshot: (snapshot: RoomStateSnapshot) => void;
  onChatMessage: (message: ChatMessage) => void;
  onPhaseStart: (payload: PhaseStartPayload) => void;
  onRoundReveal: (payload: RoundRevealPayload) => void;
  onGenericError: (message: string) => void;
  onRateLimited: (scope: string, retryAfterMs: number) => void;
  onLevelUp: (payload: XpLevelUpPayload) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function registerRoomListeners(
  socket: TypedSocket,
  handlers: RoomListenerHandlers,
): () => void {
  socket.on('room:state', handlers.onSnapshot);
  socket.on('chat:message', handlers.onChatMessage);
  socket.on('phase:start', handlers.onPhaseStart);
  socket.on('round:reveal', handlers.onRoundReveal);
  socket.on('error:generic', (payload) => handlers.onGenericError(payload.message));
  socket.on('error:rate_limited', (payload) =>
    handlers.onRateLimited(payload.scope, payload.retryAfterMs),
  );
  socket.on('xp:level_up', handlers.onLevelUp);
  socket.on('connect', handlers.onConnect);
  socket.on('disconnect', handlers.onDisconnect);

  return () => {
    socket.off('room:state');
    socket.off('chat:message');
    socket.off('phase:start');
    socket.off('round:reveal');
    socket.off('error:generic');
    socket.off('error:rate_limited');
    socket.off('xp:level_up');
    socket.off('connect');
    socket.off('disconnect');
  };
}
