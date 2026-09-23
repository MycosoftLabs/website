---
title: FormSpace
subtitle: A mathematical framework for learning organization and emergent behavior
author: Mycosoft
version: 1.1 public review draft
lang: en-US
---

# Abstract

FormSpace is Mycosoft’s chart for the organized states of biological, physical, and artificial systems. A state on that chart is a place a system can occupy: what it maintains, where it returns after a disturbance, and which paths connect one organized condition to another. Growth, decay, rotation, and recovery already have a form. The chart gives those forms axes, units, and a comparison rule, so an experiment can tell a persistent pattern from sensor noise.

The Nature Learning Model writes the coordinates. It reads voltages, chemistry, pressure, heat, light, and motion through time, and it keeps a missing channel empty. A forest, a fungal colony, a coastline, or a machine mixes turbulence with organization that persists. Without the chart, the model is a detector in that variation. With the chart, each observation is a point, a trajectory, or an abstention.

In developmental biology, Michael Levin describes Platonic space as a structured set of possible forms. A living system ingresses one of those forms when its physical interface can reach it. The genome and the local physics set the interface. The form expressed is one that interface admits. Other groups study the same class of question in their own subjects. FormSpace is the environmental chart Mycosoft uses to measure it: coordinates from the Nature Learning Model, then perturbation, recovery, and replication to decide whether a point is kept.

FormSpace connects those coordinates to typed states, local geometry, transition models, candidate target regions, uncertainty, and evidence about interventions. The framework distinguishes a recurring cluster from a demonstrated attractor, an assigned objective from an inferred endogenous target, and a reachable outcome from one that is viable and authorized. Every state retains its subject, observer, chart, model, calibration, context, provenance, and support status so that a result can be inspected, compared, corrected, or rejected.

The scientific objective is to distinguish reproducible organization from incidental variation. A persistent pattern becomes useful only when it improves prediction or survives controlled tests. An attractor requires evidence about dynamics and return after perturbation. A target hypothesis requires comparison with passive, context-driven, and feedback alternatives. FormSpace therefore combines a versioned atlas with perturbation experiments, uncertainty estimation, explicit completion rules, and counterevidence preserved in MINDEX.

NLM supplies sensor-derived representations and predictions; FormSpace specifies how those representations are interpreted and tested; MYCA uses supported states and candidate futures to propose bounded actions; AVANI separates physical reachability from authority; and local controllers retain hard safety limits. This integration is an experimental and engineering contract, not a claim to have invented state spaces, attractors, feedback control, or the broader scientific study of organized systems.

The archived numerical reference was evaluated on synthetic environmental data. Those results establish neither biological target discovery nor real-world calibration, and they do not demonstrate superiority over competing world models. A deterministic worked example illustrates recovery, memory ablation, and stopping separately from the archived evaluation. FormSpace’s broader claims remain falsifiable research hypotheses to be tested against simpler models, held-out interventions, independent embodiments, and measured operational outcomes.

**Keywords:** FormSpace, Nature Learning Model, emergent behavior, dynamical systems, biological computing, sensor fusion, causal experimentation, embodied intelligence.

# 1 Purpose and contribution

An environmental system can change before any individual sensor crosses an alarm threshold. A biological network can preserve a function while changing its geometry. A software collective can recover from a missing component through a new division of work. In each case, the important object is an organized process unfolding over time, not merely a measurement or label.

FormSpace provides a common way to ask: What organization is present? Which outcomes are reachable? What persists under perturbation? What evidence would distinguish recovery, passive relaxation, and a change of target? What should an operator or autonomous system do next, and when should it stop?

The intended product is an inspectable state-and-decision record. It contains the subject, relevant observations, chart and model versions, uncertainty, candidate futures, and the evidence needed to support each conclusion. Such a record can support laboratory experiments, environmental monitoring, robot supervision, or distributed software management without assuming that all domains share one geometry.

The proposed contributions are:

1. A typed atlas connecting observations, organized states, local comparison rules, and evidence status.
2. An intervention-based workflow for testing attractors, recovery, memory, and candidate targets.
3. A navigation contract separating reachable, viable, and authorized outcomes, including completion and rollback.
4. A cross-embodiment research protocol for testing whether corresponding dynamics transfer between systems.
5. An evidence-preserving integration of NLM, MYCA, MINDEX, FCI, and AVANI, with bounded exploratory search through PSILO.

These are architectural and methodological contributions. Priority, patentability, and broad performance advantage have not been established by this consolidation. The useful test is whether the combined system improves prediction, experiment selection, or control over simpler alternatives at comparable cost.

# 2 Scientific motivation and scope

## 2.1 Organization beyond an assigned task

Research on xenobots showed that living constructs assembled from frog cells can exhibit coordinated behavior in unfamiliar configurations; later work demonstrated kinematic self-replication under particular laboratory conditions [1, 2]. These constructs use evolved cells, and computational design participated in the research. They are not evidence that biology was created without evolutionary history. They motivate a narrower question: which capabilities become accessible when competent components are arranged in a new embodiment?

Zhang, Goldstein, and Levin studied distributed versions of classical sorting algorithms, including damaged elements and mixtures of sorting policies. They reported temporary loss of sorting progress around defects and unexpected clustering by algorithm type [3]. These are behaviors of the complete specified dynamics even when the assigned objective does not explicitly name them. The engineering implication is to observe more than the primary task score.

