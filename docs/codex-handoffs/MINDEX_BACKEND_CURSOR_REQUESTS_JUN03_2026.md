# MINDEX Backend Requests for Cursor - Living Handoff

**Created:** June 3, 2026  
**Status:** Draft backlog. Keep adding findings here before handing to Cursor.  
**Frontend surface:** `http://localhost:3010/natureos/mindex`  
**Production target:** `https://mycosoft.com/natureos/mindex`  
**Do not hand over yet:** User is still auditing tabs and adding backend requests.

## Current Constraints

- Do not use mock data or iNaturalist fallback stats to hide missing MINDEX rows.
- Do not use fake visualizations. Library previews should come from parsed numeric sensor data, decoded media, or real backend preview artifacts; raw file bytes are not acceptable as waveform, heatmap, or spectrum data.
- Website dev server `3010` is shared with another Codex agent working on Earth Simulator. Do not restart or kill that process from this thread.
- Frontend work is local only until user explicitly asks for staging, commit, deploy, or Cloudflare purge.
- Backend truth should come from MINDEX VM `192.168.0.189` and its live API/BFF routes.

## Verified Frontend/BFF Context

These values were observed from the local website BFF on June 3, 2026:

| Route | Current result |
| --- | --- |
| `GET /api/natureos/mindex/stats` | `10,164` taxon rows, `823,972` observations, `747,343` observations with images |
| `GET /api/natureos/mindex/console` | NAS mounted, 17 ETL jobs registered, image coverage available |
| `GET /api/natureos/mindex/sync` | 17 ETL jobs visible |
| `GET /api/mindex/health/all` | `taxon=10,164`; genome, taxon compounds, ledger anchors, telemetry devices are `null` there |
| `GET /api/natureos/mindex/compounds?limit=5` | Empty fallback result |
| `GET /api/natureos/mindex/genomes?limit=5` | Demo data response, not real MINDEX data |

Current MINDEX console details:

| Field | Value |
| --- | ---: |
| `core.taxon` | `10,164` |
| `core.observation` | `823,972` |
| `core.taxon_external_id` | `10,000` |
| `bio.genome` | `0` |
| `bio.genetic_sequence` | `0` |
| `taxon_compound` | `0` |
| `genome_records` | `0` |
| `trait_records` | `0` |
| `synonym_records` | `0` |
| `taxa_with_images` | `9,998` |
| `taxa_without_images` | `166` |
| `image coverage` | `98.37%` |

## Request 001 - Biological Data and ETL Source Ingestion

**Owner requested:** Fix the missing biological data and source coverage. MINDEX is supposed to expose genome records, trait records, synonyms, taxon compounds, taxon images, observation media, GenBank data, PubChem data, ChemSpider data, FungiDB data, MycoBank data, GBIF data, and the other registered ETL sources.

### User-Facing Problem

The Overview tab previously made it look like biological data and data sources were missing because the frontend only displayed a small count set. After frontend correction, the UI now shows the real split:

- Images are not missing: `9,998` taxa have images, `166` taxa are missing images, and `747,343` observations have media.
- Observations are present: `823,972` total observations, all currently geolocated.
- Registered ETL sources are visible: iNaturalist, GBIF, MycoBank, GenBank, FungiDB, PubChem, ChemSpider, Mushroom.World, Mushroom.World + Wikipedia, iNat/GBIF/Wikipedia media, PubMed/GBIF/SemanticScholar, TheYeasts.org, Fusarium.org, MINDEX ancestry enrichment, Civic/Government.
- But the backend target tables for genomes, genetic sequences, traits, synonyms, and compounds are still empty.

### Backend Request for Cursor

Please fix the MINDEX backend ingestion and reporting for these registered ETL sources:

| Source/job | Expected backend outcome |
| --- | --- |
| `genetics` / GenBank | Populate `bio.genetic_sequence`; expose nonzero genetic sequence counts in `/api/mindex/stats`, `/api/mindex/console`, and relevant species detail routes |
| `fungidb` / FungiDB | Populate real genome metadata; expose nonzero genome counts without demo fallback |
| `mycobank` / MycoBank | Populate taxon synonyms and nomenclature joins; expose nonzero synonym counts |
| `traits` / Mushroom.World + Wikipedia | Populate taxon trait records; expose nonzero trait counts |
| `pubchem` / PubChem | Populate compound and molecular metadata; expose nonzero compound counts |
| `chemspider` / ChemSpider | Populate compound cross-references and taxon-compound links |
| `gbif` / GBIF | Populate occurrence records beyond iNaturalist-only source counts where available |
| `hq_media` and `taxon_photos` | Keep image coverage reporting accurate and ensure species detail/Encyclopedia can render taxon image profiles |

### API Expectations

Update or verify these endpoints so the frontend can trust them:

- `GET /api/mindex/stats`
  - Must include nonzero counts when backend tables are populated:
    - `genome_records`
    - `trait_records`
    - `synonym_records`
    - `total_external_ids`
    - `taxa_by_source`
    - `observations_by_source`
    - any compound/genetic counts if available
- `GET /api/mindex/console`
  - Must include `etl.core_counts` for:
    - `taxon`
    - `observation`
    - `taxon_external_id`
    - `genome`
    - `genetic_sequence`
    - `taxon_compound`
    - synonym and trait table counts if the tables exist
  - Must include accurate image coverage:
    - `images.total_taxa`
    - `images.taxa_with_images`
    - `images.taxa_without_images`
    - `images.coverage_percent`
- `GET /api/mindex/etl-status`
  - Must keep all 17 jobs visible and ideally expose recent run status, last success, last failure, and rows written per job.
- `GET /api/mindex/compounds`
  - Should return real MINDEX compounds or an explicit backend blocker, not a silent empty fallback.
- `GET /api/mindex/genomes`
  - Should return real MINDEX genome records. Website route currently falls back to demo data when the real API is not wired.
- Species detail / Encyclopedia routes
  - Must support real all-life species profiles with images, taxonomy, genetics, chemistry, traits, observations, and external IDs.

### Acceptance Criteria

- Running the registered ETL jobs results in nonzero backend table counts where source data exists.
- `/api/mindex/console` and `/api/mindex/stats` agree on core biological counts.
- Website Overview Biological Data panel no longer shows `registered, empty` for GenBank/FungiDB/MycoBank/PubChem/ChemSpider once jobs have ingested.
- Website Data Sources panel shows loaded rows for GBIF, GenBank, PubChem, ChemSpider, MycoBank, FungiDB, traits, and media jobs where data exists.
- `/api/natureos/mindex/genomes?limit=5` no longer returns `source: "demo"` when MINDEX is configured.
- `/api/natureos/mindex/compounds?limit=5` no longer returns empty fallback if PubChem/ChemSpider data has been ingested.

### Notes for Cursor

- This is not a request to fake numbers on the frontend. The frontend has been adjusted to reveal what is loaded versus what is merely registered.
- The frontend currently labels empty registered backends as `registered, empty` so the backend gap is visible.
- Keep all-life mode in mind. The user does not want fungi-only behavior after the switch to all species.

## Running Backend Request Queue

Add future backend requests below this line as the tab audit continues.

### Request 002 - Encyclopedia Taxonomy/Profile Backend Repair

**Owner requested:** Fix the Encyclopedia. It currently says:

> All-life taxonomy profiles are not available from MINDEX yet.
>
> MINDEX all-life taxa view is unavailable. This usually means the backend bio.taxon_full view or all-life migration needs repair.
>
> Live observations are still flowing below. They prove the biology feed is alive, but the taxon/profile join needs the backend `bio.taxon_full` or raw `core.taxon` fallback repaired before species pages can render.

#### Verified Failure

The frontend Encyclopedia tab depends on the website BFF route:

- `GET /api/natureos/mindex/taxa?limit=50`
- `GET /api/natureos/mindex/taxa?q=<query>&limit=50`
- single profile/details through `GET /api/natureos/mindex/taxa/{id}` and related species detail routes

The BFF proxies MINDEX:

- `GET http://192.168.0.189:8000/api/mindex/taxa?limit=5&offset=0`
- `GET http://192.168.0.189:8000/api/mindex/taxa?limit=5&offset=0&q=amanita`

Both currently return HTTP 500 through the website BFF:

```json
{
  "data": [],
  "total": 0,
  "limit": 5,
  "offset": 0,
  "has_more": false,
  "error": "MINDEX API returned HTTP 500",
  "message": "MINDEX all-life taxa view is unavailable. This usually means the backend bio.taxon_full view or all-life migration needs repair."
}
```

Meanwhile, observations prove the biology stream is alive:

- `GET /api/natureos/mindex/observations?limit=2` returns HTTP 200.
- Rows include live `inat` observations, location, media images, observer, source id, and source URI.
- Current observation rows have `taxon_id: null`, so they cannot join back to a taxon/profile page even though observation data exists.

#### Backend Request for Cursor

Repair the MINDEX taxonomy/profile backend so Encyclopedia can render all-life species profiles.

Required fixes:

1. Fix `GET /api/mindex/taxa`
   - Must return HTTP 200 for default list queries.
   - Must return rows from `bio.taxon_full` if that view is healthy.
   - If `bio.taxon_full` is missing or broken, fall back to raw `core.taxon` plus available joins instead of HTTP 500.
   - Must support `limit`, `offset`, `q`, `source`, `rank`, `kingdom`, `lineage_contains`, `order_by`, and `order`.

2. Fix all-life search/filter behavior
   - `q=amanita`, common names, canonical names, and synonyms should search.
   - Kingdom/domain filters should work for fungi, plants, animals, bacteria, archaea, and all-life/unclassified rows.
   - Do not regress into fungi-only behavior.

3. Fix taxon/profile join fields
   - Returned list rows should include:
     - `id`
     - `canonical_name`
     - `rank`
     - `kingdom`
     - `lineage`
     - `lineage_ids`
     - `common_name`
     - `authority`
     - `description`
     - `source`
     - `external_ids`
     - `obs_count`
     - `image_count`
     - `video_count`
     - `audio_count`
     - `genome_count`
     - `compound_link_count`
     - `interaction_count`
     - `publication_count`
     - `characteristic_count`
     - `metadata`
     - `created_at`
     - `updated_at`

4. Fix `GET /api/mindex/taxa/{id}`
   - Must return a full profile for the selected taxon.
   - Must include images/default photo, observations, external ids, lineage, genetics, compounds, traits, synonyms, publications, and integrity/provenance fields as available.
   - Should use the same all-life taxonomy source as the list endpoint.

5. Repair observation-to-taxon linking
   - Current observation rows are flowing but `taxon_id` is null.
   - Backfill or repair joins from iNaturalist/GBIF source taxon identifiers into `core.taxon`.
   - Observation rows should carry usable `taxon_id` where a matching taxon exists.
   - Species profile pages should be able to show related observations and media.

6. Expose a backend health/audit signal
   - Add a clear diagnostic in `/api/mindex/console` or `/api/mindex/etl-status` for:
     - whether `bio.taxon_full` exists
     - whether `core.taxon` fallback is active
     - count of taxa with `kingdom`
     - count of observations with non-null `taxon_id`
     - count of taxa with images/default photos
     - last all-life taxonomy migration/run status

#### Acceptance Criteria

- `GET /api/natureos/mindex/taxa?limit=5` returns HTTP 200 with real taxon rows.
- `GET /api/natureos/mindex/taxa?q=amanita&limit=5` returns HTTP 200 with matching real taxon rows.
- Encyclopedia no longer shows the all-life unavailable warning.
- Encyclopedia species cards render names, rank, kingdom, source, images, and counts.
- Selecting a species opens a real profile instead of a blank/detail failure.
- Live observation cards can link back to taxon profiles because `taxon_id` is populated where possible.
- Ancestry species pages should use the same repaired profile backend, so fixing this should also unblock the related Ancestry app issue.

#### Notes for Cursor

- Do not solve this by adding website mock taxa.
- Do not hide the 500 with demo data.
- The frontend intentionally shows observations as fallback proof that the biology feed is alive. The real fix is backend taxonomy/profile repair.
- This is probably the same root issue as the Ancestry app break after switching from fungi-only to all species.

### Request 003 - ETL Scheduler Interval Policy

**Owner requested:** Do not leave registered MINDEX ETL jobs on 168-hour intervals. That is too long. Every registered job should check at least daily unless there is a very specific reason to run more frequently. High-change biology, media, observations, and ancestry enrichment should run much more often.

#### Verified Current Intervals

`GET /api/natureos/mindex/sync` currently reports:

| Job | Source | Current interval |
| --- | --- | ---: |
| `inat_taxa` | iNaturalist | `24h` |
| `mycobank` | MycoBank | `168h` |
| `theyeasts` | TheYeasts.org | `null` |
| `fusarium` | Fusarium.org | `null` |
| `mushroom_world` | Mushroom.World | `null` |
| `fungidb` | FungiDB | `168h` |
| `traits` | Mushroom.World + Wikipedia | `168h` |
| `inat_obs` | iNaturalist | `0.083333h` (~5 min) |
| `gbif` | GBIF | `24h` |
| `hq_media` | iNat/GBIF/Wikipedia | `12h` |
| `publications` | PubMed/GBIF/SemanticScholar | `48h` |
| `chemspider` | ChemSpider | `168h` |
| `pubchem` | PubChem | `168h` |
| `genetics` | GenBank | `168h` |
| `taxon_photos` | iNaturalist | `24h` |
| `ancestry` | MINDEX | `168h` |
| `civic_viewport` | Civic/Government | `168h` |

#### Desired Scheduler Policy

- No registered ETL job should remain at `168h`.
- No registered ETL job should be `null` / unscheduled unless it is explicitly disabled in a separate `enabled=false` field with a reason.
- Every job should check at least daily (`<=24h`) unless the user explicitly accepts a longer interval.
- High-change observation/media/profile completion data should check hourly or faster.
- Publications can stay slower (`48h`) because publication feeds do not need minute-level updates.
- Civic/government viewport data can be `48h`; election data can be handled by targeted jobs if needed.

#### Requested New Intervals

| Job | Source | Requested interval | Reason |
| --- | --- | ---: | --- |
| `inat_taxa` | iNaturalist | `24h` | Taxonomy changes less often; daily check is enough |
| `mycobank` | MycoBank | `24h` | No 168h; taxonomy/synonyms should refresh daily |
| `theyeasts` | TheYeasts.org | `24h` | No null unscheduled jobs |
| `fusarium` | Fusarium.org | `24h` | No null unscheduled jobs |
| `mushroom_world` | Mushroom.World | `24h` | No null unscheduled jobs |
| `fungidb` | FungiDB | `24h` | Genome metadata should refresh daily, not weekly |
| `traits` | Mushroom.World + Wikipedia | `24h` | Trait backfill should refresh daily |
| `inat_obs` | iNaturalist | keep `0.083333h` or set `<=1h` | Current fast observation ingest is good; do not slow it to daily |
| `gbif` | GBIF | `24h` or `<=24h` | Daily occurrence refresh |
| `hq_media` | iNat/GBIF/Wikipedia | `12h` | User said 12h is probably okay |
| `publications` | PubMed/GBIF/SemanticScholar | `48h` | User said 48h is okay for publications |
| `chemspider` | ChemSpider | `24h` | Compound data should be daily, not weekly |
| `pubchem` | PubChem | `24h` | Compound/molecular data should be daily, not weekly |
| `genetics` | GenBank | `24h` | Genetic data should refresh daily, not weekly |
| `taxon_photos` | iNaturalist | `<=24h` | Daily is okay; can be faster if image gaps remain |
| `ancestry` | MINDEX | `1h` | User specifically wants hourly; new biology data should continuously complete profiles |
| `civic_viewport` | Civic/Government | `48h` | Civic data does not change constantly; election-specific updates can be separate |

