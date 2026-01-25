# Deployment Guide - January 25, 2026

**Status**: Ready for Manual Deployment  
**Commit**: `23b7f3f` (Website), `8e308d6` (MAS)

---

## Changes Deployed

### Bug Fixes
1. **Header dropdown z-index** - Dropdowns now appear above all page headers
2. **MINDEX observation ID fix** - Fixed `TypeError: obs.id.slice is not a function`
3. **Defensive ID handling** - All `.id.slice()` calls now use `String()` wrapper

### New Files
- `docs/SESSION_SUMMARY_JAN25_2026.md` - Session documentation
- `scripts/deploy-dual-vm.ps1` - Dual VM deployment script

---

## Manual Deployment Steps

### Step 1: SSH to Sandbox VM
```powershell
ssh mycosoft@192.168.0.187
```
Password: [use your credentials]

### Step 2: Pull Latest Code
```bash
cd /opt/mycosoft/website
git fetch origin
git reset --hard origin/main
```

### Step 3: Rebuild Docker Container
```bash
docker build -t website-website:latest --no-cache .
```

### Step 4: Restart Container
```bash
docker compose -p mycosoft-production up -d mycosoft-website
```

### Step 5: Verify Health
```bash
docker logs mycosoft-website --tail 50
curl -s http://localhost:3000/api/health
```

---

## Post-Deployment: Cloudflare Cache Purge

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select the `mycosoft.com` zone
3. Navigate to **Caching** > **Configuration**
4. Click **Purge Everything**

---

## Verification Checklist

After deployment, verify on https://sandbox.mycosoft.com:

- [ ] Homepage loads without errors
- [ ] Header dropdowns appear correctly on all pages
- [ ] NatureOS pages - dropdowns visible above search bar
- [ ] Security pages - dropdowns visible above SOC header
- [ ] MINDEX dashboard loads without JavaScript errors
- [ ] Check browser console (F12) for any errors
- [ ] Innovation apps accessible at /apps

---

## Quick Test Commands

```powershell
# Test main pages
curl -sf https://sandbox.mycosoft.com | Select-String "Mycosoft"
curl -sf https://sandbox.mycosoft.com/mindex | Select-String "MINDEX"
curl -sf https://sandbox.mycosoft.com/security | Select-String "Security"

# Check API health
curl -sf https://sandbox.mycosoft.com/api/health
```

---

## Rollback (if needed)

```bash
# SSH to sandbox VM
ssh mycosoft@192.168.0.187

# Rollback to previous commit
cd /opt/mycosoft/website
git reset --hard HEAD~1
docker build -t website-website:latest --no-cache .
docker compose -p mycosoft-production up -d mycosoft-website
```

---

## Commits Deployed

### Website Repository
- **Commit**: `23b7f3f`
- **Message**: Fix: header dropdown z-index, observation ID type errors, add deployment scripts
- **Files**: 8 files changed, 451 insertions, 6 deletions

### MAS Repository  
- **Commit**: `8e308d6`
- **Message**: Add innovation apps docs, MINDEX scripts, update master index
- **Files**: 20 files changed, 8091 insertions, 869 deletions

---

*Document Generated: January 25, 2026*