Levin's TAME framework motivates operational comparisons of goal-directed capacities across different bodies and scales [4]. FormSpace adopts the experimental emphasis: perturb systems, measure outcomes, test alternative mechanisms, and avoid using verbal reports or superficial resemblance as sufficient evidence of agency.

## 2.2 The Platonic interpretation

The motivating philosophical conjecture is that reusable patterns of form and competence occupy a structured possibility space, and embodiments make some of those patterns accessible. Mycosoft translates this idea into measurable hypotheses about organization, constraints, recurrence, and transfer [S1, S3]. A “blueprint” denotes a candidate target, generative constraint, or family of acceptable forms within FormSpace.

The mathematical framework does not require a nonphysical realm to exist. A successful cross-substrate prediction would support the tested correspondence, not prove a metaphysical explanation. FormSpace remains useful if every discovered pattern is explained by ordinary physical and computational mechanisms.

## 2.3 Relationship to language models

NLM is designed to learn from calibrated measurements, context, missingness, and intervention history. FormSpace adds explicit interpretation and experimental contracts to those learned representations. Language models can then explain results, propose hypotheses, write code, or help plan experiments using those records.

The distinction concerns grounding, objectives, and validation. Transformers can process nonlinguistic data and participate in world models; state-space models can process language [5]. Neither architecture alone guarantees causality, physical understanding, or useful emergence. This paper does not establish general superiority over frontier language models. The testable claim is that explicit physical evidence, dynamics, and intervention evaluation improve particular environmental and embodied tasks.

# 3 Mathematical objects and local geometry

## 3.1 Observation and state

Let $e$ identify an embodiment, $x_t\in X_e$ its underlying state, $c_t$ its context, and $a_t$ a recorded action. Modality $m$ supplies

$$
y_t^{(m)}=h_m(x_t,e,c_t)+\epsilon_t^{(m)}. \tag{1}
$$

Calibration, clock uncertainty, detection limits, missingness, and sensor condition are part of the observation contract. Noise need not be independent or Gaussian. NLM estimates a task-scoped belief over form $f_t$ and candidate target $b$:

$$
q_\theta(f_t,b\mid y_{1:t},a_{1:t-1},c_{1:t},e). \tag{2}
$$

This is a proposed inference interface, not a claim that every quantity has already been estimated or validated. A Form State record is

$$
F_t=(s,e,k,f_t,c_t,U_t,E_t,v,t), \tag{3}
$$

where $s$ is the subject, $k$ the chart, $U_t$ the uncertainty description, $E_t$ the evidence references, and $v$ the relevant schema, model, calibration, and chart versions. An observer is distinct from its subject. A sorting algorithm can be a subject without a sensor location; a fungal species description can be literature-derived without being a measured physiological state.

## 3.2 Forms and equivalence

For a specified question, let $\Lambda:X_e\rightarrow Z$ extract the relevant organization. An exact equivalence relation can be defined by

$$
x\sim_\Lambda x' \iff \Lambda(x)=\Lambda(x'),
\qquad \mathcal F_\Lambda=X_e/\!\sim_\Lambda. \tag{4}
$$

Equality makes the relation reflexive, symmetric, and transitive. A deterministic partition with fixed tie-breaking also defines an equivalence relation. By contrast, $d(f,g)<\varepsilon$ usually does not: 0 is close to 0.6 and 0.6 to 1.2 at tolerance 1, while 0 is not close to 1.2. We therefore call tolerance-based similarity a neighborhood relation unless a valid equivalence construction is supplied. This corrects an ambiguity in earlier conceptual drafts [S1, S3].

The quotient is question-dependent. Preserving a multiset, preserving a resource-flow function, and preserving recovery dynamics are different equivalences. They cannot be substituted without testing.

## 3.3 Atlas and metrics

FormSpace is a heterogeneous collection of domains. A chart defines coordinates, units, applicable subjects and contexts, comparison rules, and versioned evidence. Some charts are continuous; others are discrete, symbolic, or graph-valued. The term *manifold* applies only where the required local structure is justified.

For a fixed continuous chart, a useful metric is

$$
d_k(f,g)=\sqrt{(f-g)^\top G_k(f-g)},\qquad G_k\succ0. \tag{5}
$$

Positive definiteness makes this a metric on coordinates. A learned positive-semidefinite matrix may give only a pseudometric. Arbitrary interaction penalties do not automatically satisfy metric axioms. Where geometry varies with position, a Riemannian metric requires path-length construction and suitable regularity, rather than silently applying Equation 5 globally.

On chart overlaps, a transition map $\tau_{\ell k}$ must preserve the declared measurements or functions within a validated tolerance. Round-trip consistency and held-out prediction error test the mapping. An unvalidated map is a hypothesis. There is no assumed universal Euclidean distance between a fungus, a robot, and an algorithm.

## 3.4 Dynamics and target regions

A transition model is indexed by embodiment and context:

$$
f_{t+1}\sim P_e(\,\cdot\mid f_t,a_t,c_t). \tag{6}
$$

