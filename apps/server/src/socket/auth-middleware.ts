import type { SupabaseClient } from '@supabase/supabase-js';
import type { Socket } from 'socket.io';

/** Augment socket.data to carry auth information. */
declare module 'socket.io' {
  interface SocketData {
    userId: string;
    isGuest: boolean;
    nickname: string | null;
    roomCode: string | null;
  }
}

/**
 * Socket.io auth middleware: validates Supabase JWT on handshake.
 * If no token is provided, the connection is accepted as a guest.
 */
export function createAuthMiddleware(supabase: SupabaseClient | null) {
  return async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (token && supabase) {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
          next(new Error('UNAUTHORIZED'));
          return;
        }

        socket.data.userId = user.id;
        socket.data.isGuest = false;
        socket.data.nickname = null;
        socket.data.roomCode = null;
        next();
      } catch {
        next(new Error('UNAUTHORIZED'));
      }
    } else {
      // Guest connection
      socket.data.userId = `guest:${socket.id}`;
      socket.data.isGuest = true;
      socket.data.nickname = null;
      socket.data.roomCode = null;
      next();
    }
  };
}
