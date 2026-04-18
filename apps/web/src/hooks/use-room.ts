'use client';

import { useAuth } from '@/hooks/use-auth';
import { type TypedSocket, getSocket, setSocketAuth } from '@/lib/socket';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type {
  ChatMessage,
  PhaseConfig,
  RoomConfig,
  RoomPlayer,
  RoomStateSnapshot,
  XpLevelUpPayload,
} from '@wts/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface PhaseStartPayload {
  phase: 1 | 2 | 3 | 4;
  endsAt: number;
  audioData: PhaseConfig;
  midiFileUrl: string;
}

interface RoundRevealPayload {
  title: string;
  artist: string;
  correctPlayerIds: string[];
}

interface UseRoomReturn {
  snapshot: RoomStateSnapshot | null;
  chat: ChatMessage[];
  isConnecting: boolean;
  error: string | null;
  isHost: boolean;
  myPlayer: RoomPlayer | null;
  myId: string | null;
  phaseStart: PhaseStartPayload | null;
  roundReveal: RoundRevealPayload | null;
  sendChat: (text: string) => void;
  startGame: () => void;
  leaveRoom: () => void;
  createRoom: (config: RoomConfig, onCreated: (code: string) => void) => void;
  levelUp: XpLevelUpPayload | null;
}

const MAX_LOCAL_CHAT = 100;

export function useRoom(code: string | null): UseRoomReturn {
  const { user, guest } = useAuth();
  const [snapshot, setSnapshot] = useState<RoomStateSnapshot | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phaseStart, setPhaseStart] = useState<PhaseStartPayload | null>(null);
  const [roundReveal, setRoundReveal] = useState<RoundRevealPayload | null>(null);
  const [levelUp, setLevelUp] = useState<XpLevelUpPayload | null>(null);
  const socketRef = useRef<TypedSocket | null>(null);
  const versionRef = useRef(0);

  // Refs for user/guest so the effect doesn't re-run on reference changes
  const userRef = useRef(user);
  userRef.current = user;
  const guestRef = useRef(guest);
  guestRef.current = guest;

  // Stable identity
  const myId = user?.id ?? (guest ? `guest:${guest.id}` : null);

  useEffect(() => {
    if (!code || !myId) return;

    let cancelled = false;
    setIsConnecting(true);
    setError(null);

    async function connect() {
      const socket = getSocket();
      socketRef.current = socket;

      // Set auth: JWT for logged-in users, stable guest ID for guests
      const currentUser = userRef.current;
      const currentGuest = guestRef.current;
      if (currentUser) {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        setSocketAuth(data.session?.access_token ?? null);
      } else {
        setSocketAuth(null, currentGuest?.id);
      }

      if (cancelled) return;

      // Register listeners before connecting
      socket.on('room:state', (snap) => {
        if (snap.version >= versionRef.current) {
          versionRef.current = snap.version;
          setSnapshot(snap);
          // Sync chat from snapshot on full state updates
          setChat(snap.chat);
        }
      });

      socket.on('chat:message', (msg) => {
        setChat((prev) => {
          // Deduplicate by id
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          return next.length > MAX_LOCAL_CHAT ? next.slice(-MAX_LOCAL_CHAT) : next;
        });
      });

      socket.on('phase:start', (payload) => {
        setPhaseStart(payload);
        setRoundReveal(null);
      });

      socket.on('round:reveal', (payload) => {
        setRoundReveal(payload);
        setPhaseStart(null);
      });

      socket.on('error:generic', (payload) => {
        setError(payload.message);
        setIsConnecting(false);
      });

      socket.on('error:rate_limited', (payload) => {
        setError(
          `Rate limited (${payload.scope}). Retry in ${Math.ceil(payload.retryAfterMs / 1000)}s`,
        );
      });

      socket.on('xp:level_up', (payload) => {
        setLevelUp(payload);
      });

      socket.on('connect', () => {
        setIsConnecting(false);
        // Join room on connect/reconnect
        const nickname = userRef.current ? undefined : guestRef.current?.nickname;
        if (code) socket.emit('room:join', { code, nickname });
      });

      socket.on('disconnect', () => {
        setIsConnecting(true);
      });

      if (!socket.connected) {
        socket.connect();
      } else {
        // Force reconnect so auth middleware runs with the current token
        socket.disconnect();
        socket.connect();
      }
    }

    connect();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        socket.emit('room:leave');
        socket.off('room:state');
        socket.off('chat:message');
        socket.off('phase:start');
        socket.off('round:reveal');
        socket.off('error:generic');
        socket.off('error:rate_limited');
        socket.off('connect');
        socket.off('disconnect');
      }
      setSnapshot(null);
      setChat([]);
      setPhaseStart(null);
      setRoundReveal(null);
      versionRef.current = 0;
    };
  }, [code, myId]);

  const sendChat = useCallback((text: string) => {
    socketRef.current?.emit('chat:send', text);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('game:start');
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
  }, []);

  const createRoom = useCallback((config: RoomConfig, onCreated: (code: string) => void) => {
    const socket = getSocket();
    socketRef.current = socket;

    async function doCreate() {
      const currentUser = userRef.current;
      const currentGuest = guestRef.current;
      if (currentUser) {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        setSocketAuth(data.session?.access_token ?? null);
      } else {
        setSocketAuth(null, currentGuest?.id);
      }

      // Always (re)connect to ensure auth middleware runs with current token
      if (socket.connected) {
        socket.disconnect();
      }
      socket.connect();
      socket.once('connect', () => {
        socket.emit('room:create', config, (payload) => {
          onCreated(payload.code);
        });
      });
    }

    doCreate();
  }, []);

  const isHost = snapshot !== null && snapshot.room.hostId === myId;
  const myPlayer = useMemo(() => {
    if (!snapshot || !myId) return null;
    return snapshot.players.find((p) => p.id === myId) ?? null;
  }, [snapshot, myId]);

  return {
    snapshot,
    chat,
    isConnecting,
    error,
    isHost,
    myPlayer,
    myId,
    phaseStart,
    roundReveal,
    sendChat,
    startGame,
    leaveRoom,
    createRoom,
    levelUp,
  };
}