#### Backend Request for Cursor

Update the MINDEX scheduler/job registry so interval metadata and actual scheduler behavior match the requested policy.

Implementation expectations:

- Update the canonical job registry used by `/api/mindex/etl-status`.
- Update the actual scheduler loop so it honors the new intervals.
- Ensure `null` intervals are either scheduled or explicitly marked disabled with a reason.
- Add per-job `last_started_at`, `last_completed_at`, `last_status`, `last_rows_written`, and `next_run_at` if possible.
- Make `/api/mindex/etl-status` expose the effective schedule, not stale hard-coded interval metadata.
- After deploy, restart the ETL scheduler/container/process so new intervals are active.

#### Acceptance Criteria

- `GET /api/natureos/mindex/sync` no longer shows any `168` hour intervals.
- `GET /api/natureos/mindex/sync` no longer shows `null` intervals for active registered jobs.
- `ancestry` reports `interval_hours: 1`.
- `pubchem`, `chemspider`, `genetics`, `fungidb`, `mycobank`, and `traits` report `interval_hours: 24`.
- `civic_viewport` reports `interval_hours: 48`.
- `inat_obs` remains fast (`<=1h`), and ideally stays at its current ~5-minute cadence if the backend can handle it.
- Scheduler actually queues/runs according to these intervals, not just the API metadata.

### Request 004 - Mycorrhizae Publish Key Must Be Server-Side Only

**Owner requested:** The Live Data Flow and Live SQL / JSON Monitor should never ask the user to paste a Mycorrhizae publish key. The key must be permanently configured server-side, and the frontend should not expose, store, or request it.

#### Verified Failure

The website MINDEX widgets previously rendered `MYCORRHIZAE_PUBLISH_KEY` input fields and stored the pasted value in `localStorage` under `mindex:publishKey`.

Affected frontend components:

- `components/mindex/data-flow.tsx`
- `components/mindex/query-monitor.tsx`
- `components/mindex/crypto-monitor.tsx`
- `components/mindex/agent-activity.tsx`

Affected publish routes:

- `POST /api/mindex/stream/publish`
- `POST /api/mindex/agents/insights/publish`

#### Frontend Change Made Locally

- Removed every MINDEX frontend publish-key input.
- Removed every browser-side `x-mycorrhizae-key` send.
- Removed `localStorage` reads/writes for `mindex:publishKey`.
- Added a server-side publisher auth helper so dashboard calls use existing company/local-dev auth, while server-to-server callers can still use `x-mycorrhizae-key` for compatibility.

#### Backend / Config Request for Cursor

Please make the Mycorrhizae publish key a permanent server-side configuration across the MINDEX + website deployment stack:

1. Set secrets in the correct server environments
   - `MYCORRHIZAE_PUBLISH_KEY`
   - `MYCORRHIZAE_ADMIN_KEY`
   - Any Mycorrhizae API service-side equivalent required by VM `187` / Mycorrhizae Protocol.

2. Verify deployment targets
   - Website local `.env.local` if needed for dev.
   - Sandbox VM `187`.
   - Production website environment.
   - Mycorrhizae Protocol service / broker environment if separate.

3. Do not expose secrets to the browser
   - No UI input field for this key.
   - No JSON API response that returns this key to the dashboard.
   - No `localStorage`, query param, or client header requirement for this key.

4. Keep backend/server compatibility
   - Server-to-server publishers may continue sending `x-mycorrhizae-key`.
   - Browser dashboard publishers should authenticate with company session/local-dev session and let the server enforce publishing rights.

#### Acceptance Criteria

- Live Data Flow no longer displays a publish key field.
- Live SQL / JSON Monitor no longer displays a publish key field.
- Crypto monitor and Agent Activity no longer display publish key fields.
- Starting a demo stream from the dashboard does not require the user to find or paste any secret.
- `POST /api/mindex/stream/publish` does not return `requiredHeader: "x-mycorrhizae-key"` for authenticated dashboard users.
- Public unauthenticated callers still cannot publish to MINDEX/Mycorrhizae streams.
- Secrets remain server-only in deployment env vars or the proper secret manager.

#### Notes for Cursor

- This is a config/security issue, not a UI issue.
- The dashboard should treat the publish action like an internal company tool, not like a developer manually providing a raw protocol secret.
- If the Mycorrhizae service itself needs a publish key, the website server should inject it server-to-server; the browser should never participate in that secret exchange.

### Request 005 - Integrity Verification, Ledger Rails, and Platform One Integration

**Owner requested:** Make the full Integrity + Ledger verification system real. This includes local Bitcoin via Umbrel, Solana via QuickNode or another dedicated/free RPC option, Hypergraph/DAG, Platform One, Iron Bank, PartyBus, hash-chain verification, anchor proofs, wallet/balance rails, and live terminal-style status. Do not put credentials, local file names, VM environment details, RPC URLs, private keys, or secret setup instructions in the UI.

#### Verified Current Failures

Observed from `http://localhost:3010` on June 3, 2026:

| Route | Current result |
| --- | --- |
| `GET /api/mindex/integrity/summary` | HTTP 200, but `taxon.hashed=null`, `genome.hashed=null`, `taxon_compound.hashed=null`, `anchors_total=null` |
| `GET /api/mindex/integrity/anchors/recent?limit=5` | HTTP 500 `Internal Server Error` |
| `GET /api/natureos/mindex/ledger` | HTTP 503; Hypergraph, Solana, Bitcoin all disconnected; fallback body says status offline |
| `GET /api/mindex/ledger/wallet/balances` | HTTP 200 but only partial config booleans; Solana token mint is known, but Solana/Bitcoin/Platform One/Hypergraph are not connected |

Current UI blockers:

- Integrity `Chain / wallet rail` was showing raw JSON and frontend config/credential language. Codex removed that locally and replaced it with a terminal-style status rail.
- Ledger status cards were showing env/setup language in the UI. Codex removed that locally.
- Hash Chain Visualizer depends on `GET /api/mindex/integrity/record/{id}` and cannot render anything useful until backend records and recent record discovery are available.
- Anchor tail cannot populate until `/api/mindex/integrity/anchors/recent` and `/api/mindex/integrity/stream` are healthy.

#### External References

Use these as implementation references, not as UI text:

- Umbrel Bitcoin Node: https://apps.umbrel.com/app/bitcoin
  - Umbrel’s Bitcoin Node app runs Bitcoin Core and supports advanced node settings.
- Bitcoin Core JSON-RPC: https://github.com/bitcoin/bitcoin/blob/master/doc/JSON-RPC-interface.md
  - `bitcoind` exposes JSON-RPC; `/` and `/wallet/<walletname>/` are separate endpoints.
- Solana RPC docs: https://solana.com/docs/rpc
  - Solana RPC is used to read state, send transactions, simulate execution, and subscribe to live updates.
- Solana public endpoint limits: https://solana.com/docs/references/clusters
  - Public endpoints are shared/rate-limited and not intended for production.
- Constellation Hypergraph APIs: https://docs.constellationnetwork.io/network-apis/api-reference/hypergraph-apis
  - Hypergraph public HTTP APIs exist for Global L0 and DAG L1.
- Constellation local metagraph development: https://docs.constellationnetwork.io/metagraph-development/elements/development-environment
  - Local metagraph development can run in Docker, but it is resource-heavy.
- Constellation metagraph intro: https://docs.constellationnetwork.io/network-fundamentals/metagraphs/introduction
  - Metagraphs are independent application-specific networks that anchor final results to Hypergraph / Global L0.
- Platform One offerings: https://p1docs.dso.mil/p1/products-services-teams
  - Iron Bank is the assessed container repository; Party Bus is managed DevSecOps PaaS.

#### Backend Request for Cursor

Build the MINDEX integrity verification stack as server-side infrastructure. The website should only render status, proofs, anchors, and verification results.

##### 1. Bitcoin / Umbrel Rail

Set up Bitcoin on the local network using Umbrel:

- Install and sync Umbrel Bitcoin Node on the chosen local machine.
- Confirm Bitcoin Core is fully synced before enabling write/anchor flows.
- Configure JSON-RPC access for MINDEX only.
- Restrict RPC to the local network and ideally to MINDEX VM `192.168.0.189` / the website sandbox host that needs it.
- Do not expose Bitcoin RPC publicly.
- Support both node-level RPC and wallet-level RPC paths because Bitcoin Core has `/` and `/wallet/<walletname>/` endpoints.
- Add backend health checks:
  - `getblockcount`
  - `getnetworkinfo`
  - mempool size
  - fee estimate
  - wallet loaded / ordinals rail ready
- Add backend anchor modes:
  - OP_RETURN for compact hash anchors.
  - Ordinals inscription flow if the Ordinals service/wallet is installed and configured.
- Ensure all credentials stay server-side only. Never return RPC URLs, RPC usernames, wallet names, private keys, or secret paths in website JSON.

Expected MINDEX backend config names may include:

- `BITCOIN_RPC_URL`
- `BITCOIN_RPC_USER`
- `BITCOIN_RPC_PASSWORD`
- `BITCOIN_RPC_COOKIE_FILE`
- `BITCOIN_RPC_WALLET`
- `BTC_ORDINALS_ENABLED`
- `BTC_ORDINALS_API_URL`
- `BTC_ORDINALS_WALLET`

These names are for backend setup only. Do not surface them in frontend copy.

##### 2. Solana / MYCA Rail

We probably should not run a local Solana mainnet node for this dashboard. Use a dedicated Solana RPC provider for production/sandbox anchoring, and use public Devnet only for test/dev if needed.

Required backend work:

- Re-enable QuickNode if already available, or evaluate a current free/dedicated option such as Helius, Alchemy, Triton, or another provider.
- Use provider abstraction so `SOLANA_RPC_URL` can be switched without frontend changes.
- Health check:
  - `getHealth`
  - `getSlot`
  - `getBlockHeight`
  - `getTokenSupply` for MYCA token mint
  - fee estimate for memo/hash anchor transaction
- Anchor mode:
  - Solana Memo Program hash anchor for MINDEX record batches.
  - Return transaction signature, slot, block time, fee, and explorer URL metadata.
- Ensure the MYCA mint address and signer are configured server-side and redacted in frontend responses unless the field is explicitly public.

Expected backend config names may include:

- `SOLANA_RPC_URL`
- `SOLANA_CLUSTER`
- `MYCA_SOLANA_MINT`
- `SOLANA_SIGNER_SECRET`
- `SOLANA_MEMO_PROGRAM_ID`

##### 3. Hypergraph / DAG Rail

Figure out the correct Hypergraph path:

- Option A: Use public Constellation Hypergraph / DAG L1 APIs for read + transaction status.
- Option B: Run a local Constellation Euclid/metagraph development environment for local testing.
- Option C: If full local Hypergraph validation is not practical, run a MINDEX metagraph relay locally and anchor final state to the public Hypergraph API.

Required backend work:

- Add a server-side Hypergraph client that can report:
  - Global L0 reachability
  - DAG L1 reachability
  - cluster info
  - latest snapshot / snapshot height
  - submitted MINDEX anchor status
  - metagraph ID / network mode, redacted as needed
- Add a MINDEX metagraph anchor format:
  - batch id
  - Merkle root
  - first/last record ids
  - content hash
  - timestamp
  - signer public key
  - source table/domain
- Add `hypergraph` result records into `ledger.anchor`.

Expected backend config names may include:

- `HYPERGRAPH_API_URL`
- `DAG_L1_API_URL`
- `HYPERGRAPH_NODE_URL`
- `HYPERGRAPH_METAGRAPH_ID`
- `HYPERGRAPH_SIGNER_SECRET`

##### 4. Platform One / Iron Bank / PartyBus Rail

Wire the Platform One integration as a real backend connector, not a static card.

Required backend work:

- Inspect existing website code under `lib/security/platform-one/iron-bank-client.ts`.
- Decide whether that code belongs in website only, MINDEX backend, or a shared package.
- Add MINDEX backend routes for Platform One status and correlation:
  - Iron Bank image / container assessment lookup.
  - PartyBus / CtF readiness or deployment correlation.
  - Big Bang / deployment status if available.
  - P1PS only if relevant to notifications.
- Add the Platform One correlation into ledger/integrity records:
  - container image digest
  - Iron Bank approval state
  - deployment/package id
  - artifact hash
  - associated MINDEX anchor id
  - compliance / ATO state if available
- No Platform One tokens or internal URLs should ever appear in the website UI.

Expected backend config names may include:

- `P1_BASE_URL`
- `P1_API_TOKEN`
- `IRON_BANK_API_URL`
- `IRON_BANK_API_TOKEN`
- `PARTYBUS_API_URL`
- `PARTYBUS_API_TOKEN`

##### 5. Integrity Records, Hash Chain, Merkle Proofs

Repair the core integrity database so verification works without manual guessing.

Required backend endpoints:

- `GET /api/mindex/integrity/summary`
  - Must return non-null totals and hashed counts for all supported domains.
- `GET /api/mindex/integrity/anchors/recent?limit=...`
  - Must return recent anchors instead of 500.
- `GET /api/mindex/integrity/stream`
  - Must stream new anchor events and status ticks.
- `GET /api/mindex/integrity/records/{id}`
  - Must return the full canonical `MINDEXRecord` needed by the Hash Chain Visualizer:
    - `record_id`
    - `data_hash`
    - `prev_hash`
    - `signature`
    - `timestamp`
    - `payload`
    - `public_key`
    - optional `device_id`, `user_id`, `entity_type`, `entity_id`
- `GET /api/mindex/integrity/records/recent?limit=...`
  - Add this so the frontend can auto-load latest verifiable records instead of asking the user to paste ids.
- `GET /api/mindex/integrity/days/{date}/leaves`
  - Must return Merkle leaves and root for proof generation.
- `GET /api/mindex/integrity/proof/{id}`
  - Must return Merkle proof steps, root, leaf, date, and verification metadata.
- `GET /api/mindex/integrity/verify/{id}`
  - Must verify data hash, prev hash, signature, and Merkle inclusion.
- `POST /api/mindex/ledger/anchor/records`
  - Must anchor a batch to requested rails and write `ledger.anchor` rows.
- `GET /api/mindex/ledger`
  - Must report sanitized readiness for Hypergraph, Solana, Bitcoin, Platform One, and last anchor status.
- `GET /api/mindex/ledger/wallet/balances`
  - Must report sanitized rail readiness and public balances only. No secrets, no file paths, no internal URLs.

Required backend data model:

- Add or repair `integrity.record` / `core.integrity_record`.
- Add or repair `ledger.anchor`.
- Add or repair `integrity.day_merkle_tree` or equivalent.
- Add backfill job that creates signed hash-chain records for:
  - `core.taxon`
  - `core.observation`
  - genome/genetic sequence tables
  - taxon compounds
  - device telemetry envelopes
  - chemistry rows once PubChem/ChemSpider are populated
- Add record chain continuity:
  - deterministic canonical JSON payload
  - SHA-256 data hash
  - SHA-256 link hash from previous record hash
  - Ed25519 signature
  - public key identifier / public key for verification
- Private signing material stays server-side only.

##### 6. Website/BFF Contract

The website should receive sanitized, presentation-ready JSON:

