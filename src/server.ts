import 'dotenv/config';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { handleSocketConnection } from './websocket/socketHandler.js';
import { initializeSocketIO } from './services/realtime.service.js';
import { startSeatHoldCleanupJob, stopSeatHoldCleanupJob } from './jobs/seatHoldExpiration.job.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Initialize real-time service
initializeSocketIO(io);

// Socket.IO connection handling
handleSocketConnection(io);

// Make io instance available to the app
app.set('io', io);

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();

    // Start background jobs
    await startSeatHoldCleanupJob();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log('\n🚀 Tiki-Taka Backend Server Started');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM signal received: closing HTTP server');
  await stopSeatHoldCleanupJob();
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  await stopSeatHoldCleanupJob();
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

startServer();
