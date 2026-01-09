# Earth Simulator - Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- Google Earth Engine account (optional, for GEE features)
- 384GB+ RAM recommended for optimal performance

## Environment Variables

Create `.env.local`:

```env
# Google Earth Engine (Optional)
GEE_PROJECT_ID=your-project-id
GEE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GEE_CLIENT_ID=your-client-id
```

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Navigate to
http://localhost:3002/apps/earth-simulator
```

## Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Docker Deployment (Optional)

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  earth-simulator:
    build: .
    ports:
      - "3002:3002"
    environment:
      - GEE_PROJECT_ID=${GEE_PROJECT_ID}
      - GEE_SERVICE_ACCOUNT_EMAIL=${GEE_SERVICE_ACCOUNT_EMAIL}
      - GEE_PRIVATE_KEY=${GEE_PRIVATE_KEY}
      - GEE_CLIENT_ID=${GEE_CLIENT_ID}
    memory: 32g
    restart: unless-stopped
```

## Performance Tuning

### Node.js Memory
```bash
NODE_OPTIONS="--max-old-space-size=16384" npm start
```

### Docker Memory Limit
```yaml
deploy:
  resources:
    limits:
      memory: 32G
```

## Monitoring

- API response times
- Memory usage
- Error rates
- User interactions

---

**Last Updated**: January 2026
