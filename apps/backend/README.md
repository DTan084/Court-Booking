# Court Booking Backend API

Enterprise-grade court booking system backend built with NestJS, PostgreSQL, and Redis.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Court Management**: CRUD operations with time slot management
- **Booking System**: Real-time booking with conflict detection and pessimistic locking
- **Performance**: Redis caching, database indexing, connection pooling
- **Security**: Helmet, CORS, rate limiting, input validation
- **Logging**: Winston logger with request tracking
- **API Documentation**: Swagger/OpenAPI at `/api/docs`
- **Health Checks**: Database and Redis health monitoring

## 📋 Prerequisites

- Node.js >= 18.x
- pnpm >= 8.x
- PostgreSQL >= 14.x
- Redis >= 6.x

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd Court-Booking/apps/backend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

```bash
# Copy example env file
cp ../../.env.example ../../.env

# Edit .env with your configuration
```

### 4. Database Setup

```bash
# Create database
createdb court_booking

# Run migrations
pnpm migration:run

# (Optional) Seed data
pnpm seed
```

## 🏃 Running the Application

### Development Mode

```bash
pnpm dev
```

Server runs at: `http://localhost:3001/api/v1`

### Production Mode

```bash
# Build
pnpm build

# Start
pnpm start:prod
```

### Watch Mode

```bash
pnpm start:dev
```

## 🧪 Testing

```bash
# Unit tests
pnpm test

# Test coverage
pnpm test:cov

# E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

## 📚 API Documentation

Access Swagger documentation at: `http://localhost:3001/api/docs`

### API Endpoints

#### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

#### Courts

- `GET /api/v1/courts` - List all courts (paginated)
- `GET /api/v1/courts/:id` - Get court details
- `POST /api/v1/courts` - Create court (Admin only)
- `PATCH /api/v1/courts/:id` - Update court (Admin only)
- `DELETE /api/v1/courts/:id` - Delete court (Admin only)
- `GET /api/v1/courts/:id/stats` - Get court statistics
- `GET /api/v1/courts/:id/time-slots` - Get time slots
- `PUT /api/v1/courts/:id/time-slots` - Update time slots (Admin only)
- `GET /api/v1/courts/:id/schedule` - Get court schedule

#### Bookings

- `POST /api/v1/bookings` - Create booking
- `PATCH /api/v1/bookings/:id/cancel` - Cancel booking
- `GET /api/v1/bookings/me` - Get my bookings

#### Health

- `GET /api/v1/health` - Overall health
- `GET /api/v1/health/db` - Database health
- `GET /api/v1/health/redis` - Redis health

## 🗄️ Database

### Migrations

```bash
# Generate migration
pnpm migration:generate src/database/migrations/MigrationName

# Run migrations
pnpm migration:run

# Revert migration
pnpm migration:revert

# Show migrations
pnpm migration:show
```

### Entities

- **User**: User accounts with roles
- **Court**: Court information
- **CourtTimeSlot**: Time slots with pricing
- **Booking**: Booking records
- **RefreshToken**: JWT refresh tokens

## 🔧 Configuration

### Environment Variables

```env
# Application
NODE_ENV=development
PORT=3001
APP_NAME=Court Booking API

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=court_booking
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_SIZE=10
DB_MAX_QUERY_TIME=5000

# JWT
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=15m

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Booking
BOOKING_MIN_CANCEL_HOURS=2

# Frontend URL (for CORS)
FE_URL=http://localhost:3000
```

## 📁 Project Structure

```
apps/backend/
├── src/
│   ├── common/              # Shared utilities
│   │   ├── decorators/      # Custom decorators
│   │   ├── filters/         # Exception filters
│   │   ├── interceptors/    # Interceptors
│   │   ├── pipes/           # Validation pipes
│   │   └── redis/           # Redis module
│   ├── config/              # Configuration files
│   ├── database/            # Database related
│   │   ├── entities/        # TypeORM entities
│   │   └── migrations/      # Database migrations
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication
│   │   ├── bookings/        # Booking management
│   │   ├── courts/          # Court management
│   │   └── health/          # Health checks
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry
├── test/                    # E2E tests
├── docs/                    # Documentation
│   ├── API_REVIEW.md        # API review checklist
│   ├── DEPLOYMENT.md        # Deployment guide
│   └── PERFORMANCE.md       # Performance guide
└── README.md                # This file
```

## 🔒 Security

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Redis-based rate limiting (5 attempts)
- **Input Validation**: Zod schema validation
- **Password Hashing**: bcrypt with salt rounds
- **JWT**: Secure token-based authentication
- **SQL Injection**: TypeORM parameterized queries

## ⚡ Performance

- **Caching**: Redis caching for frequently accessed data
- **Database**: Connection pooling, indexes, query optimization
- **Compression**: Response compression with gzip
- **Pagination**: All list endpoints support pagination
- **N+1 Prevention**: Eager loading with relations

## 📊 Monitoring

### Logs

Logs are stored in `logs/` directory:

- `error.log` - Error logs
- `combined.log` - All logs

### Health Checks

Monitor application health:

```bash
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/health/db
curl http://localhost:3001/api/v1/health/redis
```

## 🐳 Docker

### Build Image

```bash
docker build -f Dockerfile -t court-booking-backend .
```

### Run with Docker Compose

```bash
docker-compose up -d
```

## 🚀 Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

1. Set environment variables
2. Run migrations: `pnpm migration:run`
3. Build: `pnpm build`
4. Start: `pnpm start:prod`

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Write tests
4. Run linter: `pnpm lint`
5. Run tests: `pnpm test`
6. Create pull request

## 📝 Code Style

- **Linting**: ESLint with Prettier
- **Formatting**: Prettier
- **Commit**: Conventional commits

```bash
# Lint
pnpm lint

# Format
pnpm format

# Lint and fix
pnpm lint:fix
```

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready

# Check connection
psql -h localhost -U postgres -d court_booking
```

### Redis Connection Error

```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Migration Error

```bash
# Check migration status
pnpm migration:show

# Revert last migration
pnpm migration:revert
```

### Port Already in Use

```bash
# Change PORT in .env file
PORT=3002
```

## 📞 Support

For issues or questions:

- Check documentation in `docs/` folder
- Review API documentation at `/api/docs`
- Check logs in `logs/` directory

## 📄 License

Private - All rights reserved

## 👥 Team

- Backend Developer: [Your Name]
- Project Manager: [PM Name]

---

**Version**: 1.0.0  
**Last Updated**: 2026-05-04
