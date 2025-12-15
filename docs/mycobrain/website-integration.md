## MycoBrain V1 â€” Website Integration Notes

### What was added

- Device documentation pages under `app/devices/mycobrain/integration/`.
- Mycorrhizae Protocol page under `app/protocols/mycorrhizae/`.
- Repo notes and templates under `docs/`.

### Intended integration model

- **Transport:** MDP v1 (COBS framing + CRC16)
- **Telemetry:** best-effort
- **Commands:** reliable (ACK + retry)
- **Pipeline:** Device â†’ MAS â†’ MINDEX â†’ Mycorrhizae Protocol â†’ NatureOS

