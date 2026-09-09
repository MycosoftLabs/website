# Home computer setup and live rollout

## Run the preserved local application first

Check out the handoff branch using your existing authenticated GitHub setup. If the repository is already on the computer, fetch and switch without overwriting unrelated work. The branch name is `codex/itdx-live-integration-handoff-20260908`.

```sh
git clone --branch codex/itdx-live-integration-handoff-20260908 https://github.com/MycosoftLabs/website.git
cd website
python itdx/verify_handoff.py
cd itdx/local
python launch.py
```

Use `python3` if appropriate. Full repository cloning may download large unrelated assets; an existing checkout or Git partial/sparse clone can avoid that. The standalone ZIP in `itdx/artifacts` is sufficient for v1.2 without the website checkout.

The application requires Python 3.10+. The launcher creates its own `.itdx-venv` if needed and installs the optional signing dependency from the supplied requirements. It opens the verified local address and selects a free port if 8765 is occupied. Keep its terminal running. Direct startup is `python run.py --port 8766 --no-browser`; direct startup does not perform all launcher diagnostics.

Core computation does not require Node, a cloud account, PostgreSQL or model downloads. Cryptographic signing requires the specified optional dependency. The explicit unsigned mode is `python launch.py --allow-unsigned`; preserve its visible unsigned status. Do not weaken browser policy or request validation to launch the app.

Record the actual OS, Python, installed dependencies, CPU/RAM/GPU, browser and screen dimensions. Windows/macOS execution and full browser layout were not verified in the build workspace. Rehearse on the actual demonstration computer.

## Back up existing operator work

Stop the old local server before copying data. Preserve a separate copy of its `local_data/` directory, including its signing-key material, using the owner's normal private backup process. Do not commit that directory or upload it as part of this public handoff. Retain each old release needed for exact replay. Avoid using the only copy of operator data for migration testing.

## Prepare the full stack

Install the runtime versions required by the **current** receiving repositories, using their lockfiles and setup instructions. Expect Git, the website's Node/package manager, the MAS Python environment (source README used Python 3.11/Poetry), and Docker/Compose or the established service hosts. Do not guess CUDA/model RAM requirements from the words “NLM”; inspect the actual loaded checkpoint and hardware support.

Keep adjacent checkouts for `website`, `mindex`, `mycosoft-mas`, and `NLM` when available. Read each repository's applicable instructions. Use service APIs and compatible shared packages, not absolute filesystem imports between repositories. Start dependency services in their documented order and verify action endpoints before the website integration.

| Service | Source default / likely local convention | Required confirmation |
|---|---|---|
| v1.2 local lab | 8765, free-port fallback; choose 8766 if necessary | Actual launcher URL; 8765 may be used by other Mycosoft services |
| Website development | 3010 | Current `package.json` and active process |
| Website production-mode local start | 3000 | Build and `start` script; not the production domain |
| MINDEX compose API | Host 8000 | Current compose mapping, API prefix, dependencies and auth |
| MAS API | Often host 8001 to container 8000 | Actual entrypoint and mounted brain/NLM routers |
| Dedicated NLM backend | Source may use 8200 | Actual host/path/model; may be behind MAS rather than directly exposed |

Use unique host ports. `127.0.0.1` inside a container refers to that container; choose the actual Compose service name or documented host route for interservice calls. Localhost on the home computer is not the remote production network. Do not make private endpoints public to solve a missing route.

`local.env.example` lists configuration names and placeholders. It is a template for inspection, not an automatically loaded configuration. Existing names belong to their respective services; proposed `ITDX_*` names are not implemented by this handoff. Place secrets in the established local secret store/ignored environment and production secret manager. Keep server credentials out of client bundles and exports.

## Correct the v1.2 optional profiles when testing services

Use the service configuration UI to enter the actual local/private base URL and mounted path. For the MINDEX source default, Earth search needs `/api/mindex/unified-search/earth` and the appropriate API key. For website development use port 3010. For NLM confirm which host mounts `/api/nlm/embeddings/nature`; do not point it at an unrelated service occupying port 8000.

The local adapter allows only local/private addresses, rejects redirects, uses named environment keys and has a five-second timeout and 2-MB response cap. It cannot connect directly to public `mycosoft.com` and is not the production adapter. A successful optional sample/search remains separate from the local measured run.

## Validation commands without modifying the frozen snapshot

Copy `itdx/local` to a temporary working directory and run from the copy if you intend to regenerate HTTP/scenario artifacts. For nonmutating core checks, the packaged tests use temporary application data:

```sh
python run.py --self-test
node tests/test_views.cjs
node tests/test_workbench_views.cjs
python rank_compare.py sample_results/ranking_illustrative_result.json
python review_replay.py sample_results/civil_evidence_illustrative_result.json
```

Node is needed for JavaScript tests only. `python tests/http_acceptance.py` regenerates sample outputs: run it in the disposable copy. Historical evaluation ZIP replay must use the original release matching its source snapshot. New live adapter tests must use isolated test cases and preserve explicit origin/backend labels.

## Rollout and rollback work Cursor must finish

1. Inventory the real deployment pipeline and existing branch protections; feature-branch testing must not invoke production deployment accidentally.
2. Back up relevant data and rehearse additive schema migration on staging. Record compatibility and rollback behavior; do not assume dropping newly written evidence tables is an acceptable rollback.
3. Deploy MINDEX/MAS/NLM changes using their existing mechanisms, then the website feature. Pin build/image/model/chart versions across the release record.
4. Prove live action/persistence paths and the complete browser walkthrough in staging. Measure browser map cold render separately from API calculation.
5. Use the established production release process and a controlled feature flag/access scope. Run authenticated live smoke tests on the deployed domain and verify the export from that same run.
6. Roll back by disabling the feature and restoring compatible prior application images/configuration when necessary. Preserve created evidence and audit history; perform data restoration only through the reviewed migration/backup plan.

This handoff was prepared on an isolated upload branch. It does not add a deploy workflow, modify secrets, start production jobs or establish production acceptance.
