# Deployment Guide

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- PostgreSQL 14+ with pgvector extension
- MinIO (or S3-compatible storage)
- Groq API key (for chat assistant)
- Gemini API key (for embeddings)
- Older Anthropic/OpenAI keys remain supported as fallbacks

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stitch_enterprise?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# WebRTC Signaling (using Socket.IO for signaling)
# No additional WebRTC-specific environment variables needed

# AI/LLM
# Preferred free setup
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="llama-3.1-8b-instant"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_EMBEDDING_MODEL="gemini-embedding-001"

# Backward-compatible fallback values
ANTHROPIC_API_KEY="your-anthropic-api-key"
EMBEDDINGS_API_KEY="your-openai-api-key"
EMBEDDINGS_MODEL="text-embedding-3-small"

# File Storage (MinIO for local dev)
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL="false"
MINIO_BUCKET="stitch-files"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Backend Port
BACKEND_PORT="3001"
```

## Local Development Setup

### 1. Start Infrastructure Services

```bash
cd stitch-enterprise-collab-hub
docker-compose up -d
```

This starts:
- PostgreSQL with pgvector extension
- MinIO for file storage

### 2. Setup Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Production Deployment

### Option 1: Render Deployment

#### Backend Deployment

1. Create a PostgreSQL database on Render with pgvector extension
2. Create a Web Service for the backend
3. Set environment variables in Render dashboard
4. Deploy using:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   npm run start:prod
   ```

#### Frontend Deployment

1. Create a Web Service for the frontend
2. Set `NEXT_PUBLIC_API_URL` to your backend URL
3. Deploy using:
   ```bash
   cd frontend
   npm install
   npm run build
   npm start
   ```

#### Storage

Use Render's disk storage or external S3-compatible service.

### Option 2: Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up -d --build
```

### Option 3: Kubernetes Deployment

Create Kubernetes manifests for:
- PostgreSQL StatefulSet
- MinIO Deployment
- Backend Deployment
- Frontend Deployment
- Ingress for routing

## Security Considerations

### Production Checklist

- [ ] Change all default passwords and API keys
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable request logging
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts
- [ ] Use environment-specific configurations
- [ ] Enable database connection pooling
- [ ] Configure file upload size limits
- [ ] Set up proper error handling

### Database Security

- Use strong database passwords
- Enable SSL for database connections
- Regular backups
- Limit database user permissions
- Enable query logging in development only

### API Security

- Implement rate limiting
- Validate all inputs
- Use parameterized queries (Prisma handles this)
- Sanitize user inputs
- Implement proper authentication
- Use HTTPS in production
- Set secure cookie flags

## Monitoring

### Recommended Tools

- **Application Monitoring**: Datadog, New Relic, or Prometheus
- **Error Tracking**: Sentry
- **Log Management**: ELK Stack or CloudWatch
- **Uptime Monitoring**: Pingdom or UptimeRobot

### Health Checks

Backend health endpoint: `GET /health`

## Scaling

### Horizontal Scaling

- Use a load balancer (Nginx, AWS ALB)
- Deploy multiple backend instances
- Use Redis for session storage (if needed)
- Use external PostgreSQL with connection pooling

### Vertical Scaling

- Increase instance size based on load
- Optimize database queries
- Enable caching for frequently accessed data

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump -h localhost -U postgres stitch_enterprise > backup.sql

# Restore
psql -h localhost -U postgres stitch_enterprise < backup.sql
```

### File Storage Backups

- MinIO has built-in replication
- Use versioning for S3
- Regular sync to backup location

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL
   - Verify PostgreSQL is running
   - Check pgvector extension is enabled

2. **File Upload Failed**
   - Verify MinIO is running
   - Check bucket permissions
   - Verify storage credentials

3. **AI Assistant Not Working**
   - Check API keys are valid
   - Verify embeddings model is available
   - Check document processing status

4. **WebRTC Connection Failed**
   - Verify STUN servers are accessible
   - Check firewall rules
   - Ensure WebSocket connection is established

## Performance Optimization

### Backend

- Enable database query caching
- Use connection pooling
- Implement Redis for frequently accessed data
- Optimize database indexes
- Enable compression for responses

### Frontend

- Implement code splitting
- Use Next.js Image optimization
- Enable static generation where possible
- Implement lazy loading
- Use CDN for static assets

## Maintenance

### Regular Tasks

- Update dependencies regularly
- Monitor disk usage
- Review logs for errors
- Check database performance
- Update security patches
- Test backup restoration

### Updates

1. Test in staging environment first
2. Create database backups before migrations
3. Use blue-green deployment for zero downtime
4. Monitor after deployment
- Roll back if issues detected