- `connected`, `reachable`, `status`, `last_checked_at`, `last_anchor_at`
- public transaction ids/signatures
- block height / slot / snapshot height
- fee estimates
- public token supply/balance if safe
- error categories such as `not_configured`, `unreachable`, `syncing`, `rate_limited`

The website must not receive:

- secrets
- private keys
- RPC usernames/passwords
- raw provider tokens
- internal-only file paths
- local credential filenames
- backend setup instructions
- raw env var names
- unredacted private URLs

#### Acceptance Criteria

- Integrity Summary shows non-null hash coverage.
- Anchor tail loads recent rows and no longer shows `/integrity/anchors/recent` failure.
- Hash Chain Visualizer can auto-load recent records and verify a real chain without the user pasting ids.
- `GET /api/mindex/integrity/records/{id}` returns a canonical record for at least one recent id.
- `GET /api/mindex/integrity/proof/{id}` returns a Merkle proof.
- `GET /api/mindex/integrity/verify/{id}` verifies hash, signature, and proof.
- Ledger status shows meaningful readiness for:
  - Bitcoin / Umbrel node
  - Solana / MYCA rail
  - Hypergraph / DAG
  - Platform One
- Bitcoin node health comes from the local Umbrel Bitcoin Core node.
- Solana rail uses a configured dedicated RPC for production/sandbox, not public rate-limited endpoints.
- Hypergraph rail either uses public Hypergraph/DAG APIs or a local Euclid/metagraph relay with documented resource requirements.
- Platform One rail can query Iron Bank and PartyBus-related status where credentials/access allow.
- No frontend panel displays credential names, local secret files, VM environment text, raw secrets, or setup instructions.
- Chain / wallet rail appears as a live terminal/status feed, not raw JSON.

### Request 006 - Edge Device Storage Nodes and NAS Replication

**Owner requested:** MINDEX storage nodes must represent both device-local storage and central MINDEX/NAS storage. Jetson-based devices such as Mushroom 1 and Hyphae/Hiveful 1 have SSDs that should cache local telemetry/media/inference datasets on-device. When a device reconnects to Wi-Fi or another trusted network, it should automatically back up and reconcile that local data to the central MINDEX NAS. This needs to support one central NAS now and multiple storage locations later.

#### Verified Current Failure

Observed from `http://localhost:3010` on June 3, 2026:

| Route | Current result |
| --- | --- |
| `GET /api/mindex/network/nodes` | HTTP 503, backend says `storage_node_unavailable` / missing table |
| `GET /api/natureos/mindex/console` | NAS is mounted and reports capacity, but storage-node inventory/sync state is not connected |

Codex frontend change made locally:

- Network tab now describes storage as:
  - Edge SSD buffers
  - Central MINDEX NAS
  - Sync registry
- It no longer treats storage nodes as only a missing SQL table.
- It surfaces the backend storage registry as pending until MINDEX exposes device-local cache state and NAS replication state.

#### Backend Request for Cursor

Build MINDEX storage as a hybrid edge-plus-central storage system.

##### 1. Storage Node Registry

Create or repair a storage-node table/schema. Suggested model:

- `network.storage_node`
  - `id`
  - `device_id`
  - `registry_id`
  - `node_type`: `edge_device`, `central_nas`, `cloud_archive`, `lab_gateway`
  - `name`
  - `status`: `online`, `offline`, `syncing`, `stale`, `error`
  - `host_label` or sanitized host identity
  - `location_label`
  - `storage_root_label`
  - `capacity_bytes`
  - `used_bytes`
  - `free_bytes`
  - `available_for_local_inference`
  - `last_seen_at`
  - `last_sync_at`
  - `sync_target_id`
  - `metadata`

Current known node classes:

- Edge storage:
  - Mushroom 1 Jetson SSD
  - Hyphae/Hiveful 1 Jetson SSD
  - Future MycoBrain / field devices with local storage
- Central storage:
  - Headquarters NAS mounted for MINDEX
  - Future additional NAS/site storage nodes

##### 2. Local Edge Storage Behavior

For each edge device with SSD/local storage:

- Store telemetry envelopes, sensor traces, media, device logs, inference inputs, inference outputs, model-cache artifacts, and local feature windows on the device first.
- Keep the data available to local inference even when the device is offline.
- Track a local manifest for every stored object:
  - content hash
  - size
  - MIME/type/domain
  - device id
  - observed/captured timestamp
  - local path label, not raw secret/internal path in frontend
  - sync state
  - retry count
  - last attempted backup
  - central object id once backed up
- Use content-addressed storage where practical so retries are idempotent.
- Keep a local outbox/sync queue for unsent data.

##### 3. Reconnect and Backup Flow

When a device reconnects to a trusted Wi-Fi/network:

1. Device announces storage status to MINDEX/MAS:
   - free space
   - local backlog count
   - total backlog bytes
   - oldest unsynced record
   - current sync target
2. MINDEX creates or resumes sync jobs.
3. Device uploads changed objects/manifests to central NAS through the approved transport.
4. MINDEX validates each upload:
   - content hash
   - expected byte size
   - device signature if available
   - storage domain and retention policy
5. MINDEX records central object location and marks local queue items synced.
6. Device retains local copies according to policy:
   - keep all if enough disk
   - prune after verified NAS backup if low space
   - preserve inference-critical windows/models locally

##### 4. NAS / Central Storage Layout

Use the existing central MINDEX NAS as the primary target for now.

Suggested layout:

- `archive/`
- `training/`
- `scrapes/`
- `images/`
- `devices/<device_id>/telemetry/`
- `devices/<device_id>/media/`
- `devices/<device_id>/inference/`
- `devices/<device_id>/logs/`
- `manifests/<device_id>/`

Requirements:

- NAS ingest must be append-safe and idempotent.
- Store manifests alongside objects.
- Record all central writes in MINDEX tables.
- Support multiple central storage targets later:
  - headquarters NAS
  - lab NAS
  - cloud/archive target
  - portable field gateway

##### 5. APIs Needed by Website

Implement sanitized backend APIs:

- `GET /api/mindex/network/nodes`
  - Return all edge and central storage nodes.
  - Must not 503 because a table is missing.
- `GET /api/mindex/storage/nodes`
  - Detailed storage inventory with capacity, status, sync target, last seen, last sync.
- `GET /api/mindex/storage/sync/status`
  - Summary: pending jobs, bytes pending, failed jobs, active uploads, last completed sync.
- `GET /api/mindex/storage/sync/jobs?device_id=...`
  - Per-device sync queue state.
- `POST /api/mindex/storage/sync/register`
  - Device announces local storage status and backlog.
- `POST /api/mindex/storage/sync/manifest`
  - Device submits manifest/checkpoint.
- `POST /api/mindex/storage/sync/complete`
  - Mark object/job complete after hash validation.

Website response fields should be presentation-ready and safe:

- `node_id`
- `device_id`
- `name`
- `node_type`
- `status`
- `capacity_bytes`
- `used_bytes`
- `free_bytes`
- `backlog_count`
- `backlog_bytes`
- `sync_target_name`
- `last_seen_at`
- `last_sync_at`
- `errors`

Do not return raw private filesystem paths, credentials, SSH details, internal-only URLs, or secrets.

##### 6. Sync Transport

Pick the safest transport for Jetson-to-NAS sync:

- Prefer an authenticated MINDEX ingestion/upload API if already available.
- `rsync`/SSH can be used internally only if credentials are managed by backend/device config and never exposed to the frontend.
- Object-store compatible transport is acceptable if we later mount NAS as S3/MinIO.
- MQTT is not enough for large objects; it can announce manifests/jobs but bulk data should use an upload/sync transport.

##### 7. Integrity and Inference Coupling

Storage sync should integrate with integrity:

- Every local object should have a content hash.
- Every central replicated object should be verifiable.
- Important telemetry/media/inference objects should produce MINDEX integrity records.
- Backed-up objects should be eligible for hash-chain/Merkle anchoring once Request 005 is complete.
- Local inference should read from device-local SSD first, then central MINDEX/NAS if needed and connected.

#### Acceptance Criteria

- `GET /api/mindex/network/nodes` returns HTTP 200 with storage nodes instead of 503.
- Mushroom 1 appears as an edge storage node when its SSD/local storage agent is available.
- Hyphae/Hiveful 1 appears as an edge storage node when its SSD/local storage agent is available.
- Headquarters NAS appears as the central storage node.
- The Network tab can show:
  - edge SSD capacity
  - central NAS capacity
  - pending sync backlog
  - last sync time
  - failed sync jobs
  - whether data is available for local inference
- Offline devices keep accumulating local data.
- On reconnect, unsynced data automatically backs up to NAS.
- Uploads are hash-validated and idempotent.
- No frontend panel displays credentials, internal raw paths, SSH details, or secret config.

### Request 007 - Biology Data Plane, Ancestry Kingdom Stats, and Observation Taxon Links

**Owner requested:** The Bio tab must not say "what is blocked" or show raw HTTP failures in the UI. It should show a detailed biology data plane for all life: taxonomy, observations, images, genetics, traits, synonyms, taxon compounds, kingdom/domain stats, and live observation rows. The frontend can show the current state cleanly, but Cursor needs to repair the backend so the Bio tab and Ancestry app populate real all-life profiles instead of empty/error states.

#### Verified Current Failure

Observed from `http://localhost:3010` on June 3, 2026:

| Route | Current result |
| --- | --- |
| `GET /api/natureos/mindex/stats` | HTTP 200, but only `10,164` loaded taxon rows, all from `inat`; `genome_records`, `trait_records`, and `synonym_records` are `0` |
| `GET /api/natureos/mindex/console` | HTTP 200, shows `823,972` observations, `747,343` observation rows with images, `10,000` external IDs, `9,998` taxa with images, but `genome`, `genetic_sequence`, and `taxon_compound` core counts are `0` |
| `GET /api/natureos/mindex/taxa?limit=5` | HTTP 500; frontend message says the MINDEX all-life taxa view is unavailable and points to `bio.taxon_full` / all-life migration repair |
| `GET /api/ancestry/kingdoms` | HTTP 503 with empty `kingdoms` and message `MINDEX all-life stats unavailable` |
| `GET /api/natureos/mindex/observations?limit=5` | HTTP 200 with live rows, media, GPS, and iNaturalist source IDs, but every sampled row had `taxon_id: null` |
| `GET /api/mindex/genetics?limit=5` | HTTP 200 but returns empty `sequences` and says the genetics endpoint is not configured against MINDEX |
| `GET /api/mindex/genome-tracks?species=amanita` | HTTP 200 with `tracks: null` |
| `GET /api/mindex/compounds?limit=5` | HTTP 500 |

Codex frontend change made locally:

- Bio tab no longer shows a "What is blocked" section.
- Bio tab no longer renders raw `HTTP 503`, raw route paths, or backend failure messages as primary UI.
- Bio tab now shows detailed biology coverage across:
  - loaded taxon rows
  - external IDs
  - taxa linked to observations
  - synonyms
  - total observations
  - located observations
  - observation media
  - taxa with images
  - genome records
  - genetic sequences
  - trait records
  - taxon compounds
  - source-loaded counts
- Live observation preview renders rows even when `taxon_id` is null, but the UI should not label or explain this as a frontend state.

#### Backend Request for Cursor

Repair the MINDEX biology backend so all-life species pages, Bio tab, and Ancestry kingdom stats populate with real data.

##### 1. Restore All-Life Taxonomy/Profile View

Fix `GET /api/mindex/taxa` and the BFF path `GET /api/natureos/mindex/taxa`.

Required behavior:

- Return HTTP 200 even if the enriched all-life profile view is partially unavailable.
- Prefer the enriched `bio.taxon_full` view when healthy.
- Fall back to raw `core.taxon` plus safe joins when `bio.taxon_full` is missing or broken.
- Include all-life taxonomy fields where available:
  - `id`
  - `canonical_name`
  - `rank`
  - `kingdom`
  - `domain`
  - `lineage`
  - `common_name`
  - `source`
  - `external_ids`
  - `obs_count`
  - `image_count`
  - `genome_count`
  - `compound_link_count`
  - `publication_count`
  - `characteristic_count`
  - `description`
  - default image/media fields
- Confirm the migration from fungi-only to all-life does not filter out plants, animals, bacteria, archaea, protists, or non-fungal taxa.

##### 2. Fix Ancestry Kingdom Stats

Repair the backend powering `GET /api/ancestry/kingdoms`.

Required behavior:

- Return HTTP 200 with kingdom/domain rollups instead of HTTP 503.
- Include all known life domains and kingdoms when rows exist.
- Include counts for:
  - taxa
  - observations
  - taxa with images
  - taxa with external IDs
  - taxa with genomes
  - taxa with compounds
  - taxa with traits
  - taxa with synonyms
- Return empty arrays only when the database truly has no rows, not because a view failed.

##### 3. Backfill Observation `taxon_id`

Live observations are flowing, but sampled rows have `taxon_id: null`. Backfill and repair the join.

Frontend note from Codex: user explicitly does not want the UI explaining `taxon_id` gaps with copy such as "the row is real but not connected to a species profile." The frontend now hides that explanatory copy; Cursor needs to fix the backend observation-to-taxon join instead.

Required behavior:

- Use observation source identifiers and metadata to resolve each observation to `core.taxon`.
- For iNaturalist rows, join via source taxon ID / iNat taxon external ID where available.
- If current observation rows do not store the source taxon ID, update the observation ETL to persist it.
- Backfill existing observation rows in batches.
- Preserve source IDs and external references.
- Expose taxonomy fields on observation API rows:
  - `taxon_id`
  - `canonical_name`
  - `rank`
  - `kingdom`
  - `domain`
  - `source_taxon_id`
  - `source_observation_id`
  - image/media count

##### 4. Wire Genetics, Traits, Synonyms, and Compounds

Current stats show the tables/endpoints are empty or unavailable.

Required behavior:

- GenBank and FungiDB ETL should populate genome and sequence counts.
- MycoBank ETL should populate synonyms.
- Mushroom.World/Wikipedia ETL should populate traits and descriptions.
- PubChem and ChemSpider ETL should populate compounds and taxon-compound links.
- `GET /api/mindex/genetics` should return real sequence rows or a healthy empty response without "not configured" copy.
- `GET /api/mindex/genome-tracks` should return `tracks: []` for no tracks and real track arrays once data exists, never `tracks: null`.
- `GET /api/mindex/compounds` should return HTTP 200 and real compound rows or a healthy empty response.

##### 5. Add Biology Summary API

Add a single presentation-ready backend summary endpoint so the frontend does not need to infer biology state from several brittle routes.

Suggested path:

- `GET /api/mindex/bio/summary`

Recommended fields:

- `taxa_total`
- `taxa_by_domain`
- `taxa_by_kingdom`
- `taxa_by_source`
- `observations_total`
- `observations_by_source`
- `observations_with_location`
- `observations_with_media`
- `observations_with_taxon_id`
- `taxa_with_images`
- `taxa_without_images`
- `image_coverage_percent`
- `external_ids_total`
- `genome_records`
- `genetic_sequence_records`
- `trait_records`
- `synonym_records`
- `compound_records`
- `taxon_compound_records`
- `publication_records`
- `last_successful_etl_by_source`
- `failing_etl_sources`
- `migration_status`

Do not expose raw credentials, private paths, or internal-only backend details in this endpoint.

#### Acceptance Criteria

