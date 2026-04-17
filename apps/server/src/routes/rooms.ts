import type { FastifyInstance } from 'fastify';
import * as roomManager from '../services/room-manager.js';

export async function roomsRoutes(server: FastifyInstance): Promise<void> {
  server.get('/rooms', async (_request, _reply) => {
    return roomManager.listPublicRooms();
  });
}
