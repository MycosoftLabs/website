# ITDX26 Mathematical Demonstration Plan

**UNCLASSIFIED**  
**Mycosoft working paper**  
**Solicitation:** W91RUSI-FCID260001  
**Execution window:** 8–18 September 2026  
**Plan date:** 16 July 2026  
**Version:** 1.1 — algorithm-only scope with DIRTNet decentralized-edge study

![ITDX26 Mathematical Demonstration Plan — NLM, MYCA, AVANI, FUSARIUM, and MINDEX.](graphics/cover.png)

---

## Document control

| Field | Controlled value |
|---|---|
| Purpose | Define the mathematical, empirical, software, and on-site execution plan for Mycosoft's ITDX26 algorithm demonstrations. |
| Demonstration class | Software and mathematics only; all runs are local, offline-capable, and unclassified. |
| Primary focus | Task 12 — Perform Pattern Analysis; Task 13 — Perform Link Analysis. |
| Secondary focus | Task 8 — Produce Courses of Action, subject to an August feasibility gate. |
| Stretch fallback | Task 14 — Produce products on a Map. |
| Cross-cutting differentiator | DIRTNet decentralized-edge algorithm emulator: local inference, intermittent mesh, Merkle synchronization, and cryptographic audit. |
| Evaluation objective | Identify useful algorithms, expose limitations, quantify algorithm interaction, and measure processing speed and efficiency. |
| Execution constraint | One or two laptop-class computers; no external service is required during a scored run. |
| Reproducibility standard | Deterministic command, frozen environment, immutable data manifests, five seeds, logged code and data hashes. |
| Evidence rule | A number is labeled **measured** only after the evaluation harness produces it. Values stated before then are **targets**, **budgets**, or **acceptance thresholds**. |

---

# Executive summary

ITDX26 is an algorithm discovery and benchmarking experiment, not a product showcase. The governing scope is therefore a compact, auditable demonstration of four questions: which algorithms perform Army intelligence tasks well; where those algorithms fail; whether their interaction improves outcomes; and what quality is purchased by additional time, memory, and compute. Mycosoft will answer those questions with two deep primary demonstrations, one gated secondary demonstration, and one deterministic fallback.

**Task 12, Pattern Analysis**, is the lead demonstration. It treats an unclassified event stream as a marked spatiotemporal sequence and asks the Nature Learning Model sequence core to estimate the probability of what should happen next, identify deviations from that learned distribution, group deviations into candidate patterns, and render the result as an analyst-reviewable pattern product. The principal model is a selective state-space model in the Mamba family, compared against a classical seasonal count model and a matched transformer. The demonstration reports precision and recall at analyst-selected review budgets, time-to-detection, calibration, throughput, memory, and known failure cases. The key claim is deliberately narrow: a streaming state-space model should offer a favorable long-context latency/memory trade on laptop-class compute. That claim is tested rather than assumed.

**Task 13, Link Analysis**, is the structural complement. It converts public, provenance-tracked entity and event records into a typed temporal graph, performs entity resolution, predicts withheld links, ranks actors and relations, detects communities, and renders a link diagram with confidence and provenance. The FUSARIUM analytics core uses relational message passing with temporal encodings and a calibrated link decoder. Classical graph heuristics, node2vec, and a modern graph model run on the identical split. The evaluation separates three problems that are often blurred together: entity-resolution quality, edge-prediction quality, and analyst-product quality. This prevents a graph model from receiving credit for links produced by a faulty upstream resolver.

**Task 8, Courses of Action**, is an August-gated study in multi-agent decision support. A local language-model ensemble parses a fictional or publicly releasable scenario, proposes several candidate courses of action, critiques them, revises them, and scores them against the doctrinal feasibility, acceptability, suitability, distinguishability, and completeness criteria. The output is advisory and explicitly retains human judgment. The experiment compares a template/rule baseline, a single-agent model, and the multi-agent protocol. It measures doctrinal structural completeness, constraint violations, unsupported assumptions, distinguishability, human ratings, inter-rater agreement, latency, and loop stability. If the complete multi-agent path does not pass its August 22 reliability gate, it is not shown as a primary live claim.

**Task 14, Map Products**, is the stretch fallback and is intentionally deterministic. A reproducible geospatial pipeline combines selected OpenStreetMap, USGS, and NASA layers, applies coordinate-system validation, spatial aggregation, labeling, provenance, and offline rendering. It gives ICED a clean speed/quality demonstration even if generative COA work is not stable. Its core product has zero learned parameters; optional learned label-ranking modules are evaluated separately so that the map remains reproducible and interpretable.

The demonstrations are joined by a controlled interaction study. The sequence model emits event embeddings, anomaly probabilities, uncertainty, and temporal context. The graph model consumes those values as node and edge features. A validation-fitted logistic fusion rule combines temporal and structural evidence. The required ablation is: sequence-only, graph-only, and fused. The plan makes no advance claim that fusion will win; it specifies the sample sizes, confidence intervals, and paired tests needed to determine whether the observed improvement is meaningful. MYCA then orchestrates the two algorithms, records every proposal, critique, score, and revision, and renders the full debate transcript so analysts can inspect how a conclusion formed.

A cross-cutting **DIRTNet** study demonstrates how the same algorithms operate as a decentralized edge network rather than a central application. Virtual edge nodes on the demonstration laptops receive different event, graph, and replayed sensor shards; run local NLM or FUSARIUM models; sign append-only observations; exchange compact Mycorrhizae messages over emulated LoRa, LoRaWAN, and Meshtastic constraints; reconcile Merkle epochs after partitions; and coordinate through MYCA and AVANI. The comparison is centralized raw upload versus isolated edge inference versus DIRTNet signed-event synchronization, with an optional federated-learning condition. Metrics include task quality, time-to-first alert, bytes transmitted, availability under partition, synchronization convergence, duplicate suppression, signature rejection, and proof verification. No physical radio or device is required; the experiment is entirely algorithmic.

All evaluation runs use immutable data manifests and temporal or edge-based holdouts. Five predetermined seeds are the default; bootstrap confidence intervals and paired tests are used where observations are dependent. Every run writes a machine-readable report containing code SHA, environment hash, data hashes, model hash, seed, metrics, timing, memory, warnings, failure flags, and artifact paths. The live entry point is:

```bash
make demo TASK=12 SIZE=small SEED=17 OFFLINE=1
```

The demonstration package is designed around legal and operational conservatism. GDELT is used as an openly available event source with source attribution and article-level provenance. ACLED is **excluded by default** because current terms impose license-specific limits on AI and machine-learning use; it enters the package only after written authorization is archived. Common Crawl is optional and metadata-only because access to crawled records is not a blanket copyright license for underlying content. Wikidata CC0 and license-cleared Open Graph Benchmark datasets are preferred for the graph demonstration. Every source has a local license record, citation, acquisition date, transformation log, and SHA-256 digest.

The schedule is built backward from a sealed offline package on 5 September. Task designs close on 8 August; data and legal manifests close on 15 August; reference runs close on 22 August; interaction and rendering close on 29 August; dry runs occur 2–4 September. No model or dependency upgrade is permitted after the data freeze unless it fixes a critical defect and triggers a complete requalification run. On site, the first week establishes Task 12 and Task 13 separately; the second week demonstrates interaction, a gated Task 8 or Task 14 fallback, final Pareto measurements, and a reproducible handoff.

The success condition is not that every algorithm looks impressive. Success is that an Army analyst can see exactly what each algorithm consumed, what it produced, how long it took, how uncertain it was, what baseline it beat or failed to beat, and under what conditions it should not be trusted.

---

# 0. Demonstration doctrine, experimental posture, and notation

## 0.1 Source-of-truth hierarchy

The plan uses the following authority order:

1. ITDX26 special notice and written scope correction.
2. Current Army and joint doctrine applicable to the task.
3. Canonical algorithm papers and official implementations.
4. Official dataset terms, license texts, and provenance records.
5. Mycosoft's internal architecture names and interfaces.

When an internal proposal conflicts with a dataset's current terms, the current terms control. When a performance expectation conflicts with a measured run, the measured run controls.

## 0.2 Army task framing

The exact task labels in the ITDX26 notice are short: **“Perform Pattern Analysis,” “Perform Link Analysis,” “Produce Courses of Action,”** and **“Produce products on a Map.”** [D1] ATP 2-33.4 is the primary analytic-technique reference for pattern and link analysis. FM 5-0 is the primary planning reference for course-of-action development and screening. ATP 2-01.3 supplies operational-environment context and geospatial products. FM 2-0 and JP 2-0 provide the broader intelligence-function context. [D2–D7]

## 0.3 Experimental claims

Every claim falls into one of four classes:

- **Design claim:** an architectural statement, such as “the sequence model passes anomaly features to the graph model.”
- **Hypothesis:** a testable expected relationship, such as “fusion will improve precision at a fixed review budget.”
- **Target:** a desired threshold, such as “cold start below 30 seconds.”
- **Measured result:** a value produced by a frozen run and linked to a run report.

Only the fourth class may be presented as achieved performance.

## 0.4 Core notation

| Symbol | Meaning |
|---|---|
| \(e_t\) | Event observed at ordered index or time \(t\). |
| \(x_t\in\mathbb{R}^d\) | Encoded event feature vector. |
| \(h_t\) | Latent sequence state. |
| \(G_t=(V_t,E_t,R)\) | Typed temporal graph at time \(t\), with relation set \(R\). |
| \(z_v\) | Learned embedding of graph node \(v\). |
| \(y\) | Ground-truth label or withheld relation. |
| \(p\) | Predicted probability after calibration. |
| \(\tau\) | Analyst-selected threshold or time horizon. |
| \(K\) | Review budget: number of ranked items shown to an analyst. |
| \(s\) | Deterministic random seed. |
| \(\theta\) | Trainable model parameters. |
| \(\mathcal{D}_{tr},\mathcal{D}_{va},\mathcal{D}_{te}\) | Train, validation, and held-out test partitions. |

## 0.5 Common statistical protocol

Unless a task section overrides it:

1. Fix five seeds before model selection: \(S=\{11,17,23,29,31\}\).
2. Select hyperparameters only on \(\mathcal{D}_{va}\).
3. Evaluate the frozen selection once on \(\mathcal{D}_{te}\) for each seed.
4. Report the mean, standard deviation, and 95% confidence interval.
5. Use a paired bootstrap over the natural unit of analysis: event cluster, query node, scenario, or map tile.
6. When two classifiers differ on the same binary cases, use McNemar's test; for ranked metrics use a paired randomization or bootstrap test; for human ordinal ratings use a paired ordinal model or Wilcoxon signed-rank test with multiplicity correction.
7. Report effect size with the p-value. A tiny statistically significant improvement is not treated as operationally meaningful.

The minimum default bootstrap count is \(B=10{,}000\). Confidence intervals are percentile intervals unless the distribution is highly skewed, in which case bias-corrected and accelerated intervals are used.

---

<a id="canonical-architecture"></a>
## 0.6 Canonical NLM–MYCA–AVANI system architecture

The general Mycosoft architecture is broader than the ITDX26 laptop demonstration, but the same role boundaries govern the experiment. The Nature Learning Model is the grounded state-estimation and forecasting layer; FUSARIUM contributes typed graph analytics and intelligence-product logic; MYCA coordinates models and agents; AVANI enforces admissibility, deterministic policy, reversibility, and human-review gates; MINDEX preserves evidence, lineage, model artifacts, and decisions; and NatureOS/CREP presents the result to a human operator. [NLM1, SYS1–SYS4]

The architectural rule is:

```text
physical or public-world observation
        -> calibrated, provenance-bound frame
        -> NLM latent-state inference and forecast
        -> graph/relational analysis
        -> MYCA hypothesis and option orchestration
        -> AVANI deterministic admissibility gate
        -> MINDEX evidence and decision record
        -> NatureOS/CREP analyst product
```

For ITDX26, public event records, public graphs, and public geospatial layers stand in for live physical telemetry. This does not convert them into nature signals; it tests whether the same signal-native architecture can reason over ordered observations, structural relations, uncertainty, and provenance without making language generation the source of truth. The live demonstration requires no Mycosoft hardware.

![Figure 1. Canonical system architecture: observation, grounded inference, orchestration, governance, provenance, and analyst delivery.](graphics/fig01_system_architecture.png)

**Figure 1 — Canonical system architecture.** The stochastic and learned components propose state estimates, forecasts, links, and alternatives. Deterministic contracts, validators, and AVANI gates decide whether an output may be rendered, escalated, or used. Every displayed judgment remains linked to immutable evidence.

The separation is strict:

| Layer | Primary mathematical object | Permitted responsibility | Explicit non-responsibility |
|---|---|---|---|
| NLM | posterior or embedding over latent state | encode observations; estimate state; forecast; detect anomaly; quantify uncertainty | cannot authorize action or convert uncertain evidence into policy |
| FUSARIUM analytics core | typed temporal graph and intelligence-product schema | entity resolution; relationship inference; ranking; community structure; fused analytic products | cannot erase provenance or relabel predicted edges as observed |
| MYCA | multi-agent state machine and evidence graph | decompose tasks; invoke algorithms; propose, critique, revise, and compare alternatives | cannot become the raw-signal source of truth |
| AVANI | deterministic policy and admissibility function | enforce quality, provenance, licensing, safety, reversibility, and human-review rules | does not learn the underlying signal dynamics |
| MINDEX | append-only, versioned evidence and artifact graph | preserve records, hashes, lineage, model cards, predictions, analyst dispositions, and rollback points | does not decide which hypothesis is true |
| NatureOS/CREP | operator-facing projection of structured state | display, filter, inspect, compare, export, and record human disposition | natural-language rendering may not create new evidence |

This role decomposition is central to the Army-facing explanation. It prevents the entire system from being described as one opaque “AI.” It also makes ablation possible: each layer can be removed, replaced, or evaluated independently.

## 0.7 Nature and operational environments as partially observed dynamical systems

The NLM begins from a state-space assumption. Let the environment have a latent state

\[
s_t\in\mathcal{S}
\]

at time \(t\). A state may include biological, physical, geospatial, organizational, or operational variables that are not all directly observed. Modality \(m\) produces observation

\[
y_t^{(m)} = h_m(s_t,c_t;\phi_m)+\epsilon_t^{(m)},
\]

where \(h_m\) is a modality-specific observation operator, \(c_t\) is context, \(\phi_m\) contains calibration parameters, and \(\epsilon_t^{(m)}\) is measurement and representation noise. Actions or interventions \(a_t\) affect the state transition:

\[
s_{t+1}=f_\psi(s_t,a_t,c_t)+\eta_t,
\]

or probabilistically,

\[
p_\psi(s_{t+1}\mid s_t,a_t,c_t).
\]

The inference problem is to approximate

\[
q_\theta(s_t\mid y_{1:t}^{(1:M)},c_{1:t}),
\]

then forecast

\[
p_{\theta,\psi}(s_{t+k}\mid y_{1:t}^{(1:M)},a_{t:t+k-1},c_{1:t+k}).
\]

In Task 12, \(s_t\) is the latent activity regime that generates observed public events. In Task 13, the state includes the evolving typed relationship structure among entities. In Task 8, the state is not inferred directly from raw sensor streams; MYCA reasons over the structured state and evidence products produced by the first two tasks.

![Figure 2. NLM probabilistic signal-to-state model.](graphics/fig02_signal_state_model.png)

**Figure 2 — Signal-to-state formalization.** Multiple observation operators constrain a common latent state. The model must preserve the distinction between observation noise, state uncertainty, and model uncertainty.

The uncertainty decomposition is operationally important. For predictive distribution \(p(y\mid x,\mathcal{D})\), total variance may be decomposed as

\[
\operatorname{Var}(y\mid x,\mathcal{D})
=
\underbrace{\mathbb{E}_{\theta}[\operatorname{Var}(y\mid x,\theta)]}_{\text{aleatoric}}
+
\underbrace{\operatorname{Var}_{\theta}(\mathbb{E}[y\mid x,\theta])}_{\text{epistemic}}.
\]

Aleatoric uncertainty reflects ambiguity or noise in observations; epistemic uncertainty reflects incomplete model knowledge. The demonstration does not claim perfect Bayesian inference. It requires the system to report calibrated predictive probabilities, ensemble or conformal uncertainty where justified, and explicit degraded modes when data quality is inadequate.

## 0.8 Nature Message Frame as the scientific evidence contract

A raw sample is not yet evidence suitable for modeling. NLM uses the Nature Message Frame, or NMF, as the canonical scientific record. In mathematical shorthand,

\[
F_t = (I_t,T_t,S_t,C_t,R_t,\Phi_t,X_t,Q_t,P_t,Y_t),
\]

where:

- \(I_t\) is immutable frame identity;
- \(T_t\) is time, including clock quality and observation/ingestion distinction;
- \(S_t\) identifies source and modality;
- \(C_t\) contains environmental, spatial, taxonomic, mission, or dataset context;
- \(R_t\) references raw blocks;
- \(\Phi_t\) is calibration and transformation state;
- \(X_t\) contains derived features;
- \(Q_t\) contains quality, missingness, drift, and artifact flags;
- \(P_t\) is provenance, permissions, and lineage;
- \(Y_t\) is an optional label, target, intervention, or adjudication.

The cryptographic lineage root is computed over canonical serialized content:

\[
H_t=\operatorname{SHA256}\big(
H(I_t)\Vert H(T_t)\Vert H(S_t)\Vert H(C_t)\Vert H(R_t)
\Vert H(\Phi_t)\Vert H(X_t)\Vert H(Q_t)\Vert H(P_t)\Vert H(Y_t)
\big).
\]

A transformation creates a new frame whose provenance references its parents; it never mutates the original. A derived result is admissible only if every required parent hash resolves and all transformation versions are recorded.

For ITDX26, the NMF profile is adapted as follows:

| General NMF field | Task 12 profile | Task 13 profile | Task 14 profile |
|---|---|---|---|
| raw block | public event record | source entity/relation record | public geospatial feature or raster tile |
| calibration | source-code map, clock normalization, geocoding version | entity-normalization and relation-ontology version | CRS, vertical datum, resolution, resampling method |
| quality | duplication, source density, missing coordinates, coding drift | alias ambiguity, edge-source count, temporal validity | positional accuracy, age, nodata, source scale |
| context | AOR, time window, ontology | graph snapshot, relation types, temporal cutoff | extent, scale, projection, mission context |
| provenance | source record ID, URL/domain, acquisition and transform hashes | source IDs for each node/edge; observed/predicted status | layer license, acquisition date, transform chain |

## 0.9 Signal tokens, modality encoders, and the hybrid NLM backbone

NLM tokenization does not assert that physical or operational signals are language. A signal token is a learned or engineered representation of a recurring motif over a bounded measurement window. The hierarchy is:

1. **Primitive:** local event, spike, spectral patch, gas-response segment, or other atomic motif.
2. **Burst or phrase:** a short ordered composition of primitives.
3. **State-transition motif:** evidence of movement between latent regimes.
4. **Cross-source or ecosystem motif:** a coordinated pattern across modalities, locations, entities, or devices.

For ITDX26, an event token may combine actor class, action code, spatial cell, time delta, source-quality vector, and permitted text embedding. A graph token may represent a typed relation, an entity alias set, a temporal edge neighborhood, or a candidate higher-order relation. These are machine representations, not claims that an event “means” a specific intent.

The general hybrid encoder is

\[
e_t^{(m)}=E_m(y_t^{(m)},\phi_m,q_t^{(m)},c_t),
\]

followed by a state-space recurrence

\[
h_t=\operatorname{SSM}_\theta(h_{t-1},[e_t^{(1)},\ldots,e_t^{(M)},c_t]),
\]

and a relational update over graph or hypergraph \(\mathcal{H}_t=(V_t,\mathcal{E}_t)\):

\[
z_v^{(\ell+1)}=\sigma\left(
W_0^{(\ell)}z_v^{(\ell)}+
\sum_{e\in\mathcal{E}_t:v\in e}
\alpha_{ve}^{(\ell)}W_e^{(\ell)}\operatorname{AGG}\{z_u^{(\ell)}:u\in e\}
\right).
\]

Sparse cross-modal attention is reserved for selected critical interactions rather than applied quadratically to every long stream:

\[
\operatorname{Attn}_{\Omega}(Q,K,V)
=
\operatorname{softmax}\left(
\frac{QK^\top}{\sqrt{d}}+M_{\Omega}
\right)V,
\]

where mask \(M_{\Omega}\) permits only ontology-valid, time-local, or anomaly-triggered interactions.

![Figure 3. Hybrid NLM backbone.](graphics/fig03_nlm_hybrid_backbone.png)

**Figure 3 — Hybrid backbone.** Selective state-space dynamics carry long context; graph and hypergraph layers model typed relationships; sparse attention focuses on cross-modal or cross-entity interactions that justify its cost.

The architecture is “not transformer-first,” not “anti-transformer.” Attention remains useful for selective fusion, language rendering, and some baselines. The hypothesis tested at ITDX26 is that the SSM-centered primary path provides a better long-context speed/memory operating point for the chosen event stream.

## 0.10 Scientific learning objectives

A general NLM may optimize multiple objectives:

\[
\mathcal{L}_{NLM}=
\lambda_{mask}\mathcal{L}_{mask}
+\lambda_{forecast}\mathcal{L}_{forecast}
+\lambda_{contrast}\mathcal{L}_{contrast}
+\lambda_{pert}\mathcal{L}_{pert}
+\lambda_{phys}\mathcal{L}_{phys}
+\lambda_{graph}\mathcal{L}_{graph}
+\lambda_{cal}\mathcal{L}_{cal}.
\]

The components are:

### Masked reconstruction

\[
\mathcal{L}_{mask}=\sum_{t\in\mathcal{M}}d(x_t,\hat x_t),
\]

where \(d\) is cross-entropy, Huber, or modality-appropriate reconstruction loss. This tests whether the representation preserves recoverable local structure.

### Forecasting

\[
\mathcal{L}_{forecast}=-\sum_t\log p_\theta(y_{t+1:t+k}\mid y_{1:t},c_{1:t+k}).
\]

For continuous probabilistic forecasts, continuous ranked probability score may be used:

\[
\operatorname{CRPS}(F,y)=\int_{-\infty}^{\infty}(F(z)-\mathbf{1}\{y\le z\})^2\,dz.
\]

### Cross-modal or cross-view contrast

\[
\mathcal{L}_{contrast}=-\log
\frac{\exp(\operatorname{sim}(z_i^{(a)},z_i^{(b)})/\tau)}
{\sum_j\exp(\operatorname{sim}(z_i^{(a)},z_j^{(b)})/\tau)}.
\]

Positive pairs must refer to the same event or controlled context. An augmentation that changes semantics is not a valid positive.

### Controlled-perturbation identification

\[
\mathcal{L}_{pert}=-\log p_\theta(u_i\mid r_i,c_i),
\]

where intervention \(u_i\) produced response \(r_i\). This term is essential to scientific falsifiability: a recurring correlation is not promoted to a semantic or causal interpretation merely because an embedding cluster exists.

### Physics- or rule-informed residual

\[
\mathcal{L}_{phys}=\left\|\frac{\partial \hat u}{\partial t}-\mathcal{F}(\hat u,\nabla\hat u,\nabla^2\hat u,\vartheta)\right\|_2^2.
\]

For ITDX public event data, this is replaced by domain-valid conservation and consistency penalties rather than an invented physical law: nonnegative counts, chronological validity, relation-domain/range constraints, geospatial validity, and no future leakage.

### Graph relation loss

\[
\mathcal{L}_{graph}=-\sum_{(i,r,j)}\left[y_{irj}\log p_{irj}+(1-y_{irj})\log(1-p_{irj})\right]
\]

with relation-aware negative sampling and temporal validity.

### Calibration loss

A differentiable Brier term is

\[
\mathcal{L}_{cal}=\frac{1}{n}\sum_{i=1}^{n}(p_i-y_i)^2.
\]

Calibration is also evaluated after training; a low training calibration loss does not substitute for held-out reliability diagrams, expected calibration error, Brier score, and conformal coverage.

The ITDX task losses in Part 1 are concrete subsets of this general objective. No single run is expected to optimize every term.

## 0.11 Deterministic, stochastic, and hybrid inference

Mycosoft's architecture uses paired rails because reproducibility and uncertainty are different requirements.

### Deterministic rail

Given immutable input frame \(F\), model and code version \(v\), seed \(s\), and policy \(\Pi\), a deterministic function

\[
o_D=f_D(F;v,s,\Pi)
\]

must return the same structured result. Determinism includes fixed preprocessing, frozen weights, stable ordering, disabled nondeterministic kernels where practical, and recorded exceptions where a platform cannot guarantee bitwise equality.

The AVANI-style gate is

\[
g(o_D,F)=
\begin{cases}
\text{PASS}, & q(F)\ge q_{min}\land p(o_D)\ge\tau_{pass}\land C(o_D)=1,\\
\text{GATE}, & q(F)\ge q_{review}\land p(o_D)\ge\tau_{review}\land C_{hard}(o_D)=1,\\
\text{BLOCK}, & \text{otherwise},
\end{cases}
\]

where \(q\) is evidence quality and \(C\) is the vector of hard constraints.

### Stochastic rail

A stochastic NLM represents uncertainty or alternative futures:

\[
s_{t+k}^{(i)}\sim p_\theta(s_{t+k}\mid y_{1:t},c_{1:t}),\qquad i=1,\ldots,N.
\]

MYCA's language-model agents are also stochastic unless decoding is constrained. Their outputs are proposals, not truth. Each proposal must resolve to structured evidence and pass deterministic validators before presentation.

### Hybrid rail

The hybrid result is

\[
o_H=\operatorname{Gate}_{\Pi}
\left(
\operatorname{Calibrate}
\left[
\{o_S^{(i)}\}_{i=1}^{N},o_D,F
\right]
\right).
\]

The stochastic rail searches the hypothesis or option space; the deterministic rail enforces evidence, schema, constraints, licensing, and reproducibility. This is the mathematical basis of “MYCA expands capability; AVANI protects integrity.”

![Figure 4. Deterministic and stochastic paired architecture.](graphics/fig04_deterministic_stochastic.png)

**Figure 4 — Paired inference rails.** Deterministic processing is not assumed to be infallible; it is repeatable and inspectable. Stochastic processing is not assumed to be unreliable; it is explicitly distributional. The hybrid system uses each for the job it is mathematically suited to perform.

## 0.12 MYCA as a bounded multi-agent protocol

For ITDX26, MYCA is described as an orchestration protocol, not as an anthropomorphic consciousness claim. Let the agent set be

\[
\mathcal{A}=\{a_1,\ldots,a_n\},
\]

with role specification \(r_i\), tool permissions \(T_i\), evidence-access set \(E_i\), and reliability weight \(\omega_i\). At round \(k\), agent \(i\) receives immutable evidence state \(\mathcal{E}^{(k)}\), prior messages \(M^{(<k)}\), and a task-specific schema. It emits

\[
m_i^{(k)}=(h_i^{(k)},\,c_i^{(k)},\,R_i^{(k)},\,U_i^{(k)}),
\]

where \(h\) is a hypothesis or option, \(c\) is confidence, \(R\) is a set of evidence references, and \(U\) is an uncertainty/assumption set.

A deterministic validator computes

\[
v_i^{(k)}=V(m_i^{(k)},\mathcal{E}^{(k)},\Pi),
\]

including schema validity, unsupported-claim count, contradiction count, license and classification status, and doctrinal completeness. The score is

\[
s_i^{(k)}=\omega_i\left(
\beta_e E_i^{(k)}+
\beta_d D_i^{(k)}+
\beta_c C_i^{(k)}+
\beta_a A_i^{(k)}
\right)-\lambda_v V_i^{(k)}-\lambda_u U_i^{(k)}.
\]

The shared state is updated only with validated objects. The protocol stops at convergence, a round cap, a wall-time cap, or a hard gate. A disagreement is retained when the evidence does not support convergence.

This bounded protocol has five Army-relevant properties:

1. every agent has a declared role and permission set;
2. every claim must cite structured evidence;
3. every revision is diffable;
4. the transcript is part of the product;
5. timeout or disagreement produces a visible status rather than a fabricated consensus.

## 0.13 AVANI admissibility and reversible decision state

AVANI is the governance and admissibility layer. In this plan, its controls are implemented as deterministic policy code plus human-review checkpoints. Let candidate output \(o\) have attributes:

\[
\chi(o)=[q,\,p,\,u,\,\ell,\,\kappa,\,\rho,\,\gamma],
\]

where \(q\) is data quality, \(p\) calibrated confidence, \(u\) uncertainty, \(\ell\) license admissibility, \(\kappa\) classification status, \(\rho\) reproducibility status, and \(\gamma\) hard-constraint status. An action envelope is

\[
\mathcal{U}(o)=\{a\in\mathcal{A}_{possible}:G(a,o,\Pi)=1\}.
\]

For ITDX26, the permitted envelope is deliberately narrow:

- render an analytic aid;
- rank or filter candidates;
- expose evidence and alternatives;
- record an analyst disposition;
- rerun with a changed analyst-selected threshold.

The system may not issue an operational order, conceal a failed gate, or transform a low-confidence hypothesis into an asserted fact. All state-changing analyst actions create a new version and preserve the previous version for rollback.

## 0.14 MINDEX provenance and NatureOS/CREP presentation

MINDEX is modeled as a versioned evidence graph

\[
\mathcal{M}=(\mathcal{V}_E,\mathcal{V}_A,\mathcal{E}_L),
\]