- `GET /api/natureos/mindex/taxa?limit=5` returns HTTP 200 with taxon/profile rows.
- `GET /api/ancestry/kingdoms` returns HTTP 200 with non-empty all-life kingdom/domain rollups when data exists.
- Sample observations from `GET /api/natureos/mindex/observations?limit=20` include non-null `taxon_id` whenever the source taxon can be resolved.
- Observation rows include taxonomy display fields so Encyclopedia and Bio can show species context without extra brittle joins.
- MINDEX stats show nonzero counts after ETL/backfill for available genomes, genetic sequences, traits, synonyms, compounds, and taxon compounds.
- `GET /api/mindex/genetics`, `GET /api/mindex/genome-tracks`, and `GET /api/mindex/compounds` return healthy HTTP 200 responses.
- Bio tab can display all-life coverage without raw HTTP errors, empty route health spinners, or "blocked" product copy.
- Ancestry app can show all-life kingdom/profile data again after the fungi-only to all-life migration.

### Request 008 - MINDEX Chemical Computer, Molecular Visualization, and Chemistry Backend

**Owner requested:** The Chemistry tab must become a full MINDEX chemical computer, not four blocked cards or a simple table. The chemical database currently fails (`/api/mindex/compounds` has shown HTTP 500/route failure in the UI) and the tab must show real compound data, molecular structure images, a 3D molecule, periodic/element data, chemical interactions, source organisms/species links, reaction partners, byproducts, and simulation/chemical-computing integrations.

#### Verified Current Failure

Observed from the local MINDEX console work on June 3, 2026:

| Area | Current result |
| --- | --- |
| `GET /api/mindex/compounds?limit=5` | Has returned backend failure / HTTP 500 behavior in UI |
| `GET /api/natureos/mindex/console` | `etl.core_counts.taxon_compound` is `0`; compound data is not populated |
| Chemistry tab | Previously showed `blocked` for compound database, molecular pictures, species interactions, and chemical computer |
| Chemistry tab database | Previously exposed raw backend error copy such as `HTTP 500` |

Codex frontend change made locally:

- Removed `blocked` statuses and raw HTTP error display from Chemistry UI.
- Chemistry tab now has:
  - compound search
  - MINDEX-first compound rows
  - PubChem-backed detail lookup when local rows are empty
  - 2D molecular structure images
  - Three.js 3D conformer viewer when PubChem CID / SDF data is available
  - chemical identity panel
  - property vector panel
  - element composition / periodic metadata panel
  - interaction graph panel
  - compute-adapter panel for OpenChemistry/RDKit, DWSIM, Cantera, and molecular/DNA computing
- `app/api/natureos/mindex/compounds/route.ts` now forwards query parameters and uses MINDEX auth retry.

#### Backend Request for Cursor

Build the real MINDEX chemical computer backend so the frontend can show real database-backed chemistry instead of only live external lookup.

##### 1. Repair Compound API Health

Fix:

- `GET /api/mindex/compounds`
- `GET /api/natureos/mindex/compounds`
- `GET /api/mindex/compounds/detail`
- Any related `POST /api/mindex/compounds` upsert/storage path used by the PubChem detail route.

Required behavior:

- Return HTTP 200 for healthy empty state or populated results.
- Do not return HTTP 500 for missing optional tables/views.
- Preserve pagination and search parameters:
  - `limit`
  - `offset`
  - `q`
  - `search`
  - `id`
  - `cid`
  - `inchikey`
  - `smiles`
  - `taxon_id`
- Include route diagnostics in backend logs, not in the frontend payload.
- Populate and return counts:
  - `compound_count`
  - `taxon_compound_count`
  - `interaction_count`
  - `structure_count`
  - `conformer_3d_count`
  - `reaction_count`

##### 2. Schema Needed for Chemical Computer

Create or repair chemistry tables/views. Suggested model:

- `chem.compound`
  - `id`
  - `name`
  - `iupac_name`
  - `molecular_formula`
  - `molecular_weight`
  - `exact_mass`
  - `monoisotopic_mass`
  - `canonical_smiles`
  - `isomeric_smiles`
  - `inchi`
  - `inchi_key`
  - `pubchem_cid`
  - `chemspider_id`
  - `cas_number`
  - `chemical_class`
  - `compound_type`
  - `description`
  - `source`
  - `source_url`
  - `metadata`
- `chem.compound_property`
  - `compound_id`
  - `property_name`
  - `property_value`
  - `unit`
  - `source`
  - `evidence_url`
- `chem.compound_structure`
  - `compound_id`
  - `structure_type`: `png`, `svg`, `sdf_2d`, `sdf_3d`, `mol`, `pdb`, `cif`
  - `url`
  - `storage_object_id`
  - `smiles`
  - `inchi`
  - `coordinates_json`
  - `source`
  - `license`
- `chem.compound_element`
  - `compound_id`
  - `element`
  - `element_name`
  - `atomic_number`
  - `count`
- `chem.compound_interaction`
  - `compound_id`
  - `interacts_with_compound_id`
  - `interaction_type`
  - `effect`
  - `conditions`
  - `products`
  - `byproducts`
  - `reaction_equation`
  - `kinetics`
  - `thermodynamics`
  - `evidence_source`
  - `evidence_url`
- `chem.reaction`
  - `id`
  - `name`
  - `reactants`
  - `products`
  - `byproducts`
  - `catalysts`
  - `enzymes`
  - `pathway`
  - `conditions`
  - `delta_g`
  - `rate_parameters`
  - `source`
  - `evidence_url`
- `bio.taxon_compound`
  - `taxon_id`
  - `compound_id`
  - `relationship_type`
  - `evidence`
  - `source`
  - `source_url`

##### 3. Data Sources to Research and Integrate

Cursor should research and integrate any/all of these properly into MINDEX chemical computer architecture. Treat this as an engineering/research task, not just a link dump:

- `https://github.com/openchemistry`
- `https://github.com/lmmentel/awesome-python-chemistry`
- `https://github.com/hsiaoyi0504/awesome-cheminformatics`
- `https://github.com/Arif-PhyChem/datasets_and_databases_4_MLPs`
- `https://github.com/materials-data-facility/matchem-llm`
- `https://github.com/kjappelbaum/awesome-chemistry-datasets`
- `https://github.com/zobront/dna-computing-simulator`
- `https://github.com/UC-Davis-molecular-computing/simd-dna`
- `https://github.com/vitortterra/dna-computing`
- `https://github.com/DNA-and-Natural-Algorithms-Group/multistrand`
- `https://github.com/gigasquid/chemical-computing`
- `https://dwsim.org/`
- `https://cantera.org/`

Specific research asks:

- Identify best Python cheminformatics stack for MINDEX ETL and services:
  - RDKit
  - Open Babel
  - OpenChemistry / Avogadro-related tooling
  - PubChemPy or direct PubChem PUG REST
  - ChEMBL clients
  - OPSIN where useful for name-to-structure
- Identify best datasets for:
  - molecular structures
  - reaction data
  - thermodynamics
  - kinetics
  - pathways
  - biological source compounds
  - chemical interactions
  - toxicity/safety metadata
  - materials / physicochemical ML datasets
- Decide how to integrate DWSIM:
  - User has downloaded the desktop app.
  - Determine whether MYCA can control it through CLI, automation, COM/.NET, files, or an API bridge.
  - Use DWSIM for process simulation, mixtures, unit operations, phase equilibrium, and generated reports where appropriate.
- Decide how to integrate Cantera:
  - Use for chemical kinetics, thermodynamics, reaction networks, combustion/atmospheric chemistry if useful, and mechanism simulation.
  - Expose backend simulation endpoints that the UI can call.
- Decide how DNA/molecular computing tools fit:
  - Use DNA computing simulators and Multistrand for molecular computing modules where relevant.
  - Keep this separate from ordinary compound database lookup but visible in the compute-adapter layer.

##### 4. APIs Needed by Website

Implement presentation-ready APIs:

- `GET /api/mindex/chem/summary`
  - counts, source coverage, ETL status, structure coverage, 3D coverage, interaction coverage
- `GET /api/mindex/compounds`
  - searchable paginated compound rows
- `GET /api/mindex/compounds/{id}`
  - full compound profile
- `GET /api/mindex/compounds/detail?name=...`
  - MINDEX-first detail lookup, PubChem fallback, then store result back into MINDEX
- `GET /api/mindex/compounds/{id}/structure`
  - 2D/3D structure metadata and files
- `GET /api/mindex/compounds/{id}/interactions`
  - known interactions, products, byproducts, evidence
- `GET /api/mindex/compounds/{id}/reactions`
  - reaction graph and pathways
- `GET /api/mindex/compounds/{id}/taxa`
  - species/taxa that produce, metabolize, accumulate, or interact with the compound
- `POST /api/mindex/chem/simulate/cantera`
  - Cantera simulation job
- `POST /api/mindex/chem/simulate/dwsim`
  - DWSIM simulation job/bridge
- `POST /api/mindex/chem/compute/dna`
  - DNA/molecular computing simulation job

Website payloads should include:

- `id`
- `name`
- `iupac_name`
- `molecular_formula`
- `molecular_weight`
- `exact_mass`
- `canonical_smiles`
- `inchi`
- `inchi_key`
- `pubchem_cid`
- `chemspider_id`
- `cas_number`
- `description`
- `synonyms`
- `properties`
- `elements`
- `structures`
- `source_species`
- `interactions`
- `reactions`
- `products`
- `byproducts`
- `evidence`
- `source_urls`
- `updated_at`

##### 5. ETL Requirements

Daily or better, per Request 003:

- PubChem compound metadata
- ChemSpider cross-references
- ChEMBL/bioactivity where useful
- biological source compounds
- PubMed/Semantic Scholar evidence links
- structure files:
  - SVG or PNG for 2D structure images
  - SDF/MOL/PDB/CIF or coordinate JSON for 3D molecules
- element composition / periodic metadata
- reaction/interaction graph records

Store structures and large files in MINDEX/NAS where appropriate:

- `archive/chemistry/`
- `images/chemistry/structures/`
- `training/chemistry/`

##### 6. Frontend Contract

The frontend should never need to show:

- `HTTP 500`
- `blocked`
- raw table/view names as product copy
- raw credential or environment details

It should be able to render:

- database status
- structure coverage
- 2D molecular image
- 3D molecule
- formula and element composition
- periodic metadata
- property vectors
- interaction/reaction graph
- species/taxon links
- simulation adapter status

#### Acceptance Criteria

- Chemistry tab no longer shows four blocked cards.
- `GET /api/mindex/compounds?limit=5` returns HTTP 200.
- Compound rows include enough data to render 2D molecular images.
- At least one compound can render a 3D conformer from MINDEX-stored structure data, not only live PubChem.
- `taxon_compound` count is nonzero after ETL if any source compound links are available.
- Compound detail profiles include PubChem CID, ChemSpider ID when available, formula, SMILES, InChIKey, properties, source URLs, and structure metadata.
- Interaction endpoint returns known relationships, reaction partners, products/byproducts, evidence, and source links.
- Cantera and DWSIM integration paths are documented and at least one simulation endpoint is implemented or stubbed with a real job contract.
- MYCA can call the chemistry APIs and simulation endpoints without needing desktop credentials in the frontend.

### Request 009 - Primary MINDEX Data Catalog, Search, Details, and Information Layer

**Owner requested:** MINDEX needs a primary tab called `Data`, directly after Overview and before Encyclopedia. This must be the basis of the app: a full interactive database browser for everything in MINDEX. Users should be able to search, filter, organize, categorize, select records, inspect provenance, and connect raw data into meaning. The other tabs are details and secondary workflows; the main use is "here is all of our data, use it to figure out what the data means."

#### Codex Frontend Change Made Locally

- Added a real `Data` tab directly after Overview.
- Moved the old ETL screen from `Data Pipeline` to a separate `Pipeline` tab.
- Added a table-first frontend Data workspace that takes over the main screen like a database app:
  - Table rail for actual MINDEX schemas/tables
  - Large central row grid
  - Schema/column meaning strip
  - Right-side MYCA information and analysis panel
  - Dataset definitions, source/provenance text, correlation paths, and selected-record details
- Wrapped the MINDEX page in the shared `MYCAProvider`, matching Earth Simulator's MYCA integration pattern.
- Replaced the Data tab's local mock conversation with the shared `MYCAChatWidget` so user prompts carry selected table/row context into MYCA's normal memory-aware route.
- Configured the Data tab's MYCA widget as a MINDEX-bound harness:
  - requests MAS/MYCA brain mode
  - keeps persistent MYCA memory enabled for authenticated users
  - includes consciousness, grounding, bridge, and voice-tool context in the structured payload
  - disables Earth Simulator map fast-intent controls inside this Data surface
  - passes selected table, selected row, visible filters, provenance, relationship paths, and catalog context with every user prompt
- Added a website BFF route:
  - `POST /api/natureos/mindex/data-ai-summary`
  - Sends the selected MINDEX table/row/schema/provenance context to MAS `/api/myca/chat`
  - Uses metadata source `mindex_data_myca_sees`
  - Tags the context with `harness: "mas-myca-mindex-data"` and `platform: "mindex-data-myca-live"`
  - Keeps model/provider details out of the UI
  - Falls back to a deterministic summary when MAS/MYCA is temporarily unavailable
- Current frontend uses existing summary endpoints and sample rows:
  - stats
  - console
  - health/all counts
  - taxa sample when available
  - observations sample
  - ETL jobs
  - Earth domain counts
  - field devices
  - NAS status

#### Backend Request for Cursor

Build the real MINDEX data catalog/search/detail backend so the Data tab can browse every MINDEX dataset instead of inferring from summary endpoints.

##### 1. Data Catalog API

Add:

- `GET /api/mindex/data/catalog`

Return every browsable MINDEX dataset/domain:

- taxonomy
- observations
- media/images
- external IDs
- genomes
- genetic sequences
- traits
- synonyms
- compounds
- taxon-compound links
- publications
- Earth intelligence domains
- devices
- telemetry
- storage nodes
- NAS objects/manifests
- integrity records
- ledger anchors
- ETL jobs/runs
- agents/database access if available
- chemistry reactions/interactions
- M-Wave earthquake/mycelium correlation streams

Each catalog item should include:

- `id`
- `label`
- `category`
- `description`
- `record_count`
- `sample_count`
- `source_tables`
- `source_systems`
- `freshness`
- `last_updated_at`
- `status`
- `quality_flags`
- `search_fields`
- `filter_fields`
- `detail_endpoint`
- `records_endpoint`
- `related_dataset_ids`

##### 2. Unified Data Search API

Add:

- `GET /api/mindex/data/search?q=...&category=...&dataset=...&limit=...&offset=...`

Required behavior:

- Search across all MINDEX datasets.
- Allow dataset/category filters.
- Return normalized result rows with enough context for display:
  - `dataset_id`
  - `record_id`
  - `title`
  - `subtitle`
  - `summary`
  - `source`
  - `provenance`
  - `updated_at`
  - `matched_fields`
  - `related_counts`
  - `detail_endpoint`
- Do not silently hide datasets that are empty or pending. Return catalog status and record counts so UI can explain what exists and what needs ingestion.

##### 3. Dataset Records API

Add:

- `GET /api/mindex/data/datasets/{dataset_id}/records?limit=...&offset=...&q=...&filters=...`

Required behavior:

- Paginated records for each dataset.
- Dataset-specific filters.
- Stable column metadata:
  - field name
  - label
  - type
  - unit
  - whether searchable/filterable/sortable
- Return sanitized presentation-ready data. Do not expose credentials, private file paths, SSH details, VM internals, or secrets.

