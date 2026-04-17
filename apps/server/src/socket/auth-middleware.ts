import type { SupabaseClient } from '@supabase/supabase-js';
import type { Socket } from 'socket.io';

/** Augment socket.data to carry auth information. */
declare module 'socket.io' {
  interface SocketData {
    userId: string;
    isGuest: boolean;
    nickname: string | null;
    avatar: string | null;
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
        socket.data.roomCode = null;

        // Fetch nickname and avatar from users table
        const { data: profile } = await supabase
          .from('users')
          .select('nickname, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        socket.data.nickname = profile?.nickname ?? null;
        socket.data.avatar = profile?.avatar_url ?? null;

        next();
      } catch {
        next(new Error('UNAUTHORIZED'));
      }
    } else {
      // Guest connection — use stable client-provided guest ID if available
      const guestId = socket.handshake.auth?.guestId as string | undefined;
      socket.data.userId = guestId ? `guest:${guestId}` : `guest:${socket.id}`;
      socket.data.isGuest = true;
      socket.data.nickname = null;
      socket.data.avatar = null;
      socket.data.roomCode = null;
      next();
    }
  };
}
