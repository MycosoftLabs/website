# NatureOS Devices Page – Neural Network Command Center

This folder contains a drop-in implementation of the **visual redesign** described in your “Devices Page Vision & Design Specification” (Jan 15, 2026).

It is designed for **Next.js App Router** (`app/`) and assumes a typical alias config where `@/` points to your project root (create-next-app default).

---

## 1) Install packages

Use npm / pnpm / yarn. Example (npm):

```bash
npm i framer-motion three @react-three/fiber @react-three/drei react-force-graph-2d \
  @tsparticles/react @tsparticles/slim @tsparticles/engine
```

Optional (nice-to-have):

```bash
npm i lottie-react
```

---

## 2) Fonts (Orbitron / JetBrains Mono / Inter)

Use Next.js `next/font` (recommended for performance).

In `app/layout.tsx`:

```ts
import './globals.css'

import { Inter, JetBrains_Mono, Orbitron } from 'next/font/google'

const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

Next.js automatically self-hosts fonts and optimizes them when using `next/font`. (See Next docs.)

---

## 3) Styles

Add the CSS variables + utility classes:

1) Copy `styles/devices.css` into your project (same path or adjust)
2) Import it from your global CSS:

```css
/* app/globals.css */
@import "../styles/devices.css";
```

If you’re using Tailwind, you can keep all Tailwind utility usage as-is.

---

## 4) Copy files into your project

Copy these folders into your codebase:

- `app/natureos/devices/page.tsx`
- `components/devices/*`
- `lib/devices/*`

---

## 5) Add a hero background video (optional)

Place either of these into:

- `public/videos/mycelium.mp4`
- `public/videos/mycelium.webm`

If you do nothing, the hero falls back to the CSS animated gradient.

---

## 6) Hook up real data

`lib/devices/data.ts` loads from an env var by default:

- `NATUREOS_DEVICES_ENDPOINT=http://localhost:3000/api/devices/snapshot`

Return JSON shaped like:

```ts
type DevicesSnapshot = {
  source: 'live' | 'mock'
  generatedAt: string
  devices: Array<{
    id: string
    name: string
    type: string
    status: 'online'|'offline'|'warning'|'critical'|'unknown'
    model?: string
    ip?: string
    parentId?: string
    metrics?: { latencyMs?: number; cpuPct?: number; memPct?: number; tempC?: number; humidityPct?: number }
    location?: { x?: number; y?: number }
  }>
}
```

---

## 7) Notes on performance

- The topology view uses `react-force-graph-2d` (canvas) and will handle hundreds of nodes.
- The particles layer uses the **slim** bundle; adjust particle count if you need higher FPS.
- The 3D icons are intentionally low-poly and tiny.

---

## 8) Where to customize

- Hero title / copy: `components/devices/devices-hero.tsx`
- Particle behavior: `components/devices/particle-background.tsx`
- Card UI / gestures: `components/devices/device-card.tsx`
- Topology visuals: `components/devices/network-topology.tsx`
- MycoBrain panel: `components/devices/mycobrain-panel.tsx`