##### 4. Record Detail and Information API

Add:

- `GET /api/mindex/data/records/{dataset_id}/{record_id}`
- `GET /api/mindex/data/records/{dataset_id}/{record_id}/related`
- `GET /api/mindex/data/records/{dataset_id}/{record_id}/explain`

The detail payload should include:

- canonical fields
- raw source references
- provenance
- evidence/source links
- integrity state
- related records
- correlation candidates
- derived interpretation fields
- gaps/missing links

The explain payload should help turn data into information:

- what this data means
- what source it came from
- how fresh it is
- what it is related to
- what can be inferred
- what cannot be inferred yet
- how it connects to species, observations, chemistry, devices, Earth, storage, and integrity

##### 5. Correlation / Relationship Graph API

Add:

- `GET /api/mindex/data/graph?record=...`
- `GET /api/mindex/data/correlate?datasets=...&q=...`

Required relationships:

- observation -> taxon
- taxon -> external IDs
- taxon -> images/media
- taxon -> genome/sequences
- taxon -> compounds
- compound -> reactions/interactions
- device -> telemetry
- device -> storage node
- telemetry -> Earth context
- mycelium signal -> earthquake event
- record -> integrity proof / ledger anchor
- record -> ETL source/run

##### 6. MYCA Data Analysis API

Add a server-side MYCA endpoint for the Data tab information rail:

- `POST /api/mindex/data/analyze`

Payload should include:

- selected dataset/table
- visible filters/search query
- selected row ID and selected row payload
- visible column metadata
- provenance/source metadata
- related dataset IDs
- row quality flags
- conversation history

Required behavior:

- Stream or return MYCA analysis of the data currently in front of the user.
- Use the full MAS MYCA MINDEX orchestrator path for the Data tab harness, including brain mode, consciousness state, persistent memory/context, bridge context, grounding when available, and voice-tool support.
- Keep the harness scoped to MINDEX Data. MYCA should reason over the selected dataset/table/record/filter/provenance context and should not trigger Earth Simulator map movement, global app controls, deployment/configuration actions, or credential prompts from this surface.
- Support both:
  - passive readout: quick analysis of the currently selected visible data
  - interactive chat: full MYCA conversation with persistent memory and optional audio response support
- MYCA readouts must be plain human information. Do not return backend, ETL, route, endpoint, schema, join, payload, quality-flag, credential, configuration, permission, or failure/debug language as user-facing copy.
- Explain what the selected row means.
- Internally detect missing links, stale data, suspicious gaps, and next best queries, but present them as clear user guidance rather than backend diagnostics.
- Suggest related tables/records to inspect.
- Generate safe follow-up search/filter/query suggestions.
- Persist or route the selected table/row/schema/provenance context into MYCA's long-term memory/context layer in the same spirit as Earth Simulator's MYCA viewport analysis.
- Treat this as "MYCA sees MINDEX data" context, not a frontend-only tooltip.
- Use a stable metadata source such as `mindex_data_myca_sees` so MAS/MYCA can distinguish this from ordinary chat, Earth Simulator viewport context, and generic website search.
- Use stable harness metadata:
  - `harness: "mas-myca-mindex-data"`
  - `platform: "mindex-data-myca-live"`
  - `source_platform: "mindex-data-myca-live"`
  - `chat_mode: "brain"`
  - `mode: "brain"`
  - `use_brain: true`
  - `include_memory_context: true`
  - `allow_provider_fallbacks: true`
  - `voice_tools_enabled: true`
  - `bridges_enabled: true`
- Store enough context for MYCA to learn which datasets/tables/rows the user is inspecting:
  - dataset/table ID
  - selected record ID/title
  - visible filters/search query
  - row payload summary
  - schema/column meanings
  - provenance/source systems
  - relationships/join candidates
  - quality flags/missing joins
  - timestamp and route/surface
- Never expose credentials, private paths, raw secret names, local VM environment details, or internal-only setup text.
- Keep model/provider details server-side. The frontend should show `MYCA`, not a model name.

##### 7. Data Quality / Missing Link Flags

Expose clear status flags:

- `loaded`
- `empty`
- `pending_ingestion`
- `join_missing`
- `view_unavailable`
- `stale`
- `source_error`
- `needs_backfill`
- `needs_credentials`
- `schema_missing`

These flags must be backend data, not frontend guesswork.

##### 8. Acceptance Criteria

- `Data` tab is the first tab after Overview.
- `Pipeline` tab remains available for ETL operations.
- `GET /api/mindex/data/catalog` returns every dataset category with counts and status.
- `GET /api/mindex/data/search` can search across all available MINDEX data.
- Dataset records are paginated, searchable, filterable, and selectable.
- Record details include provenance, source, integrity state, related data, and explanatory meaning.
- `POST /api/mindex/data/analyze` lets MYCA read the selected table/row/filter context and return useful analysis.
- The UI can show data categories, records, details, and correlations without scraping several summary endpoints.
- Empty/missing datasets are represented as data-quality states, not raw HTTP errors.
- The frontend labels the analysis rail as MYCA and does not display model/provider names.
- No frontend panel displays credentials, private file paths, VM environment details, raw secret names, or internal-only setup text.

### Request 010 - MINDEX Sensor Blob Library and Nature Learning Model Fingerprints

**Owner requested:** Add a `Library` tab directly under `Data` and above `Encyclopedia`. This tab must contain every sensor data blob library used by the nature learning model: spectral, acoustic, bioelectric, chemical, thermal, and tactile recordings. Each category needs real file lists, proper playback, visualizers, fingerprints, source devices, sample context, and storage/integrity metadata.

#### Codex Frontend Change Made Locally

- Added `Library` to the MINDEX right-side navigation between `Data` and `Encyclopedia`.
- Added a first-pass `LibrarySection` UI with these library categories:
  - Spectral: hyperspectral, multispectral, LiDAR, radar, Geiger counter, radiation/dosimeter traces
  - Acoustic: hydrophone, transducer, microphone, contact microphone, ultrasonic microphone
  - Bioelectric: Fungal Computer Interface electrodes, electrical traces, magnetic traces, radio wave captures, Wi-Fi, Bluetooth
  - Chemical: VOCs, VSCs, Bosch BME688/BME690 gas-combination blobs, humidity, moisture, pressure-associated smell profiles
  - Thermal: infrared, thermal camera frames, thermistors, temperature probes, animated heat maps
  - Tactile: pressure, movement, strain, contact, vibration, touch and substrate response recordings
- The current frontend does not fake recordings. It shows category definitions, expected playback modes, and an empty recording table until MINDEX exposes real library blob records.

#### Backend Request for Cursor

Build the real MINDEX Library backend for sensor blobs and nature learning model fingerprints.

##### 1. Sensor Blob Catalog API

Add:

- `GET /api/mindex/library/catalog`

Return every library category and available counts:

- `spectral`
- `acoustic`
- `bioelectric`
- `chemical`
- `thermal`
- `tactile`
- derived nature learning model fingerprints

Each category should include:

- `id`
- `label`
- `description`
- `sensor_types`
- `file_count`
- `blob_count`
- `fingerprint_count`
- `storage_bytes`
- `latest_recorded_at`
- `source_devices`
- `playback_modes`
- `visualizer_modes`
- `record_endpoint`
- `stream_endpoint`

##### 2. Sensor Blob Records API

Add:

- `GET /api/mindex/library/blobs?category=...&sensor_type=...&device_id=...&q=...&limit=...&offset=...`
- `GET /api/mindex/library/blobs/{blob_id}`

Each blob row should include:

- `id`
- `category`
- `sensor_type`
- `device_id`
- `device_name`
- `recorded_at`
- `duration_ms`
- `sample_rate`
- `frequency_range`
- `units`
- `mime_type`
- `codec`
- `file_name`
- `file_size_bytes`
- `storage_object_id`
- `storage_uri`
- `public_preview_url` when allowed
- `stream_url`
- `download_url` when allowed
- `thumbnail_url`
- `waveform_url`
- `spectrogram_url`
- `heatmap_url`
- `point_cloud_url`
- `gas_profile`
- `thermal_profile`
- `pressure_profile`
- `organism_context`
- `taxon_id`
- `sample_id`
- `experiment_id`
- `site_context`
- `calibration`
- `environment_context`
- `fingerprints`
- `embedding_id`
- `nlm_model_version`
- `provenance`
- `integrity_record_id`
- `ledger_anchor_id`
- `created_at`
- `updated_at`

##### 3. Playback and Visualization APIs

Add:

- `GET /api/mindex/library/blobs/{blob_id}/stream`
- `GET /api/mindex/library/blobs/{blob_id}/waveform`
- `GET /api/mindex/library/blobs/{blob_id}/spectrogram`
- `GET /api/mindex/library/blobs/{blob_id}/fingerprint`
- `GET /api/mindex/library/blobs/{blob_id}/visualization`

Required playback behavior:

- Acoustic files must support audio playback, waveform display, spectrogram, and frequency waterfall.
- Spectral files must support spectrum plots, point cloud previews for LiDAR, radar sweep playback, and radiation timelines.
- Bioelectric files must support oscilloscope-like playback, signal waterfall, frequency analyzer, and packet/radio trace views.
- Chemical files must support gas matrix visualizers, VOC/VSC profile views, smell-profile radar, humidity/moisture/pressure timelines, and BME688/BME690 calibration context.
- Thermal files must support thermal video, animated heat maps, and temperature timelines.
- Tactile files must support pressure-field playback, motion timelines, vibration spectra, and strain graphs.

##### 4. Storage and Ingestion

Store blobs and previews in MINDEX/NAS with stable paths, for example:

- `archive/library/spectral/`
- `archive/library/acoustic/`
- `archive/library/bioelectric/`
- `archive/library/chemical/`
- `archive/library/thermal/`
- `archive/library/tactile/`
- `training/library/fingerprints/`
- `images/library/previews/`

Ingest from:

- Mushroom 1
- Hyphae 1
- Psathyrella buoy when available
- future Mycosoft field devices
- lab captures and local manually imported recordings
- Earth Simulator / Fungi Compute / FCI signal streams where applicable

##### 5. Nature Learning Model Fingerprints

For every sensor blob, generate or store the fingerprint created by the nature learning model:

- fingerprint ID
- model/version
- modality
- raw feature summary
- embedding/vector reference
- confidence/quality score
- similar fingerprints
- source organism/sample/site
- related events such as weather, earthquake, device state, organism/taxon, chemistry, and thermal/tactile context

##### 6. Frontend Contract

The frontend should be able to render:

- category counts
- browsable file table
- category-specific player/visualizer
- fingerprint details
- source device
- sample/site/organism context
- storage/integrity state
- related records in MINDEX Data, Devices, M-Wave, Chemistry, Bio, and Earth Simulator

Do not expose:

- raw private filesystem paths
- credentials
- environment variables
- VM internals
- secret names
- debug-only service text

##### 7. Acceptance Criteria

- `Library` tab appears directly under `Data` and above `Encyclopedia`.
- `GET /api/mindex/library/catalog` returns all six categories.
- `GET /api/mindex/library/blobs?category=acoustic` returns real audio/hydrophone/microphone/transducer rows when available.
- Chemical rows include VOC/VSC/BME688/BME690 gas-combination profiles and smell fingerprints.
- Bioelectric rows include FCI electrical recordings plus magnetic/radio/Wi-Fi/Bluetooth traces where available.
- Spectral rows include LiDAR/radar/radiation/geiger files where available.
- Thermal rows include infrared/temperature files and heat-map metadata.
- Tactile rows include pressure/movement/strain/vibration files.
- Every blob can expose the correct player/visualization metadata for the frontend.
- Blob records link to storage, source device, sample/site/organism, fingerprint, and integrity proof when available.

### Request 011 - Unified Search Must Search All MINDEX Data

**Owner requested:** Searching `lions mane` should find Lion's Mane / `Hericium erinaceus` across every relevant MINDEX surface, not return nothing. Search must cover species data, device data, mapped data, scraped/API data, ETL/source data, library blobs, chemistry, genetics, observations, media, storage, integrity, ledger, and agents where records exist.

#### Verified Failure

On June 3, 2026, the local website BFF showed:

- `GET /api/natureos/mindex/search?q=lions%20mane&limit=10` returned zero results.
- `GET /api/natureos/mindex/search?q=Hericium&limit=10` returned zero results.
- `GET /api/natureos/mindex/taxa?q=Hericium&limit=5` returned HTTP 500 from the all-life taxa/profile backend.
- `GET /api/natureos/mindex/search?q=lion%27s%20mane&limit=10` returned generic recent observations from the old observation path, not reliable Lion's Mane records.

This is tied to Request 002: the all-life taxonomy/profile endpoint is unavailable, and observations currently have missing `taxon_id` joins. The frontend added a temporary BFF bridge so users can see live source results, but the real fix must be the MINDEX backend unified search.

#### Backend Request for Cursor

Build a real unified MINDEX search backend that searches every dataset category and returns normalized, ranked results.

Add or repair one canonical endpoint:

- `GET /api/mindex/data/search?q=...&category=...&dataset=...&limit=...&offset=...`

Optional compatibility aliases:

- `GET /api/mindex/unified-search?q=...`
- `GET /api/mindex/search?q=...`

Required searchable buckets:

- species/taxa and species profiles
- common names, canonical names, synonyms, alternate spellings, and external IDs
- observations and observation media
- images, videos, audio, and media metadata
- GenBank/genetics/genome records
- traits, profile facts, descriptions, publications
- compounds, taxon-compound links, PubChem, ChemSpider, structures, reactions/interactions
- field devices, device registry, telemetry, MQTT/device protocol state
- mapped Earth intelligence domains and geospatial records
- MINDEX sensor Library blobs and nature learning model fingerprints
- source/API/ETL records and run/source status
- NAS/storage nodes, manifests, and device-local storage sync records
- integrity records, ledger anchors, blockchain/hypergraph/platform proofs
- M-Wave / Fungi Compute signal and earthquake correlation records
- MINDEX agent/database harness records where available

Required search behavior:

- Support common-name and scientific-name variants:
  - `lions mane`
  - `lion's mane`
  - `Lion's Mane`
  - `Hericium`
  - `Hericium erinaceus`
- Normalize apostrophes, punctuation, capitalization, and spacing.
- Search synonyms and public external IDs, not only `core.taxon.canonical_name`.
- Do not return unrelated generic recent observations for a species query.
- Observation results for a species query should be filtered through a matching taxon/common-name/synonym/source ID relationship.
- If a bucket is empty or unavailable, return bucket status/counts rather than silently dropping it.
- Search should be all-life, not fungi-only.

Normalized result shape:

- `dataset_id`
- `bucket`
- `record_id`
- `title`
- `subtitle`
- `summary`
- `source`
- `provenance`
- `updated_at`
- `matched_fields`
- `related_counts`
- `detail_endpoint`
- `thumbnail_url` when available
- `external_url` when appropriate
- `quality_flags`
- `status`

#### Acceptance Criteria

- `GET /api/mindex/data/search?q=lions%20mane&limit=20` returns `Hericium erinaceus` / Lion's Mane species/profile results.
- `GET /api/mindex/data/search?q=lion%27s%20mane&limit=20` returns the same organism family of results.
- `GET /api/mindex/data/search?q=Hericium&limit=20` returns matching taxa and related records.
- Species results include image/default-photo information when available.
- Observation results are actually related to Lion's Mane / Hericium and do not include unrelated recent records.
- Related media, compounds, traits, genomes/genetics, publications, external IDs, mapped records, and source rows appear when they exist.
- Device, Library, storage, integrity, ledger, M-Wave, and agent records are searchable by their names, IDs, source device, organism/sample context, and related data.
- The Data tab can call one backend search endpoint instead of scraping multiple summary endpoints.
- Empty buckets return clear status fields for the frontend without raw HTTP 500 text.

