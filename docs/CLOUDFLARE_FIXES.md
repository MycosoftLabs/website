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
