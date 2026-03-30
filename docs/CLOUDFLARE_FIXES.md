# Cloudflare Dashboard Fixes

These changes must be made in the Cloudflare dashboard and cannot be implemented via code.

## 1. Enable Always Use HTTPS

HTTP requests to `http://mycosoft.com` should redirect to `https://mycosoft.com`.

**Steps:**
1. Log in to the Cloudflare dashboard
2. Select the `mycosoft.com` domain
3. Go to **SSL/TLS** > **Edge Certificates**
4. Enable **Always Use HTTPS**

Alternatively, create a Page Rule:
- URL: `http://mycosoft.com/*`
- Setting: **Always Use HTTPS**

This ensures all HTTP traffic is 301-redirected to HTTPS.

## 2. www to Apex Redirect

All requests to `www.mycosoft.com` should 301-redirect to `https://mycosoft.com`.

**Steps:**
1. Ensure DNS has a record for `www` (CNAME to `mycosoft.com` or an A record) with Cloudflare proxy enabled (orange cloud)
2. Go to **Rules** > **Redirect Rules** (or **Page Rules**)
3. Create a new redirect rule:
   - **When**: Hostname equals `www.mycosoft.com`
   - **Then**: Dynamic redirect to `https://mycosoft.com${http.request.uri.path}`
   - **Status code**: 301 (Permanent)

Or via Page Rules:
- URL: `www.mycosoft.com/*`
- Setting: **Forwarding URL** (301 Permanent Redirect)
- Destination: `https://mycosoft.com/$1`

---

## Optional: Apply via API (Mar 28, 2026)

From the website repo root, after a **valid** token is set:

```powershell
Set-Location "C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website"
python scripts/apply_cloudflare_seo_settings.py
```

**Environment (same as cache purge):** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` or `CLOUDFLARE_ZONE_ID_PRODUCTION` (mycosoft.com zone). Load from `.env.local` or `.credentials.local` (see `_cloudflare_cache.py`).

**Token permissions (custom token, zone-scoped to mycosoft.com):**

- Zone → SSL and Certificates → Edit (Always Use HTTPS)
- Zone → Config Rules → Edit, or Zone → Page Rules → Edit (redirect rulesets)

If the script returns **403 Authentication error** or verify returns **401 Invalid API Token**, the token is wrong, revoked, or truncated—create a new token in **My Profile → API Tokens** and update `.env.local` (do not commit).

**Manual dashboard steps above still work** if you prefer not to use the API.