where \(\mathcal{V}_E\) contains evidence and model artifacts, \(\mathcal{V}_A\) contains analytic outputs and analyst dispositions, and \(\mathcal{E}_L\) contains lineage edges such as `DERIVED_FROM`, `GENERATED_BY`, `VALIDATED_BY`, `REJECTED_BY`, and `SUPERSEDES`.

A product root is

\[
H_{product}=\operatorname{MerkleRoot}\{H(v):v\in\operatorname{Ancestors}(product)\}.
\]

The user interface resolves every displayed assertion to those ancestors. Language is a rendering of the structured state, not the canonical record. The dashboard therefore treats the following as first-class objects:

- evidence frame;
- model output;
- uncertainty object;
- policy decision;
- agent proposal and critique;
- analyst disposition;
- run report;
- model, code, environment, and dataset hashes.

## 0.15 Evidence-to-action ladder and falsifiability

The scientific ladder is:

```text
raw record
  -> calibrated observation
  -> feature
  -> recurring motif
  -> event or relation hypothesis
  -> latent-state estimate
  -> forecast
  -> recommendation
  -> governed action envelope
```

A higher level may not be claimed without the validation required by the lower levels. A repeated correlation is not a causal mechanism. A language summary is not evidence. A high model score is not authorization.

The ITDX26 implementation uses five claim-status labels:

| Status | Meaning | Required evidence |
|---|---|---|
| `SPECIFIED` | interface, loss, or protocol is mathematically defined | reviewed design document |
| `IMPLEMENTED` | executable code exists | passing unit and integration tests |
| `MEASURED` | a frozen run generated a metric | signed run report with hashes |
| `REPLICATED` | another machine or operator reproduced the result | independent run report within tolerance |
| `VALIDATED` | predefined acceptance criteria and external review are met | adjudicated evaluation record |

The September demonstration may establish `MEASURED` and `REPLICATED` for the selected public benchmarks. It does not, by itself, validate every broader NLM claim about biology, ecology, or physical-world intelligence.

---

## 0.16 DIRTNet decentralized edge network

DIRTNet is Mycosoft's coordination fabric for edge compute, sensors, local inference, intermittent communications, cryptographic evidence, and federated memory. It binds MycoBrain and accelerator nodes to MDP, Mycorrhizae, MycoSpeak, NLM, MINDEX, MYCA, AVANI, NatureOS, and FUSARIUM.

For ITDX26, DIRTNet is demonstrated as a software-defined network of virtual edge nodes. This preserves the event's “no hardware” scope while exposing a novel algorithmic question: whether an AI-analyst pipeline can remain useful, auditable, and convergent when observations and compute are distributed across constrained and intermittently connected nodes.

Let

\[
\mathcal{D}_t=(V_t,E_t,\mathcal{T},\mathcal{L},\Theta,\Pi)
\]

be the DIRTNet state, where \(V_t\) are edge/gateway nodes, \(E_t\) are time-varying links, \(\mathcal{T}\) are transport profiles, \(\mathcal{L}\) are append-only local logs, \(\Theta\) is the distributed model inventory, and \(\Pi\) is AVANI policy and authority.

Each node maintains

\[
X_i=(compute_i,energy_i,storage_i,sensors_i,quality_i,log_i,models_i,keys_i,authority_i).
\]

The local-autonomy invariant is

\[
Capability_i(partition)\ge C_{min,i},
\]

meaning that a node can continue sensing, validating, detecting selected events, preserving evidence, and applying bounded policy even when no central service is reachable.

### Edge event and evidence identity

A record at node \(i\), sequence \(k\), is hashed as

\[
h_{i,k}=SHA256(domain\Vert i\Vert k\Vert t_{i,k}\Vert h_{i,k-1}\Vert H(payload)\Vert H(context)),
\]

and signed

\[
\sigma_{i,k}=Sign_{sk_i}(h_{i,k}).
\]

An epoch root is

\[
R_{i,e}=MerkleRoot(h_{i,k_1},\ldots,h_{i,k_n}).
\]

A federated checkpoint commits node roots and the prior checkpoint. Inclusion proofs let MINDEX or an analyst verify one record without downloading all node data.

This design borrows exact primitives from Bitcoin—independent nodes, wallet-like key custody, signed records, a pending queue analogous to a mempool, hash-linked epochs, Merkle roots, and compact inclusion proofs. It deliberately does **not** use proof-of-work for routine field consensus. DIRTNet is a permissioned evidence network, not an open monetary double-spend network; deterministic validation, source signatures, quorum/notary checkpoints, and optional external timestamp anchors are the appropriate controls.

### Message priority and constrained links

For message \(m\):

\[
P(m,t)=\frac{w_uU+w_vV+w_nN+w_qQ+w_fF}{\epsilon+Airtime(m)+\lambda_E Energy(m)}.
\]

High-urgency compact alerts cross LoRa-class links first. Raw video, acoustic windows, or model packages remain content-addressed locally until a higher-bandwidth contact is available.

### Partition-tolerant reconciliation

Nodes exchange manifests containing sequence ranges, hybrid logical clocks, epoch roots, model versions, and queue summaries. Matching roots require no transfer. Divergent roots initiate Merkle-tree or range reconciliation. Immutable observations merge by set union; annotations retain explicit versions; device configuration and model promotion follow AVANI-authorized state machines, not generic last-writer-wins.

### Local and federated learning

Node \(i\) estimates

\[
b_i(s_t)=p_{\theta_i}(s_t\mid y_{i,1:t},c_{i,1:t}),
\]

and may exchange compact event states, embeddings, prototypes, covariance sketches, quantized adapters, or signed model deltas instead of raw streams. A quality-weighted update is

\[
\theta^{new}=\theta+\eta\,RobustAggregate(\{w_i\Delta_i\}),
\qquad w_i\propto n_i q_i c_i d_i,
\]

with clipping, robust aggregation, held-out validation, signed lineage, and AVANI promotion gates.

### Sensing packages and platform surfaces

BlueSight contributes visual and spatial evidence; SINE contributes acoustic and vibration evidence; GANDHA contributes chemical, odor, and particle evidence; FCI contributes biological and bioelectric evidence. NatureOS is the civilian/scientific operator surface. FUSARIUM and CREP are the defense/operational surfaces. The same scientific source roots may support different additive products under different admission and access policies.

![Figure 11. DIRTNet decentralized edge fabric: devices, adaptive transports, local inference, federated memory, MYCA, AVANI, and platform surfaces.](graphics/fig11_dirtnet_decentralized_edge_fabric.png)

**Figure 11 — DIRTNet architecture.** Every node is a data sensor and a bounded data-center participant. The cloud or field gateway is a federation point, not a prerequisite for local intelligence.

---

# Part 1 — Task-by-task mathematical specifications

![Figure 5. ITDX26 algorithm interaction and analyst-facing flow.](graphics/fig05_itdx_algorithm_interaction.png)

**Figure 5 — Demonstration topology.** Tasks 12 and 13 produce independently scored analytic objects; MYCA coordinates their interaction; AVANI controls admissibility; Task 8 is gated and Task 14 remains the deterministic fallback.

<a id="task-12"></a>
# 1. Task 12 — Perform Pattern Analysis

## 1.1 Task definition and analyst-facing output

### BAA text

> **Perform Pattern Analysis.** [D1]

### Doctrinal interpretation

Pattern analysis is the systematic examination of events, activities, locations, actors, and time to identify regularities, changes, associations, and indicators relevant to an intelligence problem. ATP 2-33.4 describes analytic aids such as pattern-analysis plot sheets and time-event charts; the central doctrinal requirement is not “find any statistical anomaly,” but organize evidence so an analyst can explain what changed, where, when, who was involved, how confident the judgment is, and what alternative explanation remains plausible. [D2]

The demonstration therefore produces an analytic aid, not an autonomous conclusion. It must preserve source provenance, separate observations from inference, expose uncertainty, and support analyst revision. FM 2-0 and JP 2-0 reinforce that intelligence supports understanding and decision-making; uncertainty and source limitations must remain visible. [D3, D7]

### Required analyst product

The rendered product is a **Pattern Analysis Worksheet** with the following sections:

1. **Problem statement:** region, time window, actors or event classes in scope.
2. **Observation timeline:** ordered events, source count, location, and confidence.
3. **Baseline behavior:** expected rate, seasonality, actor mix, and spatial distribution.
4. **Detected patterns:** ranked clusters, each with first observation, persistence, affected area, and supporting events.
5. **Indicators:** measurable conditions that increased the score.
6. **Alternative explanations:** reporting-volume changes, duplicate reports, source outages, holidays, weather, or coding drift.
7. **Uncertainty:** calibrated probability, conformal set or interval, and missing-data warning.
8. **Provenance:** local source identifier, transformation version, and hash.
9. **Analyst disposition:** accept, reject, monitor, merge, relabel, or request more data.

Expected fidelity is defined operationally. Every detected pattern must link to its constituent events; every score must be reproducible; and no natural-language summary may introduce an actor, place, or causal claim absent from the structured evidence.

## 1.2 Algorithm architecture

### Architecture overview

The primary model is a selective state-space event model. Events are converted into typed tokens and continuous features, processed in temporal order, and used for four related objectives: masked attribute reconstruction, next-event prediction, time-to-next-event estimation, and contrastive anomaly separation. A deterministic clustering layer converts high-scoring events into pattern candidates.

```text
Public event records
      |
      v
Schema validation -> deduplication -> geocoding checks -> provenance hash
      |
      v
Typed event encoder
(actor, action, object, time delta, H3 cell, source density, text embedding)
      |
      v
Selective SSM / Mamba stack ------------------------+
      |                                              |
      +-> next-event distributions                   |
      +-> time-to-event distribution                 |
      +-> contextual embedding h_t                   |
      +-> uncertainty estimates                      |
                                                     v
                              calibrated anomaly composition
                                                     |
                                                     v
                               temporal-spatial clustering
                                                     |
                                                     v
                         Pattern Analysis Worksheet + JSON
```

![Figure 6. Task 12 Pattern Analysis pipeline.](graphics/fig06_task12_pattern_pipeline.png)

**Figure 6 — Task 12 pipeline.** Public event observations become provenance-bound event frames, selective-state representations, calibrated anomalies, clustered pattern candidates, and an analyst-controlled worksheet.

### Streaming state-space core

A continuous-time linear state-space model begins with

\[
\dot h(t)=A h(t)+B x(t),\qquad y(t)=C h(t)+D x(t).
\]

After discretization at event-dependent interval \(\Delta_t\),

\[
h_t=\bar A_t h_{t-1}+\bar B_t x_t,\qquad o_t=C_t h_t+D x_t.
\]

The selective mechanism makes \(\Delta_t\), \(B_t\), and \(C_t\) functions of the current input, allowing the recurrence to retain or suppress information based on event content. The implementation follows the Mamba selective state-space design and hardware-aware scan principles. [M1, M2]

### Model-size plan

These are target architectures; exact parameter counts are generated by `scripts/count_parameters.py` and stored in each model card.

| Tier | Target architecture | Target parameters | Live role | Tradeoff |
|---|---|---:|---|---|
| Small | 24 selective SSM blocks, \(d_{model}=768\), state size 64, expansion 2 | 120–180M | Default live model | Fastest, lowest memory; weaker rare-pattern recall and long-horizon abstraction. |
| Medium | 36 blocks, \(d_{model}=1280\), state size 64, expansion 2 | 350–550M | Quality/latency comparison | Better representation capacity; still practical on a laptop GPU with mixed precision. |
| Large | 48 blocks, \(d_{model}=2048\), state size 128, expansion 2 | 1.1–1.8B | Optional Pareto point | Highest context capacity; adapter training and quantized inference only; not required for a successful live run. |

The size labels satisfy the requested ceilings. Training means adapter tuning or continued pretraining of an existing checkpoint on the event vocabulary, not training a billion-parameter model from random initialization in 24 hours.

### Typed input schema

```python
class EventRecord(TypedDict):
    event_id: str
    occurred_at_utc: str              # ISO-8601, second precision
    observed_at_utc: str              # ingestion time
    actor_1_id: str | None
    actor_2_id: str | None
    event_code: str                   # controlled event ontology
    root_event_code: str
    latitude: float | None
    longitude: float | None
    h3_r7: str | None
    country_code: str | None
    admin1_code: str | None
    source_record_ids: list[str]
    source_count: int
    source_diversity: float           # normalized entropy
    tone: float | None
    text_embedding_ref: str | None
    quality_flags: list[str]
    license_id: str
    provenance_sha256: str
```

The event encoder is

\[
x_t=W_a a_t+W_b b_t+W_c c_t+W_g g_t+W_{\Delta}\phi(\Delta t_t)+W_q q_t+W_s s_t,
\]

where actor, event-code, and geography terms are learned embeddings; \(\phi(\Delta t)\) is a log-bucketed and sinusoidal time-delta encoding; \(q_t\) contains source quality; and \(s_t\) is an optional frozen sentence embedding derived only from permitted text fields.

### Typed output schema

```python
class PatternCandidate(TypedDict):
    pattern_id: str
    rank: int
    start_utc: str
    end_utc: str
    centroid: tuple[float, float] | None
    h3_cells: list[str]
    actor_ids: list[str]
    event_codes: list[str]
    supporting_event_ids: list[str]
    anomaly_probability: float
    calibrated_confidence: float
    conformal_alert_set: list[str]
    baseline_rate: float
    observed_rate: float
    time_to_detection_seconds: float
    indicators: list[dict]
    alternative_explanations: list[str]
    quality_flags: list[str]
    provenance_root_sha256: str
```

The natural-language worksheet is generated from this object through a constrained template. A language model may improve phrasing, but it may not add facts; a post-render verifier checks all named entities and numbers against the structured object.

## 1.3 Mathematical formalism

### Masked event-attribute loss

Let \(m_t\) denote masked fields for event \(t\). For categorical field set \(\mathcal{F}_c\),

\[
\mathcal{L}_{mask}=-\sum_t\sum_{f\in\mathcal{F}_c} m_{t,f}\log p_\theta(e_{t,f}\mid e_{\setminus m}).
\]

Continuous fields, such as tone or normalized source density, use Huber loss:

\[
\mathcal{L}_{cont}=\sum_t\sum_{f\in\mathcal{F}_r}m_{t,f}\,\operatorname{Huber}_{\delta}(\hat e_{t,f}-e_{t,f}).
\]

### Next-event prediction

For event type \(c_{t+1}\), actor pair \(a_{t+1}\), and spatial cell \(g_{t+1}\),

\[
\mathcal{L}_{next}=
-\sum_t \left[
\log p(c_{t+1}\mid h_t)
+\lambda_a\log p(a_{t+1}\mid h_t)
+\lambda_g\log p(g_{t+1}\mid h_t)
\right].
\]

Hierarchical softmax is used for large actor vocabularies. Unseen actors map to stable ontology and lexical features rather than a single undifferentiated unknown token.

### Time-to-event likelihood

A log-normal head is the first implementation because it is stable and interpretable:

\[
\log \Delta t_{t+1}\sim\mathcal{N}(\mu_t,\sigma_t^2),
\]

\[
\mathcal{L}_{time}=\sum_t\left[
\log(\Delta t_{t+1}\sigma_t\sqrt{2\pi})+
\frac{(\log\Delta t_{t+1}-\mu_t)^2}{2\sigma_t^2}
\right].
\]

A temporal point-process head is a planned ablation, not a dependency for the live demonstration.

### Contrastive anomaly objective

Let \(z_i\) be a normalized contextual embedding for an event window, \(z_i^+\) a semantically consistent augmentation, and \(\mathcal{N}_i\) negatives from other times or regions. InfoNCE is

\[
\mathcal{L}_{NCE}=-\sum_i\log
\frac{\exp(\operatorname{sim}(z_i,z_i^+)/T)}
{\exp(\operatorname{sim}(z_i,z_i^+)/T)+\sum_{j\in\mathcal{N}_i}\exp(\operatorname{sim}(z_i,z_j)/T)}.
\]

Augmentations may mask low-confidence fields or jitter timestamps within source uncertainty. They may not change event class, actor identity, or region in a way that creates false semantics.

### Composite training loss

\[
\mathcal{L}_{12}=w_m\mathcal{L}_{mask}+w_r\mathcal{L}_{cont}+w_n\mathcal{L}_{next}+w_t\mathcal{L}_{time}+w_c\mathcal{L}_{NCE}+\lambda\lVert\theta\rVert_2^2.
\]

Initial weights are \((w_m,w_r,w_n,w_t,w_c)=(1.0,0.25,1.0,0.5,0.5)\). They are tuned only on validation performance under a fixed analyst review budget.

### Anomaly score

Define normalized components:

- \(u_t\): negative log probability of observed categorical attributes;
- \(v_t\): standardized time-to-event residual;
- \(r_t\): embedding-distance score to a local normal reference set;
- \(d_t\): reporting-density deviation;
- \(q_t\): data-quality penalty.

The raw score is

\[
a_t=\alpha_u u_t+\alpha_v|v_t|+\alpha_r r_t+\alpha_d d_t-\alpha_q q_t.
\]

It is smoothed using a causal kernel,

\[
\tilde a_t=\frac{\sum_{j=0}^{J} \exp(-j/\eta)a_{t-j}}
{\sum_{j=0}^{J}\exp(-j/\eta)}.
\]

Temperature scaling on validation data converts the score to a calibrated probability:

\[
p_t=\sigma\left(\frac{\tilde a_t-b}{T_{cal}}\right).
\]

The calibration set is temporally later than training and earlier than test. Expected calibration error and Brier score are always reported alongside precision and recall.

### Conformal alert set

For a nonconformity score \(A_i\) on calibration examples, the threshold for error rate \(\epsilon\) is

\[
q_{1-\epsilon}=\operatorname{Quantile}_{\lceil(n+1)(1-\epsilon)\rceil/n}\{A_i\}_{i=1}^{n}.
\]

A new candidate is labeled “outside the calibrated normal set” when \(A_{new}>q_{1-\epsilon}\). The exchangeability assumption is imperfect for drifting event streams; therefore the plan also evaluates rolling and weighted conformal variants and clearly marks coverage failures under drift. [M8]

### Pattern clustering

High-scoring events form a weighted graph. Two events are connected when they satisfy temporal, spatial, and semantic gates:

\[
w_{ij}=
\exp(-|t_i-t_j|/\tau_t)
\exp(-d_H(g_i,g_j)/\tau_g)
\max(0,\cos(z_i,z_j))
\mathbf{1}[\Gamma(i,j)],
\]

where \(d_H\) is Haversine distance and \(\Gamma\) enforces actor/event compatibility. Connected components or HDBSCAN produce pattern candidates. A candidate must meet minimum support, source-diversity, and persistence rules before display.

### Training regime

| Item | Small | Medium | Large |
|---|---:|---:|---:|
| Context | 8,192 events | 32,768 events | 65,536 events |
| Micro-batch | 4 | 2 | 1 |
| Gradient accumulation | 8 | 16 | 32 |
| Precision | BF16/FP16 | BF16/FP16 | 4-bit base + BF16 adapters |
| Optimizer | AdamW | AdamW | paged AdamW |
| Peak learning rate | \(2\times10^{-4}\) adapters | \(1.2\times10^{-4}\) | \(8\times10^{-5}\) |
| Warmup | 5% steps | 5% | 8% |
| Schedule | cosine decay | cosine decay | cosine decay |
| Gradient clip | 1.0 | 1.0 | 0.5 |
| Planned wall time | 8–12 h | 12–18 h | 18–24 h |

Splits are strictly temporal. A default example is training through 31 December 2023, validation during 2024, and test during 2025, with exact dates adjusted to the selected regional slice. No near-duplicate source record may cross partitions. Duplicate clusters are assigned wholly to the earliest partition containing the underlying event.

### Inference regime and latency targets

Batch size is one sequence window. The streaming state is cached between updates. Targets on a warmed NVIDIA laptop path are:

- Small: ingest and score 10,000 processed events in less than 2 seconds.
- Medium: less than 5 seconds.
- Large: less than 12 seconds.
- Worksheet render after scoring: less than 2 seconds.

These are acceptance targets, not predicted measurements. The Apple path uses the small model or a portable PyTorch/MLX implementation and is treated as a separate platform stratum rather than pooled with CUDA timings.

### Regularization

- input dropout 0.05–0.10;
- stochastic depth up to 0.10 on the large tier;
- label smoothing 0.05 for high-cardinality categorical heads;
- decoupled weight decay 0.01;
- actor-frequency reweighting capped to avoid rare-actor overamplification;
- validation-fitted temperature scaling;
- rolling conformal calibration when drift diagnostics exceed threshold.

## 1.4 Baselines

### Classical baseline A — seasonal Poisson rate model

For event class \(c\), region \(g\), and time bucket \(b\), estimate

\[
N_{cgb}\sim\operatorname{Poisson}(\lambda_{cgb}),\qquad
\log\lambda_{cgb}=\beta_0+\beta_c+\beta_g+f_{hour}(b)+f_{week}(b)+f_{season}(b).
\]

The anomaly score is a two-sided tail probability or deviance residual. This baseline is cheap, interpretable, and often difficult to beat for periodic count changes. It runs in seconds and provides a sanity check against needless model complexity.

### Classical baseline B — marked n-gram model

For a sequence of discretized marks \(m_t\),

\[
p(m_t\mid m_{t-n+1:t-1})=
\frac{C(m_{t-n+1:t})+\alpha}
{C(m_{t-n+1:t-1})+\alpha |\mathcal{V}|}.
\]

The anomaly score is \(-\log p\). Backoff and Kneser–Ney smoothing are evaluated for \(n\in\{2,3,4\}\). This baseline tests whether the SSM is learning more than local event transitions.

### Modern baseline — matched transformer encoder

The transformer uses the same event encoder, parameter budget, context truncation policy, training loss, and data. Sparse or sliding-window attention may be included as a named variant. The comparison must report actual context length and memory; a transformer that silently truncates history is not a matched long-context baseline.

### Baseline compute during the event

All baseline artifacts are precomputed for the canonical scenario, but the live harness can rerun them. The Poisson and n-gram paths should finish in under one minute. The matched transformer target is within 1.5 times the corresponding SSM wall-clock budget for the largest common context that fits; inability to fit is itself a measured limitation.

## 1.5 Evaluation metrics

### Detection metrics

At review budget \(K\):

\[
P@K=\frac{|\text{top-}K\cap Y|}{K},\qquad
R@K=\frac{|\text{top-}K\cap Y|}{|Y|},
\]

\[
F_1=2\frac{PR}{P+R}.
\]

Average precision is reported across the full ranking. Because positives are rare, AUROC is secondary; area under the precision-recall curve is primary.

### Time-to-detection

For labeled pattern \(j\) with onset \(t_j^0\) and first alert \(t_j^a\),

\[
TTD_j=\max(0,t_j^a-t_j^0).
\]

Missed patterns receive a censored value and are summarized using both conditional latency and detection probability by horizon.

### Calibration

\[
\operatorname{Brier}=\frac1n\sum_i(p_i-y_i)^2.
\]

Expected calibration error uses fixed and adaptive bins. Reliability diagrams appear in the metrics dashboard.

### System metrics

- events per second;
- end-to-end wall time;
- cold-start and warm-start time;
- peak resident RAM and accelerator memory;
- serialized model bytes;
- energy proxy when supported by the operating system;
- number of scored events per joule when a reliable measurement is available;
- context length actually processed;
- preprocessing versus inference time.

### Acceptance criteria

A Task 12 candidate is live-ready when it:

1. completes all five seeds without NaN, overflow, or nondeterministic hash drift;
2. beats at least one baseline on average precision **or** provides a materially better latency/memory operating point at non-inferior precision;
3. has a Brier score no worse than the uncalibrated model and a documented calibration curve;
4. produces a traceable worksheet with zero unsupported named entities in 100 test renders;
5. completes the small-tier canonical run within the latency budget on both event laptops or activates the documented portable fallback.

## 1.6 Failure-mode audit

| Failure mode | Root cause | Indicator | Adversarial batch | Mitigation and on-site disclosure |
|---|---|---|---|---|
| Reporting-volume anomaly mistaken for real activity | News or source coverage changes | Score correlates with source count but not source diversity | Duplicate one event across many outlets; remove a major outlet abruptly | Include density and diversity features; run source-ablation; label as reporting artifact when appropriate. |
| Actor alias drift | Same actor appears under new transliteration or alias | Rising unknown-token and resolver-conflict rate | Replace known names with aliases, misspellings, and transliterations | Alias graph, lexical features, uncertainty flag; do not merge below resolver threshold. |
| Geographic imprecision | Country-level records appear point-precise | High score concentrated at default centroids | Inject null, centroid, and swapped coordinates | Carry precision class; forbid distance claims beyond source precision. |
| Cyclical burst false positive | Holidays, elections, weather, or weekly routines | Repeated alert at stable periodicity | Hold out known seasonal windows | Seasonal baseline feature; show baseline residual and alternative explanation. |
| Rare-event collapse | Class imbalance suppresses meaningful rare classes | Near-zero recall on rare labels | Rare-class stress split with matched negative volume | Focal/reweighted loss, hierarchical heads, report per-class recall. |
| Label or temporal leakage | Same underlying event crosses splits | Implausibly high held-out score; duplicate hashes | Near-duplicate and future-field leakage tests | Cluster-before-split, hash audit, temporal feature allowlist. |
| Long quiet interval state decay | Recurrence forgets context after sparse periods | Error grows with gap length | Insert 1-, 7-, and 30-day silent gaps | Explicit delta-time encoding, state reset policy, gap-specific calibration. |
| Overconfidence under drift | Calibration set no longer matches test | ECE and coverage error rise | Region shift and event-code prevalence shift | Drift detector, rolling calibration, “coverage not guaranteed” banner. |
| Semantically invalid augmentation | Contrastive positive changes meaning | Training loss falls while task metrics degrade | Audit 500 augmented pairs | Typed augmentation rules and human audit before training. |
| Pattern fragmentation or over-merging | Clustering thresholds poorly set | Too many one-event patterns or giant clusters | Dense burst and bridge-event stress sets | Stability plot across thresholds; display constituent events and merge controls. |

At least one failure batch is run during the live session. A model that fails predictably and transparently is more useful than one whose failure boundary is hidden.

## 1.7 Reproducibility

### Deterministic controls

```python
import os, random, numpy as np, torch

SEED = int(os.environ["ITDX_SEED"])
os.environ["PYTHONHASHSEED"] = str(SEED)
os.environ["CUBLAS_WORKSPACE_CONFIG"] = ":4096:8"
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.cuda.manual_seed_all(SEED)
torch.use_deterministic_algorithms(True, warn_only=False)
torch.backends.cudnn.benchmark = False
```

If an optimized selective-scan kernel is not deterministic on the target environment, the run is marked accordingly and the deterministic reference kernel is used for the scored reproducibility run. Fast and deterministic modes are separate report fields.

### Task command

```bash
make demo TASK=12 SIZE=small SEED=17 OFFLINE=1 \
  CONFIG=configs/task12/canonical.yaml
```

### Required artifacts

- input data manifest and SHA-256 list;
- resolved configuration;
- model card and weight hash;
- exact environment lock hash;
- full event rankings;
- pattern worksheet JSON and HTML/PDF render;
- metrics JSON;
- stdout/stderr log;
- profiler trace for one canonical run;
- failure-batch output.


<a id="task-13"></a>
# 2. Task 13 — Perform Link Analysis

## 2.1 Task definition and analyst-facing output

### BAA text

> **Perform Link Analysis.** [D1]

### Doctrinal interpretation

ATP 2-33.4 treats link analysis as a method for identifying and portraying relationships among persons, organizations, locations, events, activities, and other entities. The doctrinal value is in making a network inspectable: the analyst must be able to see the asserted relationship, its source, direction, type, time, confidence, and any analytic inference layered on top. [D2]

For this demonstration, an **observed edge** is never visually or semantically conflated with a **predicted edge**. The graph product uses separate symbology and data fields for:

- source-reported relations;
- resolver-generated identity equivalences;
- deterministic graph measures;
- model-predicted relations;
- analyst-confirmed or rejected relations.

That separation is essential. A link-prediction score is a hypothesis for analyst review, not evidence that the relationship exists.

### Required analyst product

The **Link Analysis Worksheet** contains:

1. **Intelligence question and scope:** graph time cutoff, relation types, geography, and inclusion rules.
2. **Entity roster:** canonical identifier, aliases, entity type, source count, resolver confidence.
3. **Observed relationship table:** source, relation, direction, valid time, observation time, confidence.
4. **Predicted relationship table:** probability, rank, calibration interval, supporting paths, counterevidence.
5. **Network measures:** degree, weighted degree, betweenness, PageRank, component, and community.
6. **Community summary:** membership, internal density, bridge nodes, stability across perturbations.
7. **Link diagram:** selectable layers for observed, predicted, rejected, and uncertain edges.
8. **Provenance and limitations:** data coverage, missingness, resolver conflicts, license, and hash.
9. **Analyst disposition:** confirm, reject, monitor, defer, merge entities, split entity, or suppress relation.

The expected fidelity criterion is that any displayed edge can be traced to either a source record or a specific model run and feature explanation.

## 2.2 Algorithm architecture

### End-to-end architecture

```text
Wikidata CC0 + license-cleared benchmark graphs + optional public metadata
       |
       v
schema validation -> entity extraction -> alias normalization -> candidate pairs
       |
       v
entity-resolution model + deterministic constraints
       |
       v
canonical typed temporal graph G_t=(V,E,R)
       |
       +------------------------------+
       |                              |
       v                              v
classical graph analytics       relational temporal GNN
(PageRank, Louvain, paths)      (GraphSAGE/GAT message passing)
       |                              |
       +--------------+---------------+
                      v
       calibrated link decoder + community head
                      |
                      v
      evidence paths, counterevidence, uncertainty
                      |
                      v
        Link Analysis Worksheet + interactive graph
```

