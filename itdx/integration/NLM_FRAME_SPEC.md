# Full NLM frame, mathematical Form Space and transmission

This specifies the next integration. Fields listed as required by the design are not all populated by v1.2. The archived frame explorer illustrates the smaller existing synthetic implementation. Use the actual model/device schemas where available and record a versioned mapping; do not rename unrelated values to make a frame look complete.

## Mathematical basis

Represent the pipeline as calibrated observations `y`, latent estimates `z`, chart-local Form States `f`, and explicitly defined target/attractor hypotheses `b`:

```text
y → z → f in chart C → posterior over declared target hypotheses b
```

The numerical state, geometry, constraints, uncertainty and evidence are primary. Narrative text is an explanation or source artifact. It is not a substitute for coordinates or a numerical validation result.

Each chart defines a domain, coordinate names/dimension/units, normalization, metric or similarity, valid comparisons, transform version and uncertainty representation. Compare two states only when a compatible chart or a validated transition exists. Do not call arbitrary embedding distance physical distance, velocity, confidence or causal effect.

The relationship “distance is below epsilon” is generally not transitive and therefore does not alone define a quotient space. To claim equivalence classes, define a genuine equivalence relation or an explicit class/partition assignment with its assumptions. v1.2 uses a frozen local partition; it does not establish a learned universal Platonic atlas. Attractors, intervention effects and causal claims require their own model and validation evidence.

The `civil-evidence/v1` ASCOPE/PMESII projection is categorical metadata. Report tags may connect to the evidence graph, but do not become a learned mathematical coordinate system by naming them Form Space.

## Field inventory and the value of each part

| Frame section | Minimum fields / contents | Value to the evaluator | Missing or invalid behavior |
|---|---|---|---|
| Identity | Frame/event/observation IDs, schema/ontology version, sequence, parent frame, source/device IDs and identity status | Connects records and detects replay/equivocation | Unknown identity remains unknown; reject conflicting same-identity payloads |
| Acquisition time | Observation and ingestion UTC times, clock source, uncertainty/drift, sampling interval, ordering/late flags | Establishes temporal alignment and evidence age | Retain uncertain time; exclude precise temporal claims outside the defined tolerance |
| Spatial context | CRS, coordinates, transform/source, altitude/depth/datum if known, position uncertainty and footprint | Supports correct map placement and scale | Null geometry remains visible in a table; no default coordinate at 0,0 |
| Embodiment | Device type, sensor/channel, deployment/mount context, operating range, health, power/link state | Explains how the observation was produced and what can bias it | Missing hardware/health metadata is disclosed, not inferred from a sensor name |
| Raw evidence | Raw object refs, media type/codec, sample count/rate/window, bytes and hash | Allows inspection and reprocessing of the original capture | No raw data claim when only summary features exist; identify nonembedded objects |
| Sensor measurements | Channel values with units/range/missing mask: spectral, acoustic, thermal, chemical, bioelectric/FCI, mechanical or other actual channels | Shows what was physically measured rather than inferred | Preserve absence; do not fabricate unavailable modalities |
| Calibration | Calibration ID/version/date/reference, transform, offset/gain, residual/uncertainty, saturation/quality flags | Makes values comparable and exposes drift | Uncalibrated values can remain raw but cannot silently enter a calibrated comparison |
| Features | Feature names/order/units/window, extractor version/hash, normalization parameters, mask and quality | Makes model inputs reproducible and auditable | Reject dimension/order/version mismatch; retain raw input and reason |
| Source lineage | Origin/source family, derived-from refs, transformations, common-source declaration and independence status | Prevents duplicate/correlated evidence from appearing independent | Multiple report IDs are not multiple independent sources |
| Prior information | Prior ID/version, valid time/region, origin, role, distribution/parameters, uncertainty, source refs and compatibility | Makes historical knowledge, map context and assumptions visible | Expired/incompatible priors are flagged or excluded with reason; unknown prior is not certainty |
| Fusion | Included/excluded inputs, time/space alignment, fusion method/version, weights/dependence assumptions, residuals, conflict state and posterior | Explains what additional information the combination contributed | Preserve counterevidence; correlated duplicates must not artificially raise confidence |
| NLM state | Model/checkpoint hash, architecture actually executed, runtime/device/precision, latent state, predictions and uncertainty type | Establishes which computation produced the result | No qualified model metadata means no qualified-model claim |
| Form State | Chart ID/version, coordinates, metric definition, class/partition, transition refs, uncertainty and admissibility | Provides a mathematical representation tied to evidence | Cross-chart comparisons require explicit validated transform; unsupported comparisons abstain |
| Goal/prior hypothesis | Declared goal, target/attractor candidate definition, constraints, posterior/score interpretation and validation status | Separates observation from proposed desired state | Do not convert an analyst goal into a discovered natural attractor |
| Graph context | Observed/inferred/contradicted typed edges, evidence paths, unresolved entities and provenance | Shows relationships and the effect of source removal | Contradictions remain inspectable; name similarity alone is not entity resolution |
| Quality and uncertainty | Missingness, coverage, uncertainty method/calibration set, confidence scale definition, out-of-domain state | Prevents a precise-looking number from hiding missing evidence | A 1–5 ordinal rating is not a posterior probability or measured sensor accuracy |
| Governance | Policy/version, hard constraints, AVANI result where executed, review/deny/pause reasons, human disposition | Explains what bounded output is admissible | Borda ranking or model score does not override a failed hard constraint |
| Proofs | Canonicalization ID, raw/normalized/object hashes, Merkle membership with index, self/world/event/parent/frame roots, signature/key ID and trust state | Detects changes and binds the packet's components | Invalid/missing proofs remain explicit; a valid signature does not prove source truth |
| Transport | Envelope ID/sequence, payload type/schema/hash, sender/receiver identity status, codec, bytes, enqueue/send/receive/ack times, retry/dedup and link profile | Explains what was transmitted, when, and at what measured cost | Software bytes/time are distinguished from RF throughput, battery and physical field measurements |
| Execution receipt | Run/task/attempt/trace IDs, actual service build/model, input/output refs and timing breakdown | Proves the live service contributed to this run | Cached/recorded responses retain origin and timestamp; no silent substitution |

