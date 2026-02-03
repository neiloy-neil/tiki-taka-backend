import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Handle Socket.IO connections
 */
export const handleSocketConnection = (io: SocketIOServer): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Optional: Authenticate socket connection
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        socket.data.user = decoded;
        console.log(`👤 Authenticated user: ${decoded.email}`);
      } catch (error) {
        console.warn('Invalid token for socket connection');
      }
    }

    // Store session ID for tracking user holds
    const sessionId = socket.handshake.auth.sessionId || socket.id;
    socket.data.sessionId = sessionId;

    /**
     * Join event room to receive real-time updates
     */
    socket.on('join_event', (data: { eventId: string }) => {
      const { eventId } = data;

      if (!eventId) {
        socket.emit('error', { message: 'Event ID is required' });
        return;
      }

      const roomName = `event:${eventId}`;
      socket.join(roomName);

      console.log(`📍 Socket ${socket.id} joined ${roomName}`);

      socket.emit('joined_event', {
        eventId,
        message: 'Successfully joined event room',
      });

      // Broadcast viewer count update
      io.to(roomName).emit('viewers_update', {
        eventId,
        count: io.sockets.adapter.rooms.get(roomName)?.size || 0,
      });
    });

    /**
     * Leave event room
     */
    socket.on('leave_event', (data: { eventId: string }) => {
      const { eventId } = data;

      if (!eventId) return;

      const roomName = `event:${eventId}`;
      socket.leave(roomName);

      console.log(`📍 Socket ${socket.id} left ${roomName}`);

      // Broadcast viewer count update
      setTimeout(() => {
        io.to(roomName).emit('viewers_update', {
          eventId,
          count: io.sockets.adapter.rooms.get(roomName)?.size || 0,
        });
      }, 100);
    });

    /**
     * Request current seat status
     */
    socket.on('request_seat_status', async (data: { eventId: string; seatIds?: string[] }) => {
      const { eventId, seatIds } = data;

      try {
        // Import here to avoid circular dependencies
        const { getSeatAvailability } = await import('../services/seat.service.js');
        let seats = await getSeatAvailability(eventId);

        // Filter by specific seats if requested
        if (seatIds && seatIds.length > 0) {
          seats = seats.filter((s) => seatIds.includes(s.seatId));
        }

        socket.emit('seat_status_response', {
          eventId,
          seats,
        });
      } catch (error: any) {
        socket.emit('error', {
          message: error.message || 'Failed to fetch seat status',
        });
      }
    });

    /**
     * Ping/pong for connection health check
     */
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);

      // Broadcast viewer count updates for all rooms this socket was in
      socket.rooms.forEach((room) => {
        if (room.startsWith('event:')) {
          setTimeout(() => {
            io.to(room).emit('viewers_update', {
              eventId: room.replace('event:', ''),
              count: io.sockets.adapter.rooms.get(room)?.size || 0,
            });
          }, 100);
        }
      });
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });
};
