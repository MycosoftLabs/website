# MYCA Page Troubleshooting (Feb 17, 2026)

## ERR_TOO_MANY_REDIRECTS

If you see "localhost redirected you too many times" or "ERR_TOO_MANY_REDIRECTS":

1. **Clear site data for localhost**
   - Open DevTools (F12) → Application (Chrome) or Storage (Firefox)
   - Under Cookies/Storage, select `http://localhost:3010`
   - Click "Clear site data" or "Clear storage"
   - Or: Right-click refresh → "Empty cache and hard reload"

2. **Use Incognito/Private window**
   - Open `http://localhost:3010/myca` in a new Incognito window
   - No cached redirects will apply

3. **Restart dev server**
   - Stop the current server (Ctrl+C)
   - Run `npm run dev:next-only` again
   - Visit `http://localhost:3010/myca` in a fresh tab

## Page Not Loading / Blank

- Ensure dev server is running on port **3010** (not 3000)
- URL: `http://localhost:3010/myca`
- If MAS (${MAS_VM_HOST}:8001) is down, the page still loads; consciousness badge shows "Dormant", world tab shows "Failed to connect"
- Check browser console (F12 → Console) for JavaScript errors

## Integrations (MAS API)

| Integration              | API Route                              | MAS Endpoint        |
|--------------------------|----------------------------------------|---------------------|
| Consciousness status     | /api/myca/consciousness/status         | /api/myca/status    |
| World model              | /api/myca/consciousness/world          | /api/myca/world     |
| Chat / Orchestrator      | /api/mas/voice/orchestrator            | MAS orchestrator    |
| Memory                   | /api/mas/memory                        | MAS memory          |

Set `MAS_API_URL` in `.env.local` (default: `http://${MAS_VM_HOST:-localhost}:8001`). If MAS is unreachable, the page degrades gracefully.
