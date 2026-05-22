import type { FastifyInstance } from 'fastify';
import * as roomManager from '../services/room-manager.js';

export async function roomsRoutes(server: FastifyInstance): Promise<void> {
  // Unauthenticated lobby listing. Project to the minimum fields the lobby UI
  // uses — full RoomStateSnapshot would expose nicknames, avatars, levels, and
  // host id of every in-progress public room to scrapers.
  server.get('/rooms', async (_request, _reply) => {
    return roomManager.listPublicRooms().map((snapshot) => ({
      code: snapshot.room.code,
      category: snapshot.room.config.category,
      maxPlayers: snapshot.room.config.maxPlayers,
      playerCount: snapshot.players.length,
      status: snapshot.room.status,
      createdAt: snapshot.room.createdAt,
    }));
  });
}
