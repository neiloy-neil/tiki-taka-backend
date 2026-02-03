import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO instance
 */
export const initializeSocketIO = (socketServer: SocketIOServer): void => {
  io = socketServer;
  console.log('✅ Real-time service initialized');
};

/**
 * Get Socket.IO instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Broadcast seat availability update to all clients watching an event
 */
export const broadcastSeatUpdate = (
  eventId: string,
  updates: Array<{ seatId: string; status: string }>
): void => {
  if (!io) {
    console.warn('Socket.IO not initialized, skipping broadcast');
    return;
  }

  const roomName = `event:${eventId}`;

  io.to(roomName).emit('seat_availability_update', {
    eventId,
    updates,
    timestamp: new Date().toISOString(),
  });

  console.log(`📡 Broadcast to ${roomName}: ${updates.length} seat updates`);
};

/**
 * Broadcast hold expiration
 */
export const broadcastHoldExpired = (eventId: string, seatIds: string[]): void => {
  if (!io) return;

  const roomName = `event:${eventId}`;

  io.to(roomName).emit('hold_expired', {
    eventId,
    seatIds,
    timestamp: new Date().toISOString(),
  });

  console.log(`📡 Broadcast to ${roomName}: Hold expired for ${seatIds.length} seats`);
};

/**
 * Notify specific user about their hold expiring soon
 */
export const notifyUserHoldExpiring = (sessionId: string, eventId: string, expiresAt: Date): void => {
  if (!io) return;

  // Find socket by session ID (stored in socket.data)
  const sockets = io.sockets.sockets;
  sockets.forEach((socket: Socket) => {
    if (socket.data.sessionId === sessionId) {
      socket.emit('hold_expiring_soon', {
        eventId,
        expiresAt: expiresAt.toISOString(),
        message: 'Your seat hold will expire soon. Please complete your purchase.',
      });
    }
  });
};

/**
 * Get connected clients count for an event
 */
export const getEventViewersCount = async (eventId: string): Promise<number> => {
  if (!io) return 0;

  const roomName = `event:${eventId}`;
  const room = io.sockets.adapter.rooms.get(roomName);

  return room ? room.size : 0;
};
