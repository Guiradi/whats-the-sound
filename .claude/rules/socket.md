---
paths:
  - "apps/server/src/socket/**"
  - "apps/web/src/hooks/use-room.ts"
  - "apps/web/src/hooks/use-socket.ts"
  - "apps/web/src/lib/socket.ts"
  - "packages/shared/src/types/**"
---

# Socket.io Rules — What's the Sound?

## Events
- All event names use namespace:action format (room:create, game:guess, chat:message)
- Event types MUST be defined in packages/shared/src/types/
- Server-to-client and client-to-server events have separate interfaces
- Every event handler MUST have error handling with error event emission

## Rooms
- Room code: 5 alphanumeric uppercase chars (A-Z, 0-9)
- Room state lives in-memory (Map) on server, NOT in database during gameplay
- Room state saved to database only at GAME_END
- Auto-cleanup empty rooms after 5 minutes

## Auth
- Token validated in connection handshake middleware
- Guest connections: accepted without token, identified by socket.id + nickname
- On reconnection: emit room:state with full snapshot (see below)

## Reconnect payload (`room:state`)
Emitted on reconnect and on any state-changing event. Shape enforced by shared type `RoomStateSnapshot`:
- `room`: code, hostId, config, status (LOBBY/ROUND_*/PHASE_*/GAME_END), createdAt
- `players[]`: id, nickname, avatar, isGuest, totalScore, connected, joinedAt (used for host migration order)
- `round | null`: current/total, midiId (only after PHASE_1 starts), phase, phaseStartAt/phaseEndAt (epoch ms, server clock), correctPlayerIds (IDs only — never title/artist), phaseAudioData
- `chat[]`: last 50 messages; correct guesses are NEVER included
- `version`: monotonic; client ignores snapshots with older version

Rules:
- NEVER include midi title/artist in the snapshot — reveal only via `round:reveal` at ROUND_END
- Client computes remaining time as `phaseEndAt - now + clockSkew` (ping handshake provides skew)
- After receiving snapshot, client reopens AudioContext if needed and resumes phase from the correct offset

Full spec lives in `specs/features/04-multiplayer-rooms.md#payload-de-reconexão-roomstate`.

## Game Loop
- All game state transitions are server-authoritative
- Timer runs on server, broadcasts tick every 1 second
- Score calculation is server-only — NEVER trust client scores
- Phase audio data sent per-phase (never all phases at once)
- Guess verification is server-only
- Timestamp for guess order = server receive time, NOT client send time

## Performance
- Broadcast to room only (not all sockets)
- Throttle score:update to 1 per second max
- Timer tick: 1 per second (not more frequent)
- Limit chat messages: 1 per second per player
