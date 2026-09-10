# Fusarium 180-role UX architecture — 10 September 2026

Date: 10 September 2026  
Status: Implemented on worktree `website-itdx-codex-v13`  
Related: `FUSARIUM_PERSONNEL_SYSTEMWIDE_SEP10_2026.md`, `FUSARIUM_OUTCOMES_MEASUREMENT_AND_KO_RELAY_SEP10_2026.md`

## What the package is

The Downloads package `FUSARIUM_PERSONNEL_CURSOR_PACKAGE_v1_1` is a **proposed user catalog**, not a required headcount and not a named unit roster. 180 roles: USA 31, USN 25, USMC 25, USAF 25, USSF 17, USCG 20, JOINT 15, CIVIL 22. Import grants **no** users, grants, billets, or clearances. RJ Ricasata is **CFO**.

## Clusters (19 shells, not 180 pages)

| persona_id | Function | Workflows | Default ITDX view | Default Earth Sim hint |
|---|---|---|---|---|
| owner_full | Owner | — | lab | live-data, FIRMS, AQ, radar, movement |
| analyst | Intel | analysis | frames | live-data, movement |
| reviewer | Intel | review | ranking | live-data |
| geo | Geo | geo | replay | live-data, FIRMS, movement |
| signals | Intel | signals | sources | live-data |
| human_source | Intel | humint, ci | sources | live-data |
| weather_env | Weather | weather, hazard | lab | live-data, AQ, radar, FIRMS |
| health_exposure | Medical | health | personnel | live-data, AQ |
| ops_watch | Ops | ops | apps | live-data, movement, radar |
| command | C2 | command | outcomes | live-data, movement |
| sensor_droid | Maintainer | sensor | services | live-data |
| platform | Maintainer | integrator, comms | services | live-data |
| cyber_defense | Ops | cyber | services | live-data |
| logistics | Logistics | logistics | apps | live-data, movement |
| evaluator | Science | evaluation | tests | live-data |
| steward_release | Science | steward, release | exports | live-data |
| instructor | Science | training | walkthrough | live-data |
| oversight | C2 | oversight | outcomes | live-data |
| liaison_partner | Joint/civilian | liaison, civil, viewer | exports | live-data |

Owner still sees every Fusarium control. Duty position **retargets chrome defaults** and suggested tools. It does not delete Live Data, FIRMS, the memory governor, or ITDX tabs.

## Entitlements model

Least privilege is **product UX emphasis**, not a fake RBAC that hides the owner app.

- `primaryRoutes` / `primaryTools` — suggested navigation
- `defaultItdxView` / `defaultEarthSimLayers` / `defaultAerosolFocus` / `defaultSaPanel` — starting lens
- `uxEmphasis.*` — which tools the lens highlights
- Server authorization is unchanged. Persona pick never grants access, release, or clearance.
- `in_boundary_cui` is **disabled / NOT_SUPPLIED** on this commercial surface.

## NOT_SUPPLIED vs not measured

| Item | State |
|---|---|
| 180 role titles, workflows, pay **examples**, ranks, training paths | Loaded from package |
| Named unit roster / Dr. Hess staff list | NOT_SUPPLIED — never synthesized |
| Access grants | All `grant_on_import=false` |
| Task labor, duty, rest, NASA-TLX, WellBQ, errors, injury, fatality | **Not measured** until a real survey/study |
| CUI-backed customer military measures | NOT_SUPPLIED (`source_class: in_boundary_cui` hook only) |
| Approved billet reduction / cash savings | Null |

Provisional occupational codes stay `EXAMPLE_MAPPING_REQUIRES_CURRENT_DIRECTORY_REVIEW`. Army **350F** and **35F** stay distinct personas (reviewer vs analyst).

## How to switch role on 3010

1. Sign in as Fusarium owner.
2. Topbar **Duty** select (shell, every `/fusarium/*` route).
3. Earth Sim: lens suggests layers; Live Data/FIRMS remain.
4. Aerosol: lens suggests AQ/smoke vs map/sensors.
5. ITDX: default tab follows persona; existing lab/walkthrough/sources/ranking/frames/tests/exports/services/replay/apps tabs stay.
