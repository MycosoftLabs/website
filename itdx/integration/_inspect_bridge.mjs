import { readFileSync } from 'node:fs'

function load(p) {
  const e = {}
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    e[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return e
}

const env = load(new URL('../../.env.local', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
const gen = await fetch(url + '/auth/v1/admin/generate_link', {
  method: 'POST',
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ type: 'magiclink', email: 'morgan@mycosoft.org' }),
})
const g = await gen.json()
const ver = await fetch(url + '/auth/v1/verify', {
  method: 'POST',
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ type: 'magiclink', token_hash: g.hashed_token }),
})
const sess = await ver.json()
const ref = new URL(url).hostname.split('.')[0]
const cookie = 'sb-' + ref + '-auth-token=base64-' + Buffer.from(JSON.stringify(sess), 'utf8').toString('base64url')
const js = await (await fetch('http://localhost:3010/api/fusarium/itdx/bridge/app.js', { headers: { Cookie: cookie } })).text()
const css = await (await fetch('http://localhost:3010/api/fusarium/itdx/bridge/styles.css', { headers: { Cookie: cookie } })).text()
const bare = [...js.matchAll(/\/api\/(?!fusarium\/itdx\/bridge)/g)]
console.log('bare /api/ count', bare.length)
for (const m of bare.slice(0, 40)) {
  console.log('BARE', JSON.stringify(js.slice(Math.max(0, m.index - 40), m.index + 50)))
}
console.log('js remaining /app.js', js.includes('/app.js'))
console.log('js bridge api', (js.match(/\/api\/fusarium\/itdx\/bridge\/api/g) || []).length)
const fetches = [...js.matchAll(/\.fetch\(|fetch\(/g)]
console.log('fetch call count', fetches.length)
console.log('imports', [...js.matchAll(/from\s+["'][^"']+["']/g)].slice(0, 20).map((m) => m[0]))
const i = css.indexOf('body{')
console.log('body css', css.slice(i, i + 240))
const j = css.indexOf('.loading')
console.log('loading css', css.slice(j, j + 220))
const eg = await fetch('http://localhost:3010/api/fusarium/itdx/bridge/earth-grid.js', { headers: { Cookie: cookie } })
console.log('earth-grid', eg.status, eg.headers.get('content-type'), (await eg.text()).length)
const boot = await fetch('http://localhost:3010/api/fusarium/itdx/bridge/api/bootstrap', { headers: { Cookie: cookie } })
console.log('bootstrap', boot.status, (await boot.text()).slice(0, 180))
