# Supabase Integration - Testing Checklist

**Date:** January 17, 2026  
**Status:** Ready for Local Testing

---

## 📊 Overall Status

| Phase | Code Status | Dashboard Status | Testing Status |
|-------|-------------|------------------|----------------|
| 1. Authentication | ✅ Complete | ⚠️ Need Redirect URLs | ⏳ Pending |
| 2. Database & Vectors | ✅ Complete | ✅ Ready | ⏳ Pending |
| 3. Realtime | ✅ Complete | ✅ Ready | ⏳ Pending |
| 4. Storage | ✅ Complete | ✅ Buckets + Policies | ⏳ Pending |
| 5. Edge Functions | ✅ Complete | ⏳ Need Deployment | ⏳ Pending |
| 6. LangChain | ✅ Complete | N/A | ⏳ Need Packages |

---

## 🔴 BLOCKING ISSUES (Must Fix Before Testing)

### 1. LangChain Packages Missing

The LangChain packages are NOT installed. Run:

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
npm install @langchain/openai@^0.3.0 @langchain/community@^0.3.0 @langchain/core@^0.3.0 --legacy-peer-deps
```

### 2. Environment Variables

Verify `.env.local` contains all required keys:

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://hnevnsxnhfibhbsipqvz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI (REQUIRED for embeddings & chat)
OPENAI_API_KEY=sk-your_key_here

# MINDEX (optional, for database sync)
MINDEX_API_URL=http://localhost:8000
```

### 3. Redirect URLs in Supabase Dashboard

Go to: https://supabase.com/dashboard/project/hnevnsxnhfibhbsipqvz/auth/url-configuration

Add these redirect URLs:
- `http://localhost:3000/auth/callback`
- `http://localhost:3002/auth/callback`
- `https://mycosoft.com/auth/callback` (production)

---

## 🟡 RECOMMENDED (Optional but Important)

### 4. Deploy Edge Functions

Install Supabase CLI and deploy:

```powershell
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref hnevnsxnhfibhbsipqvz

# Set secrets
supabase secrets set OPENAI_API_KEY=sk-your_key_here

# Deploy functions
supabase functions deploy generate-embeddings
supabase functions deploy process-telemetry
```

### 5. Configure OAuth Providers (Optional)

For Google/GitHub login, configure in:
- https://supabase.com/dashboard/project/hnevnsxnhfibhbsipqvz/auth/providers

---

## ✅ TESTING PROCEDURE

### Step 1: Start Development Server

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
npm run dev
```

Note: If port 3000 is in use (Docker production), it will start on 3002.

### Step 2: Test Authentication

1. Navigate to: http://localhost:3002/signup
2. Create a test account with email/password
3. Verify email confirmation (check Supabase dashboard for auth.users)
4. Navigate to: http://localhost:3002/login
5. Login with test credentials
6. Verify redirect to /dashboard

**Expected:** User is authenticated, session persists across pages.

### Step 3: Test Protected Routes

1. Navigate to: http://localhost:3002/profile
2. Verify user info is displayed
3. Navigate to: http://localhost:3002/dashboard/crep
4. Verify authenticated access

**Expected:** Protected pages accessible when logged in.

### Step 4: Test Storage Upload

1. Navigate to: http://localhost:3002/profile
2. Upload a profile picture (if UI exists)
3. Check Supabase dashboard > Storage > avatars

Or test via API:
```bash
curl -X POST http://localhost:3002/api/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-image.jpg" \
  -F "bucket=avatars" \
  -F "path=test/test-image.jpg"
```

**Expected:** File appears in Supabase Storage bucket.

### Step 5: Test Realtime (If Telemetry Data Exists)

```typescript
// In React DevTools or a test component
import { useRealtimeTelemetry } from '@/hooks/use-realtime-telemetry'

const { telemetry, isConnected } = useRealtimeTelemetry('device-id-here')
console.log('Connected:', isConnected)
console.log('Data:', telemetry)
```

**Expected:** Real-time updates from Supabase.

### Step 6: Test Semantic Search (Requires OpenAI Key)

```bash
curl -X POST http://localhost:3002/api/embeddings/search \
  -H "Content-Type: application/json" \
  -d '{"query": "mushroom species", "table": "species", "limit": 5}'
```

**Expected:** Returns relevant results based on semantic similarity.

### Step 7: Test RAG Chat (Requires OpenAI + LangChain)

```bash
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What fungi are found in North America?", "useRAG": true}'
```

**Expected:** AI response with context from vector store.

---

## 📁 Key Files to Verify

### Authentication
- `lib/supabase/client.ts` - Browser client
- `lib/supabase/server.ts` - Server client
- `lib/supabase/middleware.ts` - Session management
- `app/login/page.tsx` - Login page
- `app/signup/page.tsx` - Signup page
- `app/auth/callback/route.ts` - OAuth callback
- `hooks/use-supabase-user.ts` - User hook

### Database & Vectors
- `lib/supabase/embeddings.ts` - Embedding utilities
- `lib/supabase/mindex-integration.ts` - MINDEX sync
- `app/api/embeddings/search/route.ts` - Search endpoint

### Realtime
- `hooks/use-realtime-telemetry.ts` - Telemetry hook
- `components/dashboard/realtime-device-status.tsx` - UI component

### Storage
- `lib/supabase/storage.ts` - Storage utilities
- `app/api/upload/route.ts` - Upload endpoint

### Edge Functions
- `supabase/functions/generate-embeddings/index.ts`
- `supabase/functions/process-telemetry/index.ts`

### LangChain
- `lib/ai/langchain-setup.ts` - LangChain config
- `app/api/chat/route.ts` - Chat endpoint

---

## 🚨 Troubleshooting

### "Missing Supabase credentials"
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server after adding env vars

### "Redirect URL not allowed"
- Add the URL to Supabase dashboard auth settings
- Includes http://localhost:3000 AND http://localhost:3002

### "Cannot find module '@langchain/...'"
- Install: `npm install @langchain/openai @langchain/community @langchain/core --legacy-peer-deps`

### "Storage upload fails"
- Check bucket policies are configured (already done via SQL)
- Verify user is authenticated before upload

### "Realtime not connecting"
- Check Supabase project has Realtime enabled (default: yes)
- Verify table has Realtime enabled in Table Editor

---

## 🎯 Quick Start Commands

```powershell
# Navigate to website directory
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website

# Install LangChain packages
npm install @langchain/openai@^0.3.0 @langchain/community@^0.3.0 @langchain/core@^0.3.0 --legacy-peer-deps

# Start dev server
npm run dev

# Open browser
start http://localhost:3002
```

---

## 📋 Completion Checklist

- [ ] LangChain packages installed
- [ ] Environment variables verified
- [ ] Redirect URLs configured
- [ ] Dev server starts without errors
- [ ] Signup works
- [ ] Login works
- [ ] Protected routes work
- [ ] Storage upload works
- [ ] Realtime subscription works
- [ ] Semantic search works
- [ ] RAG chat works
- [ ] Edge Functions deployed (optional)

---

**Once all tests pass, the system is ready for production deployment!**
