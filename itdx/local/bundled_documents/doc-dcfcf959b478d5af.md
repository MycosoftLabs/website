# Revision Notes — Version 0.2

## Canonical naming

- **MYCA** is used consistently as the agentic runtime and orchestration layer.
- **DIRTNet** is the canonical name for Mycosoft's **Decentralized Edge Network**.
- **MINDEX** is spelled and treated as the distributed persistence, knowledge, model-registry, and cryptographic-provenance layer.

## Major additions

### 1. DIRTNet promoted to a first-class architectural layer

DIRTNet is no longer represented as generic connectivity. It is specified as the coordination fabric that turns MycoBrain-, ESP32-, Jetson-, and gateway-class devices into a partition-tolerant distributed environmental data center. Each node can sense, preprocess, infer, store, sign, route, synchronize, and continue operating locally when disconnected.

### 2. Bitcoin-derived architecture mapped precisely

The revision incorporates the applicable Bitcoin architecture patterns:

- peer nodes with local state;
- wallet-like device keypairs and signed records;
- SHA-256 content addressing;
- parent-linked append-only evidence records;
- Merkle trees, epoch roots, and compact inclusion proofs;
- independent verification and replay;
- delayed reconciliation after partitions.

The document explicitly does **not** claim that DIRTNet is a cryptocurrency, Bitcoin fork, public permissionless ledger, or proof-of-work network. Routine environmental sensing does not require mining competition. The corresponding Mycosoft concept is **evidence mining**: deterministic validation, feature extraction, anomaly detection, and construction of verifiable evidence checkpoints.

### 3. Mycorrhizae Protocol maturity boundary

Repository evidence is incorporated directly:

- implemented/documented: authenticated channel-based pub/sub, Redis-backed streaming, API keys and rate limits, SSE, HPL basics, device/MINDEX/MYCA/NatureOS connections;
- in progress: full FCI normalization, M-Wave productionization, complete NatureOS bridge;
- planned: bidirectional fungal I/O and learned biological pattern recognition.

DIRTNet extends Mycorrhizae with signed edge envelopes, Merkle anti-entropy manifests, checkpoint exchange, transport selection, and partition reconciliation.

### 4. NLM repository architecture incorporated

The NLM source repository confirms the RootedNatureFrame pipeline, six sensory fingerprints, deterministic scientific preconditioning, SSM/graph/sparse-attention core, AVANI gating, SHA-256 roots, lineage chains, Merkle trees, and inclusion proofs. The revision connects those components to device-level DIRTNet execution and MINDEX synchronization.

### 5. BlueSight, SINE, GANDHA, and FCI formalized

- **BlueSight:** visual and spatial evidence service—cameras, blue-light biological observation, geometry, LiDAR, radar, WiFiSense, local embeddings, detection and tracking.
- **SINE:** acoustic evidence service—deterministic DSP, learned embeddings, semantic/OOD heads, prototype retrieval, multisensor fusion. The current public evidence gate is preserved: a trained semantic artifact must be registered before semantic claims are promoted.
- **GANDHA:** chemical, odor, gas, VOC/VSC, and particle evidence service with environmental compensation and sensor-drift controls.
- **FCI:** biological signal-transduction service for calibrated mycelial bioelectric observations and controlled-stimulus experiments.

### 6. NatureOS and FUSARIUM customer surfaces

The same evidence roots and DIRTNet fabric support two additive platform views:

- **NatureOS:** civilian, scientific, environmental, laboratory, and field-research workflows;
- **FUSARIUM:** defense environmental-intelligence workflows, classification-aware handling, chain of custody, pattern/link analysis, geospatial products, and analyst artifacts.

### 7. Current NVIDIA physical-AI context

The revision includes NVIDIA's July 2026 physical-AI releases as an interoperability reference, not a partnership or equivalence claim. NVIDIA modules can provide high-tier visual reasoning, robotics, digital twins, and accelerated inference. Mycosoft's distinct architecture is the persistent decentralized multisensory and biological sensing network, Nature Learning Model, Mycorrhizae transduction, MINDEX provenance, and AVANI governance.

### 8. ITDX26 no-hardware demonstration

The ITDX26 plan now includes a virtual DIRTNet emulator that runs multiple edge nodes, mixed transports, partitions, store-and-forward queues, signed event frames, Merkle checkpoints, decentralized Task 12 pattern detection, Task 13 graph reconciliation, MYCA distributed COA generation, and NatureOS/FUSARIUM product rendering on one or two laptops.

## New machine-readable artifacts

- DIRTNet signed-message schema;
- DIRTNet node-capability manifest;
- Merkle synchronization manifest;
- federated checkpoint schema;
- virtual ITDX26 emulator configuration.

## Claim discipline

All architecture statements are labeled as source-defined, repository-evidenced, proposed formalization, implementation status, or empirical claim. Integrity proofs demonstrate data identity and non-tampering; they do not by themselves prove sensor correctness, causal meaning, biological semantics, or model accuracy.
