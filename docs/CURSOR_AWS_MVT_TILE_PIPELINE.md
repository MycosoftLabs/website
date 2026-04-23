# Cursor Handoff — AWS + MVT Tile Pipeline

**Date**: Apr 23, 2026
**Requester**: Morgan ("scale up fast now with aws compute/gpu/extra vms what can make this faster")
**Claude PRs referenced**: #124 cleanup, #125 service worker, #126 tile-render proxy endpoint, #127 web-worker decoder

Everything in this doc is for Cursor to execute against AWS + the existing Mycosoft infrastructure. Claude has shipped all the client-side code that consumes the tile pipeline; now we need the tile pipeline to actually produce and serve tiles.

Scope:
1. **AWS account setup** — IAM, billing, alarms
2. **Cloudflare R2 bucket** + worker
3. **MVT vector-tile baker** (ephemeral g6.xlarge OR local 4080B)
4. **GPU raster tile renderer** on 241 + 249 Legions
5. **Nightly cron**
6. **Website env wiring**
7. **Verification checklist**

---

## 1. AWS account setup

### 1.1 Account structure
- Create a new AWS account scoped to Mycosoft CREP compute (not tangled with any other Mycosoft AWS workloads).
- Root account email: `aws-crep@mycosoft.org` (or Morgan's preferred alias).
- Enable MFA on the root account immediately and lock the root credentials in 1Password.

### 1.2 IAM users
Create two IAM users:

| User | Purpose | Policies |
|---|---|---|
| `crep-baker-ephemeral` | Spin-up + tear-down of baker EC2 instances | `AmazonEC2FullAccess`, `AmazonVPCReadOnlyAccess`, scoped-down S3 write to the bake bucket |
| `crep-ci` | GitHub Actions + deploy scripts | `AmazonEC2ReadOnlyAccess`, scoped-down R2 / S3 read |

Generate access keys for each, store in GitHub Actions secrets:
```
AWS_CREP_BAKER_KEY_ID
AWS_CREP_BAKER_SECRET
AWS_CREP_CI_KEY_ID
AWS_CREP_CI_SECRET
AWS_DEFAULT_REGION=us-west-2
```

### 1.3 Budget alarm
Before any compute fires, set a monthly budget alarm:
```
AWS Console → Billing → Budgets → Create budget
  Name: crep-monthly-cap
  Amount: $200/month (tune to comfort)
  Alert thresholds: 50%, 80%, 100% → email aws-alerts@mycosoft.org
```
Cost discipline: this pipeline runs mostly on nightly crons for ~30 min on a $0.80/hr instance = ~$12/month. Budget alerts exist to catch a runaway instance that wasn't torn down.

---

## 2. Cloudflare R2 bucket (tile storage + CDN)

R2 is preferred over AWS S3 for this because:
- Zero egress cost (S3 would charge ~$0.09/GB to serve tiles)
- Native Cloudflare CDN integration — tiles cached at every edge pop for free
- Same auth/billing as the main Cloudflare account already powering mycosoft.com

### 2.1 Create the bucket
```bash
# Using Cloudflare's API (or Dashboard → R2 → Create bucket)
BUCKET=crep-tiles-prod
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/r2/buckets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$BUCKET\"}"
```

### 2.2 Custom domain binding
Bind `tiles.mycosoft.com` to the bucket so the website can fetch tiles directly from `https://tiles.mycosoft.com/{layer}/{z}/{x}/{y}.png` and `https://tiles.mycosoft.com/{layer}.pmtiles`.

Dashboard → R2 → `crep-tiles-prod` → Settings → Custom Domains → add `tiles.mycosoft.com`.

### 2.3 Access key for uploader
```
Dashboard → R2 → Manage R2 API Tokens → Create API Token
  Name: crep-baker-writer
  Permissions: Object Read & Write, specific bucket: crep-tiles-prod
```
Store as GitHub Actions secret:
```
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ACCOUNT_ID
R2_BUCKET=crep-tiles-prod
R2_ENDPOINT=https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com
```
Then in the website env:
```
TILE_RENDER_CDN_FALLBACK=https://tiles.mycosoft.com
```
The existing `/api/crep/tile-render/[layer]/[z]/[x]/[y]/route.ts` endpoint (Claude's PR #126) reads this and falls back to the CDN whenever the Legion upstream is down.

### 2.4 PMTiles vs XYZ layout
| Layer type | Storage format | URL pattern |
|---|---|---|
| Vector (substations, transmission, cell towers, iNat) | `.pmtiles` (single file per layer) | `https://tiles.mycosoft.com/substations.pmtiles` |
| Raster (Earth-2 temp/precip/wind, iNat density, signal heatmap) | Individual PNGs in `z/x/y` layout | `https://tiles.mycosoft.com/earth2/temperature/{z}/{x}/{y}.png` |

MapLibre supports both natively. PMTiles is much more efficient for vector data because the client only downloads the tiles it needs from a single file via HTTP range requests.

---

## 3. MVT vector-tile baker

Two paths — use whichever has capacity.

### 3A. Local bake on 4080B (249) — preferred, zero AWS cost

SSH into 249. Install tippecanoe (CPU-only, doesn't need GPU but happy to use them if available):

```bash
sudo apt-get update
sudo apt-get install -y build-essential libsqlite3-dev zlib1g-dev
git clone https://github.com/felt/tippecanoe.git /opt/tippecanoe
cd /opt/tippecanoe && make -j$(nproc) && sudo make install

# Verify
tippecanoe --version
```

Bake script — `mycosoft-mas/scripts/bake_mvt_tiles.sh`:
```bash
#!/usr/bin/env bash
# Bake MVT pmtiles for every CREP layer, upload to R2.
# Runs nightly; takes ~20 min on the 4080B.
set -euo pipefail

BAKE_ROOT=${BAKE_ROOT:-/var/cache/crep-tiles}
OUTPUT_ROOT=${OUTPUT_ROOT:-/var/lib/crep-tiles}
SOURCE_ROOT=${SOURCE_ROOT:-/nas/mycosoft/crep-data}

mkdir -p "$OUTPUT_ROOT"

bake_layer() {
  local name=$1
  local src=$2
  local minzoom=${3:-2}
  local maxzoom=${4:-14}
  local extra_args=${5:-}

  echo "[bake] $name from $src (z$minzoom–z$maxzoom)"
  tippecanoe \
    --output="$OUTPUT_ROOT/$name.pmtiles" \
    --force \
    --minimum-zoom=$minzoom \
    --maximum-zoom=$maxzoom \
    --base-zoom=g \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --read-parallel \
    $extra_args \
    "$src"
}

# Big layers where the client-side geojson load is slowest
bake_layer substations       "$SOURCE_ROOT/substations-us.geojson"            4 14
bake_layer transmission-full "$SOURCE_ROOT/transmission-lines-us-full.geojson" 3 14 "--drop-smallest-as-needed"
bake_layer cell-towers       "$SOURCE_ROOT/cell-towers-global.geojson"         3 14
bake_layer power-plants      "$SOURCE_ROOT/power-plants-global.geojson"        2 14
bake_layer inat-global       "$SOURCE_ROOT/inat-global.geojson"                5 14 "--cluster-distance=8"

# Per-city iNat (Morgan wants bakes for all 15 metros)
for city in nyc dc la sf chicago austin houston miami denver slc seattle boston philly atlanta phoenix dallas vegas; do
  if [ -f "$SOURCE_ROOT/$city-inat.geojson" ]; then
    bake_layer "inat-$city" "$SOURCE_ROOT/$city-inat.geojson" 7 16
  fi
done

# Upload to R2
for f in "$OUTPUT_ROOT"/*.pmtiles; do
  name=$(basename "$f")
  echo "[upload] $name → R2"
  aws s3 cp "$f" "s3://$R2_BUCKET/$name" \
    --endpoint-url="$R2_ENDPOINT" \
    --profile=crep-baker \
    --cache-control "public, max-age=86400, immutable"
done

echo "[bake] done — tiles live at https://tiles.mycosoft.com/{layer}.pmtiles"
```

Cron on 249 (`crontab -e`):
```
# Nightly CREP MVT bake — 3am local, ~20 min runtime
0 3 * * * /opt/mycosoft/scripts/bake_mvt_tiles.sh >> /var/log/crep-bake.log 2>&1
```

### 3B. AWS ephemeral baker (if 4080B is busy)

Use when the Legions are saturated with Earth-2 inference or during a one-off re-bake. Instance lifetime: ~30 minutes per run, cost ~$0.40.

Launch script — `mycosoft-mas/scripts/aws_bake_spot.py`:
```python
#!/usr/bin/env python3
"""
Spin up a g6.xlarge spot instance, pull the latest CREP source data from
the NAS mirror on S3, run tippecanoe, upload to R2, terminate.
Target runtime: 30 min, cost ~$0.40/run.
"""
import boto3
import time
import sys

REGION = "us-west-2"
AMI = "ami-0c55b159cbfafe1f0"  # Ubuntu 22.04 LTS us-west-2 (confirm current)
INSTANCE_TYPE = "g6.xlarge"   # 1x L4 24GB VRAM, 4 vCPU, 16 GiB RAM, $0.80/hr on-demand
SPOT_MAX = 0.30               # bid max — usually wins at ~$0.15
KEY_NAME = "crep-baker"
SECURITY_GROUP = "sg-xxx"      # outbound 443 only; no ingress
IAM_PROFILE = "crep-baker-ephemeral"
USER_DATA = open("./bake_mvt_tiles.sh", "r").read()  # cloud-init runs the bake + shutdown

ec2 = boto3.client("ec2", region_name=REGION)

response = ec2.run_instances(
    ImageId=AMI,
    InstanceType=INSTANCE_TYPE,
    MinCount=1, MaxCount=1,
    KeyName=KEY_NAME,
    SecurityGroupIds=[SECURITY_GROUP],
    IamInstanceProfile={"Name": IAM_PROFILE},
    UserData=USER_DATA,
    InstanceMarketOptions={
        "MarketType": "spot",
        "SpotOptions": {"MaxPrice": str(SPOT_MAX), "SpotInstanceType": "one-time"},
    },
    InstanceInitiatedShutdownBehavior="terminate",  # auto-kill when script shuts down
    TagSpecifications=[{
        "ResourceType": "instance",
        "Tags": [{"Key": "crep-baker", "Value": "true"}, {"Key": "Name", "Value": "crep-mvt-baker"}],
    }],
)
iid = response["Instances"][0]["InstanceId"]
print(f"launched {iid}; watch /var/log/crep-bake.log via SSM or wait for termination")
```

Pair with a cloud-init `bake_mvt_tiles.sh` that ends with `sudo shutdown -h now` so the instance self-terminates. Average cost: $0.40 per run, $12/month if nightly.

### 3C. GitHub Actions trigger (optional)

Add `.github/workflows/nightly-mvt-bake.yml`:
```yaml
name: Nightly MVT bake
on:
  schedule:
    - cron: "0 10 * * *"  # 3am PT = 10am UTC
  workflow_dispatch:
jobs:
  bake:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - name: Launch baker
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_CREP_BAKER_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_CREP_BAKER_SECRET }}
          AWS_DEFAULT_REGION: us-west-2
        run: python scripts/aws_bake_spot.py
```

---

## 4. GPU raster tile renderer on Legions

Claude's tile-render proxy endpoint (`/api/crep/tile-render/[layer]/[z]/[x]/[y]`, PR #126) expects raster tile servers on port **8230** on both Legions.

### 4.1 Deploy on 241 (Voice Legion) for density heatmaps

Install `titiler` + a simple kernel-density renderer:

```bash
# On 241
docker run -d --gpus all --restart always --name crep-density \
  -p 8230:8000 \
  -v /nas/mycosoft/crep-density:/data:ro \
  -e PROCESSOR=gpu \
  ghcr.io/mycosoftlabs/crep-density:latest
```

Expected endpoint shape: `GET /tile/{layer}/{z}/{x}/{y}.png` returns a PNG tile. Layers to serve:
- `inat-density` — kernel density of iNat observations (5 km radius Gaussian)
- `signal-coverage` — kernel density of cell towers (10 km radius Gaussian)
- Future: `cell-tower-heatmap`, `human-activity-heatmap`, `sensor-density`

### 4.2 Deploy on 249 (Earth-2 Legion) for weather rasters

Earth-2 output is already PNG tiles if using NVIDIA Modulus + Cartopy. Wrap it as an HTTP server on 8230:

```bash
# On 249
docker run -d --gpus all --restart always --name earth2-tiles \
  -p 8230:8000 \
  -v /nas/mycosoft/earth2:/data \
  ghcr.io/mycosoftlabs/earth2-tiles:latest
```

Endpoints:
- `GET /tile/earth2-temperature/{z}/{x}/{y}.png` — 2m surface temperature
- `GET /tile/earth2-precip/{z}/{x}/{y}.png` — total precip rate
- `GET /tile/earth2-wind/{z}/{x}/{y}.png` — wind vectors as streamlines

Forecast window: 0-6 hr nowcast (CorrDiff) + 0-15 day medium-range (FourCastNet). Re-render every 60 min.

### 4.3 Firewall

Open inbound **8230** on both Legions from 192.168.0.0/24 only (the website container on 187 needs access; nothing else):

```bash
# On 241 and 249
sudo ufw allow from 192.168.0.0/24 to any port 8230 proto tcp
```

If WSL-hosted, add a portproxy on the Windows host:
```powershell
netsh interface portproxy add v4tov4 listenport=8230 listenaddress=0.0.0.0 connectport=8230 connectaddress=<WSL_IP>
New-NetFirewallRule -DisplayName "CREP Tile Render 8230" -Direction Inbound -LocalPort 8230 -Protocol TCP -Action Allow
```

---

## 5. Website env wiring

Add these to the production `.env` (merge with existing):

```ini
# Tile render Legion URLs (Claude's /api/crep/tile-render/ endpoint)
TILE_RENDER_EARTH2_URL=http://192.168.0.249:8230
TILE_RENDER_DENSITY_URL=http://192.168.0.241:8230

# Cloudflare R2 CDN for tile fallback
TILE_RENDER_CDN_FALLBACK=https://tiles.mycosoft.com

# MVT PMTiles CDN (client-side — MapLibre fetches directly)
NEXT_PUBLIC_TILES_CDN=https://tiles.mycosoft.com
```

Cursor's existing `ensure_sandbox_lan_api_urls.py` script should merge these on next run.

---

## 6. Client-side migration (Claude's side, next round of PRs)

After the tile pipeline is producing output, Claude will:
1. Replace the eager `fetch("/data/crep/substations.geojson")` + `map.addSource({type: "geojson"})` with `map.addSource({type: "vector", url: "pmtiles://https://tiles.mycosoft.com/substations.pmtiles"})`. Same for transmission, cell towers, power plants, global iNat.
2. Wire the `crep-tile-render` layers (`earth2-temperature`, `inat-density`, etc.) as `raster` sources pointing at `/api/crep/tile-render/[layer]/{z}/{x}/{y}` — that endpoint is already live in PR #126.
3. Remove the baked per-region iNat geojson fetches in favor of `inat-global.pmtiles` which covers everything.

Expected memory win: **~1.2 GB GPU → ~150 MB GPU**. Page load: **200 MB network → ~15 MB network**.

---

## 7. Verification checklist

After Cursor executes items 1-5:

- [ ] `curl https://tiles.mycosoft.com/substations.pmtiles -I` → HTTP 200, `x-amz-server-side-encryption` or R2 equivalent header present
- [ ] `curl https://tiles.mycosoft.com/earth2/temperature/4/2/6.png -I` → HTTP 200, `content-type: image/png`
- [ ] `curl https://mycosoft.com/api/crep/tile-render/earth2-temperature/4/2/6` → HTTP 200, `x-crep-tile-source: legion` (or `cdn` if Legion down)
- [ ] `curl https://mycosoft.com/api/worldview/snapshot | jq .middleware.earth2_api` → `reachable: true`
- [ ] Browser DevTools Network tab when opening `/dashboard/crep` at NYC zoom: **< 20 MB** total network transfer (down from ~200 MB)
- [ ] AWS Cost Explorer after 7 days of nightly bakes: **< $5 spent** (if under $15 something is wrong, tear down immediately)

---

## 8. Scaling when you outgrow the local Legions

When 2× 4080 (32 GB total VRAM) stops being enough — typically ~50 concurrent CREP users streaming Earth-2:

| Workload | AWS drop-in | $/hr | Notes |
|---|---|---|---|
| Replacement for 1× 4080 | `g6e.xlarge` (L40S 48 GB) | $1.86 | 3× VRAM, same Ada arch |
| Parallel tile baking | `g6.12xlarge` (4× L4 96 GB) | $4.60 | 4 workers bake 4 regions at once |
| Earth-2 training / big batch | `p4d.24xlarge` (8× A100 320 GB) | $32.77 | NVIDIA Modulus standard rig |
| Frontier training | `p5.48xlarge` (8× H100 640 GB) | $98 | Only for full weather model retrain |

Cloud rendering for phone/tablet users (H.264 WebRTC stream of the CREP map): use `g6.xlarge` per user. 1 concurrent user = $0.80/hr. Auto-scale based on WebRTC session count. Budget alert catches runaway growth.

---

## 9. What Cursor should ping Claude about

- PMTiles URLs are live → Claude will ship the client-side migration PR #128
- Earth-2 Legion on 249:8230 actually responds to `/health` → Claude will turn on the tile overlays for real
- NYC TMC bake is done (`eagle-cameras-nyctmc.geojson` 750 cams) → Claude wires it into `paintBakedRegistry()` in Eagle Eye overlay
- Once 15-metro iNat bakes exist in `public/data/crep/*-inat.geojson` → Claude extends `BAKED_REGIONS` to include them

## 10. Risks + rollbacks

| Risk | Mitigation |
|---|---|
| AWS runaway cost | Budget alert at $200/mo; baker instance script sets `InstanceInitiatedShutdownBehavior=terminate`; cloud-init script ends with `sudo shutdown -h now` |
| PMTiles bake takes >1 hr | `tippecanoe --drop-densest-as-needed` + drop base zoom — never blocks prod serving since fallback is the last-good PMTiles on R2 |
| Legion + CDN both dead | `/api/crep/tile-render` returns 502, MapLibre shows empty tile (no client crash); client-side `data` layers still serve as they do today |
| R2 cost spike | Same Cloudflare budget alerts; R2 is cheap ($0.015/GB stored, $0/GB egress) so unlikely unless a bug puts something massive up |