If $f_t$ omits relevant memory, this Markov form is inadequate; augment it with history or a persistent memory state. A target $\mathcal M_b$ is an acceptable set of forms, possibly defined by several functional constraints. It need not be smooth or contain a single preferred morphology. Define

$$
e_t^b=d_k(f_t,\mathcal M_b)
=\inf_{g\in\mathcal M_b}d_k(f_t,g). \tag{7}
$$

An assigned target is an engineering objective. An inferred endogenous target is a scientific hypothesis. Maintaining that distinction prevents the controller's own goal from being mistaken for a goal discovered in nature.

## 3.5 Attractors and basins

For fixed context and policy, let $T_{e,\pi}$ describe deterministic closed-loop dynamics. If $\mathcal A_b$ is an invariant attracting set, its basin can be written

$$
\mathcal B_b=\{f_0:\lim_{t\rightarrow\infty}
 d_k(T_{e,\pi}^{,t}(f_0),\mathcal A_b)=0\}. \tag{8}
$$

A dense cluster or prototype centroid is not sufficient to establish an attractor. Attraction depends on dynamics, context, and policy. With process noise, estimate finite-horizon return probabilities and residence times; deterministic convergence may be inappropriate.

An energy-like function $\Phi$ can summarize a fitted landscape. A local minimum supports a stability argument only when the actual dynamics have an appropriate relationship to it. For gradient flow $\dot f=-\nabla\Phi(f)$,

$$
\frac{d\Phi}{dt}=-\|\nabla\Phi(f)\|^2\leq0. \tag{9}
$$

This identity does not establish that biological dynamics follow a gradient. Cycles, hysteresis, and context-driven changes may require other models.

# 4 Reachability recovery and stopping

## 4.1 Separate feasibility from authority

For deterministic prediction over horizon $H$, the reachable set is

$$
\mathcal R_H(f_0;e,c)=\{f_H:\exists a_{0:H-1},\
 f_{t+1}=T_e(f_t,a_t,c_t)\}. \tag{10}
$$

Reachability says that a path exists under the model. Viability requires remaining within specified physical or biological limits over the relevant horizon. Authorization additionally requires valid authority and policy approval. A physically reachable state can be unacceptable; a desirable state can be unreachable.

MYCA selects among admissible candidate paths using a proposed constrained objective:

$$
\begin{aligned}
\min_{a_{0:H-1}}\;&\mathbb E\left[e_H^b+
 \sum_{t=0}^{H-1}(\lambda_e e_t^b+\lambda_c C(a_t))\right]\\
\text{subject to }&\text{validated dynamics, resource limits, viability,}\\
&\text{evidence requirements and AVANI authorization.}
\end{aligned} \tag{11}
$$

Probabilistic constraints require calibrated models and explicit confidence assumptions. They cannot certify safety outside model support. Local device interlocks remain necessary even when a remote action is authorized.

## 4.2 Recovery and memory

After perturbation at $t_p$, a descriptive recovery ratio is

$$
RR=1-\frac{e_T^b}{e_{t_p}^b+\varepsilon}. \tag{12}
$$

Report the initial and final errors alongside the ratio. It can be negative when the system worsens; it is not a success probability. Cases with negligible initial error should be reported separately. Passive relaxation can produce high recovery, so recovery alone is not evidence of agency.

Memory can be modeled as $m_{t+1}=G(m_t,f_t,a_t,c_t)$. A target-rewrite hypothesis requires a persistent change after washout that predicts later interventions better than the prior target. Posterior divergence alone is insufficient: sensor drift, changed context, and model misspecification can also shift an inferred target.

## 4.3 Completion

For $K$ consecutive observations, one proposed completion rule is

$$
\operatorname{Complete}(t)=
\mathbf1\!\left[\max_{0\leq j<K}e_{t-j}^b\leq\varepsilon_b\right]
\mathbf1\!\left[\frac1K\sum_{j=0}^{K-1}
 \|a_{t-j}^{\mathrm{corrective}}\|\leq\tau_a\right]. \tag{13}
$$

Fresh evidence, adequate observation coverage, and valid uncertainty are additional prerequisites. A maintenance process may still require baseline actuation after completion. Stopping means ending unnecessary corrective work while preserving required monitoring and maintenance, not disabling all control.

# 5 NLM learning and inference

## 5.1 From evidence to temporal state

The intended pipeline admits raw signals or calibrated features through modality-specific encoders, preserves missingness and clock information, and combines temporal state with typed relationships and contextual data. MINDEX taxonomy, ecological associations, and prior observations are context with their own provenance; they are not substitutes for paired physiological measurements [S4, S5].

A general multimodal input combines encoded observations, missingness indicators, elapsed time, and context:

$$
u_t=[E_1(y_t^{(1)});\ldots;E_M(y_t^{(M)});m_t;\ell_t;c_t]. \tag{14}
$$

Each encoder $E_m$ is chosen for the modality and its sampling structure. The missingness vector $m_t$ distinguishes an absent reading from a measured zero. The time feature $\ell_t$ uses declared units and scaling. Sensor channels, latent dimensions, and time horizons are selected for the scientific question rather than fixed across every embodiment.

A selective state-space model is one possible temporal backbone [5]. Its general discrete recurrence can be expressed as

