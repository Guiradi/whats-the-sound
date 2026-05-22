'use client';

import { applySocketAuth } from '@/lib/room/apply-socket-auth';
import {
  type PhaseStartPayload,
  type RoundRevealPayload,
  registerRoomListeners,
} from '@/lib/room/register-room-listeners';
import { useAuth } from '@/hooks/use-auth';
import { type TypedSocket, getSocket } from '@/lib/socket';
import type {
  ChatMessage,
  RoomConfig,
  RoomPlayer,
  RoomStateSnapshot,
  XpLevelUpPayload,
} from '@wts/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  toggleReady: (ready: boolean) => void;
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

  const userRef = useRef(user);
  userRef.current = user;
  const guestRef = useRef(guest);
  guestRef.current = guest;

  const myId = user?.id ?? (guest ? `guest:${guest.id}` : null);

  useEffect(() => {
    if (!code || !myId) return;

    let cancelled = false;
    setIsConnecting(true);
    setError(null);

    async function connect() {
      const socket = getSocket();
      socketRef.current = socket;

      await applySocketAuth(userRef.current, guestRef.current);
      if (cancelled) return;

      const unregister = registerRoomListeners(socket, {
        onSnapshot: (snap) => {
          if (snap.version >= versionRef.current) {
            versionRef.current = snap.version;
            setSnapshot(snap);
            // Chat is no longer carried on room:state — see onChatBacklog below.
          }
        },
        onChatBacklog: (messages) => {
          // Authoritative chat history on join/reconnect. Replaces any local
          // chat state so reconnecting catches the room up to the room's state.
          setChat(messages.slice(-MAX_LOCAL_CHAT));
        },
        onChatMessage: (msg) =>
          setChat((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const next = [...prev, msg];
            return next.length > MAX_LOCAL_CHAT ? next.slice(-MAX_LOCAL_CHAT) : next;
          }),
        onPhaseStart: (payload) => {
          setPhaseStart(payload);
          setRoundReveal(null);
        },
        onRoundReveal: (payload) => {
          setRoundReveal(payload);
          setPhaseStart(null);
        },
        onGenericError: (message) => {
          setError(message);
          setIsConnecting(false);
        },
        onRateLimited: (scope, retryAfterMs) => {
          setError(`Rate limited (${scope}). Retry in ${Math.ceil(retryAfterMs / 1000)}s`);
        },
        onLevelUp: setLevelUp,
        onConnect: () => {
          setIsConnecting(false);
          const nickname = userRef.current ? undefined : guestRef.current?.nickname;
          if (code) socket.emit('room:join', { code, nickname });
        },
        onDisconnect: () => setIsConnecting(true),
      });

      socketRef.current = socket;
      socket.disconnect();
      socket.connect();

      return unregister;
    }

    const unregisterPromise = connect();

    return () => {
      cancelled = true;
      unregisterPromise.then((unregister) => unregister?.());
      socketRef.current?.emit('room:leave');
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

  const toggleReady = useCallback((ready: boolean) => {
    socketRef.current?.emit('player:ready', ready);
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

    (async () => {
      await applySocketAuth(userRef.current, guestRef.current);
      if (socket.connected) socket.disconnect();
      socket.connect();
      socket.once('connect', () => {
        socket.emit('room:create', config, (payload) => onCreated(payload.code));
      });
    })();
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
    toggleReady,
    startGame,
    leaveRoom,
    createRoom,
    levelUp,
  };
}
