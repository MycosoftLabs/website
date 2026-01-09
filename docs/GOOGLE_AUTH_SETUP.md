# Google OAuth Setup for Mycosoft

## Error: "The OAuth client was not found" (401: invalid_client)

This error means the Google OAuth credentials are missing or invalid.

## Required Environment Variables

Add these to `.env.local` in the website root:

```
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=mycosoft-super-secret-key-2024
```

## Steps to Create Google OAuth Credentials

### 1. Go to Google Cloud Console
https://console.cloud.google.com/

### 2. Create or Select a Project
- Click the project dropdown at the top
- Create a new project called "Mycosoft" or select an existing one

### 3. Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. User Type: Choose **Internal** (for Google Workspace) or **External**
3. Fill in:
   - App name: `Mycosoft`
   - User support email: `morgan@mycosoft.org`
   - Developer contact email: `morgan@mycosoft.org`
4. Click **Save and Continue**
5. Skip Scopes (defaults are fine)
6. Add test users if External: `morgan@mycosoft.org`

### 4. Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Mycosoft Website`
5. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - `http://localhost:3002`
   - `https://mycosoft.org` (for production)
6. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3002/api/auth/callback/google`
   - `https://mycosoft.org/api/auth/callback/google` (for production)
7. Click **Create**

### 5. Copy Credentials
- Copy the **Client ID** (ends with `.apps.googleusercontent.com`)
- Copy the **Client Secret**

### 6. Update .env.local
```bash
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=mycosoft-super-secret-key-2024
```

### 7. Restart the Development Server
```bash
# Kill existing server and restart
npm run dev
```

## Troubleshooting

### Error: invalid_client
- The GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is wrong
- Double-check the values in `.env.local`
- Make sure there are no extra spaces or quotes

### Error: redirect_uri_mismatch
- The callback URL doesn't match what's configured in Google Cloud Console
- Add the exact redirect URI: `http://localhost:3000/api/auth/callback/google`

### Error: access_denied
- For External consent screen: User needs to be added as a test user
- For Internal: Only @mycosoft.org emails can sign in

## Quick Test

1. Restart your dev server
2. Go to http://localhost:3000/login
3. Click "Sign in with Google"
4. Select morgan@mycosoft.org
5. You should be redirected to your profile page

## Security Notes

- Never commit `.env.local` to git
- Rotate secrets regularly
- Use different credentials for production





