$$
h_t=\bar A_t h_{t-1}+\bar B_t z_t,
\qquad r_t=C_t h_t+D z_t. \tag{15}
$$

Here $z_t$ is the transformed input, $h_t$ persistent memory, and the barred operators describe the chosen discrete update. Input-dependent operators permit selective retention of history. If a continuous-time parameterization is used, its discretization must match the implemented update. Learned update parameters are distinct from measured wall-clock intervals. State must be separated by stream identity, with declared reset and warm-up behavior [S4].

A proposed sequence-training objective combines available classification labels, future-measurement prediction, and observed-channel reconstruction:

$$
\mathcal L_{\mathrm{seq}}=\lambda_{\mathrm{class}}\mathcal L_{\mathrm{class}}
+\lambda_{\mathrm{next}}\mathcal L_{\mathrm{next}}
+\lambda_{\mathrm{recon}}\mathcal L_{\mathrm{recon}}. \tag{16}
$$

Loss weights, normalization, optimizer settings, and model size require validation on the intended dataset. A classification term is used only where legitimate labels exist. Measurements excluded by a quality or missingness mask must not silently become reconstruction targets. This is a trainable design specification, not a report of a completed model run.

## 5.2 Learning organization

The expanded research objective groups rather than conflates distinct supervision:

$$
\begin{aligned}
\mathcal L_{FS}={}&\lambda_o\mathcal L_{\mathrm{observation}}
+\lambda_d\mathcal L_{\mathrm{dynamics}}
+\lambda_g\mathcal L_{\mathrm{geometry}}\\
&+\lambda_r\mathcal L_{\mathrm{recovery}}
+\lambda_b\mathcal L_{\mathrm{target}}
+\lambda_s\mathcal L_{\mathrm{stop}}\\
&+\lambda_x\mathcal L_{\mathrm{transfer}}
+\lambda_u\mathcal L_{\mathrm{uncertainty}}
+\lambda_m\mathcal L_{\mathrm{complexity}}.
\end{aligned} \tag{17}
$$

Observation loss includes masked reconstruction and measurement prediction. Dynamics loss can include intervention-conditioned likelihood. Geometry loss tests invariants and transition preservation. Recovery and target losses require appropriate trials and labels or explicit latent-variable assumptions. Complexity penalties discourage inventing a separate blueprint for every trajectory. Losses require compatible scaling and ablation tests; no complete model trained on Equation 17 is established by the supplied evidence.

Weights may come from documented initialization, compatible licensed checkpoints, measured calibration, or training on declared datasets. Learned parameters, physical coefficients, and instrument calibration constants must remain distinguishable. Missing supervision is a reason to leave a head untrained or unknown, not to invent target values.

## 5.3 Typed relationships and uncertainty

A proposed relationship model connects observations through explicitly declared relation types. For an undirected relationship, a symmetric endpoint feature can be

$$
\psi_{ij}=[|h_i-h_j|;h_i\odot h_j;r_{ij}^{\mathrm{sym}}],
\qquad r_{ij}^{\mathrm{sym}}=r_{ji}^{\mathrm{sym}}. \tag{18}
$$

The vector $r_{ij}^{\mathrm{sym}}$ contains supported symmetric context, such as a measured distance or shared observation interval. A decoder can estimate $p_{ij}=\sigma(\operatorname{MLP}(\psi_{ij})/T_{\mathrm{link}})$ for a precisely defined relation, such as whether two sensors observe the same environmental event. Symmetry follows from $\psi_{ij}=\psi_{ji}$; directed processes require a different contract. Missing context must be represented explicitly. A shared-event estimate does not establish a causal mechanism, and different source names do not establish independent evidence [S5].

Class probability, measurement uncertainty, model uncertainty, source reliability, and action-success probability are different quantities. Fusing correlated measurements as independent evidence exaggerates certainty. Temperature scaling can adjust sharpness but cannot repair incorrect learned relationships [6].

For experiment-block conformal prediction, a possible construction uses the largest nonconformity score within each calibration block $g$

$$
A_g=\max_{i\in g}(1-p_i(y_i)),\quad
k=\lceil(n+1)(1-\alpha)\rceil,
\quad\Gamma(x)=\{y:1-p(y\mid x)\leq A_{(k)}\}. \tag{19}
$$

If $k>n$, use a vacuous threshold of 1 for these bounded scores. Under appropriate exchangeability, this construction targets joint coverage of labels in a future experimental block [7]. It does not give the probability that a particular statement is true. Empty, ambiguous, or unsupported results must remain visible.

# 6 Algorithms for discovery and navigation

## 6.1 Atlas construction and target testing

**Algorithm 1. Build a scoped experimental atlas.**

1. Define the subject, task, context, observable variables, interventions, and falsification criteria.
2. Partition complete episodes by specimen, device, site, and time as appropriate. Fit encoders, normalization, charts, and discovery thresholds only on development data.
3. Learn local coordinates and transition models; retain out-of-support states rather than forcing every observation into a known chart.
4. Use recurrent regions to propose attractors. Compare return behavior across initial conditions and controlled perturbations.
5. Fit passive, context-driven, feedback, and target-memory explanations. Evaluate predictive likelihood and task error on held-out interventions with a complexity penalty.
6. Validate chart transitions, uncertainty, and failure cases. Promote only claims supported by the prespecified experiment.
7. Commit versioned states, hypotheses, counterevidence, and model lineage to MINDEX.

