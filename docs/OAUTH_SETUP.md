# OAuth Provider Setup Guide

**Date:** January 17, 2026  
**Status:** ⚠️ Credentials Required

## Overview

OAuth allows users to sign in with their existing accounts (Google, GitHub, etc.) instead of creating new passwords.

## Supabase Callback URL

When configuring OAuth providers, use this callback URL:
```
https://hnevnsxnhfibhbsipqvz.supabase.co/auth/v1/callback
```

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google+ API** and **Google Identity** APIs

### Step 2: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Add authorized redirect URIs:
   ```
   https://hnevnsxnhfibhbsipqvz.supabase.co/auth/v1/callback
   ```
5. Copy the **Client ID** and **Client Secret**

### Step 3: Configure in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/hnevnsxnhfibhbsipqvz/auth/providers)
2. Click on **Google**
3. Enable the provider
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

### Step 4: Add to Environment
```bash
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```

---

## GitHub OAuth Setup

### Step 1: Create GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - **Application name:** Mycosoft
   - **Homepage URL:** https://sandbox.mycosoft.com
   - **Authorization callback URL:** 
     ```
     https://hnevnsxnhfibhbsipqvz.supabase.co/auth/v1/callback
     ```
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it

### Step 2: Configure in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/hnevnsxnhfibhbsipqvz/auth/providers)
2. Click on **GitHub**
3. Enable the provider
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

### Step 3: Add to Environment
```bash
GITHUB_OAUTH_CLIENT_ID=your_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_client_secret
```

---

## Discord OAuth Setup (Already Have Bot Token)

You already have a Discord bot token. To enable Discord login:

### Step 1: Create Discord OAuth App
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your existing application (Bot ID: `1450212628117979227`)
3. Go to **OAuth2** → **General**
4. Add redirect URL:
   ```
   https://hnevnsxnhfibhbsipqvz.supabase.co/auth/v1/callback
   ```
5. Copy **Client ID** and **Client Secret**

### Step 2: Configure in Supabase
1. Go to Supabase Dashboard → Auth → Providers → Discord
2. Enable and paste credentials
3. Save

---

## Testing OAuth

After configuration, test at:
```
https://sandbox.mycosoft.com/login
```

Or programmatically:
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Google Sign-in
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://sandbox.mycosoft.com/auth/callback'
  }
})

// GitHub Sign-in
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: 'https://sandbox.mycosoft.com/auth/callback'
  }
})
```

---

## Redirect URLs Configured

The following redirect URLs are already configured in Supabase:

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/auth/callback` | Local dev (port 3000) |
| `http://localhost:3002/auth/callback` | Local dev (port 3002) |
| `https://mycosoft.com/auth/callback` | Production |
| `https://sandbox.mycosoft.com/auth/callback` | Sandbox |

---

## Quick Checklist

- [ ] Create Google OAuth credentials
- [ ] Add Google credentials to Supabase
- [ ] Create GitHub OAuth App
- [ ] Add GitHub credentials to Supabase
- [ ] (Optional) Configure Discord OAuth
- [ ] Test login at sandbox.mycosoft.com/login