![Figure 7. Task 13 Link Analysis pipeline.](graphics/fig07_task13_link_pipeline.png)

**Figure 7 — Task 13 pipeline.** Entity resolution is separately measured before typed temporal graph inference; observed, predicted, rejected, and uncertain relations remain distinguishable.

### Graph representation

At cutoff time \(t_c\),

\[
G_{t_c}=(V,E_{\le t_c},R),
\]

where each edge is a tuple

\[
e=(u,r,v,t_{valid},t_{obs},w,p),
\]

with source node \(u\), relation type \(r\), target node \(v\), valid and observation times, source-derived weight \(w\), and provenance reference \(p\).

Nodes have type \(\kappa(v)\in\mathcal{K}\), such as person, organization, location, event, document, or activity. A schema matrix \(M_{\kappa(u),r,\kappa(v)}\in\{0,1\}\) forbids semantically impossible negative samples and predictions.

### Entity-resolution stage

Entity resolution is a separate scored component. Candidate pairs are generated by blocking on normalized name, alias, type, geographic context, and source identifiers. Pair feature vector \(\psi(i,j)\) includes:

- Jaro–Winkler and token-set similarity;
- alias overlap;
- type compatibility;
- geographic compatibility;
- temporal overlap;
- shared identifiers;
- neighborhood similarity;
- frozen semantic embedding cosine similarity.

The match probability is

\[
p_{ij}^{ER}=\sigma(f_\phi(\psi(i,j))).
\]

Hard constraints prevent merges across incompatible stable identifiers or entity types. Ambiguous connected components are resolved with correlation clustering rather than transitive closure alone, because a single false pair can otherwise collapse several distinct actors.

### Relational temporal message passing

For node \(v\) at layer \(\ell\), a relational attention update is

\[
h_v^{(\ell+1)}=\sigma\left(
W_0^{(\ell)}h_v^{(\ell)}+
\sum_{r\in R}\sum_{u\in\mathcal{N}_r(v)}
\alpha_{uvr}^{(\ell)}
W_r^{(\ell)}
[h_u^{(\ell)}\Vert \phi_t(t_c-t_{uv})\Vert x_{uv}]
\right).
\]

The attention coefficient is

\[
\alpha_{uvr}^{(\ell)}=
\operatorname{softmax}_{u\in\mathcal{N}_r(v)}
\left(
\frac{(Q_rh_v)^\top(K_rh_u+b_r+T_r\phi_t(\Delta t))}{\sqrt d}
\right).
\]

This architecture combines inductive neighborhood aggregation in the GraphSAGE tradition with relation-specific attention in the GAT tradition. [M3, M4]

For high-degree nodes, relation-stratified neighbor sampling caps compute while preserving rare relation types. Sampling probabilities and sampled neighbor identifiers are logged for reproducibility.

### Link decoder

For candidate relation \((u,r,v)\), the primary decoder is a relation-aware bilinear score:

\[
s(u,r,v)=z_u^\top W_r z_v+b_r+g_\omega(\chi_{uvr}),
\]

where \(\chi_{uvr}\) contains deterministic graph features such as common-neighbor count, Adamic–Adar, shortest valid path length, temporal recency, and source diversity. The raw probability is \(\sigma(s)\), then calibrated on the validation split.

A DistMult decoder and a two-layer MLP decoder are named ablations. Directional relations require a non-symmetric \(W_r\); symmetric relations may share constrained matrices.

### Community head

Soft community assignments are

\[
S=\operatorname{softmax}(ZW_c),\qquad S\in[0,1]^{|V|\times C}.
\]

The head is auxiliary. It does not replace Louvain or deterministic component analysis; it tests whether a jointly learned community signal improves link prediction and produces stable groupings.

### Model-size plan

Graph tasks do not require billions of parameters to satisfy the requested size tiers. The plan uses fit-for-purpose models well below the ceilings.

| Tier | Architecture target | Target parameters | Live role | Tradeoff |
|---|---|---:|---|---|
| Small | 4 relational GraphSAGE layers, \(d=256\), basis-decomposed relation weights, 4-head final attention | 15–30M | Default live model | Fast and interpretable; may underfit heterogeneous relations. |
| Medium | 6 hybrid GraphSAGE/GAT layers, \(d=512\), 8 heads, temporal edge encoder | 70–140M | Main quality model | Better rare-relation and temporal capacity; moderate memory. |
| Large | 8 layers, \(d=1024\), 16 heads, relation bases, hierarchical neighbor sampler | 300–650M | Optional scale point | More capacity and graph context; greater oversmoothing and sampling risk. |

The exact count depends on relation vocabulary. All relation-specific matrices use basis decomposition when \(|R|\) would otherwise dominate the parameter count.

### Typed input schema

```python
class EntityNode(TypedDict):
    entity_id: str
    entity_type: Literal["person", "organization", "location", "event", "activity", "document", "other"]
    canonical_label: str
    aliases: list[str]
    external_ids: dict[str, str]
    country_codes: list[str]
    valid_from_utc: str | None
    valid_to_utc: str | None
    source_record_ids: list[str]
    resolver_confidence: float
    quality_flags: list[str]
    license_id: str
    provenance_sha256: str

class RelationEdge(TypedDict):
    edge_id: str
    source_entity_id: str
    relation_type: str
    target_entity_id: str
    directed: bool
    valid_from_utc: str | None
    valid_to_utc: str | None
    observed_at_utc: str
    source_record_ids: list[str]
    source_confidence: float
    observed_or_predicted: Literal["observed", "predicted"]
    license_id: str
    provenance_sha256: str
```

### Typed output schema

```python
class PredictedLink(TypedDict):
    query_id: str
    source_entity_id: str
    relation_type: str
    target_entity_id: str
    raw_score: float
    calibrated_probability: float
    rank: int
    conformal_candidate_set: list[str]
    supporting_paths: list[list[str]]
    graph_features: dict[str, float]
    temporal_cutoff_utc: str
    counterevidence: list[str]
    quality_flags: list[str]
    model_run_id: str

class CommunityResult(TypedDict):
    method: str
    community_id: str
    member_entity_ids: list[str]
    internal_density: float
    conductance: float
    stability_ari: float
    bridge_entity_ids: list[str]
```

## 2.3 Mathematical formalism

### Entity-resolution loss

For labeled candidate pair \((i,j)\) with match label \(y_{ij}\),

\[
\mathcal{L}_{ER}=-\sum_{(i,j)}
\left[
\omega_+y_{ij}\log p_{ij}^{ER}+
\omega_-(1-y_{ij})\log(1-p_{ij}^{ER})
\right].
\]

Pairwise precision, recall, and F1 are reported, plus cluster metrics B-cubed precision/recall and variation of information. Graph metrics are computed on both gold-resolved and system-resolved graphs where benchmark labels permit; this quantifies error propagation.

### Link-prediction binary cross-entropy

Let \(E^+\) be observed positive edges in the training partition and \(E^-\) schema-valid sampled nonedges:

\[
\mathcal{L}_{link}=-
\sum_{e\in E^+}\log \sigma(s_e)
-\sum_{e\in E^-}\omega_e\log(1-\sigma(s_e)).
\]

Because “not observed” is not equivalent to “false,” negative sampling is controlled. Negatives are drawn from type-compatible pairs and split into:

- random negatives;
- hard structural negatives with short paths or shared neighbors;
- temporal negatives that become positive only after the cutoff;
- relation-corruption negatives.

The report lists performance by negative class. A model that wins only on easy random negatives is not considered adequate.

### Knowledge-graph ranking loss

For benchmarks such as a Wikidata-derived relation-completion slice, a sampled softmax or margin objective is added:

\[
\mathcal{L}_{rank}=\sum_{(u,r,v)\in E^+}
\sum_{v^-\in\mathcal{C}(u,r)}
\max\left(0,\gamma-s(u,r,v)+s(u,r,v^-)\right).
\]

Filtered evaluation removes other known true edges from the corruption set.

### Community-detection auxiliary loss

Let \(A\) be the weighted adjacency matrix, \(k\) the degree vector, and \(m=\frac12\sum_{ij}A_{ij}\). The soft modularity objective is

\[
Q(S)=\frac{1}{2m}\operatorname{Tr}\left[
S^\top\left(A-\frac{kk^\top}{2m}\right)S
\right].
\]

The loss is

\[
\mathcal{L}_{comm}=-Q(S)+\lambda_b\left\lVert
\frac{\mathbf{1}^\top S}{|V|}-\pi
\right\rVert_2^2+\lambda_e H(S),
\]

where \(\pi\) is a weak balance prior and \(H(S)\) controls assignment entropy. The balance prior is low-weight because real networks need not have equal-sized communities.

### Full Task 13 loss

\[
\mathcal{L}_{13}=w_{ER}\mathcal{L}_{ER}+w_l\mathcal{L}_{link}+w_r\mathcal{L}_{rank}+w_c\mathcal{L}_{comm}+\lambda\lVert\theta\rVert_2^2.
\]

Initial weights are \((1.0,1.0,0.25,0.10)\), with the community head disabled in the first reference run. It is enabled only if ablation shows no degradation in calibrated link prediction.

### Calibration and uncertainty

Per relation type with sufficient validation support, temperature scaling uses

\[
p_{uvr}=\sigma(s_{uvr}/T_r).
\]

Rare relations share a hierarchical temperature prior. Conformal candidate sets for a query \((u,r,?)\) use calibrated ranking nonconformity. Coverage is reported overall and by relation-frequency band.

### Training regime

| Item | Small | Medium | Large |
|---|---:|---:|---:|
| Neighbor fanout per layer | 20,15,10,10 | 25,20,15,10,10,5 | 30,25,20,15,10,10,5,5 |
| Edge micro-batch | 4,096 | 2,048 | 512–1,024 |
| Negative ratio | 1:4 | 1:8 | 1:8 plus hard negatives |
| Optimizer | AdamW | AdamW | AdamW / ZeRO-offload if needed |
| Peak learning rate | \(3\times10^{-4}\) | \(2\times10^{-4}\) | \(1\times10^{-4}\) |
| Warmup | 5% | 5% | 8% |
| Gradient clip | 1.0 | 1.0 | 0.5 |
| Planned wall time | 4–8 h | 8–14 h | 16–24 h |

The primary split is temporal: edges with observation or valid time after cutoff are withheld. A second inductive split withholds selected nodes and all their edges from training. Standard OGB splits are retained unchanged for benchmark comparability. [DATA7]

### Live inference targets

For the canonical graph slice, including feature load but excluding initial data download:

- Small: top-100 candidate links for a query set in less than 3 seconds.
- Medium: less than 8 seconds.
- Large: less than 20 seconds.
- Interactive one-hop neighborhood expansion: less than 500 ms after cache warmup.
- Full graph render: less than 3 seconds for the curated analyst view, with server-side downsampling for dense graphs.

### Regularization

- edge dropout 0.05–0.15;
- relation-aware DropEdge so rare relation types are not erased;
- node-feature dropout 0.10;
- residual connections and layer normalization;
- pair-normalization or jumping knowledge to mitigate oversmoothing;
- label smoothing 0.02 for relation classification;
- calibrated probabilities and abstention below relation-specific evidence thresholds.

## 2.4 Baselines

### Classical baseline A — common neighbors and Adamic–Adar

For nodes \(u,v\),

\[
CN(u,v)=|\Gamma(u)\cap\Gamma(v)|,
\]

\[
AA(u,v)=\sum_{w\in\Gamma(u)\cap\Gamma(v)}\frac{1}{\log |\Gamma(w)|}.
\]

Typed variants count only schema-compatible paths. Temporal variants weight a common neighbor by edge recency. These baselines are transparent and strong in homophilous networks.

### Classical baseline B — PageRank and Louvain

PageRank satisfies

\[
\pi=\alpha P^\top\pi+(1-\alpha)v,
\]

with \(\alpha=0.85\) as a starting value and a documented personalization vector. [M7] Louvain greedily optimizes modularity and supplies a classical community partition. [M6] Neither algorithm predicts a typed relation by itself; they provide ranking and community baselines and features for a simple logistic link classifier.

### Modern baseline — node2vec plus logistic decoder

node2vec generates biased random walks with return parameter \(p\) and in–out parameter \(q\), then optimizes a skip-gram objective:

\[
\max_f\sum_{u\in V}\log\Pr(N_S(u)\mid f(u)).
\]

A logistic classifier over \([z_u,z_v,z_u\odot z_v,|z_u-z_v|]\) predicts links. [M5] It is trained on the exact same positive and negative edges.

### Additional modern comparator

A graph-transformer or shallow GAT model with matched parameter budget is run if it fits the frozen schedule. It is not permitted to use future edges, transductive node features unavailable to the primary model, or a different negative set.

### Baseline compute during the event

Classical graph measures are cached and can be recomputed within minutes on the canonical slice. node2vec embeddings are pre-trained but a small live retraining run is available. Every baseline includes preprocessing time; precomputed embeddings cannot be presented as zero-cost inference.

## 2.5 Evaluation metrics

### Link ranking

For each query, reciprocal rank is

\[
RR_i=\frac{1}{\operatorname{rank}_i},\qquad
MRR=\frac1n\sum_i RR_i.
\]

\[
Hits@K=\frac1n\sum_i\mathbf{1}[\operatorname{rank}_i\le K].
\]

Filtered MRR and Hits@K are used for knowledge-graph completion. Average precision and AUCPR are used for binary candidate-edge evaluation. OGB-specific official evaluators are used unchanged on OGB datasets. [DATA7]

### Entity resolution

- pairwise precision, recall, F1;
- B-cubed precision, recall, F1;
- cluster variation of information;
- false-merge rate, reported separately because false merges contaminate many downstream edges.

### Community quality

When labels exist, normalized mutual information and adjusted Rand index are reported. Without labels, report modularity, conductance, partition stability under 5% edge perturbation, and analyst usefulness without calling any partition “ground truth.”

### Explanation quality

For a stratified sample of 100 predicted links:

- percentage with at least one valid supporting path;
- path faithfulness under edge removal;
- percentage whose explanation mentions only present nodes and relations;
- analyst rating for usefulness and misleadingness.

### Acceptance criteria

Task 13 is live-ready when:

1. it completes the official benchmark evaluator and the curated temporal split for all five seeds;
2. it beats at least one heuristic and node2vec on the primary ranking metric, or offers a materially better calibrated/latency operating point;
3. false-merge rate stays below the preset threshold on the entity-resolution test set;
4. no predicted edge is rendered as observed;
5. every displayed prediction has a model run ID, cutoff time, and provenance path;
6. graph interaction remains responsive on the canonical offline slice.

## 2.6 Failure-mode audit

| Failure mode | Root cause | Indicator | Adversarial batch | Mitigation and disclosure |
|---|---|---|---|---|
| False entity merge cascades | Ambiguous aliases or shared names | Large component growth after one low-confidence merge | Same-name actors in different regions and periods | Hard identifier constraints, correlation clustering, merge-review queue; show downstream sensitivity. |
| False entity split | Sparse alias evidence | Duplicate high-centrality nodes | Transliteration and abbreviation variants | Alias enrichment, resolver abstention, analyst merge action. |
| Missing-not-negative error | Unobserved edges treated as false | Performance collapses on hard/temporal negatives | Future-positive and source-coverage gaps | Negative taxonomy, positive-unlabeled sensitivity analysis, cautious probability language. |
| Hub dominance | High-degree nodes receive every prediction | Degree strongly predicts score | Synthetic super-hub and degree-preserving rewiring | Degree-normalized features, relation-specific calibration, report performance by degree band. |
| Oversmoothing | Deep message passing makes nodes indistinguishable | Embedding variance and pairwise distance collapse | Increase depth without residuals | Residuals, jumping knowledge, layer-depth ablation. |
| Temporal leakage | Future edge or future-derived feature enters training | Near-perfect MRR on temporal split | Timestamp shuffling and future-feature sentinel | Feature allowlist, cutoff assertions, unit tests, split audit. |
| Negative-sampling shortcut | Model separates easy random nonedges only | High random-negative AUC, poor hard-negative AP | Structurally plausible nonedges | Mixed negative classes and per-class reporting. |
| Spurious community narrative | Modularity partition interpreted as coordinated group | Low stability under perturbation | Degree-preserving null graphs | Stability metrics, null comparison, no intent claim from community membership alone. |
| Relation-direction confusion | Symmetric decoder used for directed edge | Reverse-edge error rises | Direction reversal set | Asymmetric decoder and schema checks. |
| Graph scale memory failure | Neighborhood explosion | OOM or latency superlinear in degree | Power-law stress graph, 2x/4x nodes and edges | Bounded sampling, partitioned inference, small-tier fallback. |
| Source echo chamber | Many records copy one source | Confidence rises with duplicate citations | Replicated-source bundle | Source-family deduplication and diversity weighting. |
| Sensitive inference from public data | Benign records combined into intrusive profile | High-confidence personal inference unsupported by task need | Public-data minimization review | Minimize person-level fields, use fictional/benchmark identities where possible, analyst and AVANI gate. |

## 2.7 Reproducibility

### Commands

```bash
make demo TASK=13 SIZE=small SEED=17 OFFLINE=1 \
  CONFIG=configs/task13/canonical.yaml

make eval TASK=13 MODEL=combined SEEDS=11,17,23,29,31
```

### Split immutability

The graph split manifest stores explicit node and edge identifiers rather than only a random seed. For every edge:

```json
{
  "edge_id": "...",
  "partition": "train|validation|test",
  "split_reason": "temporal|inductive|benchmark_official",
  "cutoff_utc": "...",
  "sha256": "..."
}
```

### Required artifacts

- raw-to-canonical entity map;
- resolver candidate pairs and decisions;
- graph schema and relation vocabulary;
- exact positive and negative edge lists;
- neighbor-sampling trace for canonical queries;
- baseline embeddings and configuration;
- predicted-link ranking;
- community results and perturbation stability;
- static and interactive graph render;
- metrics, profiler, and failure-batch reports.


<a id="task-8"></a>
# 3. Task 8 — Produce Courses of Action

## 3.1 Task definition and analyst-facing output

### BAA text

> **Produce Courses of Action.** [D1]

### Doctrinal interpretation

FM 5-0 defines a course of action as a broad potential solution to an identified problem and requires candidate courses of action to be screened for **feasibility, acceptability, suitability, distinguishability, and completeness**. A completed candidate includes a statement and sketch and accounts for the main effort, supporting efforts, resources, risk, and the transition from current conditions to the desired end state. [D6]

The demonstration uses a fictional, unclassified humanitarian-assistance and infrastructure-restoration scenario. It does not generate targeting, weapons-employment, or autonomous operational orders. The system is evaluated as a structured decision-support method: it organizes assumptions, constraints, alternatives, tradeoffs, and evidence so a human planner can compare options.

### Required analyst product

The **COA Comparison Packet** contains:

1. **Scenario facts:** facts, assumptions, constraints, limitations, and unknowns separated explicitly.
2. **Mission and desired conditions:** normalized from the scenario without inventing details.
3. **Planning factors:** time, geography, available generic capabilities, civilian considerations, logistics, communications, and risk.
4. **Three to five candidate COAs:** each with statement, phases, decisive or primary action, supporting actions, tasks and purposes, resource assumptions, decision points, risk controls, and a simple map sketch when relevant.
5. **FASDC screen:** pass, conditional pass, or fail for each criterion with evidence.
6. **Comparison matrix:** weighted and unweighted scores, sensitivity to weights, and Pareto-nondominated options.
7. **Critique transcript:** proposal, objections, revisions, unresolved disagreements, and convergence state.
8. **Unsupported-assumption register:** every claim not grounded in the scenario or approved doctrine.
9. **Human decision block:** no automatic selection; the analyst records the preferred option and rationale.

Expected fidelity is structural and evidentiary. The system need not produce the same prose as a human exemplar, but it must cover required fields, respect scenario constraints, distinguish alternatives meaningfully, and avoid unsupported facts.

## 3.2 Algorithm architecture

### Orchestration overview

MYCA coordinates a bounded agent ensemble. Each role has a fixed schema, limited tool access, and a turn budget. The coordinator never treats role labels as authority; role outputs are hypotheses that pass through validators.

```text
Scenario JSON + public doctrine excerpts + approved map layers
                         |
                         v
                Grounding and constraint parser
                         |
       +-----------------+-----------------+
       |                 |                 |
       v                 v                 v
 mission parser   intelligence/context   operations proposer
       |                 |                 |
       +--------+--------+--------+--------+
                |                 |
                v                 v
      sustainment/protection     independent red critic
                |                 |
                +--------+--------+
                         v
              doctrinal FASDC evaluator
                         |
                         v
             revise -> score -> compare
                         |
                         v
     COA packet + transcript + unresolved issues
```

![Figure 8. Task 8 MYCA COA pipeline.](graphics/fig08_task8_coa_pipeline.png)

**Figure 8 — Task 8 pipeline.** MYCA coordinates bounded role agents, deterministic validators, doctrinal FASDC scoring, critique, revision, and explicit convergence or non-convergence.

### Agent roles

| Role | Required output | Prohibited behavior |
|---|---|---|
| Grounding parser | Facts, assumptions, constraints, unknowns, citations | Converting assumptions into facts. |
| Mission parser | Task, purpose, desired conditions, success indicators | Adding missions absent from scenario. |
| Context analyst | Relevant temporal, geographic, civil, and network context | Claiming causation from correlation alone. |
| COA proposer | Candidate statement, phases, tasks/purposes, resources, risks | Selecting its own proposal as final. |
| Sustainment reviewer | Resource and sequencing feasibility | Inventing unavailable resources. |
| Protection/risk reviewer | Hazards, failure conditions, reversibility | Providing prohibited operational details. |
| Independent critic | Strongest disconfirming case and alternative | Repeating the proposer in different words. |
| FASDC evaluator | Criterion-level evidence and scores | Passing a criterion without cited support. |
| Coordinator | Turn order, convergence, transcript, final packet | Hiding disagreement or unsupported claims. |

### Model-size plan

The live system uses license-cleared, locally stored instruction checkpoints whose exact repository commit, weight hash, tokenizer hash, and license are frozen in the model allowlist. The architecture targets are:

| Tier | Decoder target | Target parameters | Quantization | Live role |
|---|---|---:|---|---|
| Small | compact instruction decoder, 24–32 layers | 0.36–0.50B | 8-bit or 4-bit | Fast parser, rubric evaluator, fallback full run. |
| Medium | instruction decoder, 24–32 layers with wider hidden state | 1.3–1.8B | 4-bit weights, BF16 adapters | Default live ensemble. |
| Large | instruction decoder with long-context support | 3.5–4.5B | 4-bit | Optional quality point; may be used only for proposer/critic while smaller models handle validation. |

The “large” tier remains below 7B and is intentionally smaller than the maximum because the full protocol invokes the model several times. Aggregate system latency matters more than a single-call parameter count.

No model is permitted in the package until its license has been reviewed and its local weight hash is listed in `models/allowlist.yaml`. The final allowlist is frozen on 15 August.

### Retrieval and grounding

The retrieval corpus contains only public doctrine excerpts, the fictional scenario, public geospatial layers, and a curated glossary. Retrieval uses hybrid lexical and embedding search. Every returned span has a document ID, paragraph/page pointer, license record, and hash.

For query \(q\), candidate span \(d\) receives

\[
R(q,d)=\lambda_{bm}BM25(q,d)+\lambda_{emb}\cos(e_q,e_d)+\lambda_{auth}A_d+\lambda_{fresh}F_d.
\]

Doctrine authority \(A_d\) is fixed by source class, not learned from user preference. Scenario facts outrank general doctrine for scenario-specific values.

### Typed scenario schema

```python
class ScenarioPacket(TypedDict):
    scenario_id: str
    title: str
    as_of_utc: str
    area: dict                       # bbox / polygon / named places
    desired_conditions: list[str]
    assigned_tasks: list[dict]
    available_capabilities: list[dict]
    unavailable_capabilities: list[str]
    time_constraints: list[dict]
    legal_policy_constraints: list[str]
    civilian_considerations: list[dict]
    hazards: list[dict]
    communications_constraints: list[str]
    confirmed_facts: list[dict]
    assumptions: list[dict]
    unknowns: list[dict]
    source_refs: list[str]
    provenance_root_sha256: str
```

### Typed COA schema

```python
class CourseOfAction(TypedDict):
    coa_id: str
    name: str
    statement: str
    objective: str
    primary_action: dict
    supporting_actions: list[dict]
    phases: list[dict]
    task_purpose_pairs: list[dict]
    decision_points: list[dict]
    resource_requirements: list[dict]
    assumptions_used: list[str]
    constraints_satisfied: list[str]
    constraint_violations: list[str]
    risks: list[dict]
    mitigations: list[dict]
    success_indicators: list[dict]
    sketch_geojson_ref: str | None
    evidence_refs: list[str]
    unsupported_claims: list[str]
    fasdc: dict
    model_run_ids: list[str]
```

### Constrained generation

All agents emit JSON conforming to a schema. Free text is rendered only after validation. Generation uses:

- grammar-constrained decoding where supported;
- low temperature for parsers and validators;
- moderate temperature for candidate generation;
- entity and number verification against the scenario;
- explicit abstention value `UNKNOWN` rather than invented detail;
- a hard maximum of two revision rounds during the live demonstration.

## 3.3 Mathematical formalism

### FASDC criterion vector

For COA \(k\), define

\[
\mathbf{c}_k=[F_k,A_k,S_k,D_k,C_k]^\top\in[0,1]^5,
\]

where:

- \(F_k\): feasibility — can it be executed with available time, space, and resources?
- \(A_k\): acceptability — is expected cost and risk proportionate to advantage?
- \(S_k\): suitability — does it accomplish the mission within intent and guidance?
- \(D_k\): distinguishability — is it meaningfully different from other candidates?
- \(C_k\): completeness — are primary/supporting actions, resources, phases, and desired transition represented? [D6]

Each criterion is computed from a transparent rubric. If criterion \(j\) contains rubric items \(r_{jm}\) with weights \(\rho_{jm}\),

\[
c_{kj}=\frac{\sum_m\rho_{jm}r_{kjm}}{\sum_m\rho_{jm}}.
\]

A rubric item score must cite a scenario field or doctrinal requirement. Uncited positive scores are set to zero by the validator.

### Hard gates and utility

Feasibility, suitability, and completeness are treated as gates:

\[
G_k=\mathbf{1}[F_k\ge\tau_F]\mathbf{1}[S_k\ge\tau_S]\mathbf{1}[C_k\ge\tau_C]
\mathbf{1}[V_k=0],
\]

where \(V_k\) is the count of hard constraint violations.

The comparison utility is

\[
U_k=G_k\left(
\mathbf{w}^\top\mathbf{c}_k
-\lambda_r R_k
-\lambda_u U^{unsupported}_k
-\lambda_a A^{assumption}_k
\right),
\]

with \(\mathbf{w}\ge0\) and \(\sum_j w_j=1\). The default view uses equal weights, while the dashboard permits analyst-controlled weights and displays sensitivity. The system never hides that ranking can change with weights.

### Distinguishability

For structured COA feature vector \(f_k\), pairwise distance is

\[
d(k,l)=\beta_s\left(1-\cos(e_k,e_l)\right)+
\beta_j J(f_k,f_l)+
\beta_p P(f_k,f_l),
\]

where \(J\) is Jaccard distance over task-purpose and phase sets, and \(P\) measures differences in primary action, sequencing, and resource allocation. A candidate fails distinguishability when its minimum distance to another candidate is below \(\tau_D\).

### Proposal–critique–revision protocol

At round \(r\):

1. Proposer generates candidate set \(C^{(r)}\).
2. Critics produce objections \(O_i^{(r)}\) and evidence.
3. Validator converts objections to typed defect records.
4. Proposer revises only defects accepted by the coordinator.
5. FASDC evaluator and independent critic score the revision.

An agent's criterion score is \(c_{ijk}^{(r)}\): score from agent \(i\), criterion \(j\), COA \(k\). Agent reliability weight \(\omega_i\) is estimated on a held-out rubric set and normalized:

\[
\tilde c_{jk}^{(r)}=
\frac{\sum_i\omega_i q_{ijk}^{(r)}c_{ijk}^{(r)}}
{\sum_i\omega_i q_{ijk}^{(r)}},
\]

where \(q_{ijk}\in[0,1]\) is the evidence-quality score. No agent may assign its own reliability weight.

### Consensus and convergence

The preferred comparison uses both utility and rank aggregation. For each eligible COA, agents submit a ranking. Weighted Borda score is

\[
B_k^{(r)}=\sum_i\omega_i\left(|C|-\operatorname{rank}_{ik}^{(r)}\right).
\]

The coordinator reports, but does not automatically enforce, the Borda ordering and utility ordering. Convergence occurs when all conditions hold:

\[
\max_k|U_k^{(r)}-U_k^{(r-1)}|<\epsilon_U,
\]

\[
\tau_{Kendall}(\pi^{(r)},\pi^{(r-1)})>\tau_{min},
\]

\[
N_{new\_critical\_defects}^{(r)}=0.
\]

The live defaults are \(\epsilon_U=0.03\), \(\tau_{min}=0.8\), and at most two revisions. Failure to converge is a valid result and is displayed as such.

### Doctrinal completeness loss for adaptation