Candidate targets can be compared by $p(b\mid D)\propto p(D\mid b)p(b)$. Alternatives must include explanations without a goal. Unknown or inadequate hypotheses require abstention. A posterior is conditional on its model class and priors; it does not establish that the hypothesis set is complete.

## 6.2 Choosing a discriminating experiment

**Algorithm 2. Select information under constraints.** For candidate experiment $a$, estimate expected information gain

$$
\operatorname{EIG}(a)=\mathbb E_{Y\sim p(Y\mid a,D)}
\left[D_{KL}(p(b\mid D,Y,a)\parallel p(b\mid D))\right]. \tag{20}
$$

Select the experiment maximizing expected information minus declared cost over the admissible experiment set. Include sham and no-action alternatives, and record the selection rule before observing the outcome. Equation 20 is model-based; a causal interpretation requires identifiable interventions, adequate controls, and recorded implementation. A confident but wrong model can select an uninformative experiment.

## 6.3 Governed navigation

**Algorithm 3. Navigate and verify.**

1. Load the latest supported Form State and Goal Contract. Reject stale evidence, incompatible versions, and unsupported chart transitions.
2. Generate no-action, information-gathering, and bounded corrective candidates.
3. Evaluate reachability, viability, expected outcome, resource cost, and uncertainty separately.
4. Apply AVANI policy and authority checks. Rank only candidates that remain eligible.
5. Persist the proposal and decision. In shadow mode, emit an advisory only.
6. For authorized execution, require local capability checks, expiry, idempotency, limits, and an execution receipt.
7. Observe the outcome independently, test completion, and stop or roll back when the contract requires it. Update the atlas with prediction errors and rejected hypotheses.

Borda aggregation can compare eligible alternatives when multiple criteria produce rankings:

$$
B(a)=\sum_{j=1}^{J}(m-\operatorname{rank}_j(a)). \tag{21}
$$

Equation 21 uses equal ballot weights; ties can receive their average occupied rank under a declared convention. Borda is a preference score, not a probability or a way to override a veto. Candidate sets and ballot rules must be fixed and disclosed [S5].

# 7 Reproducible mathematical demonstrations

## 7.1 An invariant and a progress measure

Consider adjacent-swap sorting of $[4,1,3,2]$. Define inversion count

$$
I(a)=\sum_{i<j}\mathbf1[a_i>a_j]. \tag{22}
$$

| Step | State | Inversions |
|---|---|---:|
| 0 | 4, 1, 3, 2 | 4 |
| 1 | 1, 4, 3, 2 | 3 |
| 2 | 1, 3, 4, 2 | 2 |
| 3 | 1, 3, 2, 4 | 1 |
| 4 | 1, 2, 3, 4 | 0 |

The multiset remains invariant while the inversion count changes. Swapping an adjacent inverted pair reduces the count by one because all other pairwise ordering contributions are preserved. This small proof establishes termination for repeated inversion-removing adjacent swaps on a finite array. It does not reproduce the distributed sorting experiments in [3], nor prove cross-domain intelligence.

## 7.2 Recovery with a stored target

A deterministic, dimensionless fixture demonstrates the distinction between recovery, target memory, and completion. Let the true evaluation target be $g=1$, perturb the state to $x_0=0$, and use

$$
a_t=0.3(g_{\mathrm{mem}}-x_t),\qquad x_{t+1}=x_t+a_t. \tag{23}
$$

When $g_{\mathrm{mem}}=1$, the error is $e_t=0.7^t$. Since $0.7^8\approx0.05765$ and $0.7^9\approx0.04035$, the state first enters a tolerance of 0.05 at step 9. Requiring five consecutive in-tolerance observations and average corrective effort at most 0.01 confirms completion at step 13. If stored memory is reset to 0, the same controller remains at the wrong target. With feedback disabled, the perturbed state also remains at 0.

![Deterministic recovery and two ablations. The vertical axis is absolute error to the unchanged evaluation target; the dashed threshold is 0.05.](assets/recovery_demo.png){width=92%}

At step 20, full-feedback error is approximately 0.0007979, and the recovery ratio with $\varepsilon=10^{-12}$ is approximately 0.9992021. Both ablations have error 1. The companion script regenerates the table, trajectory CSV, and these values using only Python's standard library.

This is an engineered controller, not an NLM discovery or a biological result. A passive process with the same recurrence would exhibit the same trace. The example demonstrates why additional interventions and rival-model tests are needed before inferring endogenous goals.

# 8 Evaluation and evidence quality

FormSpace must be evaluated at the level of the claim being made. Accurate labels do not prove a stable geometry. A reproducible recovery trace does not establish an endogenous goal. A valid software contract does not establish biological interpretation or field performance.

For binary event predictions, two useful descriptive measures are

$$
\operatorname{Brier}=\frac1N\sum_i(p_i-y_i)^2,
\qquad F_1=\frac{2TP}{2TP+FP+FN}. \tag{24}
$$

Brier score evaluates probability error. F1 summarizes a specified decision threshold's precision-recall balance. Report undefined denominators, abstentions, prevalence, and threshold selection. Neither measure alone evaluates early-warning lead time, biological mechanism, or the usefulness of a recommended intervention.