### Request 012 - NAS-Backed Library Files, Real Players, and NLM Source Downloads

**Owner requested:** The Library categories must not be stubs. Spectral, acoustic, bioelectric, chemical, thermal, and tactile sections must be selectable, backed by real files, and able to play or visualize the selected file inside the MINDEX app. The Library must connect to NatureOS/MINDEX storage and the NAS, so when files are added under the NAS Library folder they appear and play in the app.

#### Frontend Change Made Locally

Codex added a local website file-backed Library implementation:

- `GET /api/natureos/mindex/library`
  - scans configured MINDEX Library storage
  - returns category counts, file rows, safe relative paths, size, modified time, mime type, stream URL, preview samples, and checksums
  - supports `category`, `q`, and `limit`
- `GET /api/natureos/mindex/library/file?id=...`
  - streams the selected file from the configured Library root
  - prevents traversal outside the Library root
  - returns appropriate content type
- `components/mindex/tabs/library-tab.tsx`
  - displays real category counts and files from the API
  - acoustic uses an actual browser audio player plus waveform/signal preview
  - bioelectric reuses Fungi Compute `Oscilloscope` and `SpectrumAnalyzer`
  - spectral reuses Fungi Compute `SpectrumAnalyzer` and `STFTSpectrogram`
  - chemical renders gas/VOC/VSC/humidity/temperature profile graphs
  - thermal renders image/video previews when available plus animated heat map from file-derived samples
  - tactile renders an animated pressure field from file-derived samples

The frontend currently searches these server-side environment/storage roots:

- `MINDEX_LIBRARY_ROOT`
- `MINDEX_NAS_LIBRARY_ROOT`
- `NAS_LIBRARY_ROOT`
- `MINDEX_NAS_MOUNT/Library`
- `NAS_MOUNT_PATH/Library`
- `/mnt/nas/mindex/Library`
- `/mnt/nas/mindex/library`
- local dev fallbacks only for development

The frontend intentionally does not expose absolute filesystem paths, credentials, VM internals, or raw NAS mount details to users.

#### Required NAS Structure

Set up the NAS Library folder under the MINDEX share:

```text
MINDEX/Library/
  acoustic/
    hydrophone/
    microphone/
    transducer/
    ultrasonic/
  bioelectric/
    fci/
    magnetic/
    radio/
    wifi/
    bluetooth/
  spectral/
    lidar/
    radar/
    geiger/
    radiation/
    hyperspectral/
    multispectral/
  chemical/
    voc/
    vsc/
    bme688/
    bme690/
    humidity/
    moisture/
  thermal/
    infrared/
    temperature/
    heatmap/
  tactile/
    pressure/
    movement/
    strain/
    vibration/
  metadata/
  manifests/
  fingerprints/
```

For each recording or observation folder, store:

- raw file or files
- `metadata.json`
- `manifest.json`
- checksum information
- source device/sample/site context
- generated preview artifacts where useful:
  - waveform
  - spectrogram
  - heat map
  - gas profile
  - pressure map
  - spectrum summary
- `fingerprint.json` for Nature Learning Model fingerprints

#### Backend Request for Cursor

Mount and expose the real NAS Library storage everywhere MINDEX needs it:

- MINDEX VM `192.168.0.189`
- MINDEX API container
- MINDEX ETL/scheduler container
- website sandbox VM `187`
- production website runtime if needed

Set a stable server-side env var such as:

- `MINDEX_LIBRARY_ROOT=/mnt/nas/mindex/Library`

Then implement canonical MINDEX backend routes:

- `GET /api/mindex/library/catalog`
- `GET /api/mindex/library/blobs?category=...&sensor_type=...&device_id=...&q=...&limit=...&offset=...`
- `GET /api/mindex/library/blobs/{blob_id}`
- `GET /api/mindex/library/blobs/{blob_id}/stream`
- `GET /api/mindex/library/blobs/{blob_id}/waveform`
- `GET /api/mindex/library/blobs/{blob_id}/spectrogram`
- `GET /api/mindex/library/blobs/{blob_id}/fingerprint`
- `GET /api/mindex/library/blobs/{blob_id}/visualization`
- `POST /api/mindex/library/import` for local/NAS import jobs

Backend blob rows must include enough metadata for real browsing and playback:

- id
- category
- sensor type
- device id/name
- recorded time
- duration
- sample rate
- frequency range
- units
- mime type
- codec
- file name
- file size
- storage object id
- storage URI
- stream URL
- preview URLs
- waveform/spectrogram/heatmap/gas/pressure preview references
- organism/taxon/sample/site context
- calibration context
- environment context
- fingerprints
- embedding/vector reference when available
- integrity record
- ledger anchor
- provenance

#### NLM Training Data Catalog Intake

Use the owner-provided source files as the initial download/import catalog:

- `C:\Users\Owner1\Downloads\NLM_Training_Data_Catalog.pdf`
- `C:\Users\Owner1\Downloads\NLM_TRAINING_DATA_SOURCES.md`

The PDF priority stack says to start with:

1. ShipsEar + DS3500 + PANNs for initial vessel classification
2. MBARI Pacific Sound + SanctSound for ambient baseline training
3. GEBCO 2025 + WMM2025 + EMAG2v3 for environmental context layers
4. PAMGuard as a real-time inference framework beside NLM custom models
5. NOAA AccessAIS for acoustic-AIS correlation and validation
6. BEATs/PANNs fine-tuning on Watkins/WHOI + DCLDE
7. DroneAudioset + Xeno-canto for aerial detection
8. NAVOCEANO MOODS access through the Zeetachec Navy contracting path if access is required

From `NLM_TRAINING_DATA_SOURCES.md`, prioritize these available P0/P1 sources first:

- NOAA NRS passive acoustic data
- MBARI / Pacific Sound
- SanctSound
- NCEI Passive Acoustic Data collection
- NOAA SeaSounds
- Glacier Bay hydrophone data
- ShipsEar
- DeepShip
- DS3500
- Watkins / WHOI marine mammal database
- DCLDE
- NOAA Fisheries marine mammal acoustics
- Macaulay Library where terms allow
- AudioSet
- ESC-50
- UrbanSound8K
- FSD50K
- GEBCO
- WMM2025
- EMAG2v3
- NOAA AccessAIS
- PAMGuard
- PANNs and BEATs model weights where license terms allow

Any restricted, paid, academic, defense, or access-request source must be marked as `needs_access` or `restricted` in manifests. Do not create fake downloaded rows for sources that were not actually downloaded.

#### Downloader / Import Job Requirements

Create repeatable ETL/import jobs that:

- read the Markdown/PDF source catalog
- download allowed datasets into the NAS Library structure
- store manifests and checksums
- preserve source URLs, license/access status, and citation metadata
- split files into the correct sensor categories
- generate preview artifacts used by the frontend players
- generate or queue Nature Learning Model fingerprints
- register rows in MINDEX tables for search, Data tab browsing, Library browsing, integrity, and future ledger anchoring
- skip or mark restricted sources clearly instead of pretending they are loaded

#### Category-Agnostic Library Format Contract

This logic must apply to every Library category and every current or future file type, not only acoustic/audio/video.

MINDEX Library categories are open-ended. The first six UI categories are:

- `spectral`
- `acoustic`
- `bioelectric`
- `chemical`
- `thermal`
- `tactile`

But backend must allow future categories without frontend code changes. For every file/blob in every category:

- Discover the category from the NAS folder path, manifest, or ingestion metadata.
- Keep source categories inside the files and storage hierarchy, not as separate duplicate UI containers.
- Parse and store category-specific structured channels where possible.
- Store a generic manifest for every blob.
- Store category-specific visualization metadata for every blob.
- Return enough metadata for the frontend to choose the correct player/visualizer.
- Never fabricate records when a source or file is missing.
- Mark each blob with a clear playback/visualization state.

The Library API must support these broad playback classes:

- Media stream playback: audio/video/image where browser-compatible.
- Numeric signal playback: CSV/JSON/HDF5/NetCDF/BIN/DAT/TXT parsed into sample channels.
- Spatial playback: LiDAR/radar/point-cloud/geospatial/raster structures.
- Chemical playback: VOC/VSC/gas/humidity/moisture channels plus molecular/compound metadata where relevant.
- Bioelectric playback: fungal computer interface, electrode, magnetic, RF, Wi-Fi, Bluetooth, and other signal traces.
- Tactile playback: pressure, touch, movement, vibration, accelerometer/IMU, actuator, motor, servo, stepper, propeller, leg, joint, and robot-arm channels.
- Thermal playback: infrared images/video, temperature matrices, heat maps, and time-series traces.

Suggested category-agnostic manifest fields:

- `blob_id`
- `category`
- `subcategory`
- `sensor_type`
- `recording_group`
- `source_name`
- `source_url`
- `license`
- `relative_path`
- `file_name`
- `extension`
- `mime_type`
- `size_bytes`
- `modified_at`
- `checksum`
- `preview_artifacts`
- `visualization_type`
- `visualization_status`
- `playback_status`
- `stream_url`
- `transcode_url`
- `metadata`
- `channels`

Suggested channel fields for parsed sensor data:

- `id`
- `label`
- `kind`
- `axis`
- `unit`
- `sample_rate_hz`
- `samples`
- `min`
- `max`
- `mean`
- `device_id`
- `sensor_id`
- `actuator_type`

#### SINE Acoustic Playback and Pattern Recognition Requirements

Acoustic is not a generic audio player. It needs the SINE stack: water/air acoustic playback, visual analysis, event detection, and pattern recognition.

SINE must support both underwater and airborne recordings:

- underwater hydrophone and transducer recordings
- air microphone and ultrasonic recordings
- contact/audio recordings where relevant

SINE must classify and visualize different pattern spaces:

- water: whales, dolphins, marine propellers, explosions, sonar tones, underwater machinery, reef/river/lake events
- air: birds, insects, drone propellers, aircraft/mechanical hums, tones, alarms, sharp acoustic events

Required backend behavior:

- Ingest audio files from `MINDEX/Library/acoustic/...`.
- Preserve the source context: `water`, `air`, or `unknown`.
- Run codec/probe validation as described below.
- Generate or store waveform previews, spectrogram previews, frequency-band summaries, and event markers.
- Detect acoustic spikes/events with onset, offset, peak time, amplitude, and frequency estimate.
- Return SINE pattern matches where recognition exists.
- Keep raw spikes separate from confirmed matches. Do not pretend an unclassified spike is a whale, bird, drone, etc.
- Expose `acoustic_environment`, `acoustic_events`, `frequency_detections`, `activity_segments`, `bird_detections`, `uav_detections`, `nps_detections`, `sine_matches`, and/or `pattern_matches` through `GET /api/mindex/library/blobs` and detail endpoints.
- Add a larger detail endpoint for full spectrogram/pattern payloads when the list endpoint would be too large.
- Do not return fake detector rows or example labels. If an analyzer has not run, return empty arrays plus machine-readable status.
- Store real FFT/spectrogram artifacts or frequency-bin payloads. The frontend should not have to invent a decorative spectrogram from bytes.

Suggested SINE match fields:

- `id`
- `label`
- `kind`
- `species`
- `source_type`
- `environment`
- `start_seconds`
- `end_seconds`
- `peak_seconds`
- `frequency_hz`
- `amplitude`
- `confidence`
- `model_name`
- `model_version`
- `reference_id`

Frontend expectation:

- Acoustic files render in the SINE acoustic player.
- The player can switch between water and air recognition spaces.
- Waveform, spectrogram, spike/event markers, and recognized patterns are shown in one acoustic analysis surface.
- Confirmed pattern matches show confidence and time/frequency context.
- Unclassified spikes remain labeled as spikes/events until classified.

#### Bosch-Style Chemical Gas and Particle Playback Requirements

Chemical playback needs to support Bosch BME AI-Studio style gas fingerprinting and Bosch particulate sensors, not only generic charts.

Official references to research and integrate:

- Bosch Sensortec BME688: https://www.bosch-sensortec.com/products/environmental-sensors/gas-sensors/bme688/
- Bosch BME688/BME690 software and BME AI-Studio: https://www.bosch-sensortec.com/en/software-tools/software/bme688-and-bme690-software
- Bosch BME AI-Studio getting started docs: https://www.bosch-sensortec.com/software/bme/docs/overview/getting-started.html
- Bosch Sensortec BMV080: https://www.bosch-sensortec.com/en/products/environmental-sensors/particulate-matter-sensor/bmv080/

Required backend behavior:

- Ingest chemical blobs from `MINDEX/Library/chemical/...`.
- Support BME688 and BME690 gas-resistance/heater-profile blob data.
- Support VOC, VSC, humidity, moisture, pressure, temperature, and gas scan channels.
- Support BMV080 particulate channels: PM1, PM2.5, PM10, and particle-related metadata.
- Research whether Bosch exposes usable APIs/export formats for BME AI-Studio/BSEC workflows. If direct API use is not available, build a compatible MINDEX chemical fingerprint pipeline using exported data/manifests.
- Preserve sensor model, firmware/library version, heater profile, sample rate, calibration status, and environmental compensation metadata.
- Return `preview_channels` for gas and particle playback.
- Return `chemical_fingerprints` for classified smell/gas/chemical blob patterns.
- Do not claim precise individual VOC concentrations unless the source data and calibration support that claim.
- Mark files as `needs_profile`, `needs_calibration`, `needs_parser`, `classified`, or `unsupported_format` as appropriate.

Suggested chemical channel kinds:

- `voc`
- `vsc`
- `gas_resistance`
- `humidity`
- `moisture`
- `temperature`
- `pressure`
- `heater_temperature`
- `pm1`
- `pm2_5`
- `pm10`
- `particle_count`

Suggested chemical fingerprint fields:

- `id`
- `label`
- `class_name`
- `source`
- `sensor_model`
- `confidence`
- `profile_id`
- `calibration_id`
- `model_name`
- `model_version`

Frontend expectation:

- Chemical files render in a Bosch-style gas and particle playback surface.
- BME688/BME690 blobs show VOC/VSC/gas/humidity/moisture/temperature/pressure traces.
- BMV080 blobs show PM1/PM2.5/PM10 particle traces.
- Classified fingerprints show confidence and sensor/profile context.
- Unknown or unclassified chemical blobs show measurements without fabricated identity.

#### Spectral Spatial and Electromagnetic Playback Requirements

Spectral must not be a clone of the fungi-compute FCI player. It is for spatial, color, electromagnetic, RF, radiation, video, and sensing-spectrum data.

Spectral must support:

- 3D color/color-volume data
- LiDAR and point-cloud captures
- radar signatures
- radiation and Geiger measurements
- Wi-Fi sensing, Wi-Fi RSSI/CSI, and Bluetooth/BLE measurements
- RF/electronic radio measurements
- infrared/IR visual-like spectrum captures
- video and camera-derived spectral features
- multispectral/hyperspectral captures

Required backend behavior:

