# Production Migration Plan: Incident Causality System

## Overview

This document outlines the plan for migrating the Incident Causality and Cryptographic Chain system from development/test mode to a production-ready, secure environment.

**Version:** 1.0.0  
**Date:** January 25, 2026  
**Status:** Planning Phase

---

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Mock/Test Data Removal](#mocktest-data-removal)
3. [Real Implementation Requirements](#real-implementation-requirements)
4. [Cryptographic Container Architecture](#cryptographic-container-architecture)
5. [Security Hardening](#security-hardening)
6. [Deployment Strategy](#deployment-strategy)
7. [Rollback Procedures](#rollback-procedures)

---

## Pre-Migration Checklist

### Tests That Must Pass

Before migration, all tests at `/api/security/tests` must pass:

| Test Suite | Tests | Status |
|------------|-------|--------|
| Cryptographic Integrity | SHA-256 Hash Generation | ⏳ Pending |
| Cryptographic Integrity | Hash Chain Integrity | ⏳ Pending |
| Cryptographic Integrity | Merkle Root Calculation | ⏳ Pending |
| Cryptographic Integrity | Tamper Detection | ⏳ Pending |
| Database Persistence | Database Connection | ⏳ Pending |
| Database Persistence | Incident Log Chain Table | ⏳ Pending |
| Database Persistence | Cascade Predictions Table | ⏳ Pending |
| Database Persistence | Incident Causality Table | ⏳ Pending |
| Chain Verification | Full Chain Verification | ⏳ Pending |

### Command to Run Tests

```bash
curl http://localhost:3010/api/security/tests
```

---

## Mock/Test Data Removal

### Files Containing Mock/Test Data

| File | Mock Data Location | Action Required |
|------|-------------------|-----------------|
| `app/api/security/incidents/test/route.ts` | Entire file | Move to `/dev` or disable in production |
| `lib/security/database.ts` | In-memory fallback storage | Remove fallback, require Supabase |
| `lib/security/agents/prediction-agent.ts` | Pattern matching logic | Replace with ML model |
| `lib/security/agents/resolution-agent.ts` | Playbook definitions | Load from database |

### Step 1: Disable Test Endpoints

Create environment-based routing:

```typescript
// app/api/security/incidents/test/route.ts
export async function POST(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_TEST_MODE) {
    return NextResponse.json(
      { error: 'Test endpoints disabled in production' },
      { status: 403 }
    );
  }
  
  // ... rest of implementation
}
```

### Step 2: Remove In-Memory Fallbacks

```typescript
// lib/security/database.ts - BEFORE
export async function createIncident(incident: Incident) {
  if (supabase) {
    // Use Supabase
  } else {
    // Fallback to in-memory (REMOVE THIS)
    inMemoryStore.incidents.push(incident);
  }
}

// lib/security/database.ts - AFTER
export async function createIncident(incident: Incident) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Database connection required');
  }
  // Use Supabase only
}
```

### Step 3: Create Data Migration Script

```typescript
// scripts/migrate-to-production.ts

async function migrateToProduction() {
  console.log('=== Production Migration ===\n');
  
  // 1. Verify database connection
  console.log('1. Verifying database connection...');
  const supabase = createClient(
    process.env.SUPABASE_PROD_URL!,
    process.env.SUPABASE_PROD_KEY!
  );
  
  // 2. Run schema migrations
  console.log('2. Running schema migrations...');
  // Apply any pending migrations
  
  // 3. Clear test data
  console.log('3. Clearing test data...');
  await supabase.from('incidents').delete().like('id', 'inc-test-%');
  await supabase.from('incident_log_chain').delete().like('id', 'ilc-test-%');
  await supabase.from('cascade_predictions').delete().like('id', 'pred-test-%');
  
  // 4. Verify chain integrity
  console.log('4. Verifying chain integrity...');
  // Run full chain verification
  
  // 5. Initialize production agents
  console.log('5. Initializing production agents...');
  
  console.log('\n=== Migration Complete ===');
}
```

---

## Real Implementation Requirements

### 1. Replace Mock Pattern Matching with ML Model

**Current (Mock):**
```typescript
// lib/security/agents/prediction-agent.ts
const patterns = [
  { keyword: 'exfiltration', cascadeType: 'Data Breach' },
  // ... hardcoded patterns
];
```

**Production (Real):**
```typescript
// lib/security/agents/prediction-agent.ts
import { PredictionModel } from '@/lib/ml/incident-prediction';

export async function generatePredictions(incident: Incident) {
  const model = await PredictionModel.load('models/incident-cascade-v2');
  
  const features = extractFeatures(incident);
  const predictions = await model.predict(features);
  
  return predictions.map(pred => ({
    type: pred.cascadeType,
    confidence: pred.probability,
    reasoning: model.explain(pred),
  }));
}
```

### 2. Replace Hardcoded Playbooks with Database-Driven

**Current (Mock):**
```typescript
const playbooks = {
  malware: ['isolate_endpoint', 'kill_process'],
  // ... hardcoded
};
```

**Production (Real):**
```typescript
export async function getPlaybook(incidentType: string) {
  const { data } = await supabase
    .from('resolution_playbooks')
    .select('*')
    .eq('incident_type', incidentType)
    .single();
  
  return data?.actions || [];
}
```

### 3. Real Agent Integration

**Current (Mock):**
```typescript
// Agents run on API call
await runPredictionAgent();
```

**Production (Real):**
```typescript
// Agents run as background services
// Use Supabase Edge Functions or dedicated worker

// supabase/functions/prediction-agent/index.ts
Deno.serve(async () => {
  // Continuous agent loop
  while (true) {
    await processNewIncidents();
    await Deno.sleep(5000); // 5 second interval
  }
});
```

---

## Cryptographic Container Architecture

### Container Requirements

The cryptographic operations must run in a secure, isolated container:

```dockerfile
# Dockerfile.crypto-engine
FROM node:20-alpine

# Security hardening
RUN apk add --no-cache openssl
RUN addgroup -S crypto && adduser -S crypto -G crypto

# Copy only necessary files
COPY lib/security/crypto-engine /app/crypto-engine
COPY package.json /app/

WORKDIR /app
RUN npm install --production

# Run as non-root
USER crypto

# Health check
HEALTHCHECK --interval=30s --timeout=10s \
  CMD node /app/crypto-engine/healthcheck.js

EXPOSE 3001
CMD ["node", "/app/crypto-engine/server.js"]
```

### Crypto Engine Service

```typescript
// lib/security/crypto-engine/server.ts

import express from 'express';
import crypto from 'crypto';
import { validateRequest, rateLimit } from './middleware';

const app = express();

// Rate limiting for security
app.use(rateLimit({ windowMs: 60000, max: 1000 }));

// Request validation
app.use(validateRequest);

// SHA-256 Hashing
app.post('/hash', (req, res) => {
  const { data } = req.body;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  res.json({ hash, algorithm: 'sha256', timestamp: Date.now() });
});

// Chain Entry Signing
app.post('/sign-entry', (req, res) => {
  const { entry, previousHash } = req.body;
  
  const hashInput = JSON.stringify({
    ...entry,
    previous_hash: previousHash,
  });
  
  const eventHash = crypto.createHash('sha256').update(hashInput).digest('hex');
  
  res.json({ 
    eventHash, 
    hashInput, // For verification
    signedAt: Date.now(),
  });
});

// Chain Verification
app.post('/verify-chain', (req, res) => {
  const { entries } = req.body;
  
  const issues: string[] = [];
  
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].previous_hash !== entries[i - 1].event_hash) {
      issues.push(`Chain break at entry ${entries[i].sequence_number}`);
    }
  }
  
  res.json({ 
    valid: issues.length === 0,
    issues,
    entriesVerified: entries.length,
  });
});

// Merkle Root Calculation
app.post('/merkle-root', (req, res) => {
  const { leaves } = req.body;
  
  function calculateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 1) return hashes[0];
    
    const pairs: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      pairs.push(crypto.createHash('sha256').update(left + right).digest('hex'));
    }
    
    return calculateMerkleRoot(pairs);
  }
  
  const root = calculateMerkleRoot(leaves);
  res.json({ root, leafCount: leaves.length });
});

app.listen(3001, '0.0.0.0', () => {
  console.log('[Crypto Engine] Running on port 3001');
});
```

### Docker Compose Configuration

```yaml
# docker-compose.crypto.yml
version: '3.8'

services:
  crypto-engine:
    build:
      context: .
      dockerfile: Dockerfile.crypto-engine
    container_name: mycosoft-crypto-engine
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3001"  # Only expose locally
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./crypto-logs:/app/logs:rw
    networks:
      - crypto-net
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

networks:
  crypto-net:
    driver: bridge
    internal: true  # No external access
```

---

## Security Hardening

### 1. Environment Variables

```bash
# .env.production (never commit!)

# Database
SUPABASE_PROD_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Crypto Engine
CRYPTO_ENGINE_URL=http://crypto-engine:3001
CRYPTO_ENGINE_API_KEY=secure-random-key

# Security
ENABLE_TEST_MODE=false
ENABLE_DEBUG_LOGGING=false
```

### 2. Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE incident_log_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE cascade_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_causality ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert
CREATE POLICY "Service role insert" ON incident_log_chain
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Authenticated users can read
CREATE POLICY "Authenticated read" ON incident_log_chain
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Prevent updates (immutable chain)
CREATE POLICY "No updates" ON incident_log_chain
  FOR UPDATE
  USING (false);

-- Policy: Prevent deletes (immutable chain)
CREATE POLICY "No deletes" ON incident_log_chain
  FOR DELETE
  USING (false);
```

### 3. API Rate Limiting

```typescript
// middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function rateLimitMiddleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  return null; // Continue
}
```

### 4. Audit Logging

```typescript
// lib/security/audit-log.ts
export async function auditLog(
  action: string,
  resource: string,
  userId: string,
  details: Record<string, unknown>
) {
  const supabase = getSupabase();
  
  await supabase.from('audit_logs').insert({
    id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    action,
    resource,
    user_id: userId,
    details,
    ip_address: getClientIP(),
    user_agent: getClientUserAgent(),
    created_at: new Date().toISOString(),
  });
}
```

---

## Deployment Strategy

### Phase 1: Staging Deployment

1. Deploy to staging environment
2. Run full test suite
3. Verify all cryptographic operations
4. Load test with simulated incidents
5. Security audit

### Phase 2: Blue-Green Deployment

```yaml
# kubernetes/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: incident-system-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: incident-system
      version: blue
  template:
    metadata:
      labels:
        app: incident-system
        version: blue
    spec:
      containers:
      - name: web
        image: mycosoft/incident-system:v2.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
---
apiVersion: v1
kind: Service
metadata:
  name: incident-system
spec:
  selector:
    app: incident-system
    version: blue  # Switch to 'green' for cutover
  ports:
  - port: 80
    targetPort: 3000
```

### Phase 3: Production Cutover

1. Switch traffic to new deployment
2. Monitor for 1 hour
3. If issues, rollback to previous version
4. If stable, proceed to cleanup

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

```bash
# Switch back to previous deployment
kubectl patch service incident-system -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Database Rollback

```sql
-- Restore from backup
-- Note: This will lose data created since backup

-- 1. Stop all writes
-- 2. Restore from pg_dump backup
pg_restore -d mycosoft_prod backup_2026-01-25.dump

-- 3. Verify chain integrity
SELECT * FROM verify_chain_integrity();

-- 4. Resume operations
```

### Chain Recovery

If chain integrity is compromised:

```typescript
// scripts/recover-chain.ts
async function recoverChain() {
  const supabase = getSupabase();
  
  // Get all entries
  const { data } = await supabase
    .from('incident_log_chain')
    .select('*')
    .order('sequence_number', { ascending: true });
  
  // Recalculate hashes
  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const prevHash = i === 0 ? '0'.repeat(64) : data[i - 1].event_hash;
    
    const hashInput = JSON.stringify({
      sequence_number: entry.sequence_number,
      incident_id: entry.incident_id,
      event_type: entry.event_type,
      event_data: entry.event_data,
      reporter_type: entry.reporter_type,
      reporter_id: entry.reporter_id,
      created_at: entry.created_at,
      previous_hash: prevHash,
    });
    
    const correctHash = crypto.createHash('sha256').update(hashInput).digest('hex');
    
    // Update entry
    await supabase
      .from('incident_log_chain')
      .update({ 
        event_hash: correctHash,
        previous_hash: prevHash,
      })
      .eq('id', entry.id);
  }
  
  console.log('Chain recovered and re-hashed');
}
```

---

## Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| 1. Test Suite Completion | 1 day | Ensure all tests pass |
| 2. Mock Data Removal | 2 days | Remove test endpoints, fallbacks |
| 3. Real Implementation | 1 week | ML model, database playbooks |
| 4. Container Setup | 2 days | Crypto engine containerization |
| 5. Security Hardening | 3 days | RLS, rate limiting, audit logs |
| 6. Staging Deployment | 2 days | Deploy and test in staging |
| 7. Production Cutover | 1 day | Blue-green deployment |
| 8. Monitoring Period | 1 week | Active monitoring |

**Total Estimated Time:** ~3 weeks

---

## Success Criteria

1. ✅ All 9 tests pass
2. ✅ No mock data in production
3. ✅ All incidents create chain entries
4. ✅ Chain integrity verifiable at any time
5. ✅ Crypto engine containerized and isolated
6. ✅ RLS policies active
7. ✅ Rate limiting enabled
8. ✅ Audit logging active
9. ✅ Zero downtime deployment
10. ✅ Rollback tested and documented
