# Tiki-Taka Backend API

Modern ticketing platform backend built with Node.js, Express, TypeScript, MongoDB, and Redis.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- MongoDB running on localhost:27017 (or update MONGODB_URI in .env)
- Redis running on localhost:6379 (or update REDIS_URL in .env)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your actual API keys

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start
```

## 📁 Project Structure

```
src/
├── config/           # Configuration files (database, redis, stripe, cloudinary)
├── models/           # Mongoose models (User, Staff, Venue, Event, etc.)
├── controllers/      # Request handlers
├── services/         # Business logic
├── middleware/       # Express middleware
├── routes/           # API routes
├── websocket/        # Socket.io handlers (for real-time seat updates)
├── jobs/             # Background jobs (Bull queues)
├── utils/            # Utility functions (JWT, crypto, QR codes)
├── types/            # TypeScript type definitions
├── app.ts            # Express app setup
└── server.ts         # Server entry point
```

## 🔐 Authentication

### User Authentication (Customers)
- **Register**: `POST /api/v1/auth/register`
- **Login**: `POST /api/v1/auth/login`
- **Guest Checkout**: `POST /api/v1/auth/guest-checkout`
- **Refresh Token**: `POST /api/v1/auth/refresh-token`
- **Get Profile**: `GET /api/v1/auth/me`
- **Logout**: `POST /api/v1/auth/logout`

### Staff Authentication (Scanner App)
- **Login**: `POST /api/v1/staff/auth/login`
- **Refresh Token**: `POST /api/v1/staff/auth/refresh-token`
- **Get Profile**: `GET /api/v1/staff/me`

## 📊 Database Models

### Core Models (10 total)

1. **User** - Customer accounts (with guest support)
2. **Staff** - Scanner app users with event assignments
3. **Venue** - Venues with SVG seat maps
4. **Event** - Events with pricing zones
5. **EventSeatState** - Real-time seat availability (critical for double-booking prevention)
6. **SeatHold** - Temporary seat reservations with TTL auto-expiration
7. **Order** - Customer orders
8. **Ticket** - Individual tickets with QR codes
9. **ScanLog** - Anti-fraud ticket scan tracking
10. **Notification** - Email delivery tracking

## 🔧 Key Features Implemented

### ✅ Phase 1 Complete

- [x] Express + TypeScript setup with ES modules
- [x] MongoDB connection with Mongoose
- [x] Redis connection for caching
- [x] JWT authentication (access + refresh tokens)
- [x] User and Staff authentication
- [x] Guest checkout support
- [x] Role-based access control (Customer, Staff, Admin)
- [x] Request validation with Zod
- [x] Error handling middleware
- [x] Rate limiting
- [x] Security middleware (Helmet, CORS)
- [x] All 10 database models with indexes
- [x] QR code generation utilities
- [x] Crypto utilities for ticket codes

### 🔜 Next Phases

- [ ] Venue & Event management endpoints (Phase 2)
- [ ] Seat selection & hold system with WebSocket (Phase 3)
- [ ] Stripe checkout & payment (Phase 4)
- [ ] QR scanner API (Phase 5)

## 🔑 Environment Variables

See `.env.example` for all required environment variables.

### Critical Variables

```env
MONGODB_URI=mongodb://localhost:27017/tiki-taka
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-key
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
CLOUDINARY_CLOUD_NAME=...
```

## 🛡️ Security Features

- Bcrypt password hashing
- JWT-based authentication
- Rate limiting (100 requests/15 min globally)
- Helmet security headers
- CORS protection
- Request validation
- Optimistic locking on critical operations (EventSeatState)
- TTL-based seat hold expiration

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

## 🧪 Testing Endpoints

Use the health check endpoint to verify the server is running:

```bash
curl http://localhost:5000/health
```

### Test User Registration

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB + Mongoose
- **Cache**: Redis
- **Real-time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Password Hashing**: bcryptjs
- **Payment**: Stripe
- **Email**: Resend
- **File Storage**: Cloudinary
- **QR Codes**: qrcode
- **Queue**: Bull

## 🚧 Development

```bash
# Watch mode with auto-reload
pnpm dev

# Build TypeScript
pnpm build

# Type check
npx tsc --noEmit
```

## 📄 License

ISC

---

Built with ❤️ for Tiki-Taka Ticketing Platform
