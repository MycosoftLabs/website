# ITDX as a standalone Fusarium application

Owner direction: Cursor is adding an ITDX tab to Earth Simulator's left panel. This branch supplies the **separate ITDX application at `/fusarium/itdx`**, its full existing workbench, authenticated backend connection, shared context contract, and reusable Earth overlay. Do not duplicate Cursor's Earth left-panel work. That tab should link to this route or consume the exported replay controls.

## Runtime topology

The signed-in browser loads `/fusarium/itdx`. The existing Fusarium owner/MFA layout gates the page. Its full workbench is mounted through the same-origin `/api/fusarium/itdx/bridge/*` gateway. **Every gateway request independently calls `requireFusariumOwner()`**, including files, source previews and exports. The gateway forwards only fixed paths to a server-configured Python backend and authenticates with a server-only bearer secret. Writes additionally require same-origin JSON and the Python application's per-process request token.

The Python service executes the existing local NLM/Form Space/evidence prototypes, stores datasets, runs, notes and reviews in SQLite, and produces real computed exports. It is a separate ITDX service, not the production MINDEX database. The original desktop `launch.py` and loopback protections remain intact. `service.py` is an explicitly authenticated deployment mode, with a required random secret of at least 32 characters; do not expose its port publicly.

## Same-host development setup

Use a new v1.3 folder and a persistent data directory. Install the existing signing dependency with `python -m pip install -r requirements-optional.txt`. Generate a new random service secret using a password manager or `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Put it in the backend environment and the website's **server-only** environment; never use a NEXT_PUBLIC variable or commit the value.

Backend environment:

```dotenv
ITDX_BACKEND_TOKEN=<your-new-random-secret>
```

Website environment, when Python and Next run on the same host network:

```dotenv
ITDX_BACKEND_URL=http://127.0.0.1:8765
ITDX_BACKEND_TOKEN=<the-same-secret>
```

Start from `itdx/app/`:

```sh
python service.py --host 127.0.0.1 --port 8765 --data-dir /absolute/path/to/itdx-data
```

Restart the website after configuring its server environment. Sign in normally, complete any required MFA, and open `/fusarium/itdx`. The backend badge must report CONNECTED with its actual version and document count before the full workbench loads. NOT_CONFIGURED and UNAVAILABLE are deliberate states, not simulated success.

The website server's localhost is not the browser's localhost. In separate containers, use the backend's service name on their shared private network.

## Container option

`itdx/app/Dockerfile` builds the Python service. `itdx/integration/compose.itdx.yml` adds it to an **existing private Docker network** and persists `/data` in a named volume. It publishes no host port. Before running Compose, set:

```dotenv
ITDX_NETWORK_NAME=<actual-private-network-shared-with-website>
ITDX_EXERCISE_PACKS_DIR=<absolute-path-to-private-exercise_packs-directory>
ITDX_BACKEND_TOKEN=<your-new-random-secret>
```

Then use `docker compose -f itdx/integration/compose.itdx.yml up -d --build`. Configure the website with `ITDX_BACKEND_URL=http://itdx-backend:8765` and the same server-only token, on that same private network. The compose file deliberately requires your actual network name rather than inventing an infrastructure binding. The backend runs as UID 10001; bind-mounted data directories must be writable by that account. Keep the exercise pack readable and mounted read-only. The private PDFs are excluded from the container build context and public Git.

Back up the data volume, including its SQLite store and signing identity, according to your existing private backup process. Rotating the service bearer token requires changing both service environments. Rotating the evidence-signing identity changes verifier trust and is a separate operation. No secrets are included in this handoff.

## Full application views

The app has Algorithm lab, Walkthrough, Documents & citations, Source review & Borda, NLM / Form Space, Run & test, Evidence exports, System connections, Earth replay & portable reader, and Fusarium applications views. The embedded workbench uses the actual Python endpoints, including asynchronous jobs, imports, saved results and signed exports. It is not a screenshot or a replacement with fabricated metrics.

