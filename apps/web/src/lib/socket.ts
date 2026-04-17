'use client';

import { env } from '@/env';
import type { ClientToServerEvents, ServerToClientEvents } from '@wts/shared';
import { type Socket, io } from 'socket.io-client';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

/**
 * Get (or create) the singleton Socket.io client instance.
 * Typed with shared event interfaces for full type safety.
 * Does NOT auto-connect — call `socket.connect()` when ready.
 */
export function getSocket(): TypedSocket {
  if (socket) return socket;

  socket = io(env.NEXT_PUBLIC_SERVER_URL, {
    autoConnect: false,
    withCredentials: true,
  });

  return socket;
}

/**
 * Update the auth token on the socket (e.g., after login).
 * Must be called before connecting if the user is authenticated.
 */
export function setSocketAuth(token: string | null): void {
  const s = getSocket();
  s.auth = token ? { token } : {};
}

/** Disconnect and reset the singleton. */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