- Ingest spectral files from `MINDEX/Library/spectral/...`.
- Parse file families such as LAS/LAZ, point clouds, radar traces, RF logs, Wi-Fi/Bluetooth scans, radiation logs, infrared/video/image files, NetCDF/HDF5/TIFF/CSV/JSON where available.
- Return category-specific `preview_channels` for spatial, radio, radiation, infrared, visual, and spectral bands.
- Return `spectral_features` for recognized signatures or extracted features.
- Generate preview artifacts for point clouds, color volumes, radar/range traces, radio/RSSI/CSI traces, radiation time series, and video/image frames.
- Use streaming/detail endpoints for large point cloud/video/raster payloads.
- Mark unparsed files as `needs_parser` or `unsupported_format`; do not fake features.

Suggested spectral channel kinds:

- `lidar`
- `point_cloud`
- `depth`
- `radar`
- `range`
- `radiation`
- `geiger`
- `wifi`
- `wifi_csi`
- `wifi_rssi`
- `bluetooth`
- `ble`
- `radio`
- `rf`
- `infrared`
- `video`
- `color`
- `hyperspectral`
- `multispectral`

Suggested spectral feature fields:

- `id`
- `label`
- `kind`
- `band`
- `value`
- `unit`
- `confidence`
- `source_frame`
- `model_name`
- `model_version`

Frontend expectation:

- Spectral files render in a spatial/electromagnetic player.
- Image/video files show actual media previews.
- LiDAR/radar/radio/radiation/infrared/visual data show their own visualizations and signatures.
- The Spectral player must not reuse the FCI oscilloscope/spectrogram as its primary UI.

#### Thermal Video, Infrared, and Temperature Playback Requirements

Thermal must be a real thermal/infrared instrument surface, not a generic signal chart.

Thermal must support:

- thermal video files
- infrared video files
- infrared image frames
- thermal camera frame sequences
- calibrated temperature measurements
- heat maps from specific sensor arrays
- BME temperature channels
- BMI temperature channels
- BMP temperature channels
- thermistors
- thermocouples
- DS18B20/TMP-style temperature sensors
- MLX/FLIR/Seek-style infrared/thermal arrays where present

Required backend behavior:

- Ingest thermal files from `MINDEX/Library/thermal/...`.
- Parse thermal image/video metadata and return browser-playable preview/stream URLs where possible.
- Preserve raw thermal frame data or frame summaries through detail endpoints for high-efficiency playback.
- Return `preview_channels` for temperature, infrared, heat-map, thermal-camera, BME/BMI/BMP, thermistor, thermocouple, and other sensor channels.
- Store and return the source temperature unit for each channel: Celsius, Fahrenheit, Kelvin, or unknown.
- Normalize temperature display server-side where possible, but do not lose the source unit.
- Provide calibrated min/mean/max values when calibration exists.
- Provide a heat-map preview artifact for thermal arrays or frame sequences.
- Support large payloads with paged/detail endpoints so the list API stays fast.
- Mark uncalibrated thermal intensity as relative heat, not real temperature.
- Mark files as `calibrated`, `uncalibrated`, `needs_calibration`, `needs_parser`, or `unsupported_format`.

Suggested thermal channel kinds:

- `temperature`
- `infrared`
- `thermal_camera`
- `thermal_frame`
- `heat_map`
- `bme_temperature`
- `bmi_temperature`
- `bmp_temperature`
- `thermistor`
- `thermocouple`
- `ds18b20`
- `mlx_thermal_array`
- `flir_thermal_frame`

Suggested thermal fields:

- `temperature_unit`
- `source_unit`
- `calibration_status`
- `emissivity`
- `ambient_temperature`
- `reflected_temperature`
- `frame_rate`
- `frame_count`
- `width`
- `height`
- `min_temperature`
- `mean_temperature`
- `max_temperature`
- `heatmap_preview_url`
- `thermal_video_url`

Frontend expectation:

- Thermal files render in a thermal video and temperature player.
- Infrared images/videos play or display directly when browser-compatible.
- Heat maps render from real thermal arrays or frame summaries.
- Temperature traces can be displayed in Fahrenheit, Celsius, and Kelvin.
- Uncalibrated data is shown as relative heat intensity, not fake real temperature.

#### Tactile and Actuator Playback Requirements

Tactile is not an audio/video category. It needs an instrument-style playback surface.

Backend must parse tactile files into structured channels for:

- pressure maps
- touch/contact events
- force/load cells
- accelerometer/IMU movement
- vibration/oscillation
- strain
- actuator position
- motor speed/current/torque
- servo angle
- stepper position/steps
- propeller output/RPM
- robot leg/joint/arm movement

This should work for Mycosoft devices and third-party devices. A quadcopter with four propellers, a walking robot with four/six/eight legs, or a robot arm actuator all count as tactile/actuator telemetry when the data is recorded for movement, pressure, vibration, force, contact, or mechanical playback.

Required backend behavior:

- Ingest tactile files from `MINDEX/Library/tactile/...`.
- Infer or read the device/rig layout from metadata or file manifest.
- Preserve per-channel names like `front_left_motor`, `leg_3_joint_2`, `servo_elbow`, `imu_x`, `imu_y`, `imu_z`, `pressure_cell_14`.
- Return `preview_channels` and/or `actuator_channels` in `GET /api/mindex/library/blobs`.
- Include units where possible: `g`, `m/s2`, `Pa`, `N`, `rpm`, `deg`, `steps`, `mA`, `V`, `Nm`.
- Include enough samples for visual playback and detail endpoints for larger payloads.
- Generate tactile visualization metadata for pressure grids, movement graphs, vibration bars/spectra, and actuator timelines.
- If a file cannot be parsed into tactile channels, mark `visualization_status` as `needs_parser` or `unsupported_format`; do not fake channels.

Frontend expectation:

- Pressure/touch files render a pressure field and pressure graph.
- Accelerometer/IMU files render movement axes.
- Vibration files render vibration intensity/spectrum playback.
- Actuator/motor/servo/stepper/propeller/leg/joint/arm files render actuator channel timelines and current positions.
- Generic audio/video players must not be used for tactile unless the tactile file itself is also a legitimate media file.

#### Codec and Playback Validation Requirements

Cursor/backend must own media validation so the frontend can trust each Library blob before trying to play it.

For every imported or manually added media blob in every category:

- Run a server-side media probe, preferably with `ffprobe` / FFmpeg where available.
- Store codec metadata in the blob record and manifest:
  - container format
  - audio codec
  - video codec
  - sample rate
  - channel count
  - bit depth where available
  - duration
  - bitrate
  - width/height for video/images
  - frame rate for video
  - MIME type
  - whether browser playback is expected to work
- Generate browser-compatible previews when needed:
  - audio: WAV, MP3, AAC, or OGG preview/stream variant
  - video: MP4/H.264/AAC or WebM preview/stream variant
  - waveform data/image
  - spectrogram data/image for audio
  - thumbnail for video/image
- Do not rely on the browser to discover unsupported codecs after the user clicks play.
- Mark unsupported or unprobed media with a clear backend status:
  - `playable`
  - `needs_transcode`
  - `probe_failed`
  - `unsupported_codec`
  - `restricted`
  - `missing_file`
- Expose playback/probe status through:
  - `GET /api/mindex/library/blobs`
  - `GET /api/mindex/library/blobs/{blob_id}`
  - `GET /api/mindex/library/blobs/{blob_id}/visualization`

Frontend smoke test expectation:

- A test WAV in `MINDEX/Library/acoustic/...` should appear in the file list and play through the in-app audio control.
- A test MP3 or OGG should also play if browser-supported.
- An unsupported audio file should show `needs_transcode` or `unsupported_codec` from backend metadata, not silently fail.
- A test MP4/WebM in a video-capable category should display controls and play if browser-supported.
- If a video requires transcoding, the backend should provide a preview/transcode URL or mark it `needs_transcode`.

Suggested manifest fields:

- `source_id`
- `source_name`
- `source_url`
- `license`
- `access_status`
- `downloaded_at`
- `category`
- `sensor_type`
- `file_count`
- `total_bytes`
- `checksums`
- `preview_artifacts`
- `fingerprint_status`
- `media_probe`
- `playback_status`
- `transcode_status`
- `notes`

#### Acceptance Criteria

- The NAS folder `MINDEX/Library` is mounted and visible to MINDEX API/ETL and the website runtime.
- Adding a test audio file under `MINDEX/Library/acoustic/...` makes it appear in the Library acoustic table and play with the in-app audio player.
- Adding a numeric CSV/JSON under `bioelectric`, `spectral`, `chemical`, `thermal`, or `tactile` makes it appear and render in the correct player/visualizer.
- `GET /api/mindex/library/catalog` returns nonzero counts once files are present.
- `GET /api/mindex/library/blobs?category=acoustic` returns real NAS-backed rows with stream URLs.
- No fake blob records are returned.
- No absolute NAS paths, credentials, or VM details are exposed to the browser.
- NLM source downloads are represented by real manifests and checksums.
- Restricted sources show `needs_access` or `restricted`, not fabricated data.
- Library records are searchable through the unified MINDEX Data/Search backend once Request 011 is implemented.
- Audio and video blobs include probe/codec/playback metadata.
- Browser-compatible audio/video previews are generated or the blob is marked `needs_transcode` / `unsupported_codec`.
- Test WAV/MP3/OGG audio files can be streamed and played from the MINDEX Library tab.
- Test MP4/WebM video files can be streamed and played where supported.

---

## Final Integrated Handoff - Make MINDEX Real Across Data, Apps, MAS, Supabase, NAS, and MYCA

Date added: 2026-06-03

This is the final high-priority Cursor/backend handoff for the current MINDEX frontend state.

The frontend has been reshaped so MINDEX is no longer just a set of disconnected decorative panels. The app now expects MINDEX to be the real Mycosoft data operating system:

- `Overview`
- `Data`
- `Library`
- `Encyclopedia`
- `Pipeline`
- `Integrity`
- `Ledger`
- `Network`
- `Bio`
- `Chemistry`
- `M-Wave`
- `Agents`

The Data tab is the primary product surface. Every other tab is a specialized view of the same underlying MINDEX records.

### Non-Negotiable Product Contract

MINDEX must become the canonical, queryable, row-level data layer for Mycosoft.

Cursor/backend must make this true:

- Every taxon ID must resolve correctly across observations, profiles, images, synonyms, genomes, traits, compounds, publications, ancestry, chemistry, and training data.
- `core.taxon`, `core.observation`, `core.observation_media`, `core.taxon_external_id`, `bio.genome`, `bio.genetic_sequence`, `bio.trait`, `bio.taxon_synonym`, `chem.compound`, `chem.taxon_compound`, `chem.reaction`, `library.blob`, `library.manifest`, `training.dataset`, `training.sample`, `training.model_weight`, `device.registry`, `device.telemetry`, `earth.domain`, `mwave.signal`, `mwave.correlation`, `integrity.record`, and `ledger.anchor` must be accessible through real APIs.
- The Data tab must not show only aggregate metric rows for important tables. It must show real rows, real schema, real relationships, real provenance, search, filters, and row details.
- Old archived data, active data, unused training data, NLM-used training data, data not yet used, model weights, sensor blobs, observations, species profiles, chemistry, genetic records, and device records must all be discoverable from Data.
- All Mycosoft apps must use MINDEX IDs and routes, not their own disconnected copies.
- Public fallback APIs can be used for ETL/intake, but app search/profile rendering must prefer stored MINDEX records and clearly report missing MINDEX ingestion rather than silently substituting live public data.
- No fake/mock records.
- No UI credential prompts.
- No frontend-only fixes for missing backend data.

### P0 Backend Data Model Fixes

Cursor must repair or create the canonical all-life MINDEX joins.

Required all-life taxonomy fixes:

- Repair `bio.taxon_full` or create a durable replacement view for all-life profiles.
- Ensure `core.taxon` is not fungi-only.
- Ensure all kingdoms/domains can be represented: fungi, plants, animals, bacteria, archaea, protists, viruses/other where policy allows.
- Normalize source external IDs into `core.taxon_external_id`.
- Resolve iNaturalist IDs, GBIF keys, MycoBank IDs, GenBank/NCBI taxonomy IDs, PubChem/ChemSpider links, and internal MINDEX UUIDs to one canonical taxon row.
- Create a taxon alias/synonym resolver that supports scientific names, common names, spelling variants, apostrophes, historical synonyms, and source-specific names.
- Backfill observation `taxon_id` values so observations do not appear as disconnected rows.
- Add a repair job that scans observations where `taxon_id` is null/unresolved and resolves them through `core.taxon_external_id` and synonym tables.
- Expose join health counts: unresolved observations, unresolved media, unresolved compounds, unresolved genomes, unresolved traits, unresolved synonyms, unresolved publications.

Required row-level table APIs:

- `GET /api/mindex/data/tables`
- `GET /api/mindex/data/tables/{schema}.{table}`
- `GET /api/mindex/data/tables/{schema}.{table}/rows?limit=&offset=&q=&filters=`
- `GET /api/mindex/data/tables/{schema}.{table}/rows/{id}`
- `GET /api/mindex/data/tables/{schema}.{table}/relationships`
- `GET /api/mindex/data/search?q=&type=&limit=&offset=`
- `POST /api/mindex/data/query` for safe structured filtering only, not arbitrary SQL from browser clients.

Each table endpoint must return:

- stable row ID
- schema and table
- columns and types
- row count
- page info
- rows
- provenance/source metadata
- row relationships
- related app links
- integrity/hash state
- last ETL/source update

### P0 Website BFF / Middle-Layer Fixes

The website BFF under `/api/natureos/mindex/*` must become a faithful, safe proxy to the real MINDEX data APIs.

Required:

- Add BFF routes for the row-level data endpoints above.
- Remove any UI dependence on aggregate-only table summaries for Data tab tables.
- Replace hardcoded search buckets with backend-returned buckets and facets.
- Keep `/api/natureos/mindex/search` MINDEX-first.
- Do not depend on direct browser calls to unproxied `/api/mindex/*` routes unless they are first-class website routes.
- Centralize auth/retry/timeout behavior for all MINDEX BFF calls.
- Prevent absolute NAS paths, private VM paths, internal hostnames, tokens, and credentials from leaking to the browser.
- Return human-usable error states, but do not put backend jargon into MYCA readouts.
- Add route health payloads for each tab so UI can show real status without guessing.

### P0 MAS / MYCA / Memory Integration

The Data tab MYCA harness must use MAS MYCA MINDEX Orchestrator capabilities while remaining bound to the MINDEX app.

Required:

- MAS must expose a MINDEX Data analysis endpoint that receives selected table, selected row, filters, visible search results, provenance, and related datasets.
- MYCA must write durable context/memory that she saw and interpreted MINDEX Data selections.
- MYCA memory should be scoped so MINDEX Data knowledge can help Earth Simulator, Ancestry, Search, Chemistry, Biology, Fungi Compute, and lab tools without causing unrelated app actions.
- MYCA readouts must be plain human information: no "backend", "ETL", "join pending", "HTTP 503", "route failed", or implementation jargon in user-facing explanation text.
- Keep technical diagnostics in operator panels, logs, or Agents tab, not MYCA's human explanation.
- Support voice and bridge tools through MAS when available, but keep this harness MINDEX-bound.
- Add a MAS task type for "MINDEX data repair request" so the UI/Agents tab can submit specific backend work with table/row context.

Suggested MAS routes:

- `POST /api/myca/mindex/data/analyze`
- `POST /api/myca/mindex/data/memory`
- `POST /api/myca/mindex/data/repair-request`
- `GET /api/myca/mindex/data/context/{session_id}`

### P0 Supabase / MicoForge / Inventory Integration

