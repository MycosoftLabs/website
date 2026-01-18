# Supabase Integration - Complete Implementation Plan

**Date:** January 17, 2026  
**Status:** Phase 1 Complete, Phases 2-6 In Progress

## Overview

This document outlines the complete Supabase integration plan for all 6 phases, including automation scripts for 24/7 maintenance.

## Phase 1: Authentication ✅ COMPLETE

See `SUPABASE_PHASE1_COMPLETE.md` for details.

## Phase 2: Database & Vectors Integration

### 2.1 MINDEX Integration

**Goal:** Integrate Supabase with MINDEX database for unified data access.

**Tasks:**
- [ ] Create migration to sync MINDEX schema to Supabase
- [ ] Set up foreign data wrapper (FDW) or replication from MINDEX Postgres
- [ ] Create unified API layer
- [ ] Migrate existing MINDEX data to Supabase
- [ ] Set up RLS policies for MINDEX data

**Files to Create:**
- `lib/supabase/mindex-integration.ts` - MINDEX sync utilities
- `app/api/mindex/sync/route.ts` - Sync endpoint
- `migrations/20260117_mindex_integration.sql` - Database migration

### 2.2 Vector Embeddings

**Goal:** Use Supabase pgvector for AI/ML embeddings.

**Tasks:**
- [ ] Create embeddings table structure
- [ ] Set up embedding generation pipeline
- [ ] Integrate with existing ML models
- [ ] Create vector search functions
- [ ] Set up similarity search endpoints

**Files to Create:**
- `lib/supabase/embeddings.ts` - Embedding utilities
- `app/api/embeddings/search/route.ts` - Vector search endpoint
- `lib/ai/generate-embeddings.ts` - Embedding generation

## Phase 3: Realtime Subscriptions

### 3.1 MycoBrain Telemetry

**Goal:** Real-time telemetry updates from MycoBrain devices.

**Tasks:**
- [ ] Set up Supabase Realtime for `telemetry` table
- [ ] Create React hooks for real-time subscriptions
- [ ] Build real-time dashboard components
- [ ] Set up presence tracking for devices
- [ ] Implement broadcast channels for device commands

**Files to Create:**
- `hooks/use-realtime-telemetry.ts` - Realtime telemetry hook
- `components/dashboard/realtime-device-status.tsx` - Real-time device component
- `lib/supabase/realtime.ts` - Realtime utilities

### 3.2 Device Management

**Goal:** Real-time device status and control.

**Tasks:**
- [ ] Realtime subscriptions for device status
- [ ] Broadcast device commands
- [ ] Presence tracking for active devices
- [ ] Real-time notifications

## Phase 4: Storage Buckets

### 4.1 Create Storage Buckets

**Goal:** Set up Supabase Storage for file management.

**Buckets to Create:**
- `avatars` - User profile images
- `species-images` - Species photos
- `firmware` - Device firmware files
- `documents` - PDFs, research papers
- `telemetry-exports` - Exported telemetry data

**Tasks:**
- [ ] Create storage buckets via Supabase dashboard/API
- [ ] Set up bucket policies (RLS)
- [ ] Create upload utilities
- [ ] Integrate with existing file upload flows
- [ ] Set up image transformations

**Files to Create:**
- `lib/supabase/storage.ts` - Storage utilities
- `app/api/upload/route.ts` - File upload endpoint
- `components/upload/file-upload.tsx` - Upload component

### 4.2 Image Processing

**Tasks:**
- [ ] Integrate Supabase Image Transformations
- [ ] Create image optimization pipeline
- [ ] Set up CDN for images

## Phase 5: Edge Functions

### 5.1 Custom Business Logic

**Goal:** Move server-side logic to Supabase Edge Functions.

**Functions to Create:**
- `process-telemetry` - Process incoming telemetry data
- `generate-embeddings` - Generate vector embeddings
- `sync-mindex` - Sync with MINDEX database
- `webhook-handler` - Handle external webhooks
- `device-command` - Process device commands

**Tasks:**
- [ ] Set up Deno environment
- [ ] Create Edge Function templates
- [ ] Deploy functions
- [ ] Set up function secrets
- [ ] Create API routes that call Edge Functions

**Files to Create:**
- `supabase/functions/process-telemetry/index.ts`
- `supabase/functions/generate-embeddings/index.ts`
- `supabase/functions/sync-mindex/index.ts`

## Phase 6: LangChain Integration

### 6.1 Vector Store Setup

**Goal:** Use Supabase as vector store for LangChain.

**Tasks:**
- [ ] Install LangChain and Supabase vector store
- [ ] Set up vector store connection
- [ ] Create document loaders
- [ ] Set up retrieval chains
- [ ] Integrate with MYCA chatbot

**Files to Create:**
- `lib/ai/langchain-setup.ts` - LangChain configuration
- `lib/ai/vector-store.ts` - Vector store utilities
- `app/api/chat/route.ts` - Chat endpoint with RAG

### 6.2 RAG (Retrieval Augmented Generation)

**Tasks:**
- [ ] Set up document ingestion pipeline
- [ ] Create retrieval chains
- [ ] Integrate with existing MYCA system
- [ ] Set up semantic search

## Automation Scripts

### Redirect URLs Automation

Since Supabase doesn't expose a direct API for redirect URLs, we have two options:

1. **Browser Automation** (Recommended for now)
   - Use Puppeteer/Playwright to automate dashboard
   - Run on schedule or on-demand
   - Store credentials securely

2. **Management API** (Future)
   - Wait for Supabase Management API
   - Use service role key for authentication
   - Full programmatic control

**Script:** `scripts/supabase-automation.ts` (created)

### OAuth Provider Configuration

Similar to redirect URLs, OAuth providers need:
- Client ID and Secret from provider (Google, GitHub)
- These are set in provider's console, then added to Supabase
- Can be automated with browser automation or Management API

## Implementation Order

1. ✅ **Phase 1: Authentication** - COMPLETE
2. 🔄 **Phase 2: Database & Vectors** - IN PROGRESS
3. ⏳ **Phase 3: Realtime** - PENDING
4. ⏳ **Phase 4: Storage** - PENDING
5. ⏳ **Phase 5: Edge Functions** - PENDING
6. ⏳ **Phase 6: LangChain** - PENDING

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://hnevnsxnhfibhbsipqvz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MINDEX Integration
MINDEX_API_URL=http://localhost:8000
MINDEX_DATABASE_URL=postgresql://...

# LangChain
OPENAI_API_KEY=sk-... # or use Supabase's built-in embeddings
```

## Security Considerations

- ✅ RLS policies on all tables
- ✅ Service role key only server-side
- ✅ Environment variables in `.env.local`
- ⚠️ OAuth credentials stored securely
- ⚠️ Storage bucket policies configured
- ⚠️ Edge Function secrets managed

## Testing Strategy

1. **Local Testing:** All changes tested on `localhost:3002` first
2. **VM Sandbox:** Deploy to VM sandbox after local testing
3. **Production:** Deploy to production VM after sandbox validation

## Next Steps

1. Complete redirect URLs configuration (manual or automated)
2. Start Phase 2: Database & Vectors integration
3. Set up MINDEX sync
4. Create vector embeddings pipeline
5. Continue with remaining phases

---

**Note:** This is a living document and will be updated as implementation progresses.
