import Bull from 'bull';
import { cleanupExpiredHolds } from '../services/seat.service.js';
import { broadcastSeatUpdate } from '../services/realtime.service.js';
import { EventSeatState } from '../models/EventSeatState.model.js';
import { SEAT_STATUS } from '../config/constants.js';

// Create Bull queue for seat hold expiration cleanup
// Use REDIS_URL_PROD for production, REDIS_URL for dev, or localhost as fallback
const redisUrl = process.env.REDIS_URL_PROD || process.env.REDIS_URL || 'redis://localhost:6379';
const parsed = new URL(redisUrl);
const bullRedisConfig: Bull.QueueOptions['redis'] = {
  host: parsed.hostname,
  port: Number(parsed.port || 6379),
};
if (parsed.password) {
  bullRedisConfig.password = parsed.password;
}
if (parsed.protocol === 'rediss:') {
  bullRedisConfig.tls = {};
}

const seatHoldQueue = new Bull('seat-hold-cleanup', {
  redis: bullRedisConfig,
});

/**
 * Process seat hold expiration cleanup
 */
seatHoldQueue.process(async (_job) => {
  console.log('🧹 Running seat hold cleanup job...');

  try {
    const cleanedCount = await cleanupExpiredHolds();

    if (cleanedCount > 0) {
      // Get affected events to broadcast updates
      const recentlyExpired = await EventSeatState.find({
        status: SEAT_STATUS.AVAILABLE,
        lastUpdated: { $gte: new Date(Date.now() - 60000) }, // Last minute
      }).select('eventId seatId');

      // Group by event
      const eventUpdates: Record<string, string[]> = {};
      recentlyExpired.forEach((seat) => {
        const eventId = seat.eventId.toString();
        if (!eventUpdates[eventId]) {
          eventUpdates[eventId] = [];
        }
        eventUpdates[eventId].push(seat.seatId);
      });

      // Broadcast updates for each event
      Object.entries(eventUpdates).forEach(([eventId, seatIds]) => {
        broadcastSeatUpdate(
          eventId,
          seatIds.map((seatId) => ({
            seatId,
            status: SEAT_STATUS.AVAILABLE,
          }))
        );
      });
    }

    return { cleanedCount };
  } catch (error) {
    console.error('❌ Seat hold cleanup job failed:', error);
    throw error;
  }
});

/**
 * Schedule cleanup job to run every minute
 */
export const startSeatHoldCleanupJob = async (): Promise<void> => {
  // Add recurring job (runs every minute)
  await seatHoldQueue.add(
    {},
    {
      repeat: {
        cron: '* * * * *', // Every minute
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  console.log('✅ Seat hold cleanup job scheduled (runs every minute)');
};

/**
 * Stop cleanup job
 */
export const stopSeatHoldCleanupJob = async (): Promise<void> => {
  await seatHoldQueue.close();
  console.log('✅ Seat hold cleanup job stopped');
};

export default seatHoldQueue;