## Prior information and fusion rules

Maintain separate source types for measurements, documents/reports, historical recordings, geographic context, model parameters, analyst assumptions and constraints. Each prior must state what it is used for: feature normalization, baseline expectation, state prior, map context, class assignment or advisory constraint. This prevents ordinary document text from masquerading as a sensor channel.

A fusion implementation must specify its assumptions. Precision-weighted averages require compatible units and a justified dependence/error model. Correlated channels and copied reporting need a dependence treatment; source count alone is not evidence strength. Store exclusions, residuals, conflicting readings and the before/after uncertainty. If uncertainty is uncalibrated, label it as such. Do not produce a calibrated posterior by rescaling an arbitrary anomaly score.

Evaluate fusion on matched frozen input splits. Report standalone component and fused outputs, coverage, errors and confidence intervals appropriate to the data. The archived five-seed clean example measured zero mean F1 gain from fusion over the temporal readout; retain that result. New improvements need new measured evidence and cannot be assumed from the architecture.

Truth labels belong in the evaluation compartment. They must not enter the inference feature vector, prior selection, normalization fitting or chart construction for held-out observations. Learned calibration and transforms use permitted training/validation groups only; preserve capture-group boundaries and time order.

## Logical frame versus transmitted envelope

The complete logical frame is an evidence object graph. A transmitted packet may carry a full frame, a bounded summary or a delta plus content-addressed refs. Record which it carries and what is absent. Do not claim that a hash reference transmitted all the referenced raw bytes.

Define the wire schema using the actual device/network protocol. Requirements include explicit version/content type, maximum payload and expansion sizes, ordering, compression, authentication, retry/ack semantics, deduplication scope, replay windows, key rotation and conflict quarantine. Authenticate metadata and payload references together. Retain a parent/root relationship across deltas; detect gaps and preserve their status during reconnection.

Measure raw bytes, normalized bytes, feature-summary bytes, proof/metadata overhead and actual serialized envelope bytes separately. Report compression ratio against a defined numerator/denominator, with codec and data origin. Physical bandwidth, link loss, battery consumption and a six-hour outage require measured device tests. The v1.2 DIRTNet software emulator provides deterministic protocol cases, not those physical qualifications.

## Canonicalization and compatibility

v1.2 uses Python canonical JSON with sorted keys, compact separators, UTF-8 and rejection of nonfinite numbers. It has its own existing frame-root construction. Preserve its algorithm identifier and replay path. Do not assume ordinary JavaScript `JSON.stringify` produces identical float, Unicode or key-order bytes.

For a new cross-language contract, explicitly select and version the canonicalization, floating-point/decimal representation, Unicode treatment, timestamp normalization and hash domain separation. Publish shared positive/negative vectors for Python and TypeScript. If raw bytes and normalized objects both exist, retain and hash both, with transformation metadata. A v2 verifier must select the correct algorithm from the manifest, rather than silently reinterpret v1 roots.

## Frame inspector acceptance

An evaluator can select a map feature, open its run/frame, see every contributing observation and prior, inspect calibration and fused values with units, view the actual model/chart identity, identify excluded or conflicting evidence, inspect the transport envelope's true payload/byte count, and verify the relevant object inclusion and export signature. Missing channels and unresolved identity are visible without leaving the frame. Downloaded JSON contains the same selected revision shown in the UI.