Device inventory in MINDEX must connect to the MicoForge/Supabase inventory system rather than empty or broken routes.

Required:

- Identify the active MicoForge Supabase project and tables.
- Map parts, BOMs, devices, completed builds, deployed builds, repairs, firmware, and inventory stock into MINDEX.
- Expose inventory rows through MINDEX data APIs.
- Link completed physical devices to `device.registry`.
- Link device parts/BOMs to telemetry devices where possible.
- Ensure Mushroom One, Hypha One, and the Satherella buoy are represented as registered devices even if one is serial/offline/firmware-in-progress.
- Fix Mushroom One status so MQTT/live telemetry overrides stale offline status.
- Do not expose Supabase secrets to the frontend.

### P0 NAS / Library / Training Data Integration

The NAS-backed Library must be a real file/data browser and playback system.

Required:

- Mount and scan `MINDEX/Library`.
- Support category folders: `spectral`, `acoustic`, `bioelectric`, `chemical`, `thermal`, `tactile`, plus future categories.
- Ingest files into `library.blob` and `library.manifest`.
- Store checksums, sizes, MIME, codecs, source path, safe stream URL, preview artifacts, parsed channels, provenance, and training usage.
- Store NLM training catalog data in NAS and MINDEX tables, including data used, data not yet used, source datasets, manifests, checksums, model weights, experiments, and training runs.
- Download/ingest available source datasets from the provided NLM training data catalog and sources document.
- Keep source categories inside file manifests and file rows, not duplicated as static UI blocks.
- Create detail APIs for large media/point-cloud/thermal/audio/sensor payloads.

Required training-data tables or equivalents:

- `training.dataset`
- `training.source`
- `training.sample`
- `training.blob`
- `training.manifest`
- `training.model`
- `training.model_weight`
- `training.run`
- `training.embedding`
- `training.label`
- `training.split`

### P0 Search Contract

Search must search all MINDEX data, not only a handful of frontend buckets.

Required:

- Search all table rows, species, observations, mapped Earth data, devices, compounds, genes, genomes, traits, publications, synonyms, taxon IDs, external IDs, library blobs, training files, model weights, archived datasets, app records, and integrity anchors.
- Search must resolve common names like "lion's mane" to `Hericium erinaceus` through real synonym/common-name tables.
- Search result rows must include related IDs and navigation targets.
- Search must work across old archived and new active data.
- Search must expose facets by domain: Taxonomy, Observations, Library, Chemistry, Genomics, Devices, Earth, Training, Integrity, Ledger, M-Wave, App records.
- Search must be available to all apps, not only the MINDEX app.

Suggested shared route:

- `GET /api/mindex/search`
- `GET /api/natureos/mindex/search`
- `GET /api/search/mindex`

All three should use the same backend search service or BFF adapter.

### Cross-App MINDEX Data Consumers

The following apps must consume the same MINDEX records and canonical IDs:

- Earth Simulator
- Nature Statistics
- Ancestry
- Petri Dish Simulator
- Aerosol
- Global Search
- Compound Analyzer
- Biology Simulator
- Fungi Compute
- NLM Training Dashboard
- MYCA AI Studio
- Science pages
- Lab tools
- Any future NatureOS/MYCOSOFT science app

Required:

- Every app must be able to ask MINDEX for a canonical record by ID.
- Every app must be able to search MINDEX.
- Every app must be able to open related records in MINDEX Data.
- Earth Simulator must use MINDEX Earth/device/observation/library data.
- Ancestry must use MINDEX all-life taxonomy/profiles and feed Encyclopedia.
- Encyclopedia must render from the same profile tables that Ancestry uses.
- Compound Analyzer and Chemistry must use the same chemistry tables and molecule/media assets.
- Biology Simulator and Bio tab must use the same genome/trait/taxon/observation records.
- Fungi Compute and M-Wave must use the same sensor/FCI/bioelectric/earthquake correlation records.
- NLM Training Dashboard must use MINDEX training datasets, library blobs, labels, weights, and run records.
- MYCA AI Studio must be able to retrieve and reason over MINDEX data context with persistent memory.

### Tab-by-Tab Cursor Requirements

#### Overview

Backend requirements:

- Return correct all-life taxon counts, not fungi-only counts.
- Return complete Earth Simulator domain counts and details.
- Return complete Data Sources coverage including PubChem, ChemSpider, GenBank, GBIF, iNaturalist, MycoBank, FungiDB, publications, media, Wikipedia/Mushroom.World, ancestry enrichment, NLM/training sources, device telemetry, library/NAS sources, and Earth/OEI feeds.
- Return biological counts for genomes, genetic sequences, traits, synonyms, compounds, media, taxa with images, observations, and unresolved joins.
- Return live Mycosoft device summary from MQTT/registry/serial state.

Frontend requirements:

- Remove redundant Federation/Counts concepts.
- Keep Overview as a high-level live summary with drill-through links into Data.
- Apply the black/white transparent frosted-glass style and Petri/MycoBrain glass button style consistently.

#### Data

Backend requirements:

- Replace aggregate metric rows with real row-level data for every MINDEX table.
- Add real APIs for schema, rows, relationships, filters, search, facets, provenance, integrity state, and related apps.
- Include all missing rows from `bio.genome`, `bio.trait`, `bio.taxon_synonym`, `chem.taxon_compound`, and all other currently empty/aggregate tables.
- Include archived, training, unused, used, and model-weight data.
- Add taxon ID repair and relationship repair jobs.

Frontend requirements:

- Data must remain a full-screen workbench with table browser, result grid, row details, and MYCA analysis.
- Data must not be a duplicate list of other tabs.
- MYCA panel must use human language and persistent memory.
- Data search must query all MINDEX data, not only visible rows.

#### Library

Backend requirements:

- Implement all category-agnostic file contracts above.
- Provide real NAS-backed blobs, previews, stream URLs, parsed channels, media probes, transcoding status, and source/training usage.
- Implement SINE acoustic, Bosch chemical/particle, spectral spatial/electromagnetic, thermal, tactile/actuator, and bioelectric parsers.
- Integrate Deep Signal for the acoustic SINE identification app: https://github.com/dimastatz/deep-signal
  - Treat SINE acoustic as one Audio Identification app, not separate disconnected panels.
  - Use Deep Signal-style batch/stream processing for audio files where practical, especially for acoustic library blobs from hydrophones, transducers, microphones, contact microphones, and ultrasonic microphones.
  - Store and expose identification outputs for environmental sound, bioacoustic calls, mechanical signatures, speech content, speaker, emotion, language/dialect, background noise, temporal patterns, and anomalies.
  - Add a route such as `GET /api/mindex/library/blobs/{blob_id}/identification` and/or include summarized fields on `GET /api/mindex/library/blobs`.
- Frontend already accepts these blob fields when present: `analysis_engine`, `identification_status`, `identification_summary`, and `deep_signal_matches`.
- Each `deep_signal_matches` row should include: `label` or `class_name`, `category`, `confidence`, `start_seconds`, `end_seconds` or `peak_seconds`, optional `frequency_hz`, `environment` (`water`, `air`, `unknown`), optional `speaker`, `emotion`, `language`, `transcript`, `anomaly_score`, `background_noise_db`, `engine`, and `model`.
- Add dedicated detector outputs requested by Morgan:
  - Frequency detection using the Arduino Audio Tools simple-frequency-detection approach where useful: https://github.com/pschatzmann/arduino-audio-tools/wiki/Simple-Frequency-Detection
  - Bird detection integration/reference: https://github.com/microsoft/acoustic-bird-detection
  - Acoustic activity detection / segmentation integration/reference: https://github.com/amsehili/auditok
  - UAV/drone acoustic identification integration/reference: https://github.com/pcasabianca/Acoustic-UAV-Identification
  - National Park Service acoustic event discovery/reference library: https://github.com/nationalparkservice/acoustic_discovery
- Normalize these analyzer outputs into `frequency_detections`, `activity_segments`, `bird_detections`, `uav_detections`, and `nps_detections` so the SINE player, Data tab, Search, MYCA, and future training tools all consume the same records.
- Persist results in MINDEX tables, not only transient API responses, so Data tab, Search, Library, M-Wave, MYCA analysis, and future training dashboards can use the same identification records.
- Do not fake classifications. If analysis has not run, return an empty `deep_signal_matches` array and a clear machine-readable status such as `pending`, `queued`, `running`, `complete`, or `failed`.

Frontend requirements:

- Keep player at the top.
- Files live under Storage/right rail above File details.
- File categories are represented by actual file groups/folders, not a separate static container.
- No Devices panel inside Library.
- The acoustic player is now a single SINE Audio Identification surface with playback, waveform energy, frequency peaks, activity regions, saved detector intervals, Deep Signal/SINE matches, and identified pattern results.
- The frontend now renders only real selected-file audio data and saved backend detector rows. It does not show example classifier labels, fake pattern targets, or byte-derived mock waveforms.

#### Encyclopedia

Backend requirements:

- Fix all-life taxon profiles.
- Repair `bio.taxon_full` or equivalent.
- Provide complete profile pages: taxonomy, common names, synonyms, images, observations, genome/genetics, traits, compounds, publications, media, ancestry links, map context, and source provenance.
- Ensure Ancestry and Encyclopedia use the same canonical profile data.

Frontend requirements:

- Do not show backend diagnostic explanations to users.
- If data is missing, show a human product-level empty state and a Data/Agents diagnostic link for operators.
- Add selectable profile details and media/profile tabs once backend profile data is available.

#### Pipeline

Backend requirements:

- Fix ETL intervals: no important job should sit at 168 hours.
- Observations/media/nature feeds should run hourly where appropriate.
- PubChem/ChemSpider should run daily.
- Ancestry enrichment should run hourly.
- Publications can run every 48 hours.
- Civic viewport/election-like data can run every 48 hours unless active event periods require more.
- Expose source freshness, next run, last successful run, failures, and row deltas.

Frontend requirements:

- Pipeline can remain operational, but should display source freshness and actual row deltas.

#### Integrity

Backend requirements:

- Implement `/api/mindex/integrity/summary`, `/anchors/recent`, and `/integrity/stream` reliably.
- Set up Bitcoin local node path via Umbrel or documented LAN node config.
- Choose Solana rail: QuickNode or another reliable endpoint; local Solana full node is not required unless proven feasible.
- Define and implement Hypergraph/DAG rail.
- Define Platform One/Iron Bank/PartyBus integrations and status checks.
- Remove credential/env setup from UI; backend/operator config only.
- Hash chain visualizer must receive real records/proofs.

Frontend requirements:

- Fix malformed summary/card layouts.
- Show terminal-like live status only if it is a real live operator console.
- No credential instructions in UI.

#### Ledger

Backend requirements:

- Configure Solana RPC URL, mint/token address, wallet status, and anchor service.
- Configure Bitcoin node status and ordinals/anchor rail.
- Configure Hypergraph/DAG anchor rail.
- Configure Platform One rail.
- Return clear status and recent anchor rows.

Frontend requirements:

- Fix card spacing/text overflow.
- Remove decorative block viz.
- Remove confusing live anchor tail unless backed by useful data.
- Do not show local VM credential instructions.

#### Network

Backend requirements:

- Rebuild around the Mycosoft device protocol.
- Track MQTT devices, serial devices, field Jetsons, NAS sync nodes, storage nodes, telemetry nodes, and offline/pending firmware devices.
- Implement local device storage plus central NAS backup/sync state.
- Track Mushroom One, Hypha One, and Satherella buoy accurately.

Frontend requirements:

- Focus on Mycosoft device protocol, not generic network filler.
- Show device storage plus central storage sync.

#### Bio

Backend requirements:

- Fix all-life stats, route health, live observations, taxon joins, genome records, trait records, synonyms, compounds, taxa with images, and image/media coverage.
- Remove redundant stat duplication by returning a clean biology summary and row-level drill-through links.
- Fix Ancestry kingdoms HTTP 503.
- Fix genome browser and tree/profile APIs or remove/replace dead surfaces until real.

Frontend requirements:

- Do not display "blocked" as a product concept.
- Avoid redundant cards.
- Show detailed biology data plane with drill-through to Data and Encyclopedia.

#### Chemistry

Backend requirements:

- Fix chemistry HTTP 500s.
- Populate compounds, taxon compounds, molecules, structures, interactions, reactions, byproducts, source publications, PubChem, ChemSpider, and taxon links.
- Provide 2D molecular images/SVG/PNG and 3D molecule payloads.
- Support chemical interaction and chemical-computing data.
- Research/integrate OpenChemistry, chemistry datasets, Cantera, DWSIM, and DNA/chemical computing resources from earlier request.

Frontend requirements:

- Replace blocked cards with real chemical computer panels.
- Use real molecular visualizations and interaction records.

#### M-Wave

Backend requirements:

- Connect M-Wave to Fungi Compute / fungal computer interface data.
- Ingest live earthquake data.
- Store and expose correlations between mycelium/bioelectric signals and earthquake signals before/during/after events.
- Provide prediction/correlation streams and historical replay.

Frontend requirements:

- Replace generic prediction stream with mycelium-signal/earthquake correlation surface.

#### Agents

Backend requirements:

- Agents tab should be a MINDEX database harness, not generic agent topology.
- Provide safe query/probe/repair-request routes.
- Let operators ask for table repair, row repair, source refresh, index rebuild, taxon join repair, library scan, and integrity rehash.

Frontend requirements:

- Keep it operator-facing.
- Show route health and query results.
- Do not expose secrets.

### Design / UI Requirements Across All Tabs

Cursor/frontend must finish the UI pass after backend data contracts are implemented:

- Apply the black/white transparent frosted-glass look used by Petri Dish Simulator and MycoBrain.
- Apply Petri Dish Simulator style glass buttons in dark and light mode.
- Remove malformed spacing, text overflow, and cramped cards.
- Avoid empty gaps and forced scrolling where responsive scaling can solve it.
- Use stable dimensions for players, tables, cards, and side panels.
- Keep operator diagnostics separate from human MYCA readouts.
- No mock/fake data.

### Final Acceptance Tests

Cursor/backend should not call this done until these tests pass locally and on the sandbox/public surface:

- Search "lions mane" returns `Hericium erinaceus`, observations, images/media, taxonomy, compounds, genetics, library records, and related source records where present.
- Data tab can open real rows for `core.taxon`, `core.observation`, `bio.genome`, `bio.trait`, `bio.taxon_synonym`, `chem.taxon_compound`, `library.blob`, `training.dataset`, `device.registry`, `earth.domain`, `mwave.signal`, and `integrity.record`.
- Encyclopedia can render an all-life profile for a fungus, plant, animal, bacterium/archaeon where data exists.
- Ancestry loads all-life kingdom/domain data and uses the same taxon/profile rows as Encyclopedia.
- Earth Simulator can open MINDEX-linked observations/devices/library records.
- Nature Statistics can read MINDEX counts and row-level details.
- Compound Analyzer/Chemistry can open compound/taxon-compound rows and molecule visual assets.
- Fungi Compute can open MINDEX bioelectric/library/FCI records.
- NLM Training Dashboard can open MINDEX training datasets, library blobs, manifests, and model weights.
- MYCA AI Studio can read MINDEX Data context and persist memory.
- Library plays/visualizes test files for acoustic, spectral, bioelectric, chemical, thermal, and tactile categories.
- No route returns 500/502/503 for required MINDEX app surfaces unless the response is a documented external outage with a recovery path.
- No UI shows secrets, credential setup, VM paths, or backend jargon to normal users.