For temporal and biological experiments, report uncertainty at the level of independent cultures, devices, sites, or experimental episodes rather than treating every correlated sample as independent. Separate training, model selection, uncertainty calibration, and final testing. Entire related episodes must remain within one split where leakage would otherwise occur.

| Evaluation question | Required observation |
|---|---|
| Does the state predict future measurements? | Held-out forecasting error and likelihood |
| Is uncertainty useful? | Calibration, interval coverage, and error under abstention |
| Does a candidate target explain recovery? | Replicated perturbations and comparison with passive dynamics |
| Is completion detected correctly? | Premature stops, unnecessary continuation, and maintained function |
| Does transfer improve a new embodiment? | Comparison with target-only learning at matched resources |
| Does the product help its users? | Better sampling, maintenance, restoration, or experiment decisions |

The computed results in Section 7 apply only to the stated deterministic fixture. Its feedback condition reaches the completion criterion at step 13, while the two ablations do not complete within the 20-step horizon. These values establish that example's behavior. New sensor, biological, ecological, or robotic claims require their own data and validation.

# 9 System architecture and evidence contracts

The target architecture assigns responsibilities as follows [S1, S5, S6]. These are integration contracts, not a current deployment attestation.

![The proposed evidence and control loop. MINDEX preserves the records used in product views; authority checks precede local execution.](assets/architecture.png){width=98%}

| Component | FormSpace responsibility |
|---|---|
| NLM | Infer state and task predictions from evidence; estimate supported dynamics and uncertainty |
| FormSpace Atlas | Define charts, targets, operators, claims, and comparison scope |
| MINDEX | Preserve authoritative scientific records, versions, raw-data references, and counterevidence |
| MYCA MAS | Plan experiments, compare candidates, coordinate agents, and test completion |
| AVANI | Evaluate evidence, policy, authority, and action eligibility |
| FCI and local controllers | Acquire biological measurements and execute authorized bounded interventions |
| Supabase | Provide curated product views, access control, and user request records |
| NatureOS | Present states, evidence, advisories, and review workflows |
| Earth Simulator | Display geographic and temporal projections with separate spatial uncertainty |
| Mycorrhizae and DIRTNet | Transport observations, states, and coordination events |
| HPL | Express versioned experiment and intervention specifications |
| PSILO | Explore temporary hypotheses and mappings within a sandbox |

The logical loop is observation, inference, typed interpretation, proposal, authorization, local execution, and independent outcome observation. MINDEX records every stage, including rejection and nonexecution. An action receipt confirms what executed; it does not establish that the intended environmental outcome occurred.

A minimum Form State contract includes subject and observer identity; observation and availability times; typed coordinates with units; chart and model versions; evidence references; uncertainty and support status; and validity limits. Candidate targets, attractors, reachable sets, and stop probabilities remain optional until supported. Unknown is distinct from zero.

The proposed persistence design stores states append-only, linking corrections to superseded records. Calibration, models, interventions, trial outcomes, and negative results remain queryable. A transactional outbox binds authoritative updates to subsequent projection events; idempotent consumers and version checks make retries safe. Supabase is a curated read and request plane, not a second source of scientific truth. High-rate raw streams remain referenced in the evidence layer [S6, S9, S10].

A Goal Contract names the target, scope, allowable variation, evidence requirements, resource budget, completion test, stop conditions, rollback conditions, and authority. AVANI interfaces should use a versioned decision vocabulary. In an execution contract, PASS means eligible for local validation, REVIEW means pending review, PAUSE means required evidence or a dependency is unavailable, and DENY means prohibited. REVIEW and PAUSE cannot become executable approval. Any adapter to another vocabulary must preserve these meanings. Browser-originated requests do not grant themselves authority.

NMF means **Nature Message Frame** in this architecture. It is distinct from nonnegative matrix factorization and from a model-facing RootedNatureFrame. A serialization default such as confidence 1.0 is not calibrated evidence [S4, S5]. Language-generated hypotheses must remain distinguishable from measurement-derived Form States.

# 10 Product use cases and scientific experiments

## 10.1 Fungal physiology and biological computing

The first proposed biological atlas is deliberately narrow: a specified Pleurotus strain, substrate, and culture environment, with charts for hydration stability, growth transition, and perturbation recovery. FCI can combine electrical observations with humidity, temperature, impedance, growth imaging, and other calibrated measurements supported by the apparatus.

The useful output is a reproducible physiological-state hypothesis and a predicted response to a bounded experiment. It is not a translation of every voltage spike into language. Experiments need independent cultures, instrument controls, sham interventions, randomized schedules, recorded washout, and held-out perturbations. Separate biological variation from electrode drift and environmental coupling. Promote a target hypothesis only if it improves preregistered predictions beyond passive and context-only models.

## 10.2 Environmental monitoring and restoration

A coastal or soil monitoring installation may combine chemical, acoustic, thermal, moisture, and biological observations to detect a changing regime. FormSpace can attach the relevant context, evidence, uncertainty, and candidate recovery paths to a warning. For restoration studies, it can compare trajectories under different treatments while preserving controls and ecological endpoints.

