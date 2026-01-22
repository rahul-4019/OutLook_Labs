# ReachInbox Email Scheduler Assignment

A production-grade email scheduler service with dashboard, built with Express.js, BullMQ, Redis, PostgreSQL, and Next.js.

## 🏗️ Architecture Overview

### Scheduling Mechanism
- **BullMQ Delayed Jobs**: All email scheduling uses BullMQ's built-in delayed job feature. Jobs are scheduled with a `delay` option that calculates the time until the scheduled send time.
- **No Cron Jobs**: The system does not use any cron-based scheduling. All timing is handled by BullMQ's Redis-backed queue system.
- **Persistence**: Jobs are stored in Redis (BullMQ) and email metadata is stored in PostgreSQL. On server restart, BullMQ automatically resumes processing scheduled jobs from Redis.

### Rate Limiting Implementation
- **Redis-Based Counters**: Rate limiting uses Redis counters keyed by `hour_window:sender_id` (e.g., `rate_limit:2024-01-15-14:sender_1`).
- **Per-Sender Limits**: Each sender has a configurable `MAX_EMAILS_PER_HOUR` limit.
- **Rescheduling Strategy**: When the hourly limit is reached, jobs are automatically delayed to the next available hour window while preserving order.
- **Thread-Safe**: All rate limit checks and increments use Redis atomic operations (INCR, EXPIRE) to ensure safety across multiple workers.

### Concurrency & Delays
- **Worker Concurrency**: BullMQ workers are configured with `concurrency: CONCURRENCY_LEVEL` (default: 5).
- **Minimum Delay Between Emails**: A configurable `MIN_DELAY_BETWEEN_EMAILS` (default: 2 seconds) is enforced using BullMQ's limiter or custom delay logic.
- **BullMQ Limiter**: Uses BullMQ's built-in rate limiter to enforce delays between job executions.

### Persistence on Restart
- **Redis Persistence**: BullMQ stores all job data in Redis. When the server restarts, BullMQ automatically loads pending jobs from Redis.
- **Database State**: Email records in PostgreSQL maintain the current state (scheduled, sent, failed).
- **Idempotency**: Each email job has a unique ID. Duplicate processing is prevented by checking job status before sending.

## 📋 Features Implemented

### Backend
- ✅ Email scheduling via REST API
- ✅ BullMQ-based job queue (no cron)
- ✅ PostgreSQL database with Prisma ORM
- ✅ Rate limiting (emails per hour per sender)
- ✅ Concurrency control (configurable worker concurrency)
- ✅ Minimum delay between emails
- ✅ Ethereal Email integration (fake SMTP)
- ✅ Persistence across server restarts
- ✅ Idempotency (no duplicate sends)
- ✅ Multiple senders support
- ✅ Job rescheduling when rate limits are hit

### Frontend
- ✅ Google OAuth authentication
- ✅ User profile display (name, email, avatar)
- ✅ Dashboard with Scheduled/Sent email tabs
- ✅ Compose email modal
- ✅ CSV file upload for email leads
- ✅ Email scheduling form (subject, body, start time, delay, hourly limit)
- ✅ Scheduled emails table (email, subject, scheduled time, status)
- ✅ Sent emails table (email, subject, sent time, status)
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling with toasts
- ✅ Responsive design matching Figma

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (for Redis and PostgreSQL)
- Google Cloud Console account (for OAuth)

### Quick Setup (Automated)

**Windows:**
```powershell
.\setup.ps1
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd OutLook_Labs
```

2. **Start Docker services (Redis and PostgreSQL)**
```bash
docker-compose up -d
```

3. **Set up Backend**

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
```

Create a `.env` file in the `backend` directory:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/email_scheduler"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3001
NODE_ENV=development

# Ethereal Email (auto-generated, but you can set manually)
ETHEREAL_USER=
ETHEREAL_PASS=

# Rate Limiting
MAX_EMAILS_PER_HOUR=200
MIN_DELAY_BETWEEN_EMAILS=2000
CONCURRENCY_LEVEL=5

# Google OAuth (for frontend)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Run database migrations:
```bash
npx prisma migrate dev
```

Start the backend:
```bash
npm run dev
```

4. **Set up Frontend**

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Note:** Generate a random secret for `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```
Or use any random string generator.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your `.env.local` file

### Starting the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Start the frontend:
```bash
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 🔧 Configuration

