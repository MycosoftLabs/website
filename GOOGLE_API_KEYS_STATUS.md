# Google API Keys Status and Configuration

## Current Configuration

### Google Maps API Key
**Location**: Multiple places
- **Dockerfile**: `ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with **no secret default** (pass at build time)
- **Environment Variable**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (set in `.env.local` / CI secrets only)
- **Usage**: `lib/google-maps-loader.ts`, map components
- **Historical leak**: plaintext key was in git history (commit `753a7bb2`); treat as compromised — rotate in GCP

**Status**: ⚠️ Rotate key in Google Cloud; never commit plaintext keys. Use `<GOOGLE_MAPS_API_KEY>` / env only.

### Google OAuth (Login)
**Location**: NextAuth configuration
- **Environment Variables Required**:
  - `GOOGLE_CLIENT_ID` - OAuth client ID
  - `GOOGLE_CLIENT_SECRET` - OAuth client secret
  - `NEXTAUTH_URL` - Callback URL (http://localhost:3000)
  - `NEXTAUTH_SECRET` - NextAuth secret key
- **Usage**: `app/api/auth/[...nextauth]/route.ts`

**Status**: ⚠️ Need to verify `.env.local` has these values

## Files Using Google APIs

### Google Maps
- `lib/google-maps-loader.ts` - Main loader
- `components/maps/spore-tracker-map.tsx`
- `components/maps/mycelium-map.tsx`
- `app/natureos/*` - Various NatureOS pages

### Google OAuth
- `app/api/auth/[...nextauth]/route.ts` - NextAuth config
- `app/api/storage/gdrive/route.ts` - Google Drive integration

## Required Actions

1. **Check `.env.local` file** (in website root):
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<GOOGLE_MAPS_API_KEY>
   GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID>
   GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>
   NEXTAUTH_URL=http://localhost:3010
   NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
   ```

2. **Verify API Keys are Valid**:
   - Google Maps: Test at `/natureos` - maps should load
   - Google OAuth: Test at `/login` - "Sign in with Google" should work

3. **Update Dockerfile** (optional):
   - Remove hardcoded key or use build arg
   - Prefer environment variables

## Setup Instructions

See:
- `docs/GOOGLE_MAPS_SETUP.md` - Maps API setup
- `docs/GOOGLE_AUTH_SETUP.md` - OAuth setup

## Testing

1. **Test Google Maps**:
   - Navigate to http://localhost:3000/natureos
   - Check if maps load (no console errors)
   - Verify satellite imagery displays

2. **Test Google Login**:
   - Navigate to http://localhost:3000/login
   - Click "Sign in with Google"
   - Should redirect to Google OAuth consent
   - After consent, should redirect back to profile
