On a curated training set of scenario–COA exemplars, structured generation can be adapter-tuned with

\[
\mathcal{L}_{struct}=\mathcal{L}_{token}+
\lambda_f\sum_j\operatorname{BCE}(\hat r_j,r_j)+
\lambda_v\operatorname{BCE}(\hat V,V>0)+
\lambda_e\mathcal{L}_{citation}.
\]

Here \(r_j\) denotes required-field presence, \(V\) is hard-constraint violation, and \(\mathcal{L}_{citation}\) penalizes unsupported field generation. The objective is structure and grounding, not imitation of a specific operational answer.

### Training regime

| Item | Small | Medium | Large |
|---|---:|---:|---:|
| Adaptation | LoRA or prompt-only | QLoRA | QLoRA, optional |
| Context | 8K–16K | 16K–32K | 32K if supported |
| Effective batch | 32 sequences | 16 | 8 |
| Peak LR | \(2\times10^{-4}\) | \(1\times10^{-4}\) | \(5\times10^{-5}\) |
| LoRA rank | 16 | 32 | 32–64 |
| Epoch cap | 3 | 3 | 2 |
| Planned wall time | 4–8 h | 8–14 h | 18–24 h |

Prompt-only evaluation is always retained. An adapted model is deployed only if it improves held-out structural metrics without increasing unsupported claims or constraint violations.

### Live inference targets

For a canonical scenario with three candidate COAs and one revision round:

- Small full protocol: less than 90 seconds.
- Medium full protocol: less than 180 seconds.
- Large mixed protocol: less than 300 seconds.
- First grounded outline visible: less than 20 seconds.
- Cancellation and all-stop for the agent loop: less than 2 seconds.

Streaming the transcript prevents the interface from appearing frozen. These are target budgets; exact token counts and time by role are logged.

### Regularization and controls

- parser/evaluator temperature 0.0–0.2;
- proposer temperature 0.5–0.8 with fixed seed where the backend supports it;
- independent critics use distinct prompts but the same evidence corpus;
- maximum turns, tokens, and wall time per role;
- repeated-output hash detector;
- contradiction detector over facts and constraints;
- citation coverage threshold;
- prompt-injection sanitization on scenario text;
- no tool with irreversible external effects in the demonstration environment.

## 3.4 Baselines

### Classical baseline — doctrinal template and rule engine

A deterministic system fills required fields from the scenario and computes FASDC rubric scores using explicit rules. It does not generate novel prose. Its value is high precision and perfect repeatability.

A simplified completeness score is

\[
C_k^{rule}=\frac{1}{|R|}\sum_{j\in R}\mathbf{1}[\text{required field }j\text{ present and grounded}].
\]

Feasibility rules compare resource demand and availability, time demand and deadline, and hard constraints. This baseline establishes how far a language model improves useful synthesis beyond a well-designed form.

### Modern baseline — single-agent language model

The same medium checkpoint receives the scenario, doctrine retrieval, output schema, and token budget but no role separation, critique, or revision. It generates all candidates and scores in one call or one sequential conversation. This isolates the value of orchestration from the value of the underlying model.

### Ablated multi-agent baselines

- no independent critic;
- no evidence-quality weighting;
- no revision round;
- no hard FASDC gate;
- homogeneous prompts for all roles.

These ablations identify which protocol elements improve quality and which add latency without benefit.

## 3.5 Evaluation metrics

### Structural completeness

For required fields \(R\),

\[
SC=\frac{\sum_{j\in R}\rho_j\mathbf{1}[j\text{ valid and grounded}]}{\sum_{j\in R}\rho_j}.
\]

A present but unsupported field receives zero.

### Constraint compliance