### Environment Variables

#### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `PORT`: Backend server port (default: 3001)
- `MAX_EMAILS_PER_HOUR`: Maximum emails per hour per sender (default: 200)
- `MIN_DELAY_BETWEEN_EMAILS`: Minimum delay in milliseconds between emails (default: 2000)
- `CONCURRENCY_LEVEL`: Number of concurrent workers (default: 5)

#### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID

## 📡 API Endpoints

### Email Scheduling
- `POST /api/emails/schedule` - Schedule emails
  ```json
  {
    "subject": "Test Email",
    "body": "Email body",
    "recipients": ["email1@example.com", "email2@example.com"],
    "scheduledAt": "2024-01-15T10:00:00Z",
    "delayBetweenEmails": 2000,
    "hourlyLimit": 200
  }
  ```

### Email Queries
- `GET /api/emails/scheduled` - Get scheduled emails
- `GET /api/emails/sent` - Get sent emails
- `GET /api/emails/:id` - Get email details

## 🧪 Testing Restart Persistence

1. Schedule some emails for future times
2. Stop the backend server (`Ctrl+C`)
3. Start the backend server again
4. Verify that scheduled emails are still queued and will send at the correct time

## 📝 Assumptions & Trade-offs

### Assumptions
- Ethereal Email accounts are created per sender (or reused)
- CSV files contain one email address per line or comma-separated
- All times are in UTC (can be converted in frontend)
- Rate limits reset at the top of each hour
- Single backend instance (for multi-instance, would need shared Redis for rate limiting, which is already implemented)
- Google OAuth is used for authentication (no custom auth system)

### Trade-offs
- **Rate Limiting**: Using Redis counters for simplicity. For very high scale, could use token bucket or sliding window algorithms.
- **Job Rescheduling**: When rate limits are hit, jobs are delayed to the next hour. This preserves order but may cause delays during high load.
- **Concurrency**: Fixed concurrency level. Could be made dynamic based on system load.
- **Error Handling**: Failed emails are logged but not automatically retried (BullMQ handles retries with exponential backoff).
- **CSV Parsing**: Simple parsing logic - assumes one email per line or comma-separated. For production, would use a proper CSV parser library.
- **Frontend State**: Uses polling (10s interval) instead of WebSockets for real-time updates. For production, would implement WebSocket or Server-Sent Events.

### Shortcuts Made
- Used default Ethereal account for all senders (in production, would create separate accounts per sender)
- Simplified CSV parsing (no proper CSV library)
- No pagination on email lists (shows last 100 sent emails)
- No email cancellation feature
- No email preview/edit before sending

## 🎥 Demo Video Checklist

The demo video should cover:

1. **Creating scheduled emails from frontend**
   - Show the compose modal
   - Upload CSV file with email addresses
   - Set scheduling parameters
   - Submit and verify emails are scheduled

2. **Viewing scheduled emails in dashboard**
   - Show the Scheduled Emails tab
   - Display email list with all details

3. **Viewing sent emails after they're sent**
   - Show the Sent Emails tab
   - Display sent/failed status

4. **Server restart scenario** (Critical)
   - Schedule some emails for future times
   - Stop the backend server
   - Start the backend server again
   - Verify that scheduled emails are still queued and will send at the correct time
   - Wait for emails to send (or fast-forward time if possible)

5. **Rate limiting behavior** (Bonus)
   - Schedule many emails at once
   - Show how rate limiting reschedules emails to next hour window
   - Verify no emails are lost or duplicated

## 📚 Tech Stack

- **Backend**: Express.js, TypeScript, Prisma, BullMQ, Redis, Ethereal Email
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL
- **Queue**: Redis + BullMQ
- **Auth**: Google OAuth 2.0