Product value must be measured as useful warning lead time at a declared false-alarm rate, improved sampling decisions, or better prediction of recovery. Correlation among sensors does not identify a pollutant or remediation mechanism without suitable assays. Field benefits require independent validation.

## 10.3 Robotics and infrastructure

A robot or equipment fleet can represent functional readiness through local charts for energy, mobility, sensing quality, and communications. MYCA can propose an alternate route, additional observation, or task reassignment when capability changes. Local controllers enforce motion and hardware limits; FormSpace supplies supervisory interpretation and traceable decision context.

A meaningful test removes a sensor, changes terrain, or partitions communications and compares recovery, energy, failure rate, and completion against fixed workflows and conventional model-based controllers. The desired result is maintained function with measured uncertainty, not a visually attractive embedding.

## 10.4 Civil infrastructure and community monitoring

Water utilities, municipal environmental teams, building operators, and research stations can combine measurements to identify changing conditions and plan follow-up observations. For example, a water-quality dashboard could connect an unusual conductivity trend with temperature, flow, calibration history, and confirmatory laboratory samples. FormSpace would preserve the evidence behind a proposed interpretation and distinguish a suspected event from a verified cause.

Geographic coordinates come from supported spatial observations, never from latent form coordinates. Unknown spatial covariance remains unknown. A public or professional dashboard should expose source age, support status, model version, and alternatives. Useful evaluation measures include warning lead time, false alarms, sampling efficiency, maintenance burden, and the quality of decisions made by users in blinded comparison studies.

## 10.5 Multi-agent resilience

MYCA's software agents can share a Goal Contract while choosing local implementation steps. A Goal Field is the proposed distributed representation of target, error, urgency, and constraints. Recovery tests can remove an agent, replace a tool, or introduce conflicting evidence, then measure restoration of function and preservation of provenance.

Agreement alone is not success. Agents must retain useful specialization and unresolved alternatives. Completion tests prevent a collective from continuing to modify a correct result. This is a proposed use of FormSpace to model organization, rather than an assertion that software collectives reproduce cellular mechanisms.

# 11 Cross-substrate research and bounded discovery

## 11.1 Testing correspondence between embodiments

Let $\psi$ map states of embodiment A into B, and $\psi_a$ map corresponding actions. A one-direction transition correspondence can be tested through

$$
d_B\!\left(\psi(T_A(f,a)),T_B(\psi(f),\psi_a(a))\right)
\leq\varepsilon_T, \tag{25}
$$

with a separate bound on corresponding goal errors. For stochastic systems, compare transition distributions with a declared divergence or transport metric. Calling the relation approximate *bisimulation* requires matching behavior in both directions, not just Equation 25.

Use limited-capacity mappings, held-out actions, negative controls, and target-only baselines. A network simulator, fungal culture, and robot network might all preserve connected resource transport, but matching labels or embedding shapes does not establish shared causal organization. Transfer benefit must be measured at comparable target-data and compute budgets.

## 11.2 Cognitive scope and unrequested behavior

A cognitive light cone is a task-dependent hypothesis about the spatial and temporal scale of goals a system can pursue [4]. FormSpace should record sensing extent, predictive horizon, intervention reach, memory duration, and demonstrated goal scope separately. Mutual information or transfer entropy alone does not establish causal influence or cognition. Unmeasured dimensions remain unknown.

An observer bank can search for secondary, reproducible readouts of an execution. To test an unrequested competency, freeze the readout, use held-out tasks, compare randomized traces and simple baselines, and causally ablate the suspected mechanism. Correct for multiple comparisons. Multiple useful readouts of one trajectory motivate the term *polycomputation*; neither that label nor a surprising behavior demonstrates consciousness.

## 11.3 PSILO exploration

PSILO, the proposed Plasticity and Synesthetic Interlinking Layer Orchestrator, explores temporary cross-domain connections, alternative hypotheses, and routing structures [S1, S3]. It may change a search metric or graph overlay, not the underlying physical possibility set. To preserve a valid continuous metric, one possible parameterization is

$$
G_\psi=L_\psi L_\psi^\top+\epsilon I,\qquad\epsilon>0. \tag{26}
$$

Temporary edges need expiry and lineage. Candidate discoveries return to baseline evaluation for reconstruction, simulation, independent testing, and possible promotion. PSILO cannot directly actuate FCI, robots, laboratory equipment, or production systems. Exploration changes the hypothesis search; hard authority and safety constraints remain fixed. Its utility must be compared with ordinary randomized search at matched budgets.

# 12 Validation agenda and release criteria

The decisive next study tests added utility, not terminology. Freeze hypotheses, splits, metrics, and acceptance thresholds before test-label access. Compare a sensor-only baseline, a context-only baseline, a temporal model without FormSpace, a typed atlas without advanced target inference, and the full proposed system. Include transformer and conventional state-space baselines where relevant to the task.

| Claim | Required test | Evidence against the claim |
|---|---|---|
| Temporal state improves prediction | Full history versus frame-only and shuffled history | No held-out gain |
| A chart captures useful organization | Intervention prediction and seed stability | Geometry varies without stable predictive value |
| A candidate is an attractor | Return and residence under multiple initial conditions | Clustering without repeatable return |
| A target-memory model is useful | Perturbations, washout, and memory ablation | Passive or context-only model predicts equally well |
| Transfer preserves a competency | Held-out substrate and action correspondence | No gain over target-only training |
| Navigation improves operations | Matched-budget control and operator studies | More failures or no useful time savings |
| Exploration finds useful novelty | Frozen probes and replicated discoveries | Effects vanish under controls |