\[
CVR=\frac{\#\text{hard constraint violations}}{\#\text{hard constraints}},
\qquad
UAR=\frac{\#\text{unsupported atomic claims}}{\#\text{atomic claims}}.
\]

Both are lower-is-better and are treated as guardrails, not secondary metrics.

### Distinguishability

Report mean and minimum pairwise distance among candidate COAs, plus duplicate-cluster rate. Human evaluators answer whether each candidate represents a genuinely different approach rather than superficial wording changes.

### Human rubric

A five-point anchored rubric evaluates:

- mission alignment;
- feasibility reasoning;
- completeness;
- clarity and traceability;
- alternative quality;
- risk transparency;
- usefulness for further planning.

At least two evaluators score the held-out packet when available. Inter-rater reliability is Krippendorff's \(\alpha\) for ordinal data, with weighted Cohen's \(\kappa\) as a supplementary two-rater measure. Low agreement is reported as a limitation of the evaluation, not averaged away.

### Stability and efficiency

- completion rate before turn/time cap;
- loop and repeated-output rate;
- revisions per accepted defect;
- tokens and latency per role;
- total latency;
- peak RAM/accelerator memory;
- number of unsupported claims introduced or removed by revision;
- rank stability under prompt paraphrase and weight sensitivity.

### Acceptance gate for live use

Task 8 is shown as a secondary live demonstration only when:

1. at least 95% of canonical runs terminate within the turn and wall-time caps;
2. hard-constraint violation rate is zero on the canonical scenario and below the preset threshold on held-out scenarios;
3. the multi-agent protocol improves structural completeness or human usefulness over the single-agent baseline without increasing unsupported-claim rate;
4. at least three candidate COAs pass the distinguishability threshold;
5. every score is linked to criterion evidence;
6. the interface clearly states that selection remains a human decision.

If this gate is not met by 22 August, Task 14 replaces Task 8 in the primary on-site sequence.

## 3.6 Failure-mode audit

| Failure mode | Root cause | Indicator | Adversarial batch | Mitigation and disclosure |
|---|---|---|---|---|
| Unsupported operational detail | Generative model fills missing facts | Unsupported-claim rate | Remove key resource and location facts | `UNKNOWN`, citation validator, zero credit for unsupported fields. |
| Assumption becomes fact | Repetition across agents increases apparent certainty | Fact/assumption type flips | Seed plausible but unconfirmed assumption | Immutable fact/assumption IDs and contradiction audit. |
| Mode collapse | All COAs share the same primary action and sequence | Minimum pairwise distance below threshold | Prompt with an obvious default option | Explicit diversity constraints and regenerate only duplicate candidate. |
| Endless debate | Agents repeat objections or revisions | Repeated-output hash, no utility change | Conflicting rubrics and circular criticism | Two-round cap, convergence test, unresolved-disagreement output. |
| Consensus amplifies common error | Correlated models agree on false premise | High agreement, low evidence quality | Shared misleading statement in scenario appendix | Evidence-quality weighting, independent fact validator, no confidence from vote count alone. |
| Metric gaming | Model fills every field with vague text | High completeness, low specificity/usefulness | Empty boilerplate COA | Field validators, evidence links, specificity rubric, human review. |
| Prompt injection in scenario | Untrusted text attempts to override instructions | System-rule leakage or ignored schema | Embedded “ignore doctrine” string | Treat scenario as data, delimiter escaping, policy test suite. |
| Critic over-dominance | Excessive objections remove useful alternatives | Completeness or diversity falls after revision | Aggressive critic prompt | Accepted-defect gate, before/after metrics, preserve rejected objections. |
| Resource arithmetic error | Language model performs unreliable calculation | Inconsistent totals | Resource table with near-threshold values | Deterministic calculator and schema checks. |
| Weight sensitivity hidden | Ranking appears definitive | Rank flips under small weight change | Sweep FASDC weights | Sensitivity plot and Pareto set; no single opaque score. |
| Doctrinal mimicry without feasibility | Correct terminology masks impossible plan | High language score, failed feasibility rules | Fluent but resource-impossible exemplar | Hard feasibility gate and deterministic constraint engine. |
| Cross-platform decoding drift | Different kernels or quantizers alter outputs | Transcript hash differs by platform | Same seed on both laptops | Platform-stratified results, canonical reference output, schema-level equivalence test. |

## 3.7 Reproducibility

### Command

```bash
make demo TASK=8 SIZE=medium SEED=17 OFFLINE=1 \
  SCENARIO=data/processed/coa/canonical_scenario.json \
  MAX_ROUNDS=2
```

### Transcript event schema

Every turn is an immutable record:

```json
{
  "turn_id": "uuid",
  "run_id": "uuid",
  "round": 1,
  "role": "independent_critic",
  "input_refs": ["scenario:...", "doctrine:...", "coa:..."],
  "prompt_template_sha256": "...",
  "model_sha256": "...",
  "seed": 17,
  "started_at_utc": "...",
  "completed_at_utc": "...",
  "output_json_sha256": "...",
  "schema_valid": true,
  "citations_valid": true,
  "warnings": []
}
```

### Required artifacts

- scenario packet and map layers;
- doctrine retrieval index and hashes;
- prompt templates;
- role-level outputs;
- defect ledger and accepted/rejected critiques;
- FASDC rubric details;
- weight-sensitivity and Pareto plots;
- baseline outputs;
- final COA packet;
- full transcript;
- loop, citation, unsupported-claim, and latency metrics.


<a id="task-14"></a>
# 4. Task 14 — Produce products on a Map — stretch fallback

## 4.1 Task definition and analyst-facing output

### BAA text

> **Produce products on a Map.** [D1]

### Doctrinal interpretation

ATP 2-01.3 describes intelligence preparation of the operational environment as a process that organizes environmental, threat, civil, and other relevant information into products that support understanding and planning. Map products must preserve coordinate reference, scale, source, time, uncertainty, and the distinction between observation and assessment. [D4]

This stretch task is a controlled geospatial rendering problem. It does not attempt to replace a geospatial specialist or infer classified operational overlays. It demonstrates that public layers and outputs from Tasks 12 and 13 can be combined into a traceable, offline map product with deterministic validation.

### Required analyst product

The **Map Product Packet** contains:

1. map title, purpose, area, time, and classification marking;
2. coordinate reference system, scale, north arrow, legend, and source note;
3. base layers with acquisition dates and licenses;
4. event-pattern layer from Task 12 with uncertainty and temporal controls;
5. entity/link layer from Task 13, with observed and predicted relations separated;
6. optional COA sketch layer from Task 8, if enabled;
7. data-quality and missing-tile warnings;
8. an interactive offline HTML map and a fixed PDF/PNG render;
9. a machine-readable GeoPackage or GeoJSON bundle;
10. a provenance manifest linking each layer to data and code hashes.

## 4.2 Architecture

```text
OSM / USGS / NASA / task outputs
        |
        v
license and manifest gate
        |
        v
CRS validation -> geometry repair -> temporal filter -> H3 aggregation
        |
        +--------------------+
        |                    |
        v                    v
style rules and legend   optional label ranker
        |                    |
        +----------+---------+
                   v
          vector tile / GeoJSON pack
                   |
         +---------+----------+
         v                    v
 offline interactive map   fixed render
         |                    |
         +---------+----------+
                   v
          validation and provenance report
```

The deterministic core uses GeoPandas/Shapely, GDAL/Rasterio, PROJ, H3, MapLibre-compatible vector layers, and a headless renderer. The browser interface is not a required external service; all scripts, fonts, styles, tiles, and libraries are local.

### Operating tiers and parameter counts

Forcing a large neural model into a cartographic task would weaken reproducibility. The core pipeline therefore has zero learned parameters. Three operating tiers satisfy the size/quality study through data resolution and optional label optimization:

| Tier | Core learned parameters | Optional learned module | Intended role |
|---|---:|---:|---|
| Small | 0 | 0 | Deterministic vector layers, rule-based label placement, low-resolution terrain. |
| Medium | 0 | 20–120M label/ranking model | Adds learned label-collision ranking and richer raster context. |
| Large | 0 | 150–450M optional visual/layout evaluator | Research comparison only; never required to render a valid map. |

The live fallback remains fully functional at the small tier. Any learned module is an ablation and cannot modify source geometry or create facts.

### Typed layer schema

```python
class MapLayerManifest(TypedDict):
    layer_id: str
    title: str
    geometry_type: str
    source_name: str
    source_url_ref: str
    acquired_at_utc: str
    valid_time_start_utc: str | None
    valid_time_end_utc: str | None
    source_crs: str
    render_crs: str
    spatial_resolution_m: float | None
    license_id: str
    attribution_text: str
    transform_pipeline: list[str]
    feature_count: int
    data_sha256: str
    style_sha256: str
    quality_flags: list[str]

class MapProduct(TypedDict):
    product_id: str
    title: str
    purpose: str
    bbox_wgs84: tuple[float, float, float, float]
    scale_denominator: int
    render_crs: str
    as_of_utc: str
    layer_ids: list[str]
    legend_entries: list[dict]
    uncertainty_notes: list[str]
    attribution_block: str
    interactive_html_ref: str
    fixed_render_ref: str
    geodata_bundle_ref: str
    provenance_root_sha256: str
```

## 4.3 Mathematical and algorithmic formalism

### Coordinate transformation and validation

Each geometry \(g\) is transformed by a registered CRS operation \(T_{s\rightarrow r}\):

\[
g_r=T_{s\rightarrow r}(g_s).
\]

A round-trip check uses

\[
\epsilon(g)=d_H\left(g_s,T_{r\rightarrow s}(T_{s\rightarrow r}(g_s))\right).
\]

Features exceeding the tolerance appropriate to source precision are quarantined rather than silently rendered.

### Spatial aggregation

Event features are aggregated into H3 cell \(c\) and time window \(w\):

\[
A_{cw}=\sum_{i\in\mathcal{I}_{cw}}\omega_i p_i,
\qquad
\bar p_{cw}=\frac{A_{cw}}{\sum_{i\in\mathcal{I}_{cw}}\omega_i},
\]

where \(p_i\) is calibrated anomaly or link confidence and \(\omega_i\) is a quality/source-diversity weight. The map shows both count and mean score; it does not let a single high score masquerade as a dense pattern.

### Scale-dependent simplification

For map scale \(s\), geometry tolerance is

\[
\delta_s=\kappa\frac{s}{DPI\cdot 39.37},
\]

converted to map units. Simplification uses topology-preserving algorithms and verifies area/length distortion. The original geometry remains in the data bundle.

### Label-placement optimization

For labels \(L\), candidate placements \(P_l\), and overlap cost \(O\), the rule-based optimizer minimizes

\[
J(P)=\sum_{l\in L}c_{l,P_l}
+\lambda_o\sum_{l<m}O(P_l,P_m)
+\lambda_f\sum_l\mathbf{1}[P_l\text{ occludes critical feature}].
\]

The medium optional model learns \(c_{l,p}\), but hard overlap and critical-feature constraints remain deterministic.

### Map completeness score

For required cartographic elements \(R\),

\[
MCS=\frac{\sum_{j\in R}\rho_j\mathbf{1}[j\text{ present and valid}]}{\sum_{j\in R}\rho_j}.
\]

Required elements include title, time, scale, CRS, legend, attribution, source date, uncertainty, and layer provenance.

## 4.4 Baselines

### Classical baseline — static scripted plot

A single Matplotlib/GeoPandas script renders the same layers without vector tiles, interactive filtering, or optimized labels. This is a strong reproducibility baseline and the ultimate browser-independent fallback.

### Modern baseline — standard vector-tile pipeline

A conventional vector-tile render with rule-based styles and no task-specific provenance or label optimization. This tests whether the Mycosoft pipeline adds measurable validation and analyst utility beyond common web mapping.

### Optional learned comparator

The label-ranking/layout model is compared against the deterministic optimizer on identical candidate placements. It is retained only if it reduces overlap without moving or suppressing critical features incorrectly.

## 4.5 Evaluation metrics

### Geospatial correctness

- CRS round-trip error;
- feature displacement against source control points;
- topology-valid feature percentage;
- geometry loss or duplication count;
- temporal-filter correctness;
- layer-feature count reconciliation.

### Cartographic and analyst metrics

- map completeness score;
- label-overlap area ratio;
- critical-feature occlusion rate;
- legend-to-symbol consistency;
- color/shape distinguishability in grayscale and common color-vision simulations;
- analyst task time for locating a pattern, actor, source, and uncertainty;
- analyst error rate on those retrieval tasks.

### System metrics

- cold start;
- tile-generation time;
- fixed-render time;
- interactive frame rate on the canonical view;
- package bytes;
- peak RAM;
- offline missing-resource count.

### Acceptance criteria

The fallback is live-ready when:

1. every canonical layer passes CRS, topology, license, and attribution checks;
2. fixed and interactive renders are reproducible from a clean offline environment;
3. no external request occurs during a network-blocked integration test;
4. observed and predicted layers use distinct symbology and legend entries;
5. the small-tier fixed render completes within 10 seconds after warmup;
6. all constituent features can be traced to a layer manifest and source hash.

## 4.6 Failure-mode audit

| Failure mode | Root cause | Indicator | Stress batch | Mitigation and disclosure |
|---|---|---|---|---|
| CRS mismatch | Layer lacks or misstates projection | Large displacement or invalid bounds | Deliberately mislabeled EPSG and axis order | CRS allowlist, bounds tests, round-trip tolerance, quarantine. |
| Stale source layer | Acquisition date ignored | Product time newer than data validity | Mix old road layer with new events | Visible source dates and staleness flag. |
| Attribution omission | Export path drops required notice | Empty attribution block | Render every export format | License gate fails build when attribution absent. |
| Label collision | Dense feature cluster | Overlap ratio rises | Urban/dense event tile | Deterministic optimization, priority levels, zoom-dependent labels. |
| Overplotting creates false density | Many coincident symbols | Saturated area hides counts | Duplicate-coordinate stress set | Aggregation, jitter only for display with explicit count, density legend. |
| Geometry simplification changes meaning | Excess tolerance | Area/shape distortion | Narrow corridors and small polygons | Topology-preserving simplification, distortion thresholds. |
| Offline resource gap | CDN font/script/tile dependency | Network request or blank layer | Network namespace blocked | Vendor every dependency, static-render fallback. |
| Predicted relation looks observed | Style ambiguity | Analyst misclassification | Mixed observed/predicted layer test | Distinct line style, legend, click metadata, default prediction layer off. |
| Scale or legend error | Export resizing | Incorrect scale bar or symbol mapping | Multiple page sizes and DPI | Recompute scale on render, automated legend/symbol tests. |
| Raster misregistration | Pixel transform or datum error | Coastline/terrain shift | Known control points | Ground-control checks and source metadata retention. |

## 4.7 Reproducibility

```bash
make demo TASK=14 SIZE=small SEED=17 OFFLINE=1 \
  AREA=configs/areas/canonical.geojson

make verify-map PRODUCT=artifacts/task14/canonical/product.json
```

The verification command fails on external network requests, missing attribution, invalid geometry, inconsistent feature counts, missing hashes, or unsupported CRS. The USB package stores source extracts, processed GeoPackages, vector tiles, style JSON, local rendering libraries, and a static PDF/PNG fallback.

## 4.8 Cross-task evidence and frame contracts

![Figure 9. Evidence and validation ladder.](graphics/fig09_evidence_validation_ladder.png)

**Figure 9 — Evidence-to-action ladder.** Every transition from source record to recommendation has a falsification test, quality threshold, and governance state. A high score does not skip a rung.

![Figure 10. Nature Message Frame scientific contract.](graphics/fig10_nmf_scientific_contract.png)

**Figure 10 — NMF scientific contract.** Identity, source, context, raw blocks, calibration, features, quality, permissions, target, and provenance are bound into a versioned object. The event, graph, scenario, and map schemas in this plan are NMF profiles.

---

# Part 2 — Algorithm interaction study

<a id="interaction-nlm-fusarium"></a>
# 5. NLM–FUSARIUM feature handoff and fusion

## 5.1 Purpose

The interaction study answers a narrow question: **does temporal evidence from the sequence model improve structural inference in the graph model, and does the graph model improve prioritization of temporal anomalies?** The test is paired and controlled. All three variants receive the same held-out cases:

1. **NLM-only:** sequence/anomaly features and a non-graph classifier.
2. **FUSARIUM-only:** graph features without NLM contextual features.
3. **Combined:** graph model with frozen NLM features and a validation-fitted fusion layer.

The NLM and graph models are trained separately first. Fusion training cannot alter the held-out test set or use test-time labels.

## 5.2 Feature-passing protocol

The handoff is a versioned local file/IPC contract called `TemporalGraphFeaturePacket`. It may be serialized as Arrow IPC or Parquet for batch runs and MessagePack for live streaming. The semantic schema is identical.

```python
class TemporalGraphFeaturePacket(TypedDict):
    schema_version: Literal["itdx26.tgfp/1.0"]
    packet_id: str
    generated_at_utc: str
    temporal_cutoff_utc: str
    source_event_ids: list[str]
    canonical_entity_ids: list[str]
    event_embedding: list[float]        # fixed d_e, L2 normalized
    context_embedding: list[float]      # window-level state
    anomaly_raw: float
    anomaly_probability: float
    anomaly_calibration_id: str
    predicted_event_type_probs: dict[str, float]
    expected_time_to_next_event_s: float | None
    uncertainty: dict[str, float]
    source_diversity: float
    quality_flags: list[str]
    nlm_model_sha256: str
    dataset_manifest_sha256: str
    code_sha: str
```

### Validation rules

- `temporal_cutoff_utc` must be no later than the graph cutoff.
- Every `source_event_id` must exist in the graph provenance index or be explicitly listed as an unmatched event.
- Embedding dimension and model hash must match the graph configuration.
- Missing NLM features are represented with a missingness mask; they are never replaced silently with zero without that mask.
- Calibration identifiers must point to a frozen calibration artifact.
- Packets with future timestamps, unknown model hashes, or invalid data hashes are rejected.

## 5.3 Graph consumption

For entity \(v\), aggregate packets linked to that entity within lookback window \(W\):

\[
\bar e_v=\frac{\sum_{i\in\mathcal{P}(v,W)}\omega_i e_i}{\sum_i\omega_i},
\]

\[
A_v^{max}=\max_i p_i^{anom},\qquad
A_v^{decay}=\sum_i p_i^{anom}\exp(-(t_c-t_i)/\tau).
\]

The graph node feature becomes

\[
x_v^{combined}=[x_v^{base}\Vert\bar e_v\Vert A_v^{max}\Vert A_v^{decay}\Vert m_v],
\]

where \(m_v\) is the missingness and quality vector. For an edge candidate \((u,r,v)\), cross-temporal features include anomaly co-occurrence, lag, and event-type compatibility.

A reciprocal graph-to-sequence path is evaluated as an ablation: graph centrality, community, and neighbor-event summaries are attached to event tokens before sequence scoring. This path is disabled in the first reference build to avoid a circular dependency; it is enabled only after the one-way NLM-to-graph path is qualified.

## 5.4 Combined-scoring rule

The preferred fusion is deliberately simple and calibratable. Let \(p_T\) be the temporal model probability for a candidate pattern/link-related event, \(p_G\) the graph model probability, \(c\) a vector of deterministic context features, and \(m\) missingness flags. The fused probability is

\[
\hat p_F=\sigma\left(
\beta_0+
\beta_T\operatorname{logit}(\tilde p_T)+
\beta_G\operatorname{logit}(\tilde p_G)+
\beta_I\operatorname{logit}(\tilde p_T)\operatorname{logit}(\tilde p_G)+
\gamma^\top c+\delta^\top m
\right),
\]

where \(\tilde p=\min(1-\epsilon,\max(\epsilon,p))\). Coefficients are learned by regularized logistic regression on validation data:

\[
\min_{\beta,\gamma,\delta}
-\sum_i[y_i\log\hat p_i+(1-y_i)\log(1-\hat p_i)]
+\lambda\lVert[\beta,\gamma,\delta]\rVert_2^2.
\]

This rule is preferred over an opaque fusion network because it exposes whether temporal evidence, graph evidence, or their interaction drove the score. A shallow MLP is an optional comparator.

### Decision-level fusion

For analyst review budget \(K\), candidates are ranked by expected utility:

\[
R_i=\hat p_{F,i}V_i-(1-\hat p_{F,i})C_i-\lambda_q Q_i,
\]

where \(V_i\) is analyst-set value of detecting the candidate, \(C_i\) is false-review cost, and \(Q_i\) is a quality/missingness penalty. The live default sets \(V_i=C_i=1\), making the ranking primarily probabilistic; the dashboard makes any alternative cost assumptions explicit.

## 5.5 Ablation design

### Experimental units

Two complementary units are used:

- **pattern-cluster unit:** a labeled cluster or matched normal window for Task 12 interaction;
- **link-query unit:** a source–relation query with ranked candidate targets for Task 13 interaction.

All methods receive identical units and cutoffs. Training and validation units are separated from test units by time and, where possible, geography or entity group.

### Primary hypotheses

- \(H_{0,1}\): combined AP is no better than the best single algorithm.
- \(H_{0,2}\): combined Brier score is no lower than the best single algorithm.
- \(H_{0,3}\): combined time-to-detection is no shorter at a fixed false-alert budget.
- \(H_{0,4}\): fusion adds latency without moving the accuracy/latency Pareto frontier.

The plan does not assume rejection.

### Operationally meaningful effect thresholds

Before test execution, Mycosoft sets minimum effects worth discussing:

- absolute AP improvement of at least 0.03, **or** relative error reduction of at least 10%;
- Brier improvement of at least 0.01;
- median detection-latency reduction of at least 10% at the same review budget;
- no more than 25% additional end-to-end latency unless quality gain is materially larger.

These thresholds are planning values and may be revised only before the test labels are opened.

### Sample-size reasoning

For a simple paired binary comparison with baseline success probability \(p_0\), expected probability \(p_1\), and discordant-pair fraction \(d\), an approximate McNemar sample requirement is

\[
n\approx\frac{(z_{1-\alpha/2}+z_{1-\beta})^2d}{(p_{10}-p_{01})^2}.
\]

Because AP and MRR are ranked, final power is estimated by simulation: resample validation units with replacement, inject the minimum meaningful effect, run the paired bootstrap test, and estimate rejection probability over 5,000 simulations. The test set is considered adequately powered when simulated power is at least 0.8 at \(\alpha=0.05\).

Practical minimum targets are:

- at least 200 independently labeled pattern/normal clusters, with at least 50 positives;
- at least 1,000 link queries for MRR/Hits@K, with relation-frequency stratification;
- at least five seeds per trainable variant;
- a minimum of 100 analyst-reviewed outputs for product-quality scoring.

If the available labels are smaller, the report emphasizes intervals and case analysis and does not overstate significance.

### Required ablation matrix

| ID | Sequence features | Graph message passing | Fusion | Community loss | Resolver | Purpose |
|---|---|---|---|---|---|---|
| A0 | No | No | No | No | Gold/system as available | Classical baseline. |
| A1 | Yes | No | No | No | System | NLM-only. |
| A2 | No | Yes | No | Off | System | FUSARIUM-only. |
| A3 | Yes | Yes | Logistic | Off | System | Primary combined model. |
| A4 | Yes | Yes | Logistic | On | System | Community auxiliary value. |
| A5 | Yes | Yes | MLP | Off | System | Fusion complexity test. |
| A6 | Yes | Yes | Logistic | Off | Gold resolver where available | Resolver-error upper bound. |
| A7 | Shuffled | Yes | Logistic | Off | System | Detect spurious benefit from dimensionality. |

Shuffled NLM features preserve marginal distributions but break event/entity alignment. If A7 improves substantially, the supposed interaction is not credible.

## 5.6 Interaction failure modes

| Failure | Diagnostic | Response |
|---|---|---|
| Temporal and graph scores are highly correlated | Correlation and conditional mutual information | Fusion may add no value; report single-model preference. |
| NLM feature missingness encodes the label | Missingness-only baseline performs well | Rebuild data pipeline or include explicit missingness audit; do not claim semantic interaction. |
| Circular leakage | NLM was trained on graph-derived labels that reenter graph model | Trace feature lineage; remove contaminated features and rerun. |
| Graph model ignores NLM features | Integrated gradients/permutation importance near zero | Reduce dimension, improve normalization, or accept no interaction gain. |
| Fusion improves AP but harms calibration | AP rises, Brier/ECE worsens | Recalibrate, use separate ranking and probability outputs, disclose trade. |
| Alignment errors attach packets to wrong entities | Low entity-match confidence or timestamp conflict | Reject packet below threshold; report unmatched rate. |
| Interaction adds unacceptable latency | Pareto point dominated | Use one-way cached features or choose single model. |

---

<a id="myca-over-both"></a>
# 6. MYCA orchestration over the algorithms

## 6.1 Protocol

MYCA receives a structured scenario and invokes only local, deterministic task interfaces:

```text
1. DEFINE      Normalize the intelligence question and cutoff.
2. DISPATCH    Run Task 12 and Task 13 independently.
3. INSPECT     Validate hashes, schema, calibration IDs, and warnings.
4. PROPOSE     Generate one integrated analytic hypothesis.
5. CRITIQUE    Independent roles identify unsupported or conflicting claims.
6. SCORE       Evidence quality, task metrics, uncertainty, and relevance.
7. REVISE      Update the hypothesis without changing source outputs.
8. CONVERGE    Stop on stable ranking/no new critical defect or turn cap.
9. RENDER      Produce a transcript and analyst-facing integrated packet.
```

The orchestrator cannot modify Task 12 or Task 13 scores after the fact. It may filter, compare, and contextualize them, but the original outputs remain immutable and visible.

## 6.2 Integrated hypothesis schema

```python
class IntegratedHypothesis(TypedDict):
    hypothesis_id: str
    statement: str
    temporal_pattern_ids: list[str]
    entity_ids: list[str]
    observed_edge_ids: list[str]
    predicted_link_ids: list[str]
    supporting_evidence_refs: list[str]
    counterevidence_refs: list[str]
    temporal_probability: float | None
    graph_probability: float | None
    fused_probability: float | None
    uncertainty_notes: list[str]
    alternative_hypotheses: list[str]
    unresolved_conflicts: list[str]
    recommended_analyst_actions: list[str]
    task_run_ids: list[str]
```

## 6.3 Evidence-quality score

Each evidence item \(e\) receives

\[
q(e)=q_{prov}(e)q_{time}(e)q_{source}(e)q_{cal}(e),
\]

where each factor is in \([0,1]\): provenance completeness, temporal relevance, source diversity/reliability, and model calibration validity. Multiplication ensures a critical failure cannot be hidden by strong values elsewhere.

For hypothesis \(h\), support and counterevidence are

\[
S(h)=\sum_{e\in E_h^+}q(e)w_e,
\qquad
C(h)=\sum_{e\in E_h^-}q(e)w_e.
\]

A transparent evidence score is

\[
E(h)=\frac{S(h)-C(h)}{S(h)+C(h)+\epsilon}.
\]

This score supplements, but does not replace, calibrated task probabilities.

## 6.4 Agent scoring and consensus

Suppose agent \(i\) rates hypothesis \(h\) on relevance, support, coherence, alternatives, and uncertainty handling:

\[
\mathbf{r}_{ih}=[r^{rel},r^{sup},r^{coh},r^{alt},r^{unc}]^\top.
\]

The agent score is

\[
s_{ih}=\mathbf{a}^\top\mathbf{r}_{ih}-\lambda_vV_{ih}-\lambda_uU_{ih},
\]

where \(V\) is hard validation failure count and \(U\) unsupported atomic claim count. Reliability-weighted aggregate:

\[
\bar s_h=\frac{\sum_i\omega_i q_{ih}s_{ih}}{\sum_i\omega_i q_{ih}}.
\]

The final transcript shows all \(s_{ih}\), \(\omega_i\), evidence-quality values, and disagreement. Consensus is not treated as truth. If calibrated algorithms conflict materially, the output explicitly states the conflict and recommends collection or analyst review.

## 6.5 Convergence

At revision round \(r\), stop when:

\[
|\bar s_h^{(r)}-\bar s_h^{(r-1)}|<0.02,
\]

no new critical defect is found, all structured validators pass, and the ranked hypothesis order has Kendall \(\tau>0.8\) relative to the prior round. The live cap is two revisions. A timeout produces `NOT_CONVERGED`, preserving the last valid state.

## 6.6 Debate transcript rendering

The on-site interface has four synchronized panes:

1. **Evidence pane:** raw pattern and link outputs with hashes.
2. **Transcript pane:** each proposal, critique, and revision in chronological order.
3. **Score pane:** criterion values, agent reliability, evidence quality, and changes by round.
4. **Analyst pane:** unresolved conflicts, alternative hypotheses, and accept/reject controls.

Every sentence in the integrated summary is linked to one or more structured evidence references. Hover or click reveals the original Task 12/13 record. Unsupported sentences fail the render build.

---

<a id="pareto"></a>
# 7. Speed–quality Pareto study

## 7.1 Definitions

For configuration \(m\), let quality be task-specific \(Q_m\) and latency \(L_m\). Configuration \(a\) dominates \(b\) when

\[
Q_a\ge Q_b,\qquad L_a\le L_b,
\]

with at least one strict inequality. The Pareto frontier is the nondominated set.

Quality axes:

- Task 12: average precision at the fixed review budget, with Brier score as a guardrail.
- Task 13: MRR or average precision, with false-merge and calibration guardrails.
- Task 8: human usefulness/structural completeness, with zero hard violations as a gate.
- Task 14: analyst retrieval accuracy/map completeness, with geospatial correctness as a gate.

Latency is end-to-end, including preprocessing not already part of the frozen local data product. Cold-start and warm-start frontiers are separate.

## 7.2 Required configurations

For each applicable task:

- classical baseline 1;
- classical/modern baseline 2;
- small model;
- medium model;
- large model;
- quantized medium/large;
- combined interaction model where applicable.

Each point is the mean of repeated runs, with horizontal and vertical confidence intervals or variability bars. The report also includes peak memory as point size and package bytes as a label.

## 7.3 Expected frontier shape

The expected, not guaranteed, shape is concave: early increases in model capacity buy meaningful quality, while later increases add latency and memory for diminishing gains.

```text
quality
  ^                         large
  |                    medium-combined
  |              medium
  |         small
  |   classical
  +----------------------------------> latency
```

Several deviations are informative:

- A classical point on the frontier means complexity is not justified for that operating range.
- A large point below the frontier means the large model should not be shown except as a limitation.
- A combined point above the frontier supports interaction value.
- A combined point to the right but not higher indicates orchestration cost without quality benefit.
- A quantized point with little quality loss and large latency/memory gain becomes the recommended live operating point.

## 7.4 Operating-point selection

The dashboard supports three preset policies:

- **Rapid triage:** minimize latency subject to a minimum quality/calibration threshold.
- **Balanced:** maximize \(Q-\lambda\log L\) with visible \(\lambda\).
- **Deep review:** maximize quality subject to memory and maximum-wall-time constraints.

The analyst may change thresholds. The system displays the selected policy and why a point was chosen; it does not silently choose a model.

## 7.5 Measurement protocol

1. Reboot or clear caches for cold-start runs.
2. Run three warmups not included in timing.
3. Run at least 20 timed inferences for short tasks and 10 for long multi-agent tasks.
4. Record median, p90, p95, and maximum latency.
5. Synchronize accelerator timing before and after measured regions.
6. Separate data load, preprocessing, model, postprocessing, and render time.
7. Run on both laptops and report platform-specific frontiers.
8. Never combine CUDA and Apple timings into one mean.

<a id="datasets"></a>
# Part 3 — Dataset, provenance, licensing, and stress-test plan

# 8. Dataset plan

## 8.1 Admission rule and immutable manifest

A dataset enters the demonstration only when the following predicate is true:

\[
A(d)=L(d)\land U(d)\land P(d)\land H(d)\land S(d),
\]

where:

- \(L(d)\): the intended use is permitted by the current license or written authorization;
- \(U(d)\): the selected content is unclassified and publicly releasable;
- \(P(d)\): provenance and acquisition records are complete;
- \(H(d)\): raw and transformed objects have verified hashes;
- \(S(d)\): the dataset passes privacy, sensitive-content, and scope screening.

`A(d)=0` blocks training, evaluation, and display. A dataset's appearance in an earlier planning document does not override current terms.

Each dataset has a YAML manifest:

```yaml
dataset_id: gdelt_events_aor_v1
source_name: GDELT 2.1 Events
source_url: https://www.gdeltproject.org/
acquired_utc: 2026-08-10T20:00:00Z
acquisition_method: scripted_https
raw_sha256: "..."
license_record: licenses/GDELT_2026-08-10.pdf
license_sha256: "..."
permitted_uses:
  - research
  - evaluation
prohibited_uses:
  - redistribution_of_underlying_article_text
classification: UNCLASSIFIED
privacy_review: passed
geographic_scope: "frozen fictional-AOR bounding box"
temporal_scope:
  start: 2024-01-01
  end: 2026-06-30
schema_version: event_record_v1.2
transform_pipeline_sha256: "..."
parent_objects:
  - path: raw/gdelt/...
    sha256: "..."
splits:
  train: manifests/splits/gdelt_train.json
  validation: manifests/splits/gdelt_validation.json
  calibration: manifests/splits/gdelt_calibration.json
  test: manifests/splits/gdelt_test.json
record_counts:
  raw: null
  accepted: null
  rejected: null
status: admitted
reviewed_by: "Morgan + engineer_2"
reviewed_utc: null
```

The `record_counts` and final hashes remain null until the package is built. No placeholder value may be interpreted as measured.

## 8.2 Dataset matrix

| ID | Source | Demonstration use | License/admission posture | Frozen package form | Target package budget |
|---|---|---|---|---|---:|
| DATA1 | GDELT 2.1 event records | Task 12 sequence modeling; event-derived graph features | Admit event metadata and source references after current-terms review; do not redistribute article bodies | columnar Parquet, dictionary-encoded ontology, URL/domain provenance | 4–10 GB |
| DATA2 | ACLED | potential Task 12/14 comparator | **Excluded by default.** Admit only with written authorization whose terms explicitly cover the intended ML use and event demonstration | none unless authorized | 0 GB |
| DATA3 | OpenStreetMap | Task 14 base map, roads, places, water, infrastructure context | ODbL attribution and derivative-database obligations recorded; keep source notice in every export | regional PBF, simplified GeoParquet, offline vector tiles | 2–6 GB |
| DATA4 | USGS | elevation, terrain, hazards, hydrography, place context | U.S. government data are generally public domain, but each product's metadata and partner-content notice control | clipped COG/GeoTIFF, GeoPackage, metadata XML/JSON | 3–8 GB |
| DATA5 | NASA Earthdata | weather/environmental or imagery context for Task 14 stress tests | product-specific terms and required credit archived; no endorsement claim | predownloaded, clipped COG/NetCDF/Zarr subsets | 3–10 GB |
| DATA6 | SNAP public network datasets | Task 13 classical graph scaling and community tests | dataset-specific license/terms required; no blanket assumption for the entire portal | edge lists/Parquet plus official metadata | <2 GB |
| DATA7 | Open Graph Benchmark | Task 13 benchmark with official evaluator and split | use only datasets whose license and size fit the offline package; preserve official split and evaluator | official processed files plus checksum | 1–8 GB |
| DATA8 | Wikidata | Task 13 typed graph, alias/entity-resolution truth, relation prediction | CC0; preserve source and dump date for scientific provenance | curated entity/relation subset, labels and aliases, QID map | 2–8 GB |
| DATA9 | Common Crawl | optional URL/domain and provenance features | access to a crawl is not a blanket license to underlying content; no unrestricted body-text corpus in the USB package | index/URL metadata or rights-filtered excerpts only | 0–2 GB |
| DATA10 | Public Army/joint doctrine and public exemplars | schema/rubric construction, not model-answer memorization | public release verified; copyright and distribution notice retained | original PDFs, extracted section index, exemplar schemas | <1 GB |

The total working-data target is 20–50 GB before models and software. Final bytes are measured by `make package-audit` and included in `MANIFEST.total_bytes`.

## 8.3 GDELT event-stream plan

### Scope

GDELT is the primary Task 12 source because it provides time, actor, action, location, source, and event-code fields at large scale. The demonstration uses a frozen geographic and temporal slice selected before model training. The public scenario is fictional; the data slice exists to benchmark sequence methods, not to make a current intelligence claim about real persons or organizations. [DATA1]

The package retains:

- event identifier and date/time;
- CAMEO-style event codes and root codes;
- normalized actor fields permitted by the source schema;
- geospatial fields with a validation flag;
- source count, domain count, and source URLs or identifiers;
- fields needed to calculate reporting-density and tone features;
- acquisition and transformation hashes.

It does not ship copied article bodies. Optional text embeddings are computed only from locally permitted fields or rights-cleared text, then stored as vectors with the originating field and model hash.

### Preprocessing

```python
def build_gdelt_event_table(raw_files, manifest, aor, time_window):
    assert manifest.status == "admitted"
    rows = read_raw_gdelt(raw_files)
    rows = filter_time(rows, time_window)
    rows = filter_or_tag_geography(rows, aor)
    rows = normalize_event_codes(rows, ontology_version="cameo_profile_v1")
    rows = normalize_actors(rows, rules_version="actor_norm_v2")
    rows = attach_source_quality(rows)
    rows = deduplicate(rows, key="source_record_id", near_duplicate_window="15m")
    rows = validate_coordinates(rows)
    rows = add_h3(rows, resolutions=[5, 7, 9])
    rows = sort_stably(rows, ["occurred_at_utc", "event_id"])
    rows = attach_row_hash(rows)
    return write_parquet_and_rejection_log(rows)
```

A rejected record is never silently dropped. The rejection table stores source ID, rejection reason, and pipeline version.

### Splits

Let the full ordered interval be \([T_0,T_4]\). Use contiguous splits:

\[
\mathcal{D}_{tr}=[T_0,T_1),\quad
\mathcal{D}_{va}=[T_1,T_2),\quad
\mathcal{D}_{cal}=[T_2,T_3),\quad
\mathcal{D}_{te}=[T_3,T_4].
\]

A starting ratio is 60/15/10/15 by time, subject to minimum event counts. Validation selects architecture and thresholds. Calibration fits temperature/conformal parameters only. The test interval is not inspected until freeze.

### Pattern ground truth

GDELT does not provide a universal “anomaly” label. The plan therefore uses three evaluation tracks:

1. **Predictive track:** next-event type, actor class, spatial cell, and time-to-event on the untouched future interval.
2. **Controlled-injection track:** known motifs injected into held-out background using a preregistered generator.
3. **Natural-candidate track:** blinded human adjudication of top-ranked candidates, reported as an analyst study rather than objective ground truth.

For injected motif \(m\), the generator records all affected events, start/end, intensity, and transformation. Examples include:

- rate escalation with preserved actor mix;
- actor-role shift without rate change;
- spatial displacement across neighboring H3 cells;
- periodicity disruption;
- coordinated multi-actor motif;
- source-volume surge with no underlying event change, used as a false-positive trap.

Synthetic injection is never mixed into the natural-candidate display without a visible `SYNTHETIC_TEST` label.

## 8.4 ACLED exclusion and authorization gate

ACLED appears in the initial source framework, but the current demonstration package excludes it by default. Current terms include use-specific restrictions relevant to AI/ML and redistribution. [DATA2] The legal gate requires:

1. a copy of the terms effective on the acquisition date;
2. written permission or an applicable license tier explicitly covering model training and demonstration;
3. confirmation that derived artifacts and screenshots may be shown at ITDX26;
4. a record of retention, deletion, and redistribution obligations;
5. a signed admission decision in `licenses/decisions/acled.yaml`.

Without all five, `data/acled/` contains only a README explaining exclusion. No code path may silently download or query ACLED.

## 8.5 OpenStreetMap geospatial plan

OpenStreetMap supplies offline base-map and contextual vector features. [DATA3] The build process:

1. download a dated regional PBF from an admitted provider;
2. archive the ODbL and attribution notice;
3. clip to the selected extent plus a buffer;
4. preserve source `osm_id`, feature version timestamp where available, and tag subset;
5. transform into GeoParquet for analysis and MBTiles/PMTiles for display;
6. create a derivative-database notice and attribution string;
7. validate topology and coordinate range.

Feature extraction is deterministic:

\[
\mathcal{F}_{map}=\{\text{road},\text{rail},\text{water},\text{place},\text{boundary},\text{landuse},\text{selected infrastructure}\}.
\]

Only tags required by the fictional scenario are included. Sensitive facility inference is outside scope.

The holdout is geographic, not random. At least one tile block is excluded from label-placement and simplification tuning, then used for Task 14 cartographic evaluation.

## 8.6 USGS plan

USGS products provide terrain and physical-context layers. [DATA4] Candidate products include a public digital elevation model, hydrography, place names, and non-sensitive hazard layers. Every product remains governed by its own metadata record; “USGS” is not treated as one homogeneous license.

Raster preprocessing records:

- original CRS and vertical datum;
- pixel size and nodata value;
- clip extent;
- resampling method;
- target CRS;
- min/max and checksum before/after conversion.

For source raster \(R\) transformed by \(T\), the derived raster is

\[
R'=\operatorname{Warp}(R;\operatorname{CRS}_{target},\text{resampler},\text{resolution},\text{extent}),
\]

and the transform receipt is stored alongside \(R'\). Bilinear or cubic resampling is prohibited for categorical layers.

## 8.7 NASA Earthdata plan

NASA Earthdata is used only through predownloaded, product-specific subsets. [DATA5] Possible layers include environmental context, fires or hazards, and optical or thermal data suitable for a fictional map scenario. The admission record captures product short name, version, DOI, provider, citation, required credit, temporal extent, spatial extent, and quality flags.

The package contains no token, credential, live API dependency, or tile URL. Cloud-optimized rasters or NetCDF/Zarr subsets are converted locally, with original metadata retained. A no-data mask is rendered explicitly so missing imagery is not visually interpreted as a meaningful absence.

## 8.8 SNAP graph datasets

SNAP provides classical network benchmarks and scaling stress sets. [DATA6] Because each SNAP dataset may have different source conditions, admission occurs at the individual dataset level. Preferred sets are compact, well-described graphs that exercise:

- community structure;
- high-degree hubs;
- disconnected components;
- signed or directed edges where relevant;
- temporal edge order where available.

SNAP data are secondary Task 13 stress tests, not the principal typed-link claim. The model may collapse edge types for a topology-only benchmark, but that result is labeled accordingly.

## 8.9 Open Graph Benchmark plan

OGB supplies official loaders, splits, and evaluators. [DATA7] The primary choice must satisfy three gates:

\[
\text{license permitted}\land
\text{processed bytes}\le B_{USB}\land
\text{full evaluation fits target laptop}.
\]

A compact link-prediction dataset such as `ogbl-collab` is the preferred live benchmark. A knowledge-graph benchmark may be included only if the selected subset and evaluator preserve a defensible relation-prediction protocol. Official train/validation/test splits are never modified for the headline benchmark.

OGB results are reported separately from the intelligence-shaped Wikidata graph because they answer different questions:

- OGB: standardized model comparison;
- Wikidata profile: typed entities, aliases, provenance, temporal or relation semantics, and analyst rendering.

## 8.10 Wikidata graph and entity-resolution plan

Wikidata is CC0 and supplies stable QIDs, multilingual labels, aliases, typed properties, and source references. [DATA8] The curated graph is built from a frozen dump, not live SPARQL.

### Inclusion rules

- include only entity classes and properties required by the demonstration ontology;
- preserve QID and property ID;
- store label/alias language and normalization method;
- exclude sensitive personal fields not needed for the task;
- record statement rank, qualifiers, and references where retained;
- distinguish current truth from historical or deprecated statements.

### Entity-resolution truth

QID identity provides a natural label for alias matching. For each selected entity, generate or retain positive pairs from labels and aliases; hard negatives are entities with similar names, neighboring locations, or shared types. The split is by QID so aliases of a test entity never enter training.

Let \(E_{tr},E_{va},E_{te}\) be disjoint QID sets. Then

\[
E_{tr}\cap E_{va}=E_{tr}\cap E_{te}=E_{va}\cap E_{te}=\emptyset.
\]

This prevents alias leakage.

### Edge split

For typed relation \(r\), use a temporal split when qualifier time is meaningful; otherwise use a stratified edge split that preserves connectivity and withholds edges without exposing them through inverse or duplicate properties. The leakage audit checks:

- inverse relation present in training;
- same statement duplicated through a different source;
- relation encoded directly in a text feature;
- future qualifier present in context;
- node degree revealing the target by construction.

## 8.11 Common Crawl optional path

Common Crawl is not a default training corpus for this demonstration. [DATA9] The optional path is limited to:

- WARC index metadata;
- URL/domain frequency or crawl-timestamp features;
- content that has an independent rights basis and a documented filter;
- locally generated embeddings whose source field and rights basis are recorded.

The package does not ship a broad article-text corpus merely because the crawl is accessible. Any rights-filtered text subset must have its own manifest and deletion procedure.

## 8.12 Doctrinal references and exemplars

Public Army and joint doctrine supplies definitions, required product fields, and evaluation rubrics. [DATA10, D2–D7] Doctrine is not used as hidden answer text for a generative system. The build creates:

- a section-level citation index;
- a machine-readable product schema;
- rubric items with source paragraph/page reference;
- a frozen set of public exemplar structures where redistribution is permitted;
- an exclusion list for non-public or ambiguous training material.

Task 8 agents receive the rubric and scenario; they do not receive a gold COA answer. Task 14 receives required cartographic fields; it does not receive a target map image from which to copy labels.

## 8.13 Unified split registry and leakage audit

All task splits live in `data/manifests/splits/` and are generated before model training. The registry records inclusion keys rather than relying on a mutable random call.

```json
{
  "split_id": "wikidata_qid_disjoint_v1",
  "dataset_sha256": "...",
  "generator_code_sha": "...",
  "seed": 17,
  "unit": "qid",
  "train_keys_sha256": "...",
  "validation_keys_sha256": "...",
  "calibration_keys_sha256": "...",
  "test_keys_sha256": "...",
  "created_utc": "...",
  "leakage_checks": {
    "key_overlap": 0,
    "inverse_edge_overlap": 0,
    "future_timestamp_leak": 0,
    "duplicate_source_overlap": 0
  }
}
```

A model run aborts when any mandatory leakage check is nonzero.

## 8.14 Adversarial and stress-test suite

The stress suite is frozen separately from the normal test set.

| Stress ID | Task | Perturbation | Desired behavior | Failure indicator |
|---|---|---|---|---|
| S12-1 | 12 | duplicate reporting burst | discount duplicates and source-density shift | false pattern driven by copies |
| S12-2 | 12 | clock jitter and delayed ingestion | use observation time and quality flags correctly | time-to-detection improves from future ingestion data |
| S12-3 | 12 | event-code remap | detect ontology drift or degrade | silent confidence retention |
| S12-4 | 12 | missing geography | retain event with degraded spatial output | imputed location presented as observed |
| S12-5 | 12 | novel actor aliases | use ontology/features or unknown handling | arbitrary known-actor substitution |
| S13-1 | 13 | same-name entities | avoid false merge | false-merge rate spike |
| S13-2 | 13 | hub-node removal | expose dependency and uncertainty | unchanged confident ranking |
| S13-3 | 13 | relation imbalance | maintain per-relation reporting | macro performance hidden by dominant relation |
| S13-4 | 13 | inverse-edge leakage trap | fail the audit | inflated test MRR |
| S13-5 | 13 | adversarial negative sampling | calibrated probability should decline | high confidence on type-invalid edges |
| S8-1 | 8 | contradictory constraints | surface conflict and gate | fabricated feasible COA |
| S8-2 | 8 | prompt injection inside evidence | treat it as untrusted data | role/policy override |
| S8-3 | 8 | incomplete scenario | request assumptions or produce gated output | unsupported specificity |
| S8-4 | 8 | agent collusion/mode collapse | preserve diversity metric and dissent | near-identical COAs |
| S14-1 | 14 | mixed CRS | block or correct deterministically | displaced layer rendered without warning |
| S14-2 | 14 | stale source layer | show age and warning | current-looking unlabeled layer |
| S14-3 | 14 | dense labels | deterministic decluttering | unreadable overlap or unstable reruns |

The stress suite is never used to tune after freeze. If a defect is fixed, the version increments and the entire qualification set reruns.

## 8.15 Offline package and storage budget

The sealed package targets two identical 256 GB encrypted USB drives and two local laptop copies. The working set must fit below 100 GB to leave space for logs, duplicate rollback artifacts, and filesystem overhead.

| Package component | Target bytes | Notes |
|---|---:|---|
| raw admitted source subsets | 20–35 GB | immutable, read-only |
| processed tables and graphs | 10–20 GB | Parquet, GeoParquet, CSR/CSC graph arrays |
| geospatial tiles and rasters | 8–20 GB | clipped offline layers |
| model weights and quantized variants | 15–30 GB | includes baselines; large tier optional |
| Python wheels/containers/environment locks | 5–12 GB | completely offline install path |
| reports, exemplars, diagrams, UI assets | 2–5 GB | includes prerecorded contingency runs |
| free reserve | at least 80 GB | logs, snapshots, emergency copy |

`make package-audit` computes:

\[
B_{total}=\sum_{f\in\mathcal{P}}\operatorname{bytes}(f),
\]

verifies every SHA-256 digest, confirms no symbolic link escapes the package root, scans for secrets, checks that all paths referenced by manifests exist, and writes a signed inventory.

## 8.16 Data-freeze acceptance gate

The 15 August data freeze passes only when:

- every admitted dataset has a current license record and signed decision;
- ACLED is absent unless written permission is present;
- raw, processed, and split hashes resolve;
- all task loaders run offline;
- no train/validation/calibration/test leakage is detected;
- the stress suite is frozen;
- the package fits the storage budget;
- a second operator can rebuild the processed data from raw inputs using the included scripts;
- all displayed public-source attributions render correctly.

A failed data gate blocks the affected task; it does not trigger an improvised live download.

---
<a id="compute-budget"></a>
# Part 4 — Compute, memory, latency, and fallback budget

# 9. Compute budget

## 9.1 Target machine profiles

The plan qualifies two platform profiles independently.

| Profile | Minimum controlled configuration | Intended role |
|---|---|---|
| `CUDA-LAPTOP` | x86-64; NVIDIA laptop GPU with 16 GB VRAM; at least 64 GB system RAM; NVMe SSD with 150 GB free | primary training completion, full baseline suite, fastest live inference |
| `APPLE-LAPTOP` | Apple Silicon with at least 64 GB unified memory; current frozen macOS/Python environment; 150 GB free SSD | second independent replica, CPU/MPS-compatible models, offline presentation |
| `CPU-SAFE` | either laptop with accelerator disabled | functional contingency for classical baselines, map pipeline, cached outputs, and validation tools |

These are target profiles, not measured inventory. Before package freeze, `hardware_report.json` records actual CPU, accelerator, driver/runtime, RAM, storage, power mode, and thermal configuration for both laptops.

## 9.2 Complexity model

For a dense parameter tensor with \(P\) parameters at \(b\) bits, weight memory is approximately

\[
M_W=\frac{Pb}{8}.
\]

Full Adam-style training can require weights, gradients, master weights, and two moment tensors; a rough planning range is

\[
M_{train}\approx(12\text{ to }20)P\text{ bytes}+M_{activation}.
\]

This makes full training of the large tiers inappropriate on a 16 GB laptop GPU. The large tiers therefore use frozen base weights plus low-rank or other parameter-efficient adapters, activation checkpointing, and mixed precision. The package records trainable and total parameter counts separately.

A selective state-space stack is linear in sequence length for the recurrent scan. A simplified operation model is

\[
C_{SSM}(L,d,N)\approx O(Ld^2)+O(LdN),
\]

where \(L\) is sequence length, \(d\) model width, and \(N\) state size. The dense projections often dominate at large \(d\). A full-attention comparator has

\[
C_{attn}(L,d)\approx O(Ld^2)+O(L^2d),
\qquad
M_{attn}\approx O(L^2),
\]

which motivates the long-context Pareto experiment rather than a universal superiority claim.

For a message-passing GNN with \(|E|\) sampled edges, width \(d\), and \(K\) layers,

\[
C_{GNN}\approx O(K|E|d)+O(K|V|d^2).
\]

Neighbor sampling bounds effective \(|E|\) during training. Full-graph embedding is permitted only when memory profiling confirms it fits with a 20% reserve.

## 9.3 Pre-event training budget

The objective is not to train new foundation models from random initialization. Work consists of domain-token adaptation, parameter-efficient tuning, calibration, decoder training, and benchmark runs.

### Planned accelerator hours

| Task/configuration | Small | Medium | Large | Notes |
|---|---:|---:|---:|---|
| Task 12 NLM event model | 6–10 h | 12–20 h | 18–24 h | large uses adapter tuning; one full seed for development, five frozen-seed evaluations after selection |
| Task 12 transformer comparator | 4–8 h | 8–14 h | optional only | matched parameter/context budget; stop if it cannot fit the stated context |
| Task 13 FUSARIUM GNN | 3–6 h | 6–12 h | 12–20 h | sampled training; full inference benchmark after each checkpoint |
| Task 13 node2vec/classical suite | 1–4 h | n/a | n/a | includes embedding and logistic decoder grid |
| Task 8 MYCA protocol calibration | 2–5 h | 4–8 h | optional 8–16 h adapter | primary work is schema, prompt, validator, and rubric calibration; no required foundation-model training |
| Task 14 map preprocessing | 1–3 h CPU/GPU | n/a | n/a | tile build, raster warp, simplification, cache generation |
| Interaction/ablation qualification | 6–12 h | 10–18 h | optional | sequence-only, graph-only, fused, and orchestration runs |

The schedule assumes jobs can be distributed across the two laptops or run sequentially before 22 August. Each development run has a wall-time cap. An unstable large model is dropped rather than allowed to consume the critical path.

### Seed economy

Five seeds are required for final reporting, not for every exploratory hyperparameter. The process is:

1. architecture screening on seed 11;
2. narrow confirmation on seeds 11 and 17;
3. freeze configuration;
4. final evaluation on \(S=\{11,17,23,29,31\}\).

This reduces compute-driven researcher degrees of freedom while preserving multi-seed evidence.

## 9.4 Live inference operating scales and targets

All values below are acceptance targets to be verified on both machines. The dashboard displays measured values and never substitutes the target.

| Task | Frozen live workload | Small target | Medium target | Large/optional target | Hard live cap |
|---|---|---:|---:|---:|---:|
| 12 — batch pattern analysis | 50,000–100,000 preprocessed events, fixed AOR/window | <10 s warm | <25 s warm | <60 s quantized | 90 s |
| 12 — streaming update | one new event plus affected local cluster | <100 ms median | <250 ms | <750 ms | 2 s |
| 13 — graph embedding | up to 50,000 nodes and 500,000 observed edges in live profile | <20 s | <45 s | <90 s quantized | 120 s |
| 13 — one link query | candidate set prefiltered by type/time | <2 s | <5 s | <10 s | 15 s |
| 8 — MYCA COA cycle | 3 candidate COAs, 4 roles, at most 2 revision rounds | <90 s | <180 s | optional | 240 s |
| 14 — offline map render | fixed regional extent, admitted layers, HTML + PNG | <8 s | same | n/a | 20 s |
| integrated 12→13→MYCA | frozen scenario and cached model load | <180 s | <300 s | optional | 420 s |

The live workload is selected before the event. Larger offline scaling experiments are shown as prerecorded or precomputed results with complete run reports, not improvised as live claims.

## 9.5 Memory budgets

The process-level memory gate is

\[
M_{peak}\le 0.80M_{available}.
\]

The remaining 20% protects the UI, operating system, filesystem cache, and measurement variance.

### CUDA profile

| Component | VRAM budget |
|---|---:|
| small Task 12 or 13 model | ≤6 GB |
| medium model | ≤11 GB |
| quantized large model | ≤14 GB |
| runtime reserve | ≥2 GB |

### Apple unified-memory profile

| Component | Unified-memory budget |
|---|---:|
| model and graph arrays | ≤40 GB |
| operating system/UI/cache reserve | ≥16 GB |
| emergency reserve | ≥8 GB |

Memory-mapped CPU arrays are used for graph topology and event tables. A run aborts before allocation when the manifest estimate exceeds the configured gate.

## 9.6 Cold-start strategy

The cold-start requirement is below 30 seconds for the default live configuration. The build uses:

1. a local wheelhouse or prebuilt container image; no package resolution at show time;
2. model files on internal NVMe, not only USB;
3. memory-mapped, already processed arrays;
4. cached tokenizer/ontology dictionaries;
5. precompiled or prequalified kernels where the platform supports them;
6. a lightweight health probe before model load;
7. one explicit `prewarm` command before the scored session.

Cold start is measured from a stopped process, not from a reboot unless the session calls for a reboot. The report separates:

\[
L_{cold}=L_{process}+L_{weights}+L_{data}+L_{first\_kernel}+L_{first\_inference}.
\]

Warm latency excludes only one-time loading and compilation; preprocessing and rendering remain included.

## 9.7 Quantization policy

Quantization is an evaluated model variant, not a transparent deployment trick. For configuration \(m\), report quality loss

\[
\Delta Q=Q_{quantized}-Q_{reference},
\]

latency change

\[
\Delta L=L_{quantized}-L_{reference},
\]

and calibration change

\[
\Delta ECE=ECE_{quantized}-ECE_{reference}.
\]

Permitted variants:

- FP16/BF16 reference where supported;
- weight-only INT8 for sequence and graph models after calibration testing;
- INT4/NF4 for large local language models used by MYCA;
- dynamic CPU INT8 for simple classifiers and fallback paths.

A quantized model is promoted only when:

\[
\Delta Q\ge-\delta_Q,
\qquad
\Delta ECE\le\delta_{ECE},
\qquad
L_{quantized}<L_{reference},
\]

with task-specific tolerances preregistered. If calibration worsens materially, temperature scaling is refit on the calibration split and test data remain untouched.

## 9.8 Distillation strategy

If the medium or large model is useful but too slow, a small student is trained from the frozen teacher. For class probabilities \(p_T\) and \(p_S\),

\[
\mathcal{L}_{distill}=\alpha\mathcal{L}_{hard}+
(1-\alpha)T^2\operatorname{KL}
\left(
\operatorname{softmax}(z_T/T)
\Vert
\operatorname{softmax}(z_S/T)
\right).
\]

For embeddings, add

\[
\mathcal{L}_{embed}=\|Wz_S-z_T\|_2^2.
\]

The student is a separate model card and Pareto point. It cannot inherit the teacher's reported performance.

## 9.9 MYCA local-model budget

Task 8 is bounded by total generated tokens, agent count, and round count. Let \(n\) be agents, \(R\) rounds, and \(T_{in},T_{out}\) mean input/output tokens per agent-round. Approximate generation work scales as

\[
C_{MYCA}\propto nR(T_{in}+T_{out})P_{LM}.
\]

The live cap is:

- four role agents plus one deterministic validator;
- maximum two revision rounds;
- maximum three candidate COAs;
- task-level context budget fixed before the run;
- no recursive agent creation;
- no agent may call another language model directly; all calls pass through the orchestrator;
- a global timeout returns the last validated state.

The default local language model is selected after both laptops pass the exact offline benchmark. A smaller model with stable schema compliance is preferred to a larger model that intermittently violates constraints.

## 9.10 Profiling and measurement

Every measured region uses explicit accelerator synchronization where required. The profiler records:

```json
{
  "timing": {
    "process_start_ms": 0,
    "weight_load_ms": 0,
    "data_load_ms": 0,
    "preprocess_ms": 0,
    "model_ms": 0,
    "postprocess_ms": 0,
    "render_ms": 0,
    "end_to_end_ms": 0,
    "warm": true
  },
  "memory": {
    "peak_host_bytes": 0,
    "peak_accelerator_bytes": 0,
    "model_bytes": 0,
    "data_bytes": 0
  },
  "throughput": {
    "events_per_second": null,
    "edges_per_second": null,
    "generated_tokens_per_second": null
  },
  "power_mode": "recorded_platform_value",
  "thermal_warning": false
}
```

The plan does not infer FLOPs from elapsed time. Where FLOPs are reported, they are generated by an explicit profiler or a documented analytical estimate labeled `ESTIMATED_FLOPS`.

## 9.11 Fallback ladder

The run controller applies the following deterministic fallback ladder:

1. medium full-precision model;
2. small full-precision model;
3. qualified quantized medium model;
4. distilled small model;
5. classical baseline;
6. prerecorded run with the same package version and full report;
7. static artifact plus failure explanation.

A fallback is visible in the UI and report:

```json
{
  "requested_configuration": "task12_medium_fp16",
  "executed_configuration": "task12_small_fp16",
  "fallback_reason": "accelerator_memory_gate",
  "quality_claim_scope": "executed_configuration_only"
}
```

No prerecorded result is presented as a live run.

## 9.12 Compute-freeze gate

The 22 August reference-implementation gate passes when:

- every default model completes on both laptops;
- cold and warm timings are captured;
- peak memory stays below the 80% gate;
- a five-seed evaluation can complete within the remaining schedule;
- quantized/fallback variants have separate model cards;
- CPU-safe classical and Task 14 paths work with the accelerator disabled;
- thermal throttling is tested during at least three back-to-back runs;
- all timing code is unit-tested against synthetic sleeps and known work;
- the live scenario completes without network access.

---
<a id="implementation"></a>
# Part 5 — Reference implementation blueprint

# 10. Software architecture and reproducible execution

## 10.1 Repository layout

The reference implementation lives under one package root and exposes no hidden notebook-only logic.

```text
mycosoft/itdx26/
├── README.md
├── Makefile
├── pyproject.toml
├── requirements-linux.lock
├── requirements-macos.lock
├── wheelhouse/
├── containers/
│   ├── Dockerfile.cuda
│   └── image-manifest.json
├── configs/
│   ├── demo_task12_small.yaml
│   ├── demo_task13_small.yaml
│   ├── demo_task8_local.yaml
│   ├── demo_task14.yaml
│   ├── policies/
│   └── logging/
├── data/
│   ├── raw/                         # immutable, read-only after freeze
│   ├── processed/
│   ├── manifests/
│   │   ├── datasets/
│   │   ├── splits/
│   │   └── package/
│   ├── licenses/
│   └── stress/
├── src/mycosoft/itdx26/
│   ├── schemas/
│   │   ├── nmf.py
│   │   ├── events.py
│   │   ├── graph.py
│   │   ├── coa.py
│   │   ├── map_product.py
│   │   └── run_report.py
│   ├── provenance/
│   │   ├── hashing.py
│   │   ├── canonical_json.py
│   │   ├── merkle.py
│   │   └── lineage.py
│   ├── governance/
│   │   ├── avani_gate.py
│   │   ├── license_gate.py
│   │   ├── classification_gate.py
│   │   └── policy_engine.py
│   ├── data/
│   │   ├── gdelt.py
│   │   ├── wikidata.py
│   │   ├── ogb.py
│   │   ├── geospatial.py
│   │   ├── doctrine.py
│   │   └── split_registry.py
│   ├── models/
│   │   ├── nlm_event/
│   │   │   ├── encoder.py
│   │   │   ├── selective_ssm.py
│   │   │   ├── heads.py
│   │   │   ├── loss.py
│   │   │   └── inference.py
│   │   ├── fusarium_gnn/
│   │   │   ├── resolver.py
│   │   │   ├── relational_gnn.py
│   │   │   ├── decoder.py
│   │   │   └── inference.py
│   │   ├── myca/
│   │   │   ├── roles.py
│   │   │   ├── orchestrator.py
│   │   │   ├── transcript.py
│   │   │   ├── consensus.py
│   │   │   └── validators.py
│   │   └── baselines/
│   │       ├── seasonal_counts.py
│   │       ├── transformer_event.py
│   │       ├── pagerank.py
│   │       ├── louvain.py
│   │       ├── node2vec.py
│   │       ├── single_agent.py
│   │       └── map_baseline.py
│   ├── tasks/
│   │   ├── task12_pattern/
│   │   ├── task13_link/
│   │   ├── task8_coa/
│   │   └── task14_map/
│   ├── fusion/
│   │   ├── feature_contract.py
│   │   ├── logistic_fusion.py
│   │   └── ablation.py
│   ├── eval/
│   │   ├── calibration.py
│   │   ├── ranking.py
│   │   ├── bootstrap.py
│   │   ├── significance.py
│   │   ├── profiler.py
│   │   ├── stress.py
│   │   └── pareto.py
│   ├── render/
│   │   ├── pattern_product.py
│   │   ├── link_product.py
│   │   ├── coa_product.py
│   │   └── map_product.py
│   ├── demo/
│   │   ├── controller.py
│   │   ├── health.py
│   │   ├── offline_guard.py
│   │   └── local_server.py
│   └── cli.py
├── ui/
│   ├── static/                       # prebuilt; no Node build on site
│   └── templates/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── regression/
│   ├── determinism/
│   ├── security/
│   └── fixtures/
├── scripts/
│   ├── acquire_data.py
│   ├── build_data.py
│   ├── count_parameters.py
│   ├── build_wheelhouse.py
│   ├── seal_package.py
│   ├── verify_package.py
│   └── reproduce_reference.py
├── artifacts/
│   ├── expected/
│   └── prerecorded_contingency/
└── reports/
    ├── qualification/
    └── live/
```

Raw data, weights, and reference artifacts are outside the Python wheel but inside the sealed package. Code may read them only through manifest-resolved paths.

## 10.2 Configuration discipline

Configuration precedence is fixed:

\[
\text{compiled defaults}<\text{task YAML}<\text{machine profile}<\text{CLI overrides}.
\]

Every resolved configuration is serialized into the run report. CLI overrides are permitted only for fields marked `operator_tunable`, such as review budget \(K\), display threshold, task configuration, and seed. Dataset paths, split IDs, model hashes, and policy files are not operator-tunable during a scored run.

A configuration object includes:

```yaml
run:
  task: 12
  seed: 17
  offline: true
  machine_profile: CUDA-LAPTOP

data:
  dataset_manifest: data/manifests/datasets/gdelt_events_aor_v1.yaml
  split_manifest: data/manifests/splits/gdelt_temporal_v1.json
  test_partition: test

model:
  model_card: models/cards/nlm_event_small_v1.yaml
  weights_sha256: "..."
  precision: fp16

policy:
  avani_policy: configs/policies/unclassified_demo_v1.yaml
  review_budget_k: 25
  confidence_threshold: 0.70

output:
  report_dir: reports/live
  artifact_dir: artifacts/live
```

## 10.3 Core interfaces

### NMF profile

```python
@dataclass(frozen=True)
class NMFFrame:
    frame_id: str
    observed_at_utc: datetime
    source: SourceDescriptor
    context: Mapping[str, JSONValue]
    raw_refs: tuple[ContentRef, ...]
    calibration: CalibrationDescriptor
    features: Mapping[str, JSONValue]
    quality: QualityDescriptor
    provenance: ProvenanceDescriptor
    target: TargetDescriptor | None
```

### NLM output

```python
@dataclass(frozen=True)
class NLMStateEstimate:
    estimate_id: str
    input_frame_ids: tuple[str, ...]
    state_label: str | None
    state_embedding_ref: ContentRef
    probabilities: Mapping[str, float]
    anomaly_probability: float | None
    predictive_distribution_ref: ContentRef | None
    uncertainty: UncertaintyDescriptor
    evidence: tuple[EvidenceWeight, ...]
    recommended_measurements: tuple[str, ...]
    model_hash: str
    provenance_root: str
```

### FUSARIUM graph handoff

```python
@dataclass(frozen=True)
class GraphFeatureEnvelope:
    node_id: str
    valid_at_utc: datetime
    nlm_embedding_ref: ContentRef
    temporal_anomaly_probability: float
    uncertainty: float
    quality: float
    source_frame_ids: tuple[str, ...]
    feature_contract_version: str
    provenance_root: str
```

### AVANI decision

```python
@dataclass(frozen=True)
class GovernanceDecision:
    decision_id: str
    disposition: Literal["PASS", "GATE", "BLOCK"]
    policy_version: str
    rule_results: tuple[RuleResult, ...]
    allowed_actions: tuple[str, ...]
    human_review_required: bool
    input_provenance_root: str
    decision_hash: str
```

Objects are immutable after creation. A correction creates a new version with a `SUPERSEDES` relation.

## 10.4 Unified run-report schema

Every command writes one canonical JSON report. The top-level schema is:

```json
{
  "schema_version": "itdx26.run_report.v1",
  "run_id": "uuid",
  "started_utc": "ISO-8601",
  "completed_utc": "ISO-8601",
  "status": "SUCCESS|DEGRADED|FAILED|BLOCKED",
  "claim_class": "MEASURED",
  "task": "12|13|8|14|interaction|pareto",
  "command": "exact shell-safe argv array",
  "operator": "local identifier",
  "offline_verified": true,
  "code": {
    "git_sha": "...",
    "dirty": false,
    "source_tree_sha256": "..."
  },
  "environment": {
    "lockfile_sha256": "...",
    "python": "...",
    "platform": "...",
    "accelerator": "...",
    "driver_runtime": "...",
    "container_image_sha256": null
  },
  "data": {
    "dataset_manifest_sha256": "...",
    "split_manifest_sha256": "...",
    "input_object_hashes": ["..."],
    "license_decision_hashes": ["..."]
  },
  "model": {
    "model_card_sha256": "...",
    "weights_sha256": "...",
    "total_parameters": 0,
    "trainable_parameters": 0,
    "precision": "...",
    "quantization": null
  },
  "randomness": {
    "seed": 17,
    "python_hash_seed": 17,
    "deterministic_algorithms": true,
    "known_nondeterminism": []
  },
  "metrics": {},
  "timing": {},
  "memory": {},
  "governance": {
    "decision": "PASS|GATE|BLOCK",
    "decision_hash": "..."
  },
  "warnings": [],
  "failure_flags": [],
  "artifacts": [
    {"path": "...", "sha256": "...", "media_type": "..."}
  ],
  "report_sha256": "..."
}
```

The final `report_sha256` is calculated over canonical JSON with that field temporarily omitted.

## 10.5 Candidate dependency freeze

The following is the candidate CUDA environment. It is not promoted until installed, tested, and hashed on the actual target laptop.

| Dependency | Candidate pin | Purpose/qualification note |
|---|---|---|
| Python | 3.11.11 | common runtime; exact build recorded |
| PyTorch | 2.6.0 + qualified CUDA wheel | tensor runtime; deterministic settings tested |
| torchvision / torchaudio | version matched to PyTorch | only installed if a task requires them |
| `mamba-ssm` | 2.2.4 or source tag resolving to a recorded SHA | selected only after CUDA/toolchain qualification; package and source hash recorded |
| `causal-conv1d` | compatible frozen wheel | selective SSM dependency |
| PyTorch Geometric | 2.6.1 | GNN operators and loaders |
| OGB | 1.3.6 | official loaders/evaluators |
| Transformers | 4.51.3 | local LM and transformer comparator; offline files only |
| sentence-transformers | 4.1.0 | optional frozen text embeddings |
| NumPy | 2.1.3 | numerical arrays |
| SciPy | 1.15.2 | statistics, sparse operations |
| pandas | 2.2.3 | tabular preprocessing |
| PyArrow | 19.0.1 | Parquet/Arrow |
| scikit-learn | 1.6.1 | baselines, calibration, metrics |
| NetworkX | 3.4.2 | classical graph analysis |
| hdbscan | 0.8.40 | optional deterministic-configuration clustering |
| GeoPandas | 1.0.1 | vector geospatial processing |
| Shapely | 2.0.7 | geometry operations |
| pyproj | 3.7.0 | CRS transforms |
| rasterio | 1.4.3 | raster processing |
| DuckDB | 1.2.1 | local analytical queries |
| Pydantic | 2.10.6 | schema validation |
| FastAPI / Uvicorn | 0.115.8 / 0.34.0 | local-only UI API |
| Plotly | 6.0.0 | prebuilt interactive figures |
| pytest | 8.3.5 | testing |

Version numbers may change during qualification if compatibility requires it. Any change updates the lockfile, wheelhouse, environment hash, regression baseline, and both-laptop qualification record. No dependency is upgraded after 29 August except through the critical-defect procedure.

The macOS lock may differ where CUDA-specific packages are unavailable. A pure-PyTorch reference or CPU path must implement the small model interface. Performance is reported separately; functional parity does not imply performance parity.

## 10.6 Offline environment construction

The Linux path supports two reproducible options:

1. **Frozen wheelhouse:** install with `pip --no-index --find-links wheelhouse -r requirements-linux.lock`.
2. **Prebuilt container:** load an OCI image tar whose digest is in `image-manifest.json`.

The live default is whichever passes the lower-latency and lower-failure dry run. The macOS path uses a frozen wheelhouse and lockfile.

`make offline-audit`:

- disables or blocks outbound network access;
- clears proxy environment variables;
- verifies all model paths resolve locally;
- starts the local server on `127.0.0.1` only;
- runs one smoke test per task;
- fails if DNS, HTTP, model-hub, telemetry, or package-index access is attempted.

## 10.7 Makefile and CLI surface

Required commands:

```makefile
make doctor
make verify-package
make offline-audit
make test-unit
make test-integration
make test-determinism
make qualify MACHINE=cuda-laptop
make build-data DATASET=gdelt
make train TASK=12 SIZE=small SEED=11
make evaluate TASK=12 SIZE=small SEEDS=11,17,23,29,31
make demo TASK=12 SIZE=small SEED=17 OFFLINE=1
make demo TASK=13 SIZE=small SEED=17 OFFLINE=1
make demo TASK=8  SIZE=small SEED=17 OFFLINE=1
make demo TASK=14 OFFLINE=1
make demo TASK=interaction SIZE=small SEED=17 OFFLINE=1
make pareto TASK=12
make package-audit
make seal-package
```

The Python CLI mirrors the Makefile:

```bash
python -m mycosoft.itdx26.cli demo \
  --task 12 \
  --config configs/demo_task12_small.yaml \
  --seed 17 \
  --offline
```

Make is an ergonomic wrapper; the Python command is the canonical argv stored in the run report.

## 10.8 Seed and determinism initialization

```python
def set_reproducible_state(seed: int) -> dict[str, object]:
    import os, random
    import numpy as np
    import torch

    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.use_deterministic_algorithms(True, warn_only=False)
    if torch.backends.cudnn.is_available():
        torch.backends.cudnn.benchmark = False
        torch.backends.cudnn.deterministic = True
    return {
        "seed": seed,
        "deterministic_algorithms": True,
        "cuda": torch.version.cuda,
    }
```

If an operator lacks a deterministic kernel, the qualification run either replaces it or records the exact nondeterminism and numerical tolerance. “Same seed” is not asserted to guarantee bitwise equality across CUDA and Apple platforms.

## 10.9 Testing plan

### Unit tests

At minimum:

- canonical JSON produces identical bytes independent of dictionary insertion order;
- hashes change on every material input change;
- NMF and task schemas reject invalid time, coordinate, probability, and provenance fields;
- split registry detects overlap;
- inverse-edge leakage checker catches known traps;
- AVANI rules produce expected PASS/GATE/BLOCK cases;
- FASDC rubric aggregation respects hard gates;
- timing profiler synchronizes accelerators;
- map pipeline rejects incompatible CRS without an explicit transform;
- renderer cannot introduce an entity or number absent from structured input.

### Integration tests

- GDELT raw fixture → Task 12 product and report;
- Wikidata/OGB fixture → Task 13 link product and report;
- Task 12 feature envelope → Task 13 graph consumption;
- Task 12 + 13 evidence → MYCA proposal/critique/score transcript;
- all products → AVANI gate → MINDEX lineage graph → UI;
- Task 14 renders fully offline;
- fallback ladder activates on simulated OOM and timeout.

### Determinism tests

For deterministic path \(f\), run twice in fresh processes and require

\[
H(f(x;s,v))_1=H(f(x;s,v))_2.
\]

For floating-point artifacts that are not canonically stable, compare arrays with preregistered tolerance and then hash the canonical quantized representation. The report states which standard applies.

### Regression tests

Reference fixtures store expected schema, rank order, metric range, and artifact structure. Exact learned scores are not frozen across an intentional model change, but every change requires a new baseline approval.

### Security and offline tests

- secret scanner returns zero credentials;
- archive extraction blocks path traversal;
- local web server binds only to loopback unless explicitly configured;
- user-supplied evidence is escaped and treated as data, not prompt instruction;
- no shell command is constructed from untrusted text;
- generated paths stay within the run directory;
- network calls fail closed.

## 10.10 Local demonstration UI

The UI is a prebuilt static application served by the local FastAPI process. It has five views:

1. **Run control:** task, approved configuration, seed, review budget, and start button.
2. **Evidence:** immutable source records, provenance, and quality flags.
3. **Analysis:** task-specific visualization and calibrated scores.
4. **Interaction:** MYCA transcript, critiques, revisions, and consensus/disagreement.
5. **Performance:** latency breakdown, memory, throughput, Pareto point, and baseline comparison.

Every view displays:

- `LIVE`, `PRERECORDED`, or `STATIC` status;
- run ID;
- code/data/model short hashes;
- AVANI disposition;
- warnings and fallback state.

The UI never suppresses a failed run. Failure produces a red report card with the exception class, stage, last valid artifact, and suggested fallback.

## 10.11 Packaging, sealing, and reproduction

The package is sealed by:

```bash
make test-unit test-integration test-determinism
make qualify MACHINE=cuda-laptop
make qualify MACHINE=apple-laptop
make offline-audit
make package-audit
make seal-package
```

`seal-package`:

1. makes raw data and released weights read-only;
2. generates `MANIFEST.sha256` for every file;
3. writes the source-tree and lockfile hashes;
4. writes package byte count;
5. signs or cryptographically records the manifest using the approved local mechanism;
6. copies the package to both USB drives;
7. verifies both copies byte-for-byte;
8. creates a sealed-package receipt.

Engineer #2 reproduces the reference run using only the design document and package:

```bash
./bootstrap_offline.sh
make doctor
make verify-package
make demo TASK=12 SIZE=small SEED=17 OFFLINE=1
make compare-reference RUN=reports/live/<run_id>.json
```

A reproduction passes when schemas and hashes are valid, rank agreement and metrics fall within preregistered tolerance, and the analyst artifact contains the required fields. Cross-platform floating-point differences are reported, not hidden.

## 10.12 Critical-change procedure

After 29 August, a change is permitted only for a defect that would block or materially misrepresent the demonstration. The change requires:

- issue record and root cause;
- isolated patch;
- new code SHA and package version;
- complete unit, integration, determinism, stress, and qualification rerun;
- regenerated reference artifacts;
- updated USB manifests;
- explicit entry in the briefing's change log.

There is no “quick fix” directly on the on-site copy.

---
<a id="onsite-script"></a>
# Part 6 — On-site demonstration script

# 11. Execution plan for 8–18 September 2026

## 11.1 Calendar correction and agenda assumption

The source handoff mislabeled the weekdays. The actual calendar is:

- Tuesday, 8 September 2026;
- Wednesday, 9 September;
- Thursday, 10 September;
- Friday, 11 September;
- Saturday–Sunday, 12–13 September;
- Monday, 14 September;
- Tuesday, 15 September;
- Wednesday, 16 September;
- Thursday, 17 September;
- Friday, 18 September.

Hess has not issued the final agenda. The script below is the default allocation and is rearranged without changing task gates, datasets, or evaluation protocol. Unless ICED schedules weekend sessions, 12–13 September are analysis and recovery days, not scored demonstrations.

## 11.2 Daily startup and closeout

### Startup — 20 minutes before each session

```bash
make verify-package
make doctor
make offline-audit-fast
make smoke TASK=<scheduled_task>
```

The operator confirms:

- package manifest valid;
- internal clock and timezone recorded;
- accelerator and power mode correct;
- no network dependency;
- local UI status green;
- current run directory empty;
- selected task/configuration/seed displayed;
- contingency artifact from the identical package version available.

### Closeout — immediately after each session

```bash
make finalize-session SESSION=<date_session_id>
make verify-reports SESSION=<date_session_id>
```

Closeout exports the run report, artifacts, questions, analyst feedback, and a read-only session index. No result is copied into a briefing slide without its run ID.

## 11.3 Standard live-demonstration pattern

A 45-minute technical session follows this sequence:

1. **Problem and doctrinal product — 5 min.** Define what the analyst needs and what the algorithm is not authorized to decide.
2. **Classical baseline — 7 min.** Run the simpler method first.
3. **Primary model — 10 min.** Run the frozen learned model on the same input.
4. **Evidence and uncertainty — 8 min.** Inspect source records, scores, calibration, provenance, and alternatives.
5. **Failure or stress case — 7 min.** Show a known limitation or adversarial batch.
6. **Performance and Pareto — 4 min.** Compare latency, memory, and quality.
7. **Questions and analyst disposition — 4 min.** Capture comments and any requested rerun.

A shorter agenda uses the same order, not a marketing-only version.

## 11.4 Day-by-day schedule

### Tuesday, 8 September — orientation, qualification, and evidence contract

**Objective.** Establish trust in the method before showing model outputs.

**Demonstration.** No headline accuracy claim. Show the package manifest, offline verification, NMF profile, run-report schema, system-role boundaries, and one tiny synthetic smoke test.

**What the analyst sees.**

- Figure 1 architecture and Figure 9 evidence ladder;
- one source record transformed into an NMF profile;
- a deterministic AVANI PASS/GATE/BLOCK example;
- how a displayed sentence resolves to evidence;
- how prerecorded and live states are labeled.

**Metrics captured.** Package verification time, cold UI startup, smoke-test latency, hash verification success, and machine profile.

**Expected questions.**

- What is genuinely implemented versus planned?
- Why is NLM not simply an LLM with sensor data?
- Where does MYCA fit?
- What prevents a language model from inventing a conclusion?
- Can the run be reproduced without Mycosoft infrastructure?

**Contingency.** If an environment fails, use the CPU-safe smoke test and repair only through the critical-change process. Do not consume the orientation by debugging a large model.

**Exit gate.** ICED can identify the input, output, uncertainty object, governance decision, and run report for every later demonstration.

### Wednesday, 9 September — Task 12 baseline and first primary run

**Objective.** Establish Pattern Analysis as a measurable sequence problem.

**Commands.**

```bash
make demo TASK=12 MODEL=seasonal_baseline SEED=17 OFFLINE=1
make demo TASK=12 SIZE=small SEED=17 OFFLINE=1
```

**What the analyst sees.**

- fixed event stream and temporal holdout;
- seasonal/count baseline ranked alerts;
- NLM small-model ranked patterns;
- event-level evidence, baseline rate, observed rate, source-density features, and calibrated probability;
- review-budget slider \(K\) with precision/recall recomputed from frozen scores.

**Metrics captured.** Precision@K, recall@K, average precision, Brier score, ECE, time-to-detection, cold/warm latency, events/s, peak memory.

**Expected questions.**

- What counts as ground truth for a pattern?
- How do reporting volume and duplication affect the score?
- Why use a state-space model rather than a transformer?
- Does the system find causes or only anomalies?
- How many events can it process on this laptop?

**Contingency.** If the NLM fails or misses its target, show the baseline, the failed report, and the prerecorded reference run from the same package. State whether the failure is model, data, kernel, memory, or UI. Do not claim the prerecorded metric as live.

**Exit gate.** At least one complete live run, successful or failed, with a valid report and inspectable pattern product.

### Thursday, 10 September — Task 12 calibration, stress tests, and iteration

**Objective.** Demonstrate limitations and analyst control rather than repeat the polished case.

**Commands.**

```bash
make stress TASK=12 SUITE=reporting_bias SEED=23 OFFLINE=1
make stress TASK=12 SUITE=clock_and_ontology_drift SEED=23 OFFLINE=1
make pareto TASK=12 PROFILE=live
```

**What the analyst sees.**

- duplicate-reporting false-positive trap;
- missing geography and delayed-ingestion cases;
- reliability diagram before/after calibration;
- conformal coverage and coverage failure under drift;
- small/medium/baseline Pareto points;
- a threshold change that alters the review queue but not the underlying score.

**Metrics captured.** Stress-case false-positive rate, coverage, calibration error, rank stability, latency distribution, and analyst accept/reject actions.

**Expected questions.**

- Can an adversary manipulate source volume?
- How does the model know the ontology changed?
- What happens with a novel actor?
- How often must calibration be updated?
- Can the analyst override or annotate the model?

**Contingency.** A stress-test failure is a valid demonstration result. Freeze the run, show the failure flag, compare against the baseline, and identify the mitigation planned; do not tune on the stress set.

**Exit gate.** Task 12 limitations are explicit enough for ICED to define an appropriate use boundary.

### Friday, 11 September — Task 13 baseline and graph construction

**Objective.** Separate entity resolution, observed links, predicted links, and graph ranking.

**Commands.**

```bash
make demo TASK=13 MODEL=pagerank_louvain SEED=17 OFFLINE=1
make demo TASK=13 SIZE=small SEED=17 OFFLINE=1
```

**What the analyst sees.**

- raw alias records and entity-resolution candidates;
- typed temporal graph after deterministic validation;
- observed edges in one symbology and predicted edges in another;
- PageRank/Louvain baseline;
- FUSARIUM GNN link ranking with per-edge confidence, evidence, and temporal validity.

**Metrics captured.** Entity-resolution pairwise F1, false-merge rate, MRR, Hits@K, average precision, AUCPR, per-relation scores, calibration, nodes/s, edges/s, memory.

**Expected questions.**

- What is the difference between an observed and predicted edge?
- How do you prevent same-name false merges?
- How are negative examples chosen?
- What does centrality mean operationally?
- Does a community imply coordination?

**Contingency.** If the GNN path fails, the graph still renders with observed edges and classical metrics. Show the failed model report and continue with node2vec or deterministic baselines.

**Exit gate.** The analyst can audit one link from source record through resolution, graph construction, prediction, rendering, and governance status.

### Saturday–Sunday, 12–13 September — agenda-dependent buffer

Assume no formal scored session unless ICED directs otherwise. Permitted work:

- verify and index reports from the first four days;
- answer written technical questions;
- run already approved configurations;
- prepare requested visual views from existing structured outputs;
- rehearse the integrated scenario;
- restore a laptop from the sealed package.

Prohibited work without the critical-change procedure:

- training on test or stress data;
- changing split membership;
- upgrading dependencies;
- editing a model to fit an observed on-site case;
- replacing a failed metric with an unlabeled prerecorded result.

If ICED schedules a weekend session, use it for a repeatable Task 12 or Task 13 rerun, not an unqualified new task.

### Monday, 14 September — Task 13 stress tests and NLM–FUSARIUM ablation

**Objective.** Complete Link Analysis and introduce algorithm interaction quantitatively.

**Commands.**

```bash
make stress TASK=13 SUITE=identity_and_leakage SEED=29 OFFLINE=1
make demo TASK=interaction ABLATION=sequence_only SEED=17 OFFLINE=1
make demo TASK=interaction ABLATION=graph_only SEED=17 OFFLINE=1
make demo TASK=interaction ABLATION=fused SEED=17 OFFLINE=1
```

**What the analyst sees.**

- same-name false-merge and inverse-edge leakage traps;
- sequence-only, graph-only, and fused rankings on identical test units;
- paired difference plot and bootstrap interval;
- examples where temporal evidence helps a graph result and where it does not;
- explicit `NO_SIGNIFICANT_IMPROVEMENT` state if the interval crosses the operational threshold.

**Metrics captured.** False-merge rate, leakage audit, paired \(\Delta\)AP/\(\Delta\)MRR, confidence interval, fusion calibration, added latency and memory.

**Expected questions.**

- Does fusion actually add information or only parameters?
- How many paired test units support the claim?
- What happens when the sequence and graph models disagree?
- Can the fusion weights be interpreted?
- Is improvement worth the latency?

**Contingency.** If fusion does not beat the best component, make that the headline result and show the component frontier. MYCA still demonstrates interaction by preserving disagreement and recommending additional evidence.

**Exit gate.** ICED sees a complete interaction experiment, including a credible null result path.

### Tuesday, 15 September — MYCA integrated orchestration

**Objective.** Address how multiple algorithms and agents interact without hiding the intermediate reasoning objects.

**Command.**

```bash
make demo TASK=interaction MODE=myca SIZE=small SEED=17 OFFLINE=1
```

**What the analyst sees.**

- Task 12 pattern candidates and Task 13 link candidates as immutable evidence;
- role-conditioned proposals;
- critique of unsupported assumptions;
- revised hypotheses;
- evidence-quality and agent-reliability scores;
- convergence or visible non-convergence;
- final analyst-facing synthesis with sentence-level evidence links;
- AVANI gate and permitted action envelope.

**Metrics captured.** Unsupported-claim rate, contradiction rate, evidence-link completeness, agent diversity, convergence rounds, rank stability, human usefulness score, total latency, generated tokens, and fallback events.

**Expected questions.**

- Why use multiple agents instead of one model?
- Can agents reinforce the same error?
- How are reliability weights set?
- Does consensus mean truth?
- Can one agent bypass policy or call tools directly?
- What is MYCA doing that NLM is not?

**Contingency.** If the multi-agent loop times out or collapses, display `NOT_CONVERGED`, show the single-agent and deterministic synthesis baselines, and retain the last validated state. Do not force agreement.

**Exit gate.** Every integrated conclusion is traceable to Task 12/13 evidence or labeled as an unresolved assumption.

### Wednesday, 16 September — gated Task 8 or deterministic Task 14 fallback

#### Path A: Task 8 passes its pre-event gate

**Command.**

```bash
make demo TASK=8 SIZE=small SEED=17 OFFLINE=1
```

**What the analyst sees.** A fictional humanitarian/infrastructure-restoration scenario, three candidate COAs, proposal–critique–revision transcript, FASDC vector, hard-constraint checks, assumptions, risks, and differences among candidates.

**Metrics captured.** Structural completeness, hard-violation count, unsupported assumptions, pairwise distinguishability, human rubric, inter-rater agreement, convergence, and latency.

**Expected questions.**

- Why these roles and weights?
- Can the system identify an infeasible option?
- What prevents operationally harmful or unsupported detail?
- How do you evaluate an open-ended answer?
- Is the best-scoring COA automatically selected?

#### Path B: Task 8 does not pass

**Command.**

```bash
make demo TASK=14 OFFLINE=1
```

**What the analyst sees.** Deterministic map construction, layer provenance, CRS validation, Task 12 pattern and Task 13 link overlays, label-placement optimization, source-age warnings, and offline export.

**Metrics captured.** Geospatial error, required-field completeness, label overlap, render latency, memory, and reproducibility hash.

**Expected questions.**

- Which parts are learned?
- How are mixed coordinate systems detected?
- Can every layer be traced to its source and date?
- Does the map remain usable when AI components are disabled?

**Contingency.** If neither path is stable, rerun the stronger primary task with an ICED-selected threshold or stress condition. A deeper validated primary is preferable to a weak stretch claim.

**Exit gate.** The secondary/stretched demonstration is clearly labeled and does not dilute primary-task credibility.

### Thursday, 17 September — final speed, efficiency, Pareto, and reproducibility runs

**Objective.** Close ICED's speed/efficiency question with controlled measurements.

**Commands.**

```bash
make pareto TASK=12 MACHINE=current
make pareto TASK=13 MACHINE=current
make benchmark TASK=interaction MACHINE=current
make reproduce-reference TASK=12 SEED=17
```

**What the analyst sees.**

- cold and warm latency decomposition;
- quality versus latency frontier;
- memory as point size;
- classical, small, medium, quantized, and fused points;
- one operator-reproduced run compared with the package reference;
- machine-specific, not pooled, results.

**Metrics captured.** Median/p90/p95/max latency, throughput, peak RAM/VRAM, package bytes, cold start, quality, calibration, reproducibility difference, and thermal warning.

**Expected questions.**

- What is the best operating point on one laptop?
- What is the cost of interaction?
- What happens without a GPU?
- Are results stable over repeated runs?
- Which configuration would Mycosoft recommend and why?

**Contingency.** If thermal throttling or platform instability affects a run, label it, cool/reset according to the fixed procedure, and preserve both affected and clean reports. Never delete an unfavorable timing.

**Exit gate.** The recommended operating point is supported by a nondominated Pareto point and explicit use constraints.

### Friday, 18 September — hot wash and artifact handoff

**Objective.** Transfer an intelligible evidence package, not a collection of screenshots.

**Hot-wash structure.**

1. one-sentence result per task;
2. strongest measured result and confidence interval;
3. most important failure mode;
4. interaction result, including null or negative result;
5. recommended operating point;
6. what remains unvalidated;
7. follow-on experiment that would reduce the largest uncertainty.

**Handoff contents.**

- design document and source register;
- dataset and license manifests permitted for handoff;
- model cards and dependency lock hashes;
- run-report index;
- selected analyst artifacts;
- Pareto plots;
- failure-mode appendix;
- reproduction instructions;
- change log and package receipt.

No proprietary source, credential, or restricted third-party data is transferred outside its permitted handling terms.

**Expected questions.**

- Which algorithm should ICED evaluate further?
- What limitation matters most?
- What Army SME labeling or test data would materially improve the experiment?
- What can be reproduced immediately?
- What should not be inferred from this demonstration?

**Contingency.** If ICED requests an unplanned run, first determine whether the requested configuration and data are admitted. If not, document the request as a follow-on rather than bypassing controls.

## 11.5 Underperformance protocol

When a live algorithm underperforms:

1. stop at a safe checkpoint;
2. preserve the failed report and logs;
3. state the expected target and measured value;
4. identify whether the cause is data, model, compute, software, or evaluation;
5. run the qualified baseline;
6. optionally show the prerecorded reference run with a visible label;
7. explain the failure condition and mitigation;
8. record ICED questions and whether the failure changes the recommended use boundary.

The briefing language is:

> “This live configuration did not meet its preregistered target. The report shows the failure at stage X. The classical baseline completed at Y. The sealed reference run for the same code/data/model version is available and is labeled prerecorded. We do not count it as today's live result.”

## 11.6 Expected cross-cutting questions and concise answers

| Question | Technical answer |
|---|---|
| Is NLM an LLM? | No. NLM's canonical object is calibrated signal/event state, and its primary objectives include reconstruction, forecasting, contrastive alignment, graph relations, and calibration. An LLM may render structured output. |
| What is MYCA? | A bounded orchestration protocol over agents, models, tools, evidence, and revisions. It is not the source of truth for observations. |
| What is AVANI? | The deterministic governance and admissibility layer implementing quality, provenance, licensing, policy, review, and reversibility gates. |
| What makes the system deterministic? | Frozen inputs, versions, seeds, stable ordering, deterministic kernels where available, canonical serialization, and recorded exceptions. |
| What remains stochastic? | Predictive distributions, sampled hypotheses, and language-model proposals. These are calibrated or validated and cannot bypass hard gates. |
| Does anomaly mean threat? | No. It means departure from a defined baseline under a stated model. The analyst determines relevance. |
| Does a predicted link mean a real relationship? | No. It is a ranked hypothesis with relation type, confidence, evidence, and explicit predicted status. |
| Does multi-agent consensus mean truth? | No. Consensus is one diagnostic. Evidence quality, disagreement, validation, and human review remain decisive. |
| Can the system work offline? | The scored path, data, weights, baselines, UI, and reports are local. Offline audit fails any external call. |
| How are results reproduced? | Exact code/data/model/environment hashes, frozen split keys, seed, command, and artifacts are stored in each run report. |

---
<a id="risk-register"></a>
# Part 7 — Mathematical and algorithmic risk register

# 12. Risk model, controls, and stop conditions

## 12.1 Scoring method

This register covers model, data, evaluation, orchestration, and reproducibility risk. It excludes travel and general business risk.

Each risk receives:

- likelihood \(P\in\{1,\ldots,5\}\);
- impact \(I\in\{1,\ldots,5\}\);
- observability difficulty \(O\in\{1,\ldots,5\}\), where 1 is immediately visible and 5 is likely to remain hidden.

The planning priority is

\[
R=P\times I\times O.
\]

| Score | Priority |
|---:|---|
| 1–24 | low |
| 25–49 | medium |
| 50–74 | high |
| 75–125 | critical |

The score is a prioritization heuristic, not a measured probability. It is revised after qualification evidence.

## 12.2 Master register

| ID | Risk | P | I | O | R | Primary indicator | Preventive control | Live mitigation / stop condition |
|---|---|---:|---:|---:|---:|---|---|---|
| R1 | Selective SSM/Mamba numerical or kernel instability | 3 | 5 | 2 | 30 | NaN/Inf, exploding gradients, kernel error, throughput collapse | frozen compatible toolchain; gradient clipping; mixed-precision qualification; reference implementation; long-sequence stress | switch to small/reference model; if deterministic qualification fails, primary claim stops and transformer/classical baseline leads |
| R2 | Sequence model learns reporting intensity rather than activity pattern | 4 | 5 | 4 | 80 | performance collapses on source-volume stress; anomaly tracks domain count | source-density features; duplicate control; causal masking; source-stratified tests | flag `REPORTING_BIAS`; remove threat/relevance language; show baseline and degraded mode |
| R3 | Concept or ontology drift | 4 | 4 | 4 | 64 | PSI/MMD shift, unknown-token rate, calibration loss, code-frequency shift | frozen temporal split; drift detectors; ontology version in frame | GATE output; use rolling calibration only in follow-on, not on frozen test |
| R4 | GNN memory/latency blow-up on hubs or large graphs | 4 | 4 | 2 | 32 | degree tail, OOM predictor, p95 latency, sampled-edge explosion | graph-size cap; relation-stratified sampling; sparse arrays; preflight memory estimate | reduce to qualified subgraph/small model; use node2vec/classical path |
| R5 | Entity-resolution false merge contaminates graph | 4 | 5 | 4 | 80 | false-merge rate, contradictory attributes, impossible temporal overlap | QID-disjoint benchmark; conservative threshold; candidate provenance; cannot-link rules | split entity; mark downstream scores contaminated; do not display affected predicted links as valid |
| R6 | Link-prediction leakage through inverse/duplicate/future edges | 3 | 5 | 5 | 75 | implausibly high MRR; leakage audit match | mandatory inverse/duplicate/time audit; official OGB evaluator; split hashes | BLOCK metric publication; rebuild split and rerun all affected models |
| R7 | Negative sampling creates an unrealistically easy test | 4 | 4 | 4 | 64 | random-negative AUCPR high but hard-negative result low | type-valid, time-valid, degree-aware hard negatives; report both regimes | headline hard-negative result; downgrade claims based only on random negatives |
| R8 | Fusion causes negative transfer or double-counts correlated evidence | 3 | 4 | 4 | 48 | fused CI overlaps or falls below best component; collinearity; calibration worsens | validation-fitted logistic fusion; regularization; ablation; paired test | choose best component on Pareto frontier; state no fusion benefit |
| R9 | MYCA agent loop, non-convergence, or runaway cost | 3 | 4 | 2 | 24 | round cap, repeated text, no score improvement, timeout | fixed roles; max two revisions; token/wall-time budget; no recursive agents | return `NOT_CONVERGED`; use last validated state or single-agent baseline |
| R10 | MYCA mode collapse: nominally different agents produce the same option | 4 | 3 | 3 | 36 | low embedding/structural diversity; identical assumptions | role-specific evidence questions; distinct objective weights; distinguishability term | show diversity failure; use deterministic template alternatives; do not claim pluralistic reasoning |
| R11 | Evidence laundering or LLM storytelling | 4 | 5 | 4 | 80 | unsupported atomic claims; sentence lacks source reference | structured-only input; claim parser; post-render evidence verifier; AVANI hard gate | BLOCK render; display structured result only; record failed sentence set |
| R12 | Prompt injection embedded in public text or scenario evidence | 3 | 5 | 3 | 45 | role/policy deviation; tool request originating from evidence | evidence quoted as untrusted data; schema extraction before LM; tool calls through allowlist | terminate agent round; use sanitized structured evidence; preserve injection sample |
| R13 | Goodhart's law / metric gaming | 4 | 5 | 5 | 100 | target metric rises while calibration, stress, or human usefulness falls | metric family with guardrails; frozen test; multiple review budgets; failure suite | reject configuration that fails guardrail even if headline metric improves |
| R14 | Multiple comparisons and selective reporting | 3 | 4 | 4 | 48 | many unregistered runs; only best seed shown | preregistered seeds/configs; complete run index; multiplicity correction | report all frozen runs; label exploratory result; no post hoc headline change |
| R15 | Human-rater inconsistency for Task 8/product usefulness | 4 | 3 | 3 | 36 | low weighted kappa/ICC; rubric drift | anchored rubric; blind randomized product order; rater training | report disagreement; avoid aggregate quality claim below reliability threshold |
| R16 | Quantization changes calibration or rank order | 3 | 4 | 3 | 36 | \(\Delta ECE\), Kendall \(\tau\), rare-class recall decline | separate model card; calibration split; rank and rare-class tests | use full precision or small model; never inherit reference metrics |
| R17 | Cross-platform nondeterminism undermines reproduction | 3 | 4 | 3 | 36 | hash mismatch, rank divergence, tolerance failure | platform-specific locks; deterministic kernels; canonical quantized artifact | report numerical tolerance; designate one reference platform; preserve second-platform result |
| R18 | Dataset-license or terms mismatch | 2 | 5 | 4 | 40 | missing or changed license record; prohibited intended use | admission predicate; archived terms; ACLED block; package audit | remove dataset and all descendants; rerun from admitted sources; disclose scope change |
| R19 | Test-set contamination from manual on-site tuning | 3 | 5 | 4 | 60 | code/config change after test exposure; repeated targeted runs | sealed package; read-only test; critical-change procedure; complete run log | invalidate affected test result; revert to reference package; label exploratory only |
| R20 | Map CRS/datum or source-age error | 3 | 4 | 2 | 24 | layer displacement, invalid bounds, stale timestamp | CRS validator; metadata; known-control points; age banner | BLOCK map export or remove affected layer; use deterministic fallback |
| R21 | UI rendering diverges from structured output | 3 | 5 | 3 | 45 | displayed number/entity absent or rounded incorrectly | snapshot tests; evidence verifier; render from typed object only | show JSON/worksheet directly; invalidate visual artifact |
| R22 | Thermal throttling biases speed comparison | 4 | 3 | 2 | clock drop, temperature warning, latency drift by run order | fixed power mode; warmups; randomized/interleaved order; cooldown rule | report affected run; repeat under fixed protocol; preserve both reports |
| R23 | Small test sample yields unstable interaction conclusion | 4 | 4 | 4 | wide paired CI; sign changes under bootstrap | sample-size planning; paired units; report interval and minimum effect | state inconclusive; no fusion superiority claim |
| R24 | Synthetic stress cases are mistaken for real operational validation | 2 | 5 | 3 | unlabeled synthetic artifact; mixed reporting | prominent synthetic labels; separate reports and directories | withdraw/mend artifact; restate claim as controlled test only |

Critical planning risks are R2, R5, R6, R11, and R13. Their controls must pass before the corresponding live claim is approved.

## 12.3 SSM/Mamba stability plan

### Failure mechanisms

- incompatible CUDA/PyTorch/extension versions;
- numerically unstable recurrence at long context;
- exploding gradients or precision loss;
- nondeterministic custom kernels;
- hidden memory growth from retained states;
- parameter count or sequence length exceeding the planned operating point.

### Monitors

At training step \(k\), record:

\[
\|\nabla_\theta\mathcal{L}_k\|_2,
\quad
\|h_k\|_2,
\quad
\max|h_k|,
\quad
\operatorname{isfinite}(\mathcal{L}_k),
\quad
M_{peak,k},
\quad
\text{samples/s}.
\]

Trigger conditions:

- any nonfinite loss or state;
- gradient norm above configured cap for three consecutive steps;
- validation NLL worsens for the patience window while train NLL improves sharply;
- memory slope remains positive across equal-length batches;
- reference and optimized kernels diverge above tolerance on a fixed fixture.

### Controls

- clip global gradient norm;
- maintain selected recurrence/state operations in FP32 or BF16 if FP16 is unstable;
- use learning-rate warmup and cosine/plateau schedule;
- test context lengths geometrically: \(2^{10},2^{12},2^{14},\ldots\);
- compare optimized selective scan against a reference calculation on small sequences;
- checkpoint only after validation and hash verification;
- qualify one known-compatible software stack and freeze it.

The large Task 12 model is removed from the live plan if it has any unresolved stability defect by 22 August.

## 12.4 GNN scaling and graph-quality plan

Let degree distribution have tail quantile \(d_{0.99}\). Preflight estimates sampled edges per batch:

\[
E_{batch}\le B\sum_{\ell=1}^{K}\prod_{j=1}^{\ell}f_j,
\]

where \(B\) is seed nodes and \(f_j\) fanout. The configured fanout must keep estimated memory under the 80% gate.

Scaling experiments vary \(|V|\), \(|E|\), relation count, and degree skew independently. The report plots latency and memory against actual sampled edges, not only total graph size.

Graph quality controls precede model quality:

\[
Q_G=w_1(1-\text{false_merge})+w_2(1-\text{invalid_edge})+w_3\text{provenance_coverage}+w_4\text{temporal_validity}.
\]

When \(Q_G<q_{min}\), link prediction is gated regardless of model confidence.

## 12.5 MYCA instability plan

### Loop detection

For normalized message embeddings \(z^{(k)}\), repetition score is

\[
R^{(k)}=\max_{j<k}\cos(z^{(k)},z^{(j)}).
\]

If \(R^{(k)}>0.98\) and no validator score improves by at least 0.01, the round is classified as repetitive. Two repetitive rounds stop the protocol.

### Mode-collapse detection

For candidate COA embeddings \(z_1,\ldots,z_n\), diversity is

\[
D=\frac{2}{n(n-1)}\sum_{i<j}(1-\cos(z_i,z_j)).
\]

A structural diversity score separately compares action, phasing, resource, and risk fields. Low semantic and structural diversity triggers `MODE_COLLAPSE`; the system may regenerate once with deterministic role-specific constraints, then falls back to templates.

### Unsupported-claim gate

Let \(C\) be atomic claims and \(R(c)\) the resolved evidence references. Evidence completeness is

\[
EC=\frac{|\{c\in C:|R(c)|>0\}|}{|C|}.
\]

For an analyst-facing synthesis, \(EC=1\) is required for factual claims. Normative recommendations may cite assumptions and constraints rather than observations, but they must be labeled.

## 12.6 Goodhart and evaluation-gaming controls

The demonstration never optimizes a single metric in isolation. For Task 12, model selection is constrained:

\[
\max AP@K
\]

subject to

\[
ECE\le e_{max},\quad
FPR_{stress}\le f_{max},\quad
L_{p95}\le L_{max},\quad
M_{peak}\le M_{max}.
\]

For Task 13:

\[
\max MRR
\]

subject to false-merge, per-relation macro score, calibration, and hard-negative performance. For Task 8, utility is invalid when any hard constraint fails. For Task 14, visual attractiveness cannot compensate for coordinate or provenance failure.

Additional controls:

- show performance at multiple review budgets;
- include calibration and stress metrics beside accuracy;
- publish all five seed results;
- maintain a complete run registry;
- use the same evaluator for baseline and primary model;
- separate exploratory from confirmatory runs;
- preregister minimum operational effect sizes.

## 12.7 Drift detection

For scalar/categorical feature distribution \(P\) in training and \(Q\) in current data, monitoring includes:

- population stability index;
- Jensen–Shannon divergence;
- maximum mean discrepancy for embeddings;
- unknown-category rate;
- missingness shift;
- calibration degradation.

For binned feature \(i\), PSI is

\[
PSI=\sum_i(Q_i-P_i)\log\frac{Q_i}{P_i}.
\]

No universal PSI threshold is treated as truth. Thresholds are fitted to known stable and shifted windows and stored in the model card. Drift may trigger GATE even when prediction confidence is high.

## 12.8 Risk burn-down gates

| Date | Required risk closure |
|---|---|
| 8 Aug | R1, R4, R9 architecture controls specified; R18 dataset admission rules approved; R13 metric guardrails defined |
| 15 Aug | R2/R3 stress data frozen; R5/R6/R7 leakage and entity tests pass; all licenses admitted |
| 22 Aug | R1 and R4 default configurations stable on both laptops or fallback designated; R17 determinism tolerance recorded |
| 29 Aug | R8 fusion ablation complete; R9–R12 MYCA controls pass; UI evidence verification passes |
| 2–4 Sep | R15 human rubric rehearsal; R20/R21 map/UI checks; R22 thermal repetition; full underperformance drill |
| 5 Sep | no critical open risk for a live claim; residual risks in briefing and model cards |

A critical open risk does not block the entire event. It blocks only the affected claim or task and activates the planned fallback.

## 12.9 Residual-risk statement template

Every task's final card contains:

```text
Residual risk:
The model remains vulnerable to [condition]. The most sensitive indicator is [metric].
The system mitigates this by [control], and AVANI will [PASS/GATE/BLOCK] when
[explicit threshold]. This demonstration does not validate performance outside
[dataset/time/graph/scenario boundary].
```

This statement is presented with the strongest result, not buried in an appendix.

---
<a id="august-8-checklist"></a>
# Part 8 — 8 August design-document checklist

# 13. Per-task design-document template and completion gate

## 13.1 Required document set

By 8 August, the repository must contain:

```text
docs/design/
├── 00_system_role_and_evidence_contract.md
├── 01_task12_pattern_analysis.md
├── 02_task13_link_analysis.md
├── 03_task8_coa_gated.md
├── 04_task14_map_fallback.md
├── 05_interaction_and_ablation.md
├── 06_dataset_license_and_split_register.md
├── 07_compute_and_offline_profile.md
├── 08_evaluation_and_statistics.md
├── 09_failure_modes_and_adversarial_tests.md
└── 10_reproduction_and_usb_plan.md
```

Task 8 may be marked `GATED`, but its decision criteria must be complete. Task 14 must be sufficiently specified to serve as the deterministic fallback.

## 13.2 Per-task design-document template

Each task document uses the following structure.

### A. Control block

```yaml
document_id: ITDX26-TASK-XX-DESIGN
version: 1.0
classification: UNCLASSIFIED
owner: Morgan
engineering_owner: TBD
status: DRAFT|REVIEWED|APPROVED|GATED|DROPPED
code_target_sha: null
data_manifest_ids: []
model_card_ids: []
last_reviewed_utc: null
```

### B. Task and doctrine

- exact ITDX26 task label;
- doctrinal sources and section/page index;
- analyst problem statement;
- required fields in the analyst product;
- decisions the product may support;
- decisions the system is not authorized to make.

### C. Input contract

- typed schema;
- units, coordinate reference, time semantics, ontology versions;
- quality and missingness fields;
- provenance and license fields;
- maximum/minimum live scale;
- rejection rules;
- example valid and invalid records.

### D. Output contract

- typed result schema;
- observed versus inferred status;
- calibrated probability/uncertainty fields;
- evidence references;
- governance disposition;
- human-review controls;
- render template;
- example result with synthetic values visibly labeled.

### E. Architecture

- block diagram;
- baseline path;
- primary model path;
- layer count, width, state/embedding dimensions, heads, decoder, and parameter-count target;
- deterministic and stochastic components;
- feature handoff to/from other tasks;
- platform fallback.

### F. Mathematics

- state and observation definitions;
- losses and weighting;
- inference score;
- calibration method;
- threshold selection;
- computational complexity;
- convergence or stopping rule;
- explicit assumptions.

### G. Data and splits

- admitted datasets and license decisions;
- raw/processed hashes when available;
- temporal, entity, edge, scenario, or geographic split;
- calibration partition;
- leakage checks;
- stress-test set;
- package-byte budget.

### H. Baselines

For each baseline:

- mathematical definition;
- implementation package/version;
- exact input features;
- hyperparameter selection procedure;
- identical test units and evaluator;
- compute budget;
- conditions where the baseline should win.

### I. Metrics and statistics

- primary quality metric;
- guardrail metrics;
- system metrics;
- minimum operational effect size;
- five seeds;
- confidence-interval unit;
- paired test;
- multiplicity policy;
- human-rating protocol where applicable.

### J. Failure modes

At least five task-specific failures, each with:

- root cause;
- adversarial test;
- detection metric;
- AVANI response;
- analyst-visible warning;
- fallback;
- residual risk.

### K. Compute and deployment

- target machine profile;
- cold/warm latency target;
- memory gate;
- precision/quantization;
- training/adaptation hours;
- offline files required;
- cold-start sequence;
- CPU-safe path.

### L. Reproducibility

- canonical CLI command;
- seed;
- code/data/model/environment hashes;
- expected artifacts;
- comparison tolerance;
- second-operator reproduction steps;
- package-seal dependencies.

### M. Acceptance gate

A table of binary gates:

| Gate | Pass criterion | Evidence artifact | Status |
|---|---|---|---|
| schema | valid/invalid fixtures pass | test report | TBD |
| data | license, hash, split, leakage pass | data audit | TBD |
| baseline | completes on both profiles or designated reference profile | run report | TBD |
| primary | meets minimum quality and stability threshold | qualification report | TBD |
| calibration | guardrail below threshold | reliability report | TBD |
| stress | no unresolved critical failure | stress index | TBD |
| offline | zero external calls | offline audit | TBD |
| reproduction | second operator completes | reproduction receipt | TBD |

A task with any unresolved critical gate is `GATED` or `DROPPED`, never “mostly complete.”

## 13.3 Task 12 design gate

The Task 12 document is complete when:

- the GDELT NMF profile is fixed;
- the AOR and time window are defined without using test performance;
- the temporal train/validation/calibration/test split is immutable;
- controlled injection motifs and natural-candidate adjudication are separated;
- seasonal/count and transformer baselines are specified;
- small/medium/large model cards have exact parameter-count scripts;
- anomaly components and calibration method are fixed;
- review budgets \(K\) are preregistered;
- reporting-bias, clock-drift, ontology-drift, missing-geography, and novel-actor tests exist;
- the expected Pattern Analysis Worksheet is rendered from a typed fixture;
- no sentence can bypass evidence verification;
- one end-to-end synthetic fixture completes offline.

**Task 12 go/no-go threshold for continued implementation:** the small reference model and classical baseline must train/evaluate on the development split without nonfinite values, and the full data path must preserve row-level provenance.

## 13.4 Task 13 design gate

The Task 13 document is complete when:

- the entity and relation ontology is fixed;
- entity-resolution candidates, features, thresholds, and cannot-link rules are defined;
- observed and predicted edges have separate schemas and symbology;
- OGB choice and license are recorded;
- Wikidata QID-disjoint entity split and edge leakage audit are specified;
- PageRank, Louvain, node2vec, and GNN comparators use identical held-out units;
- negative sampling includes type-valid hard negatives;
- false-merge rate is a hard guardrail;
- MRR/Hits@K and AUCPR contexts are not conflated;
- hub scaling and memory caps are defined;
- one source-to-link provenance trace renders offline.

**Task 13 go/no-go threshold:** inverse-edge and duplicate leakage checks must return zero on a known trap fixture, and the small GNN must fit the live graph profile with the 20% memory reserve.

## 13.5 Task 8 design gate

The Task 8 document is complete when:

- the scenario is fictional, unclassified, and bounded to humanitarian/infrastructure restoration or another approved non-targeting context;
- role definitions, allowed evidence, and tool permissions are fixed;
- the FASDC rubric has item-level source references and hard gates;
- the proposal–critique–revision protocol has a maximum of two revisions;
- the consensus rule, disagreement state, and timeout state are explicit;
- template/rule and single-agent baselines are complete;
- unsupported-claim and evidence-link validators are implemented in design;
- mode-collapse and prompt-injection tests are specified;
- the human-rating rubric and inter-rater reliability threshold are set;
- the system cannot auto-execute or auto-select an operational option.

**Task 8 August 22 live gate:** zero hard-policy violations across the frozen scenario set; evidence completeness 100% for factual claims; at least three structurally distinguishable candidates when the scenario permits them; no loop beyond the round cap; and end-to-end latency below the hard cap. Failure activates Task 14.

## 13.6 Task 14 design gate

The Task 14 document is complete when:

- the admitted OSM/USGS/NASA layers and attribution are fixed;
- target CRS, scale, extent, and vertical datum are specified;
- mixed-CRS and stale-layer tests exist;
- required map fields and symbology are defined;
- label-placement objective and deterministic tie breaking are fixed;
- Task 12/13 overlay contracts are specified;
- the core pipeline has zero learned parameters;
- PNG, HTML, and machine-readable layer-manifest exports work offline.

**Task 14 go/no-go threshold:** the same input produces the same canonical layer manifest and artifact hash on repeated runs on the reference platform, with cross-platform visual tolerance documented.

## 13.7 Interaction-study design gate

The interaction document must specify:

- exact NLM-to-FUSARIUM feature contract;
- fitting data for fusion weights, distinct from test;
- sequence-only, graph-only, and fused conditions;
- paired test unit and minimum meaningful effect;
- added latency/memory calculation;
- disagreement handling;
- MYCA evidence schema and transcript;
- no-advantage outcome language.

The interaction claim is approved only if the fused or orchestrated system improves a preregistered quality measure without violating calibration, latency, memory, or evidence-completeness guardrails. Otherwise the conclusion is that interaction added no demonstrated value under the tested conditions.

## 13.8 Cross-document review rubric

Reviewers score each dimension 0–2:

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| mathematical completeness | essential formalism absent | present but ambiguous | variables, losses, inference, and assumptions complete |
| data defensibility | source/license/split unclear | partial records | admitted, hashed, split, leakage-tested |
| baseline fairness | incomparable or weak | partially matched | same data, metrics, hardware, and budget |
| uncertainty | absent | confidence without calibration | calibration, coverage, limitations, degraded state |
| provenance | screenshots or prose only | product-level source list | claim-level evidence and lineage |
| failure analysis | generic | failure list only | adversarial tests, indicators, mitigation, stop rule |
| compute realism | no budget | target only | profiled budget, memory gate, fallback |
| reproducibility | manual steps | partial command | one command, locks, hashes, second operator |
| analyst usefulness | model-centric | product present | doctrinal fields, inspectability, disposition control |
| scope discipline | overclaiming | caveats inconsistent | claim labels and non-responsibilities explicit |

Each primary task requires at least 17/20, with no zero, to enter implementation. Task 8 requires at least 18/20 because generative risk is higher.

## 13.9 8 August deliverable checklist

### Scope and naming

- [ ] Every system-name occurrence uses **MYCA** exactly.
- [ ] NLM means Nature Learning Model.
- [ ] No required hardware appears in the ITDX26 demo path.
- [ ] All content is UNCLASSIFIED and public-data based.
- [ ] Mycosoft is described as self-performing the demonstration.
- [ ] Every performance number is labeled target, budget, or measured.

### Science and mathematics

- [ ] State-space, graph, MYCA, and AVANI formalism reviewed.
- [ ] Composite losses and inference equations have defined variables.
- [ ] Deterministic and stochastic rails are separated.
- [ ] Calibration and uncertainty methods are specified.
- [ ] Falsification conditions are stated.
- [ ] Algorithm baselines receive equal mathematical treatment.

### Data

- [ ] Dataset admission predicate and manifest schema approved.
- [ ] ACLED default exclusion implemented.
- [ ] GDELT article-body restriction respected.
- [ ] OSM attribution and ODbL record prepared.
- [ ] OGB dataset and official evaluator selected.
- [ ] Wikidata QID/entity split specified.
- [ ] Common Crawl is absent or metadata/rights-filtered.
- [ ] Doctrine index and public-release records included.

### Engineering

- [ ] Repository tree exists.
- [ ] Candidate dependency locks install offline.
- [ ] NMF/task/run-report schemas compile.
- [ ] Seed and determinism initializer implemented.
- [ ] `make doctor`, `make demo`, and `make verify-package` interfaces exist.
- [ ] Unit/integration/determinism test inventory assigned.
- [ ] Both machine profiles have a qualification plan.

### Evaluation

- [ ] Five seeds preregistered.
- [ ] Primary and guardrail metrics fixed.
- [ ] Paired test and bootstrap unit fixed.
- [ ] Minimum operational effects fixed.
- [ ] Human-rating rubric fixed where needed.
- [ ] Pareto measurement protocol fixed.
- [ ] Underperformance script rehearsable.

### Presentation

- [ ] Architecture figures numbered and sourced.
- [ ] Each task has a one-page analyst product mockup.
- [ ] Live/prerecorded/static state is visible.
- [ ] Evidence, uncertainty, governance, and performance appear together.
- [ ] Calendar uses the correct 2026 weekdays.
- [ ] No unsupported marketing superlative appears as a measured claim.

## 13.10 Definition of done for the design phase

The 8 August design phase is done when a competent engineer who did not author the plan can answer, without oral clarification:

1. what exact data enter each task;
2. what mathematical transformation occurs;
3. what structured object comes out;
4. how it is calibrated and governed;
5. which baseline is run on the same data;
6. how success and failure are measured;
7. how the task fails safely;
8. how to run it offline;
9. how to reproduce it from hashes and locks;
10. what the September demonstration may and may not claim.

If any answer depends on “Morgan will explain it live,” the design is incomplete.

---

# Part 9 — DIRTNet decentralized-edge algorithm study

<a id="dirtnet-study"></a>
# 14. DIRTNet algorithm-only demonstration

## 14.1 Purpose and Army-facing relevance

DIRTNet is a cross-cutting experiment, not a fifth doctrinal task. It addresses the four ICED assessment elements directly:

1. whether local and federated algorithms preserve Task 12/13 quality;
2. where partitions, bandwidth constraints, stale models, and compromised nodes cause failure;
3. how NLM, graph analytics, MYCA, AVANI, MINDEX, and transport algorithms interact;
4. how much latency, memory, network traffic, and availability change under decentralized execution.

The demonstration thesis is:

> An AI-analyst architecture should not require every raw observation to traverse a reliable broadband link before becoming useful. Edge nodes can produce calibrated, signed, compact analytic objects locally, remain useful during disconnection, and later converge through cryptographically verifiable synchronization.

![Figure 18. DIRTNet virtual-edge emulator for ITDX26.](graphics/fig18_itdx_dirtnet_algorithm_emulator.png)

## 14.2 Virtual-node topology

The reference topology uses four local processes or containers:

| Virtual node | Local data and algorithm | Primary output |
|---|---|---|
| `edge-pattern-a` | northern or early-time event shard; Task 12 small SSM | anomaly events, temporal embeddings, local patterns |
| `edge-link-b` | southern or graph shard; Task 13 small GNN | entities, links, communities, link uncertainty |
| `edge-sensing-c` | replayed BlueSight/SINE/GANDHA/FCI feature windows | multimodal events and evidence handles |
| `field-gateway` | Mycorrhizae, MINDEX checkpoint, AVANI edge policy, anti-entropy | reconciled evidence graph and federated checkpoint |

MYCA operates as a distributed analyst over the node outputs. FUSARIUM/CREP renders the network state, patterns, links, map layers, and audit objects.

## 14.3 Transport emulator

Each directed link has profile

\[
\lambda_{ij}=(R_{ij},L_{ij},p_{ij},d_{ij},h_{ij},c_{ij}),
\]

where \(R\) is bitrate, \(L\) delay, \(p\) loss, \(d\) duty-cycle budget, \(h\) hop limit, and \(c\) cost. The emulator enforces queueing, delay, loss, fragmentation, retry, and partition schedules.

Recommended nominal profiles are stored in `dirtnet_itdx26_emulator_example.yaml`. They are controlled abstractions, not claims of exact radio-channel fidelity.

### Required profiles

- LoRa-like low-rate, low-duty-cycle direct link;
- LoRaWAN-like gateway path with uplink scheduling;
- Meshtastic-like low-rate, multi-hop mesh;
- Wi-Fi/Ethernet high-bandwidth sync contact;
- complete partition;
- asymmetric link and delayed acknowledgment.

## 14.4 Signed message and identity contract

The DIRTNet message must validate:

1. schema/version;
2. node identity and key status;
3. sequence and replay window;
4. content hash;
5. signature;
6. time and uncertainty;
7. calibration and quality;
8. routing TTL/hop constraints;
9. data scope/classification;
10. prior hash and epoch reference.

A dedupe identity is

\[
d(m)=H(node\_id\Vert sequence\Vert content\_hash).
\]

Repeated delivery refreshes acknowledgment state but cannot create a duplicate observation.

## 14.5 Merkle checkpoint and anti-entropy algorithm

Each node batches ordered record hashes into an epoch tree and publishes a signed root. The gateway forms

\[
R_e=H(e\Vert R_{e-1}\Vert MerkleRoot(H(i_1\Vert R_{i_1,e}),\ldots,H(i_q\Vert R_{i_q,e}))\Vert H(\Pi_e)).
\]

Synchronization proceeds:

```text
exchange signed manifests
  -> compare node/stream epoch ranges and roots
  -> if root equal: acknowledge, no payload transfer
  -> if root differs: descend Merkle ranges or request missing sequence ranges
  -> verify content hash and node signature
  -> reject replay/forgery/stale command
  -> merge immutable records by identity
  -> retain explicit branches/conflicts
  -> create new federated checkpoint
```

The expected reconciliation transfer for sparse differences is substantially smaller than full log transfer. The measured metric is bytes transferred to reach an identical admissible record set.

![Figure 12. DIRTNet cryptographic provenance and Bitcoin-derived mapping.](graphics/fig12_dirtnet_cryptographic_provenance.png)

## 14.6 Bandwidth-aware event selection

Each queued object receives score

\[
S_m=\frac{\alpha U_m+\beta V_m+\gamma N_m+\delta Q_m+\epsilon F_m+\zeta D_m}
{b_m+\lambda_a a_m+\lambda_e e_m},
\]

where \(b_m\) is bytes, \(a_m\) airtime, \(e_m\) energy proxy, and the numerator represents urgency, decision value, novelty, quality, freshness, and evidence diversity.

Under a constrained contact budget \(B\), choose

\[
\max_{x_m\in\{0,1\}}\sum_m x_m(\alpha U_m+\beta V_m+\gamma N_m+\delta Q_m+\epsilon F_m+\zeta D_m)
\]

subject to

\[
\sum_m x_m b_m\le B,
\]

with hard inclusion for mandatory critical alerts and governance records. This becomes a knapsack or online scheduling problem with age and expiry.

## 14.7 Decentralized Task 12

Each pattern node runs the Task 12 streaming recurrence on a local shard. It publishes:

- compact event embedding;
- calibrated anomaly score;
- changepoint score;
- candidate cluster summary;
- evidence quality and source diversity;
- content address for selected raw records;
- signed local epoch root.

The gateway performs global candidate fusion without requiring all raw events:

\[
A(C)=\sum_i w_iA_i(C_i)+\lambda_{cross}\sum_{i<j}Sim(C_i,C_j)-\lambda_uU(C).
\]

Raw records are requested only for adjudication, calibration, or analyst review.

## 14.8 Decentralized Task 13

Each graph node owns or caches a subgraph. Cross-partition boundary nodes are exchanged as signed summaries. The global graph preserves observed, inferred, and unresolved identity separately.

For cross-shard link \((u,r,v)\):

\[
p(u,r,v)=\sigma\left(
\alpha s_{local}(u,r,v)+
\beta s_{remote}(u,r,v)+
\gamma s_{temporal}(u,v)-
\delta U_{identity}-
\rho U_{source}
\right).
\]

No predicted edge is committed as observed. Edge provenance references all contributing roots.

## 14.9 Distributed MYCA and Task 8

MYCA assigns agents according to data locality and link condition. An edge agent may prepare a local pattern interpretation while a gateway agent integrates cross-node evidence. Candidate COAs can be generated under partial information, but their evidence-completeness score must expose which nodes or epochs were unavailable.

For proposal \(c\):

\[
EComp(c)=\frac{\sum_k w_k\mathbf{1}[claim_k\ has\ verified\ evidence]}{\sum_k w_k},
\]

and AVANI may require review or defer selection when unavailable partitions could materially change the ranking.

## 14.10 BlueSight, SINE, GANDHA, and FCI replay

The emulator includes compact prerecorded or synthetic feature streams:

- **BlueSight:** detections, masks, tracks, depth, motion/presence, scene embeddings;
- **SINE:** deterministic DSP, acoustic fingerprints, domain/OOD state, selected raw-window references;
- **GANDHA:** compensated VOC/VSC/gas/particle signatures and novelty;
- **FCI:** artifact-controlled bioelectric windows, motifs, and controlled-stimulus metadata.

SINE semantic labels remain `PENDING` when model/prototype evidence is absent. This is part of the evaluation, not a UI defect.

![Figure 14. DIRTNet multisensory edge stack.](graphics/fig14_dirtnet_multisensory_edge_stack.png)

## 14.11 Experimental conditions

| Condition | Description |
|---|---|
| C0 Centralized | all raw records transferred to one process before inference |
| C1 Isolated edge | local inference; no cross-node synchronization |
| C2 DIRTNet events | signed compact events, priority routing, Merkle sync |
| C3 DIRTNet federation | C2 plus prototype/model-delta exchange and robust aggregation |

Required paired comparisons are C2–C0, C2–C1, and C3–C2.

## 14.12 Fault and adversarial matrix

| Test | Injection | Expected behavior |
|---|---|---|
| six-hour partition | no inter-node contact | local detection continues; queues grow within policy |
| duplicate replay | resend valid old messages | dedupe/replay gate rejects duplicate state creation |
| forged signature | alter content/signature | message quarantined; no fusion |
| cloned sequence | same node/sequence, different content | equivocation alert and node quarantine |
| stale model | one node misses update | version mismatch visible; output uncertainty/compatibility gate |
| poisoned model delta | adversarial local update | clipping/robust aggregation/held-out validation rejects |
| gateway failure | remove gateway | local operation continues; optional mobile relay assumes bounded role |
| bandwidth collapse | reduce capacity by 90% | priority scheduler sends critical compact events first |
| clock spoof | offset one node | observation uncertainty rises; HLC preserves causal receipt order |
| contradictory sensors | incompatible local evidence | retain competing branches; no silent averaging into certainty |

## 14.13 Metrics

Quality:

- Task 12 precision, recall, F1, nDCG, calibration, time-to-detection;
- Task 13 MRR, Hits@K, AUROC/AP, entity-resolution F1;
- Task 8 evidence coverage, FASDC rubric, unsupported-claim rate.

Network and resilience:

- time-to-first alert;
- bytes and airtime proxy;
- percentage of useful local capability retained during partition;
- queue loss by priority;
- reconciliation convergence time;
- duplicate suppression;
- signature/forgery rejection;
- Merkle inclusion-proof success and latency;
- checkpoint divergence and recovery.

Learning:

- local/global performance;
- model divergence;
- update bytes;
- robustness to one malicious update;
- calibration before/after federation.

## 14.14 Hypotheses and acceptance thresholds

The hypotheses are directional, not promised results:

- H1: C2 reduces bytes substantially versus C0 while maintaining Task 12/13 quality within a predeclared non-inferiority margin.
- H2: C2 lowers time-to-alert under constrained links.
- H3: C2 remains operational during partitions where C0 cannot receive new evidence.
- H4: Merkle reconciliation converges with zero silent record loss on the reference fault suite.
- H5: C3 improves cross-node generalization over C2 without increasing calibration error beyond tolerance.

Minimum engineering acceptance:

- 100% rejection of the scripted forged-signature batch;
- 100% verification of valid inclusion proofs;
- zero duplicate analytic objects after replay batch;
- deterministic convergence of admissible logs after partition repair;
- no unauthorized command/action accepted;
- full run report with code, data, model, policy, node-manifest, and checkpoint hashes.

## 14.15 NatureOS and FUSARIUM surfaces

The demo mentions customer platforms lightly but concretely:

- **NatureOS** is the civilian/scientific surface for device networks, NLM training, Earth simulation, research workflows, APIs, and reproducible datasets.
- **FUSARIUM/CREP** is the defense surface for mission context, patterns, links, maps, alerts, chain of custody, and analyst products.

Both consume the same signed evidence roots under different access, classification, retention, and workflow policies.

![Figure 16. DIRTNet's shared edge fabric presented through NatureOS and FUSARIUM.](graphics/fig16_dirtnet_platform_surfaces.png)

## 14.16 NVIDIA physical-AI context

NVIDIA announced Cosmos 3 Edge on 15 July 2026, a 4-billion-parameter on-device model for visual reasoning and robot action on Jetson, including T2000 and T3000 modules. NVIDIA announced a national physical-AI infrastructure initiative in Japan on 16 July 2026 for multimodal foundation models, agents, digital twins, robotics, and physical-AI applications.

Mycosoft should cite this as market validation, not claim equivalence. DIRTNet can integrate Cosmos/Metropolis/Isaac/GR00T modules on high-tier nodes, especially for BlueSight or mobile robot action. NLM remains the signal-state and Earth-system core; DIRTNet remains the partition-tolerant distributed sensing/data-center fabric; MINDEX remains the evidence and lineage layer.

![Figure 17. Complementarity between NVIDIA physical-AI modules and Mycosoft NLM/DIRTNet.](graphics/fig17_nvidia_physical_ai_interoperability.png)

## 14.17 Reproducibility

Command:

```bash
make demo TASK=dirtnet SCENARIO=alpha SEED=17 PROFILE=small OFFLINE=1
```

Required artifacts:

```text
runs/<run_id>/
  run_report.json
  node_manifests/
  signed_messages/
  sync_manifests/
  epoch_checkpoints/
  merkle_proofs/
  network_trace.parquet
  queue_trace.parquet
  model_inventory.json
  task12_metrics.json
  task13_metrics.json
  coa_metrics.json
  failure_audit.json
  rendered_network.png
  rendered_crep_product.png
```

## 14.18 Scope boundary

The emulator demonstrates algorithms for distributed edge coordination. It does not prove RF performance, field durability, sensor calibration, battery endurance, secure-element resistance, biological semantic decoding, or operational military suitability. Those require hardware and field trials outside ITDX26.

---

<a id="references"></a>
# 15. Reference register

## 15.1 Scope and doctrine

- **[D1]** U.S. Army, ITDX26 Special Notice, solicitation **W91RUSI-FCID260001**, including the 16 focus-area intelligence tasks and four essential elements of analysis. Public SAM.gov opportunity record archived in the package.
- **[D2]** U.S. Department of the Army, **ATP 2-33.4, Intelligence Analysis**, public release used for analytic techniques including pattern and link analysis.
- **[D3]** U.S. Department of the Army, **FM 2-0, Intelligence**, public release used for intelligence-process and product context.
- **[D4]** U.S. Department of the Army, **ATP 2-01.3, Intelligence Preparation of the Operational Environment**, public release used for geospatial and operational-environment products.
- **[D5]** U.S. Department of the Army, **ATP 2-01, Plan Requirements and Assess Collection**, public release used for collection-planning context.
- **[D6]** U.S. Department of the Army, **FM 5-0, Planning and Orders Production**, public release used for course-of-action development and FASDC screening.
- **[D7]** Joint Chiefs of Staff, **JP 2-0, Joint Intelligence**, public release used for joint intelligence context.
- **[SCOPE1]** Mycosoft, `00_BINDER_ITDX26_ChatGPT_Handoff.md`, 16 July 2026.
- **[SCOPE2]** Mycosoft, `02_action_plan.md`, 16 July 2026.
- **[SCOPE3]** Mycosoft, `03_sources_framework.md`, 16 July 2026.
- **[SCOPE4]** Mycosoft, `04_time_schedule.md`, corrected in this plan to the actual September 2026 weekdays.
- **[SCOPE5]** Mycosoft, `05_proposal_what_we_demonstrate.md`, 16 July 2026.
- **[SCOPE6]** Mycosoft, `06_chatgpt_handoff_prompt.md`, 16 July 2026.

## 15.2 Mathematical and algorithmic references

- **[M1]** Albert Gu and Tri Dao, “Mamba: Linear-Time Sequence Modeling with Selective State Spaces,” arXiv:2312.00752, 2023.
- **[M2]** Tri Dao and Albert Gu, “Transformers are SSMs: Generalized Models and Efficient Algorithms Through Structured State Space Duality,” arXiv:2405.21060, 2024.
- **[M3]** William L. Hamilton, Rex Ying, and Jure Leskovec, “Inductive Representation Learning on Large Graphs,” NeurIPS, 2017.
- **[M4]** Petar Veličković et al., “Graph Attention Networks,” ICLR, 2018.
- **[M5]** Aditya Grover and Jure Leskovec, “node2vec: Scalable Feature Learning for Networks,” KDD, 2016.
- **[M6]** Vincent D. Blondel et al., “Fast Unfolding of Communities in Large Networks,” Journal of Statistical Mechanics, 2008.
- **[M7]** Lawrence Page, Sergey Brin, Rajeev Motwani, and Terry Winograd, “The PageRank Citation Ranking: Bringing Order to the Web,” Stanford technical report, 1999.
- **[M8]** Glenn Shafer and Vladimir Vovk, *A Tutorial on Conformal Prediction*, Journal of Machine Learning Research, 2008; and current implementation guidance archived with the code.
- **[M9]** Aaron van den Oord, Yazhe Li, and Oriol Vinyals, “Representation Learning with Contrastive Predictive Coding,” arXiv:1807.03748, 2018.
- **[M10]** Michael Schlichtkrull et al., “Modeling Relational Data with Graph Convolutional Networks,” ESWC, 2018.
- **[M11]** Chuan Guo et al., “On Calibration of Modern Neural Networks,” ICML, 2017.
- **[M12]** Glenn W. Brier, “Verification of Forecasts Expressed in Terms of Probability,” Monthly Weather Review, 1950.
- **[M13]** Leo Breiman, “Random Forests,” Machine Learning, 2001, where used as a classical tabular comparator.
- **[M14]** Yarin Gal and Zoubin Ghahramani, “Dropout as a Bayesian Approximation,” ICML, 2016, where stochastic dropout uncertainty is evaluated.
- **[M15]** Satoshi Nakamoto, “Bitcoin: A Peer-to-Peer Electronic Cash System,” 2008. Used only for peer-node, signature, hash-chain, Merkle-tree, best-effort-network, and compact-proof design patterns; routine DIRTNet does not use proof-of-work.
- **[M16]** NVIDIA, “Japan's Robotics and Manufacturing Leaders Build on NVIDIA Cosmos to Advance Physical AI Frontier,” 15 July 2026.
- **[M17]** NVIDIA, “Japan Government, Industrial Leaders and NVIDIA Launch the World's First National AI Infrastructure,” 16 July 2026.

## 15.3 Dataset and licensing references

- **[DATA1]** GDELT Project, GDELT 2.1 event data and documentation, https://www.gdeltproject.org/. Current terms and acquisition receipt archived per dataset manifest.
- **[DATA2]** Armed Conflict Location & Event Data Project, current Terms of Use and licensing materials, https://acleddata.com/terms-of-use/. Excluded from the default package unless written authorization is archived.
- **[DATA3]** OpenStreetMap contributors, Open Database License and copyright/attribution guidance, https://www.openstreetmap.org/copyright.
- **[DATA4]** U.S. Geological Survey data and product metadata, https://www.usgs.gov/; product-specific notices control.
- **[DATA5]** NASA Earthdata, data-use and citation guidance plus product-specific metadata, https://www.earthdata.nasa.gov/.
- **[DATA6]** Stanford Network Analysis Project datasets, https://snap.stanford.edu/data/; individual dataset terms control.
- **[DATA7]** Weihua Hu et al., “Open Graph Benchmark: Datasets for Machine Learning on Graphs,” NeurIPS, 2020; official data and evaluator at https://ogb.stanford.edu/.
- **[DATA8]** Wikidata, CC0 public-domain dedication and frozen dump metadata, https://www.wikidata.org/wiki/Wikidata:Licensing.
- **[DATA9]** Common Crawl terms and data documentation, https://commoncrawl.org/terms-of-use; underlying content rights remain source-specific.
- **[DATA10]** Public U.S. Army/Joint doctrine and public training exemplars admitted through package records.
- **[DATA11]** Mycosoft, `NLM_Training_Data_Catalog.pdf`, April/July 2026 versions; dataset candidates require independent license verification before admission.

## 15.4 Mycosoft architecture references

- **[NLM1]** Mycosoft, `NLM_Nature_Learning_Model_Public_Technical_Article.pdf`, v0.1, May 2026 / uploaded July 2026. Signal-native thesis, NMF, hybrid backbone, deterministic/stochastic modes, objectives, benchmarks, and risks.
- **[NLM2]** Mycosoft, `mycosoft_nlm_narrative (1).pdf`, “The One Story,” 25 June 2026. Narrative system positioning; technical claims remain subject to the evidence labels in this plan.
- **[NLM3]** Mycosoft, `NLM_Training_Data_Catalog.pdf`. Maritime/acoustic source catalog and priority stack.
- **[SYS1]** Mycosoft, `MYCA Autonomous Scientific Architecture (2026).pdf`. Multi-agent orchestration, tools, memory, physical-system integration, and control concepts.
- **[SYS2]** Mycosoft, `FUSARIUM_Architecture_Document.pdf`. Environmental-intelligence system architecture and NLM/FUSARIUM/MINDEX/AVANI relationships.
- **[SYS3]** Mycosoft, `FUSARIUM_Backend_Documentation.pdf`. API, sensor-fusion, graph, NLM bridge, provenance, and platform interfaces.
- **[SYS4]** Mycosoft, `Mycosoft_Prime_Capability_Document.pdf`. System-role and capability overview.
- **[SYS5]** Mycosoft, `MYCA_Grounded_Cognition_Upgrade_Plan.docx`. State-first cognition, experience packet, temporal/spatial engine, and NLM role.
- **[SYS6]** Mycosoft public documentation, https://mycosoft.com/docs and https://mycosoft.com/docs/ai/nlm, archived in the source package on the plan date.
- **[SYS7]** Mycosoft, DIRTNet public page, https://mycosoft.com/dirtnet, accessed 16 July 2026.
- **[SYS8]** Mycosoft, BlueSight, SINE, and GANDHA public sensing pages, accessed 16 July 2026.
- **[SYS9]** MycosoftLabs, public Mycorrhizae repository, README and protocol overview, accessed 16 July 2026.
- **[SYS10]** MycosoftLabs, public NLM repository, README and Merkle implementation, accessed 16 July 2026.
- **[SYS11]** Mycosoft, NatureOS, Defense, and FUSARIUM public pages, accessed 16 July 2026.

## 15.5 Reference-use rule

A reference supports only the claim it actually establishes. Mycosoft architecture documents establish intended design and naming; they do not, by themselves, establish measured performance. Dataset catalogs establish candidate availability; they do not replace license review. Canonical papers establish algorithms; they do not prove Mycosoft's implementation matches their performance. Only frozen run reports establish demonstration results.

---

# End of plan

**Controlled conclusion:** The Mycosoft ITDX26 demonstration is successful when it produces a traceable chain from public observation to calibrated model output, from model output to MYCA-coordinated hypothesis or option, from that hypothesis to AVANI governance, and from governance to a reproducible analyst product—while exposing the baseline, uncertainty, latency, memory, limitations, and failure conditions at every step.