The connected-service settings inside the workbench retain their existing supported behaviors: NLM status/sample inference, read-only MINDEX search, MYCA status, Earth link and explicit native/local implementation disclosures. These are configured separately from the ITDX backend connection. A connected ITDX backend does not prove production NLM/MINDEX/MYCA integration. Durable source documents in service mode reside in the private backend; the optional portable JSON reader remains memory-only.

## Contract for Cursor's Earth Simulator tab

- Navigation target: `/fusarium/itdx`.
- Shared playback API: `replay` and `useReplay()` from `@/lib/itdx/replay-store`.
- The existing map mount in this branch is `<ITDXReplayLayer map={mapRef || mapNativeRef.current} />`. Mount it once per map. The component owns only `itdx-fictional-replay*` sources and layers.
- A user scrubbing the synthetic replay inside the embedded document workspace updates the shared replay index through a checked same-origin parent message. Only fixed synthetic replay index/asset IDs are accepted; no live commands are passed.
- The dedicated ITDX app and shared dock remain accessible without opening Earth. Keep Cursor's left-panel tab as an additional entry point, not the sole owner of the application.

## Contract for every other Fusarium app

The current global Fusarium catalog drives the application directory, including future catalog entries. The shared session contains references, not document bodies, tokens, arbitrary URLs or actions:

```ts
type ITDXContext = {
  schema: 'itdx-session/v1'
  sessionId: string | null
  runId: string | null
  datasetId: string | null
  documentId: string | null
  dataOrigin: string
  revision: number
}
```

React consumers use `useITDXContext()` from `@/lib/itdx/session`. A nonvisual consumer can register with `registerITDXAdapter({ appId, onContext })` and must call its returned cleanup function on unmount. Duplicate adapter IDs are rejected. Consumer callbacks receive copies and cannot replace the producer's context. Registering or receiving a reference does not authorize a data request or automatically start a job.

Example for a **read-only evidence panel** in an existing Fusarium app:

```tsx
const selection = useITDXContext()
useEffect(() => {
  if (!selection.runId) return
  const abort = new AbortController()
  fetch('/api/fusarium/itdx/bridge/api/run?id=' + encodeURIComponent(selection.runId), {
    cache: 'no-store', signal: abort.signal
  }).then(r => {
    if (!r.ok) throw new Error('ITDX evidence unavailable')
    return r.json()
  }).then(showEvidence).catch(showUnavailable)
  return () => abort.abort()
}, [selection.runId])
```

Use the corresponding fixed document/dataset endpoint for those references. Keep each app's original authorization, provenance, units and rendering logic. Preserve SYNTHETIC_TEST / SYNTHETIC_EXERCISE / imported origin labels. Do not turn a source-review confidence, Borda preference or replay coverage value into a calibrated probability.

All catalog apps have navigation and access to this context contract. **App-specific consumers are not automatically implemented by catalog membership.** Cursor must register, implement and test each needed evidence panel. The current work wires the ITDX producer, shared dock and Earth replay; do not label every Fusarium backend integrated before verifying its actual data exchange.

## Required acceptance checks

1. No-auth and non-owner/MFA-incomplete requests to the bridge must be rejected by the existing owner helper. Missing/wrong backend bearer must be rejected by Python. Wrong-origin POST or missing application request token must fail.
2. In the dedicated ITDX page, start a clean synthetic evaluation, watch its asynchronous job complete, inspect its predictions and export the signed bundle. Restart the service with the same data volume and open the saved run again.
3. Open original source previews and save a cited note through the gateway. Export and independently verify the source ZIP. URLs must stay under the authenticated bridge and source markings must remain visible.
4. Select a run, navigate among Fusarium apps, and confirm the shared dock retains its reference. In each actual consumer, confirm the evidence request returns that run and visibly fails when unavailable. Navigation alone is not a passed data-consumer test.
5. Scrub the fixed replay, open Earth, focus the demo and verify shared time/asset selection. Exercise style reload and disabling the layer. Keep the synthetic stream separate from real assets.
6. Run full repository build/CI and authenticated browser rehearsal in the receiving environment. The producer tested Python service execution and pure gateway/session logic; full production auth, WebGL rendering, container deployment and live-service connections remain receiving-machine gates.
