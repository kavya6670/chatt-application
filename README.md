# Stitch Enterprise Collab Hub

Internal company communication platform with real-time chat, audio/video calls, calendar, and AI assistant.

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: NestJS + TypeScript + Socket.IO
- **Database**: PostgreSQL with pgvector extension
- **ORM**: Prisma
- **Auth**: JWT + bcrypt
- **Real-time**: Socket.IO (WebSockets)
- **Video/Audio**: LiveKit Cloud
- **File Storage**: MinIO (local dev) / S3 (production)
- **AI/RAG**: Anthropic Claude + embeddings API

## Project Structure

```
stitch-enterprise-collab-hub/
├── frontend/          # Next.js application
├── backend/           # NestJS API
├── docker-compose.yml # Local development services
└── .env.example       # Environment variables template
```

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### Local Development

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Start infrastructure services:
   ```bash
   docker-compose up -d
   ```

3. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Run database migrations:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

5. Start backend (http://localhost:3001):
   ```bash
   cd backend
   npm run start:dev
   ```

6. Start frontend (http://localhost:3000):
   ```bash
   cd frontend
   npm run dev
   ```

## Development Phases

- **Phase 1**: Auth, Roles, Departments, Admin Employee Management
- **Phase 2**: Dashboard, Employee Directory, 1:1 Chat
- **Phase 3**: Group Chat, Notifications, Presence
- **Phase 4**: LiveKit Audio/Video Calls
- **Phase 5**: Calendar
- **Phase 6**: Document Management, Vector Database
- **Phase 7**: RAG AI Assistant
- **Phase 8**: Security Hardening, Testing, Deployment

## Security Notes

- Never commit `.env` files
- All passwords are hashed with bcrypt
- Role-based access control enforced on backend
- Department-based data isolation
- JWT tokens for authentication
