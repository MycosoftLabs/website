# CREP: Where Planes, Boats, and Satellites Come From (and Why They May Be Missing)

**Date**: February 12, 2026

## Where they come from

| Layer    | Source           | API route                         | Rendered by              |
|----------|------------------|-----------------------------------|--------------------------|
| Planes   | FlightRadar24    | `GET /api/oei/flightradar24`      | deck.gl EntityDeckLayer  |
| Boats    | AISStream        | `GET /api/oei/aisstream`          | deck.gl EntityDeckLayer  |
| Satellites | CelesTrak      | `GET /api/oei/satellites?category=...` | deck.gl EntityDeckLayer  |

- **CREP dashboard** fetches aircraft, vessels, and satellites when **LIVE** (streaming) is on; they are merged into `deckEntities` and drawn only by **EntityDeckLayer** (no separate MapLibre markers).
- **Header counts**: The CREP header now shows **Planes: N | Boats: M | Sats: K**. When N, M, or K are **0**, that source is “not there” on the map.

## Why they might not be there (0)

1. **Planes (FlightRadar24)**  
   - Requires FlightRadar24 API access (data-cloud.flightradar24.com).  
   - If the connector is not configured or the request fails, the route returns 500 and the dashboard gets no aircraft.  
   - **Result**: Planes: 0.

2. **Boats (AISStream)**  
   - Uses cached vessel data from the AISStream WebSocket.  
   - If the cache is empty, the route falls back to **sample vessels** (see `getSampleVessels()` in `lib/oei/connectors/aisstream-ships.ts`).  
   - If sample data is not used or the fallback fails, **Result**: Boats: 0.

3. **Satellites (CelesTrak)**  
   - Fetches TLE/positions from CelesTrak; has an 8s timeout.  
   - On error or timeout, the route returns 200 with `satellites: []`.  
   - **Result**: Sats: 0.

## How to test and show they are not there

1. **In the UI**  
   - Open CREP dashboard, turn **LIVE** on.  
   - Check the header: **Planes: 0 | Boats: 0 | Sats: 0** means none of the three sources are returning data.

2. **Script**  
   - With the dev server running (`npm run dev:next-only`):  
     `node scripts/test-oei-apis.js`  
   - With production:  
     `BASE_URL=https://sandbox.mycosoft.com node scripts/test-oei-apis.js`  
   - The script calls the three APIs and prints counts and status; all zero confirms planes, boats, and satellites are not there.

## Files

- **CREP client**: `app/dashboard/crep/CREPDashboardClient.tsx` (fetch logic, `deckEntities`, header counts).
- **Deck layer**: `components/crep/layers/deck-entity-layer.tsx` (draws aircraft, vessel, satellite, fungal).
- **APIs**: `app/api/oei/flightradar24/route.ts`, `app/api/oei/aisstream/route.ts`, `app/api/oei/satellites/route.ts`.
- **Test script**: `scripts/test-oei-apis.js`.