Report capture- or experiment-level uncertainty, forecasting error, likelihood, calibration, selective risk under abstention, false alarms, recovery time, overshoot, stopping errors, energy, latency, and human workload as applicable. Use nested evaluation where discovery and model selection would otherwise leak into the test set. Preserve every prespecified failure case.

Implementation should progress from schemas and offline replay to one validated atlas, then read-only shadow inference, followed by bounded operational trials. Biological transfer and open-ended exploration require their own evidence gates. Supplied SQL drafts are design inputs; this paper neither applies migrations nor certifies their runtime behavior.

FormSpace succeeds if it makes the relationship between observation, organization, intervention, and outcome more predictive and more inspectable. Its strongest promise is an experimental system that can discover useful behaviors without confusing surprise with explanation, or an inferred pattern with established scientific fact.

# References

[1] Kriegman, S., Blackiston, D., Levin, M., and Bongard, J. (2020). *A scalable pipeline for designing reconfigurable organisms.* PNAS 117, 1853–1859. [doi:10.1073/pnas.1910837117](https://doi.org/10.1073/pnas.1910837117).

[2] Kriegman, S., Blackiston, D., Levin, M., and Bongard, J. (2021). *Kinematic self-replication in reconfigurable organisms.* PNAS 118, e2112672118. [doi:10.1073/pnas.2112672118](https://doi.org/10.1073/pnas.2112672118).

[3] Zhang, T., Goldstein, A., and Levin, M. (2024). *Classical sorting algorithms as a model of morphogenesis.* Adaptive Behavior. [doi:10.1177/10597123241269740](https://doi.org/10.1177/10597123241269740). Author manuscript: [arXiv:2401.05375](https://arxiv.org/abs/2401.05375).

[4] Levin, M. (2022). *Technological Approach to Mind Everywhere: An Experimentally-Grounded Framework for Understanding Diverse Bodies and Minds.* Frontiers in Systems Neuroscience 16, 768201. [doi:10.3389/fnsys.2022.768201](https://doi.org/10.3389/fnsys.2022.768201).

[5] Gu, A., and Dao, T. (2023). *Mamba: Linear-Time Sequence Modeling with Selective State Spaces.* [arXiv:2312.00752](https://arxiv.org/abs/2312.00752).

[6] Guo, C., Pleiss, G., Sun, Y., and Weinberger, K. Q. (2017). *On Calibration of Modern Neural Networks.* PMLR 70, 1321–1330. [Proceedings](https://proceedings.mlr.press/v70/guo17a.html).

[7] Angelopoulos, A. N., and Bates, S. (2021). *A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification.* [arXiv:2107.07511](https://arxiv.org/abs/2107.07511).

# Appendix A Source consolidation and evidence status

This draft synthesizes the supplied conceptual and engineering documents for civilian science and applications. It does not imply a fresh inspection of deployed services, source repositories, datasets, or model weights. The canonical architecture supplies the proposed system, while the training and decision-loop documents inform general data and service contracts. Source material is included only to support those scientific and engineering topics.

| ID | Supplied source | Role in this paper |
|---|---|---|
| S1 | MYCOSOFT FORM SPACE ARCHITECTURE v2 | Broad architecture and research program |
| S2 | FORM SPACE CANONICAL ENGINEERING GLOSSARY v1 | Terminology, narrowed where mathematical assumptions require |
| S3 | FORM Space Source | Conceptual summary and product relationships |
| S4 | NLM Weights and Training Blueprint | General data contracts, weight provenance, and training design |
| S5 | NLM Algorithms and Decision Loop White Paper | General decision, execution, and evidence contracts |
| S6 | Form Space database and MAS implementation package | Persistence and service boundaries |
| S7 | How the Nature Learning Model changed with Form Space | Evolution from encoder to proposed world model |
| S8 | Five-Minute Podcast Narrative and Five-Minute Spoken Narrative | Scientific motivation translated into technical prose |
| S9 | 00XX form space core SQL | Proposed core persistence vocabulary |
| S10 | 00XY form space advanced SQL | Proposed experimental and exploration entities |

The companion editorial ledger maps these labels to exact filenames. It is for publication maintenance rather than public evidence of deployment. A public claim should carry two dimensions: implementation status and evidence origin. For example, a numerical method can be implemented while its measurements remain simulated; a biological assertion can be literature-supported while its integration remains proposed.

| Evidence category | Meaning in this paper |
|---|---|
| Mathematical | A definition, derivation, or explicitly stated conditional result |
| Literature | A finding attributed to the cited external study |
| Illustrative computed | Arithmetic generated for this paper by the companion script |
| Proposed | A design or experiment requiring implementation and validation |
| Hypothesis | A falsifiable scientific conjecture or explicitly philosophical interpretation |

Public presentation should retain experimental limitations adjacent to the results. This paper does not establish fungal language decoding, universal cognitive equivalence, certified product performance, or proof of Platonic ontology.
