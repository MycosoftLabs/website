# Fusarium personnel system-wide — 10 September 2026

Date: 10 September 2026  
Status: Implemented on `website-itdx-codex-v13`  
Scope: **full Fusarium console**, not an ITDX silo

## Shared source of truth

- Catalog JSON generated from package CSV/JSON: `lib/fusarium/personnel/generated-catalog.json` (180 roles)
- Personas / entitlements: `lib/fusarium/personnel/personas.ts` (19 shells)
- Duty context: `FusariumRoleProvider` in `components/fusarium/fusarium-layout-client.tsx`
- Duty switcher in the Fusarium **topbar** (every operator route)

## Fusarium routes wired

| Route | What personnel does |
|---|---|
| All `/fusarium/*` (dashboard layout) | Duty / catalog role switcher |
| `/fusarium/personnel` | Catalog browse (180 roles) |
| `/fusarium/personnel/survey` | NASA-TLX / WellBQ scores / rest-error capture |
| `/fusarium/personnel/outcomes` | KO / command relay |
| `/fusarium/itdx` | Role lens + catalog/survey/outcomes tabs; default tab follows persona |
| `/fusarium/earth-simulator` | Role lens; does **not** revert Live Data, FIRMS, governor |
| `/fusarium/aerosol` | Role lens (AQ/smoke vs sensors) |
| `/fusarium/situational-awareness` and `/fusarium/soc` (alias) | Role lens |
| `/fusarium/command-control` | Role lens |
| `/fusarium/devices` | Role lens |

Owner override remains on. NatureOS earth-simulator is a twin globe; Fusarium chrome is the duty lens. Instant Deploy on 187 is **not** this lane.

## APIs

- `GET /api/fusarium/personnel/catalog`
- `GET /api/fusarium/personnel/personas`
- `GET|POST /api/fusarium/personnel/surveys`
- `POST /api/fusarium/personnel/telemetry`
- `GET /api/fusarium/personnel/outcomes?role_id=`

## 3010 how to switch role

1. Open `http://localhost:3010/fusarium/earth-simulator` (owner session).
2. Topbar **Duty** → e.g. Weather / METOC / hazard. Lens lists FIRMS/AQ/radar; existing Live Data stays.
3. Same Duty control on `/fusarium/itdx` retargets the default tab (analyst → NLM/FormSpace, evaluator → Run & test, command → Outcomes / KO).
4. Same Duty control on `/fusarium/aerosol` suggests AQ/smoke vs map/sensors.
5. Submit a survey at `/fusarium/personnel/survey`. It appears on `/fusarium/personnel/outcomes`. Unmeasured tiles stay **Not measured**.

## Files

- `lib/fusarium/personnel/*`
- `components/fusarium/personnel/*`
- `app/api/fusarium/personnel/**`
- `app/fusarium/(dashboard)/personnel/**`
- Layout / catalog / nav / ITDX / Earth Sim / aerosol / SA / C2 / devices hooks
