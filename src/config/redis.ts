import { createClient, RedisClientType } from 'redis';

const redisUrl = process.env.REDIS_URL_PROD || process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient: RedisClientType = createClient({
  url: redisUrl,
}) as RedisClientType;

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('disconnect', () => {
  console.warn('⚠️  Redis disconnected');
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  }
};
