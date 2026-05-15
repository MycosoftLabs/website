# Nature Learning Model (NLM)
## Signal-native AI for physical reality

**Public technical article draft**  
**Prepared for Mycosoft**  
**Version:** v0.1, May 2026

---

## Executive thesis

The **Nature Learning Model (NLM)** is not a chatbot, not a language model with a greener name, and not another transformer wrapped in an ecological prompt. It is a new class of model system built to learn from **physical signal streams** before those signals are compressed into human language.

Large Language Models begin with words. NLM begins with the world.

An LLM sees the phrase *wet soil*, tokenizes it, and learns from the statistical relationships among human descriptions. An NLM receives calibrated moisture, conductivity, thermal gradients, volatile compounds, pressure waves, multispectral reflectance, fungal bioelectric spikes, geospatial position, season, substrate, species, and experimental context. It then learns the latent state that produced those readings and predicts what will happen next.

The NLM is a **family of models**, not one model. A user can create an unlimited number of NLMs through the model-training application: one for fungal electrophysiology, one for VOC-based contamination detection, one for hydrophone ecology, one for multispectral plant stress, one for weather-driven growth forecasting, one for acoustic species detection, one for LiFi or radio signal environments, one for soil remediation outcomes, and one for any other signal source where a training plan, objective, sensor envelope, and evaluation benchmark can be defined.

The purpose of NLM is to translate the living and non-living Earth into **operational representations**: states, forecasts, risks, hypotheses, model-ready records, decisions, and safe action envelopes. MYCA can reason with those representations. AVANI can govern them. MINDEX can store their provenance. NatureOS can display and operate them. But the NLM is where raw reality becomes machine-learnable state.

---

## Nature Learning Model

The **Nature Learning Model** is Mycosoft's signal-native reasoning backbone for physical reality. It connects observations across time, location, device class, organism, modality, and experiment, while operating under partial data, noisy environments, shifting baselines, and explicit uncertainty.

The foundation is simple: language models primarily learn from human descriptions, while NLMs learn from synchronized nature telemetry, causal experiments, field observations, laboratory assays, and calibrated physical or biological measurements.

A language-first system can summarize research about a forest fire. A Nature Learning Model can ingest thermal imagery, wind reanalysis, soil moisture, volatile organic compounds, spore loads, acoustic wildlife change, radio telemetry from devices, and historical ecological state, then estimate what state transition is unfolding.

A language-first system can explain fungal stress. A Nature Learning Model can learn the spike motifs, voltage bursts, gas profiles, humidity shifts, pH changes, growth imagery, and controlled perturbation patterns that precede stress.

A language-first system can identify a species. A Nature Learning Model can learn how that species changes its environment, what signals it emits, how it interacts with hosts, which conditions alter its behavior, and what future observations are likely.

---

## Signal-State Modeling

Scientific AI systems already explore sequence-based representations of molecules, materials, proteins, DNA, RNA, cells, and other natural structures. Those approaches are useful, but they still begin from a compressed representation of nature rather than the calibrated physical event itself.

Mycosoft's NLM is a **signal-state model**. It does not assume that nature is fundamentally expressed as words or symbolic sequences. It assumes that nature is measured through physical channels and that meaning must be inferred from synchronized, calibrated, causal signal behavior.

The core question is not whether every scientific entity can be represented as a shared language. The core question is whether calibrated physical measurements can become a shared machine representation of ecosystem state.

That difference matters. Words and sequences are already abstractions. Physical signals are closer to the event itself. The NLM begins before human language has compressed, filtered, renamed, and culturally shaped the phenomenon.

---

## Why LLMs are not enough

A language model is powerful because human language contains compressed knowledge. It can reason over descriptions, papers, manuals, instructions, labels, and code. But language is late-stage reality. A word is a social artifact. It is not the event.

The word *ozone* does not contain the voltage behavior of a metal-oxide sensor. The word *stress* does not contain the precise temporal relation between a fungal spike burst, a humidity drop, and a temperature perturbation. The phrase *bird call* does not contain the waveform. The phrase *plant disease* does not contain the hyperspectral signature. The phrase *ocean anomaly* does not contain the pressure waveform or acoustic propagation context.

Human words are useful for communication. They are bad as the first substrate of environmental intelligence.

The NLM reverses the order:

```text
LLM path:
phenomenon -> human observation -> words -> tokens -> model -> story

NLM path:
phenomenon -> sensor measurement -> calibration -> feature -> state -> prediction -> explanation
```

The language layer still exists, but it arrives after grounding. In a Mycosoft system, an LLM should never treat raw telemetry as truth. It should reason over a translated, normalized, provenance-linked, confidence-scored representation. The canonical ladder is:

```text
raw sample -> signal -> feature -> fingerprint/pattern -> event -> state -> hypothesis/prediction -> recommendation -> action
```

This is why NLM is foundational. It prevents the system from turning raw signals into stories before science has occurred.

---

## Formal difference between LLM and NLM

An LLM and an NLM can both use neural networks, attention, embeddings, and probabilistic inference. The difference is the object being learned.

An LLM learns a distribution over symbolic tokens:

```math
p_\theta(w_t \mid w_{<t}, d)
```

where \(w_t\) is the next token, \(w_{<t}\) is the prior token context, \(d\) is optional retrieved document or prompt context, and \(\theta\) are the model parameters. Its training objective is usually next-token likelihood:

```math
L_{LLM}(\theta) = - \sum_{t=1}^{T} \log p_\theta(w_t \mid w_{<t}, d)
```

This is powerful for language because the output target is language. But environmental intelligence is not a next-word problem. A living system has an unobserved physical state:

```math
s_t = \{\text{organism state}, \text{environment state}, \text{device state}, \text{history}, \text{risk}, \text{uncertainty}\}
```

The NLM learns a posterior distribution over that hidden state using multi-modal measurements:

```math
p_\theta(s_t \mid y_{1:t}^{(1:M)}, c_{1:t})
```

where \(y_{1:t}^{(1:M)}\) is the synchronized observation history across \(M\) sensing modalities and \(c_{1:t}\) is context such as location, season, substrate, sensor calibration, species priors, device firmware, and experimental protocol.

The NLM also learns a state transition:

```math
p_\theta(s_{t+\Delta} \mid s_t, a_t, c_t)
```

where \(a_t\) is an action, perturbation, intervention, stimulus, or environmental change. This lets NLM ask: *if this is the current state, what happens next under these conditions?*

### Proof sketch: why signal-state models contain more operational information

Let \(S\) be the true physical state of an environment. Let \(Y\) be calibrated sensor measurements of that state. Let \(T\) be a human text description created after observing some part of \(Y\).

The information path is:

```math
S \rightarrow Y \rightarrow T
```

By the data processing inequality:

```math
I(S;T) \leq I(S;Y)
```

This means a text description cannot contain more information about the physical state than the measurements from which it was derived. Equality only holds if the text is a sufficient statistic for the physical state, which is rarely true for biological and environmental systems. A sentence like "the culture is stressed" discards waveform timing, voltage amplitude, VOC ratios, pH drift, thermal gradients, image texture, and sensor uncertainty.

Therefore, when the task is to infer physical state, predict transition, detect anomaly, or recommend intervention, an NLM that learns from \(Y\) can preserve information that an LLM trained on \(T\) cannot recover.

The practical conclusion is:

```math
\mathbb{E}[R(\hat{s}_{NLM}, s)] \leq \mathbb{E}[R(\hat{s}_{LLM}, s)]
```

when \(Y\) contains state-relevant physical measurements not preserved in \(T\), and both systems are evaluated on the same state-estimation risk \(R\). This is not a claim that every NLM is automatically better than every LLM. It is a claim about the available information. The model trained on calibrated signal has access to the evidence needed for physical inference.

### Operational objective

The NLM objective combines state inference, forecasting, calibration, causal response, and explanation:

```math
\theta^* =
\arg\min_\theta
\mathbb{E}\left[
  L_{state}
  + \lambda_f L_{forecast}
  + \lambda_c L_{calibration}
  + \lambda_a L_{action}
  + \lambda_e L_{explanation}
\right]
```

The NLM is not only trying to name what happened. It is trying to estimate what state produced the signal, how confident it is, what will happen next, which action is safe, and how the evidence should be translated for MYCA, AVANI, MINDEX, and NatureOS.

---

## The six physical senses

NLM treats sensing as a first-class modeling problem. It uses physical modalities that correspond to the way living systems and environments actually emit information.

| NLM sense | Physical signal | Example sources |
|---|---|---|
| Spectral | wavelengths, color, IR, multispectral light | cameras, optical sensors, satellites, LiFi |
| Acoustic | pressure waves, sound, hydrophone data | microphones, hydrophones, BirdNET-style pipelines |
| Bioelectric | voltage gradients, spikes, impedance | FCI probes, mycelial networks, electrode arrays |
| Thermal | temperature gradients, heat flux | BME sensors, thermal cameras, IR arrays |
| Chemical | gases, VOCs, VSCs, compounds | BME688, SporeBase, gas sensors, lab assays |
| Mechanical | pressure, vibration, deformation, seismic motion | accelerometers, tactile sensors, pressure fields |

These modalities are not merely data channels. They are separate observation operators on the same hidden world state.

In mathematical terms, the environment has a latent state \(s_t\) at time \(t\). Each modality produces an observation:

```math
y_t^{(m)} = h_m(s_t, c_t, \epsilon_t)
```

where:

- \(m\) is the modality,
- \(h_m\) is the observation function for that sensor type,
- \(c_t\) is context such as location, season, calibration, substrate, device state, and species,
- \(\epsilon_t\) is noise.

The NLM does not merely classify \(y_t\). It estimates \(s_t\), predicts \(s_{t+k}\), and learns which observations are causally informative.

This equation is the first mathematical statement of NLM:

```math
y_t^{(m)} = h_m(s_t, c_t, \epsilon_t)
```

It says that a sensor reading is not the world itself. A sensor reading is what a specific sensor modality \(m\) observes after the true hidden state \(s_t\) passes through that sensor's physics, context, calibration, and noise.

For example, if \(m\) is a VOC gas array, then \(y_t^{(m)}\) might be a vector of heater-profile responses from a BME688-class sensor. The true state \(s_t\) might include fungal metabolism, bacterial contamination, agar chemistry, humidity, temperature, airflow, colony age, and device drift. The observation function \(h_m\) is the messy physical process that turns that state into a measured gas response.

If \(m\) is a camera, then \(y_t^{(m)}\) might be RGB or multispectral pixels. The same hidden state \(s_t\) produces visible colony edge texture, color change, liquid condensation, substrate shadow, and contamination morphology. If \(m\) is bioelectric, \(y_t^{(m)}\) might be voltage spikes, impedance changes, or electrode-array dynamics.

The NLM works by reversing the measurement process:

```math
\hat{s}_t = \arg\max_{s_t} p_\theta(s_t \mid y_t^{(1)}, y_t^{(2)}, ..., y_t^{(M)}, c_t)
```

In words: given all synchronized sensor observations and context, estimate the most likely hidden environmental state.

It also produces uncertainty instead of pretending the answer is absolute:

```math
p_\theta(s_t \mid y_t^{(1:M)}, c_t)
```

The output is a distribution over possible states. That allows MYCA to say "likely fungal stress with 0.78 confidence" or "possible bacterial contamination, more visual evidence needed" instead of turning weak evidence into false certainty.

Once \(s_t\) is estimated, NLM predicts state transition:

```math
p_\theta(s_{t+k} \mid s_t, a_t, c_t)
```

where \(k\) is the forecast horizon and \(a_t\) is an action, stimulus, intervention, or environmental change. In a Petri dish, \(a_t\) could be adding a scalpel sample, changing humidity, applying an antifungal compound, adjusting temperature, adding contamination, or changing agar type.

The causal question is:

```math
\Delta_{a} = \mathbb{E}[s_{t+k} \mid do(a_t = a)] - \mathbb{E}[s_{t+k} \mid do(a_t = 0)]
```

This asks: what changed because of the action, not merely what correlated with it? That distinction is essential for scientific simulation, live lab experiments, and real-world intervention.

For the Virtual Petri Dish, the model loop becomes:

```text
agar + species + tool action + environment sliders
  -> rendered visual growth, VOC proxy, contamination events, metadata
  -> NMF frame
  -> NLM state estimate
  -> MYCA explanation
  -> MINDEX record
  -> next simulation or real-world experiment
```

This is the bridge between simulation and real sensing. The same math can describe pixels from the simulated dish, camera frames from a physical dish, gas readings from a sensor pack, and bioelectric signals from an FCI probe.

---

## Nature Message Frame (NMF)

The **Nature Message Frame** is the canonical record format for model-ready nature data. It is the bridge between raw measurement and model training.

NMF exists because raw samples alone are not enough. A voltage reading means little without electrode geometry, substrate, strain, calibration, timestamp, humidity, stimulus history, sensor firmware, and provenance. A spectrogram means less without location, season, species probability priors, sensor gain, sample rate, and environmental context. A VOC profile means less without heater profile, gas sensor drift, specimen label, and measurement session metadata.

A public-safe NMF frame can be represented as:

```json
{
  "nmf_version": "0.3",
  "frame_id": "nmf_01J...",
  "timestamp_utc": "2026-05-15T18:24:33.120Z",
  "source": {
    "sensor_id_hash": "sha256:...",
    "device_class": "mycobrain_fci",
    "modality": ["bioelectric", "chemical", "thermal"],
    "calibration_hash": "sha256:..."
  },
  "context": {
    "location_mode": "field_or_lab",
    "geohash_precision": 6,
    "taxonomy": {
      "kingdom": "Fungi",
      "genus": "Pleurotus",
      "species": "ostreatus"
    },
    "substrate": "hardwood_sawdust",
    "growth_stage": "colonization"
  },
  "raw_blocks": [
    {
      "channel": "fci_ch_01",
      "unit": "mV",
      "sample_rate_hz": 128,
      "encoding": "float32_le",
      "storage_ref": "b3://.../frame.bin",
      "sha256": "..."
    }
  ],
  "features": {
    "spike_rate_hz": 0.42,
    "burst_count": 7,
    "voc_index": 184.2,
    "relative_humidity_pct": 67.1,
    "temperature_c": 22.4
  },
  "quality": {
    "snr_db": 18.7,
    "drift_score": 0.08,
    "missingness_pct": 0.4,
    "artifact_flags": []
  },
  "provenance": {
    "dataset_id": "nlm_funga_lab_alpha",
    "permissions": ["research", "model_training"],
    "lineage_root": "sha256:..."
  },
  "label_or_target": {
    "type": "state_transition",
    "value": "nutrient_foraging_upshift",
    "confidence": 0.82
  }
}
```

The frame is not a blob of telemetry. It is a scientific object.

---

## From raw signal to operational state

The NLM pipeline is deliberately staged:

```text
1. Raw sensor sample
2. Calibration and normalization
3. Artifact filtering
4. Feature extraction
5. Bio-token or signal-token formation
6. NMF record generation
7. Modality-specific encoding
8. Cross-modal fusion
9. Latent state estimation
10. Forecast, classification, anomaly, or action envelope
11. Human-readable explanation, if needed
```

This staged design is the difference between engineering and storytelling.

A fungal voltage waveform is not a sentence. A gas sensor trace is not a fact. A hydrophone recording is not an ecological conclusion. NLM turns them into model-ready evidence by requiring calibration, context, and confidence at every step.

---

## Bio-tokens and signal-tokens

NLM does tokenize, but not like a language model.

LLMs tokenize strings. NLM tokenizes **motifs over physical measurement windows**.

A token can represent:

- a spike primitive in a bioelectric trace,
- a burst phrase across electrode channels,
- a VOC signature across heater profiles,
- a spectrogram patch in a bird call,
- a multispectral leaf stress cluster,
- a radio-frequency modulation pattern,
- a LiFi optical pulse envelope,
- a pressure-wave anomaly,
- a thermal gradient change,
- a mycelium response to a controlled perturbation.

The token is not treated as language. It is treated as a learned representation of a recurring physical pattern.

For NLM-Funga, token levels can be defined as:

```text
Level 0: Spike primitives
Level 1: Burst motifs
Level 2: State-transition motifs
Level 3: Cross-organism/ecosystem correlation motifs
```

The translation layer is:

```text
signal window -> token distribution -> state hypothesis -> ontology term -> language summary
```

The language summary is a view. The structured state is the truth-bearing layer.

---

## Model family: unlimited NLMs

An NLM is not one universal monolith. The model-training app is a factory for building NLMs around signal sources, objectives, and outcome predictions.

Examples:

| Model | Primary signal | Output |
|---|---|---|
| NLM-Funga | mycelial bioelectric + VOC + growth imagery | fungal state transitions |
| NLM-VOC | BME688 / gas arrays | gas class and drift-corrected smell signatures |
| NLM-Acoustic | microphones and hydrophones | species, event, source, anomaly |
| NLM-Spectral | RGB, IR, multispectral, LiFi | visual/spectral state |
| NLM-Soil | moisture, conductivity, pH, temperature | soil health and stress |
| NLM-Weather | ERA5, station data, microclimate | environmental forecasts |
| NLM-Maritime | hydrophone, AIS, bathymetry, ocean data | acoustic and ocean state |
| NLM-MycoNode | distributed subsurface probes | local ecosystem state |
| NLM-Fusion | multiple deployed devices | multi-modal world state |

The training app should let an engineer define:

```yaml
model:
  name: nlm_funga_v0_4
  family: funga
  objective: predict_state_transition

signals:
  modalities:
    - bioelectric
    - chemical
    - thermal
    - visual
  frame_format: nmf_v0_3

inputs:
  datasets:
    - nlm_funga_lab_alpha
    - field_probe_calibration_may_2026
  calibration_required: true
  provenance_required: true

architecture:
  temporal_backbone: selective_state_space
  fusion_layer: hypergraph_sparse_attention
  decoders:
    - state_classifier
    - next_event_forecaster
    - anomaly_score

training:
  tasks:
    - masked_time_series_reconstruction
    - next_event_prediction
    - cross_modal_contrastive_alignment
    - controlled_perturbation_identification
  split:
    train: 0.70
    validation: 0.15
    test: 0.15
  checkpoint_format: safetensors

metrics:
  - auroc
  - f1_macro
  - calibration_ece
  - forecast_rmse
  - cross_device_transfer
  - energy_per_inference

deployment:
  mode: edge_and_cloud
  promotion: shadow_canary_active_rollback
```

The model-training app becomes the public engineering surface of the NLM ecosystem.

---

## Architecture: sensor-native, not transformer-first

The strongest NLM architecture is not transformer-first. Transformer attention is useful, especially for selected cross-modal reasoning, but raw physical streams are long, continuous, unevenly sampled, noisy, and often local. Quadratic attention over long sensor streams is wasteful.

NLM should use a **hybrid architecture**:

```text
Sensor streams
  -> calibration adapters
  -> modality encoders
  -> temporal SSM/Mamba backbone
  -> graph/hypergraph interaction layer
  -> sparse attention for critical fusion
  -> task decoders
  -> NMF/MINDEX persistence
```

### Modality encoders

Each signal family has a dedicated encoder.

**Spectral encoder:**

- RGB / IR / multispectral frames
- YOLO-family object detection
- SAHI-style slicing for small or distant targets
- segmentation masks
- vegetation and stress indices
- light-field and LiFi pulse features

**Acoustic encoder:**

- waveform input
- STFT / Mel / constant-Q transforms
- BirdNET-style bioacoustic embeddings
- hydrophone localization features
- source separation and denoising
- event detection over time

**Bioelectric encoder:**

- voltage channel arrays
- spike detection
- burst segmentation
- impedance stability
- graph over electrode geometry
- stimulation-response envelope features

**Chemical encoder:**

- VOC / VSC / CO2 / humidity / temperature / pressure
- BME688 heater-profile response curves
- drift compensation
- specimen labels
- gas-class embeddings

**Mechanical encoder:**

- pressure fields
- accelerometers
- vibration
- structural deformation
- tactile patterns
- seismic features

**Geospatial-temporal encoder:**

- latitude / longitude / depth / elevation
- season, time of day, weather state
- land, sea, air, subsurface, built environment
- spatial neighborhoods and temporal recurrence

### Fusion backbone

The fusion backbone estimates latent state:

```math
h_t = F_\theta(h_{t-1}, E_1(y_t^{(1)}), E_2(y_t^{(2)}), ..., c_t)
```

where \(E_m\) is the encoder for modality \(m\), and \(c_t\) is context. The backbone uses state-space dynamics for long-horizon streams, graph/hypergraph layers for relationships, and sparse attention for rare but critical cross-modal events.

This equation means the NLM carries memory forward. The hidden representation \(h_t\) is not built from the current sensor frame alone. It depends on:

- \(h_{t-1}\), what the system believed one step ago,
- \(E_m(y_t^{(m)})\), what each modality encoder extracts from the current observations,
- \(c_t\), the external context needed to interpret the signal correctly.

The recurrent form matters because nature is path-dependent. A fungal colony at 70 percent humidity for one minute is not the same as a fungal colony after 12 hours of humidity stress. A temperature reading is not only a number; it is part of a trajectory.

The state update can be separated into prediction and correction:

```math
\tilde{h}_t = A_\theta(h_{t-1}, c_t)
```

```math
h_t = \tilde{h}_t + K_\theta(y_t^{(1:M)}, c_t)\left(E(y_t^{(1:M)}) - \hat{E}_t\right)
```

This mirrors the logic of filtering: first predict the next hidden state, then correct that belief using sensor evidence. \(K_\theta\) is a learned gain that decides how much each sensor should change the state estimate. A drifting sensor should have low gain. A fresh high-confidence sensor should have high gain.

### Hypergraph layer

Environmental events are rarely pairwise.

A fungal response might be caused by a humidity drop, temperature rise, VOC change, substrate composition, strain, and prior stimulus. A pairwise graph loses that structure. A hypergraph permits one relationship to connect multiple signals:

```math
G_t = (V_t, E_t), \quad e \in E_t, \quad e = \{v_{bioelectric}, v_{voc}, v_{thermal}, v_{substrate}, v_{species}\}
```

The hyperedge can represent the whole ecological interaction rather than forcing the system into isolated pairs.

The hypergraph layer can be written as a message-passing step:

```math
z_v' = \phi_\theta\left(z_v, \sum_{e \ni v} \psi_\theta(e, \{z_u : u \in e\}, c_t)\right)
```

Here \(z_v\) is the representation of one node, such as a species, sensor, chemical feature, substrate, or location. The term \(e \ni v\) means every hyperedge that contains that node. The function \(\psi_\theta\) computes the interaction among all nodes in that hyperedge, and \(\phi_\theta\) updates the node representation.

This is important because biological causality often requires combinations. Humidity alone may not cause a response. Temperature alone may not cause a response. VOC change alone may not cause a response. But humidity plus temperature plus substrate plus species plus prior stimulus may produce a real state transition.

---

## Deterministic and stochastic NLMs

NLM supports both deterministic and stochastic AI.

### Deterministic NLM

A deterministic NLM is used when repeatability and auditability matter. It takes the same calibrated NMF input and returns the same classification, score, action envelope, or rule decision.

Use cases:

- device safety checks,
- gas class detection after calibrated training,
- deterministic action gating,
- pass/fail ecological thresholds,
- quality control,
- audit reproduction.

A deterministic inference can be written as:

```math
\hat{y} = \arg\max_y f_\theta(x), \quad action = \begin{cases}
PASS & p(\hat{y}) > \tau \land q(x) > q_{min} \\
GATE & \tau_{review} < p(\hat{y}) \le \tau \\
BLOCK & q(x) \le q_{min}
\end{cases}
```

This is machine-governance math. \(p(\hat{y})\) is confidence in the predicted class or state. \(\tau\) is the automatic-action threshold. \(\tau_{review}\) is the human-review threshold. \(q(x)\) is input quality, which can include calibration state, sensor health, missingness, drift, timestamp freshness, and provenance.

This prevents a model from acting on bad data. A high-confidence answer from a corrupted sensor should still be blocked because \(q(x)\) is low.

### Stochastic NLM

A stochastic NLM is used when uncertainty, forecasting, exploration, or incomplete observation matters. It produces distributions, ensembles, sample paths, or posterior estimates.

Use cases:

- climate and ecosystem forecasting,
- sparse-sensor reconstruction,
- anomaly uncertainty,
- biodiversity probability maps,
- experimental design,
- active learning.

A stochastic forecast can be written as:

```math
s_{t+k}^{(i)} \sim p_\theta(s_{t+k} \mid y_{1:t}, c_{1:t}), \quad i = 1...N
```

Each \(s_{t+k}^{(i)}\) is one possible future sampled from the model. The spread of those futures is as important as the average. If every sample predicts contamination, the system has high confidence. If half predict healthy growth and half predict contamination, the system should ask for more evidence.

The uncertainty can be decomposed:

```math
Var(s_{t+k}) = Var_{model}\left(\mathbb{E}[s_{t+k} \mid \theta]\right)
              + \mathbb{E}_{model}\left[Var(s_{t+k} \mid \theta)\right]
```

The first term is epistemic uncertainty: the model does not know enough. The second term is aleatoric uncertainty: the world itself is noisy. NLM should treat those differently. Epistemic uncertainty can be reduced by more measurements. Aleatoric uncertainty may require wider safe operating envelopes.

The model reports the distribution, not just one answer:

```json
{
  "prediction": "stress_response_onset",
  "mean_probability": 0.74,
  "credible_interval": [0.61, 0.83],
  "uncertainty_reason": ["sparse chemical data", "cross-device drift"],
  "recommended_next_measurement": "increase VOC sampling and capture thermal frame"
}
```

Both modes are necessary. Deterministic NLMs keep machines safe. Stochastic NLMs let science work under partial observation.

---

## LLMs still matter, but as translators

LLMs can sit on top of NLM. They can interpret structured state, explain findings to humans, draft reports, generate code, plan experiments, query databases, or summarize results.

But the LLM should not be the first model to touch raw nature data.

Correct architecture:

```text
raw signal -> NLM -> structured state -> LLM -> explanation
```

Incorrect architecture:

```text
raw signal -> LLM -> confident story
```

The LLM is the narrator. NLM is the grounded state engine.

---

## Scientific learning objectives

NLMs can be trained on multiple objective families.

### 1. Masked signal modeling

Predict hidden parts of a time series:

```math
L_{mask} = \sum_{t \in M} \lVert x_t - \hat{x}_t \rVert_2^2
```

Useful for denoising, missing sensor reconstruction, and compression.

The model is forced to learn structure, not labels alone. If it can reconstruct a masked humidity segment from temperature, growth edge behavior, and VOC drift, it has learned a cross-modal environmental relation.

### 2. Next-event prediction

Predict the next event from context:

```math
p(e_{t+1} \mid x_{1:t}, c_{1:t})
```

Useful for warning systems and experiment planning.

For fungal culture work, \(e_{t+1}\) might be "hyphal expansion accelerates," "edge stalls," "contamination bloom begins," or "bioelectric burst follows humidity change." The NLM should learn the probability of the event before it becomes visually obvious.

### 3. Cross-modal contrastive learning

Align representations that describe the same event:

```math
L_{contrast} = -\log \frac{\exp(sim(z_a, z_b)/\tau)}{\sum_j \exp(sim(z_a, z_j)/\tau)}
```

Example: align fungal electrical bursts with VOC change and microscopy image sequences.

This objective teaches the model that different sensors can describe the same underlying event. If a bioelectric spike, a VOC shift, and an image texture change occur in the same biological episode, their embeddings should move closer together. Unrelated episodes should move apart.

### 4. Controlled perturbation identification

Infer the stimulus that produced a response:

```math
\hat{u} = \arg\max_u p_\theta(u \mid response, context)
```

This is critical for falsifiability. If the model cannot infer controlled perturbations, it should not claim semantic interpretation.

The scientific standard is not "the model found a pattern." The stronger standard is "the model can recover which controlled intervention produced the response." That makes NLM closer to experimental science than passive dashboard analytics.

### 5. Physics-informed residual loss

For dynamical systems, the model should respect known physical constraints:

```math
L_{physics} = \left\lVert \frac{\partial u}{\partial t} - \mathcal{F}(u, \nabla u, \nabla^2u, \theta) \right\rVert^2
```

This is the bridge between NLM and scientific machine learning benchmarks such as PDEBench.

For physical systems, not every neural prediction is allowed. Heat does not move arbitrarily. Fluids do not ignore conservation laws. Chemical diffusion has constraints. A physics residual penalizes predictions that may fit labels but violate the known structure of the world.

### 6. Graph relation prediction

Predict relationships among species, conditions, signals, and outcomes:

```math
p(r_{ij} \mid z_i, z_j, c)
```

Useful for interspecies relationships, mycorrhizal interaction maps, ecosystem state, and causal hypothesis generation.

The graph loss teaches relationship, not just classification. It can learn that a species, substrate, location, chemical condition, and observed outcome belong to a connected biological pattern.

### 7. Calibration and uncertainty loss

NLM should be right, but it should also know when it is unsure. Calibration measures whether predicted confidence matches observed frequency:

```math
L_{calibration} = \sum_{b=1}^{B} \frac{|B_b|}{n}
\left|acc(B_b) - conf(B_b)\right|
```

If the model says "80 percent confidence" across many cases, about 80 percent of those cases should be correct. This matters for MYCA because a poorly calibrated model can sound decisive while being wrong.

### 8. Causal intervention loss

When experiments include controlled interventions, NLM can learn treatment effects:

```math
L_{causal} =
\left\lVert
\left(\hat{s}_{t+k}^{do(a)} - \hat{s}_{t+k}^{do(0)}\right)
-
\left(s_{t+k}^{do(a)} - s_{t+k}^{do(0)}\right)
\right\rVert_2^2
```

This trains the model to estimate what changed because an intervention occurred. For Petri Dish science, that can mean distinguishing normal growth from the effect of a chemical overlay, agar type, contamination introduction, scalpel tissue transfer, or environmental slider change.

### Composite loss

A complete NLM training objective may combine them:

```math
L = \lambda_1 L_{mask} + \lambda_2 L_{forecast} + \lambda_3 L_{contrast}
  + \lambda_4 L_{physics} + \lambda_5 L_{graph} + \lambda_6 L_{calibration}
  + \lambda_7 L_{causal} + \lambda_8 L_{safety}
```

This is the mathematical reason NLM is not simply a prompt system. It has many learning targets beyond language prediction.

The \(\lambda\) terms are weights. They decide what kind of model is being trained. A field safety NLM may weight \(L_{safety}\) and \(L_{calibration}\) heavily. A fungal research NLM may weight \(L_{contrast}\), \(L_{causal}\), and \(L_{forecast}\). A climate or fluid system NLM may weight \(L_{physics}\) heavily.

The composite objective lets Mycosoft create many NLMs without pretending one model family has one training goal. The model-training dashboard should expose these weights as part of the experiment plan, store them in MINDEX, persist checkpoints, and show which mathematical objective produced each model.

---

## Example implementation sketch

Below is a simplified architecture sketch. It is not production code; it demonstrates the structure.

```python
import torch
import torch.nn as nn

class ScalarTimeSeriesEncoder(nn.Module):
    def __init__(self, in_channels: int, hidden: int):
        super().__init__()
        self.proj = nn.Linear(in_channels, hidden)
        self.norm = nn.LayerNorm(hidden)

    def forward(self, x):
        # x: [batch, time, channels]
        return self.norm(self.proj(x))

class SpectrogramEncoder(nn.Module):
    def __init__(self, hidden: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.ReLU(),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)),
        )
        self.out = nn.Linear(64, hidden)

    def forward(self, spec):
        # spec: [batch, 1, freq, time]
        h = self.net(spec).flatten(1)
        return self.out(h)

class NLMFusionCore(nn.Module):
    def __init__(self, hidden: int):
        super().__init__()
        self.fuse = nn.Linear(hidden * 4, hidden)
        self.state_update = nn.GRU(hidden, hidden, batch_first=True)
        self.state_head = nn.Linear(hidden, 12)
        self.forecast_head = nn.Linear(hidden, 64)
        self.uncertainty_head = nn.Linear(hidden, 1)

    def forward(self, bioelectric, chemical, thermal, acoustic):
        z = torch.cat([bioelectric, chemical, thermal, acoustic], dim=-1)
        z = self.fuse(z)
        h, _ = self.state_update(z)
        state_logits = self.state_head(h[:, -1])
        forecast = self.forecast_head(h[:, -1])
        uncertainty = torch.sigmoid(self.uncertainty_head(h[:, -1]))
        return state_logits, forecast, uncertainty
```

Production NLMs would replace this minimal GRU with more efficient SSM/Mamba-style sequence blocks, add hypergraph fusion, and maintain provenance-aware outputs.

---

## Model registry and weights

Every trained NLM should be versioned like a scientific instrument.

A model record should include:

- model name,
- version,
- model family,
- architecture definition,
- modality list,
- training data hash,
- calibration hash,
- metrics,
- status,
- deployment target,
- permissions,
- rollback pointer,
- model card,
- provenance root.

The database schema already points in this direction through model tables, training runs, knowledge entities, predictions, and integrations. A production registry should store model metadata in durable database tables and the weights in managed artifacts.

Recommended model formats:

| Format | Use |
|---|---|
| `safetensors` | primary PyTorch weights |
| `onnx` | portable inference |
| `engine.plan` | TensorRT edge deployment |
| `tflite` | small embedded/mobile deployments |
| `gguf` | compact local model serving where applicable |
| `json/yaml` | training plans and model cards |
| `parquet/zarr/hdf5` | large signal datasets |
| `netcdf/grib` | climate and geophysical data |
| `wav/flac` | acoustic data |
| `iq/cfile` | SDR / radio data |
| `geotiff` | raster geospatial imagery |

The core rule: **weights without provenance are not deployable NLMs**.

---

## Sensor and analysis technologies NLM should absorb

NLM does not need to reinvent every front-end model. It can absorb specialized tools as modality encoders or baselines.

### Vision and spectral sensing

YOLO-family detectors, segmentation models, and SAHI-style slicing are useful for high-resolution imagery, small objects, drone images, insects, fungal fruiting bodies, plant stress, and remote sensing patches. SAHI is especially relevant because it slices large images into smaller regions, improving small-object detection over high-resolution images.

### Acoustic sensing

BirdNET demonstrates the right ecological pattern: raw audio becomes spectrogram features, a neural network predicts species, and predictions are refined using location and date metadata. NLM-Acoustic should extend this idea beyond birds into insects, frogs, mammals, underwater acoustics, machinery, weather, and acoustic device communication.

### Chemical sensing

Bosch's BME AI-Studio shows how a gas sensor can be trained from labeled specimens, raw measurement sessions, heater profiles, and machine learning. NLM-Chemical generalizes this into a broader chemical learning pipeline: VOCs, VSCs, CO2, humidity, temperature, pressure, calibration drift, specimen metadata, and contextual priors.

### Radio, optical, and machine-to-machine signals

SDR++ and SDR pipelines make radio signal environments inspectable. LiFi and optical wireless communication expand sensing into modulated light. Gibberlink-style sound-level protocols show that AI systems can exchange data through acoustic channels. NLM treats each of these as physical signals that require modulation features, channel models, noise handling, and interpretability constraints.

### Physics benchmarks

PDEBench and sparse-sensor spatiotemporal reconstruction research provide benchmark families for learning dynamics from partial observations. NLM should use these as engineering inspiration, but extend beyond them into biology, chemistry, bioelectricity, and live deployed sensor networks.

---

## Benchmark plan: NLM-Bench

To convince engineers, NLM must be benchmarked like a serious AI system.

### Benchmark classes

| Benchmark | Task | Metrics |
|---|---|---|
| Funga-State | fungal state from FCI/VOC/thermal | F1, AUROC, ECE |
| Funga-Forecast | next spike/burst/state | RMSE, CRPS, MAE |
| VOC-Class | gas/specimen class | accuracy, confusion, drift |
| Acoustic-Bio | species/event from audio | mAP, F1, false positive rate |
| Hydro-Acoustic | underwater signal class | AUROC, localization error |
| Spectral-Stress | plant/fungal stress from imagery | mAP, IoU, calibration |
| Sparse-Field | full-field reconstruction from sparse sensors | RMSE, SSIM, physical residual |
| Cross-Device | transfer across hardware | performance drop, recalibration cost |
| Cross-Lab | transfer across labs | generalization gap |
| Edge-Inference | field deployment | latency, energy, memory |

### Baselines

NLM should be compared against:

- transformer encoders,
- CNNs,
- YOLO-family detectors,
- BirdNET-style acoustic models,
- BME AI-Studio style gas classifiers,
- Fourier Neural Operators,
- U-Nets,
- PINNs,
- diffusion / score-based reconstruction models,
- Mamba/SSM sequence models,
- LLM-only interpretation.

The key benchmark is not whether NLM can describe a signal. The key benchmark is whether it can **predict, transfer, calibrate, and act under uncertainty**.

---

## Example inference contract

An NLM inference response should never be a free-text answer alone. It should be a structured result.

```json
{
  "model": "nlm_funga_v0_4",
  "input_frame": "nmf_01J...",
  "task": "state_transition_prediction",
  "result": {
    "state": "nutrient_foraging_upshift",
    "probability": 0.82,
    "uncertainty": 0.11,
    "valid_until": "2026-05-15T19:00:00Z"
  },
  "evidence": [
    {"feature": "token_17_burst", "weight": 0.34},
    {"feature": "soil_moisture_drop", "weight": 0.21},
    {"feature": "co2_rise", "weight": 0.18}
  ],
  "predicted_next": [
    {"event": "growth_direction_change", "p": 0.63},
    {"event": "resource_allocation_shift", "p": 0.58}
  ],
  "recommended_measurement": [
    "increase_sampling_rate",
    "capture_time_lapse_frame",
    "verify_impedance_stability"
  ],
  "governance": {
    "avani_gate": "pass",
    "action_allowed": true,
    "reason": "non-invasive observation only"
  },
  "provenance": {
    "lineage_root": "sha256:...",
    "calibration_hash": "sha256:...",
    "model_card_hash": "sha256:..."
  }
}
```

A human-readable paragraph can be generated afterward. But the structured response is the product.

---

## Example training loop

```python
for batch in dataloader:
    frames = batch["nmf_frames"]

    x_bio = encode_bioelectric(frames)
    x_chem = encode_chemical(frames)
    x_spec = encode_spectral(frames)
    x_acou = encode_acoustic(frames)
    context = encode_context(frames)

    state, forecast, uncertainty = nlm(
        bioelectric=x_bio,
        chemical=x_chem,
        spectral=x_spec,
        acoustic=x_acou,
        context=context,
    )

    loss = (
        1.0 * masked_signal_loss(forecast, batch["masked_targets"]) +
        0.8 * state_loss(state, batch["state_labels"]) +
        0.6 * contrastive_alignment_loss(batch) +
        0.4 * physics_residual_loss(forecast, batch["physics_context"]) +
        0.2 * calibration_loss(uncertainty, batch["validation_error"])
    )

    loss.backward()
    optimizer.step()
    optimizer.zero_grad()
```

The important detail is that the model is not optimizing one text likelihood. It is optimizing a multi-objective scientific learning problem.

---

## Relationship to MYCA, AVANI, MINDEX, and NatureOS

NLM has a strict role.

- **NLM** translates and predicts nature-state.
- **MINDEX** stores provenance, lineage, predictions, knowledge, and model artifacts.
- **AVANI** governs admissibility, safety, reversibility, and ecological constraints.
- **MYCA** orchestrates agents, tools, devices, and action.
- **NatureOS** provides dashboards, device operations, training surfaces, and user workflows.

This separation prevents model confusion. The NLM does not become an autonomous executive. MYCA does not become the source of truth for raw nature signals. AVANI does not do signal modeling. MINDEX does not decide actions. Each layer has a job.

The result is a full-stack AI system where nature data can become operational intelligence without losing traceability.

---

## Why Mycosoft is building this

Most AI companies have no reason to build NLM. Their advantage is web-scale text, consumer behavior, cloud APIs, GPUs, recommendation systems, or office automation. Their business model rewards generalized assistants and productivity layers.

NLM requires a different stack:

- physical sensors,
- fungal interfaces,
- edge devices,
- model-training tools,
- environmental data systems,
- biology and chemistry workflows,
- geospatial databases,
- field deployments,
- provenance infrastructure,
- ecological governance,
- experimental science.

That is why this is not a feature. It is an invention class.

A company cannot prompt its way into signal-native intelligence. It must build the devices, collect the data, define the frames, calibrate the sensors, train the models, validate the outputs, and govern the actions.

Mycosoft is building NLM because the company is already building the whole chain: FCI, MycoBrain, devices, MINDEX, NatureOS, MYCA, AVANI, and the field network. NLM is the model layer that makes that stack more than telemetry.

---

## Business advantage

NLM creates business value in places where LLMs cannot compete directly:

### 1. Proprietary physical datasets

Web data is widely available. Calibrated fungal bioelectric, VOC, acoustic, multispectral, and field-device datasets are not. The moat is not a prompt. It is data collection through hardware.

### 2. Domain-specific model licensing

Each NLM can become a licensed model: NLM-Funga for fungal signals, NLM-VOC for gas fingerprints, NLM-Acoustic for biodiversity, NLM-Weather for microclimate prediction, NLM-Soil for restoration, and so on.

### 3. Hardware plus software lock-in

Devices create data. Data trains models. Models improve devices. This loop compounds.

### 4. New intelligence domain

Environmental intelligence becomes a market category. NLM is the model layer for that category.

### 5. Scientific defensibility

Because NLM is built around perturbations, calibration, provenance, uncertainty, and benchmarks, it can be evaluated in laboratories and field trials, not only by user preference.

### 6. Edge deployment

NLM can run close to sensors, reducing latency, bandwidth, and dependency on centralized compute. This is critical for remote environments.

### 7. Governance-native autonomy

Because NLM outputs structured state and uncertainty, AVANI can govern it. This is much harder with opaque language-only outputs.

---

## Risk and mitigation

NLM has risks, but they are engineering risks that can be managed.

### Risk: anthropomorphism

A fungal spike is not automatically a word. NLM must avoid calling signals messages unless semantic interpretation exists.

**Mitigation:** use token levels, controlled perturbations, state labels, and confidence bounds.

### Risk: sensor drift

Field sensors drift and fail.

**Mitigation:** calibration hashes, drift scores, cross-device validation, and explicit degraded responses.

### Risk: false confidence

A model can produce a strong prediction from weak data.

**Mitigation:** calibration metrics, ECE, conformal intervals, uncertainty reporting, and AVANI gates.

### Risk: model contamination

Bad labels, noisy field data, or synthetic placeholders can poison training.

**Mitigation:** durable training provenance, real-data enforcement, dataset hashing, human review, and shadow/canary promotion.

### Risk: LLM storytelling

A language model may over-explain or invent meaning from raw signals.

**Mitigation:** force LLMs to consume only NMF-backed structured outputs.

### Risk: ecological harm

Closed-loop experiments can over-stimulate or disturb living systems.

**Mitigation:** stimulation envelopes, reversible protocols, safety constraints, and governance approvals.

---

## What success looks like

An NLM is successful when it can:

1. ingest real calibrated signal streams,
2. create NMF records with provenance,
3. learn representations without language as the primary substrate,
4. infer state from partial multimodal measurements,
5. forecast future observations,
6. transfer across devices and environments,
7. quantify uncertainty,
8. explain evidence without hallucinating,
9. trigger safe workflows,
10. improve through controlled experiments.

The final test is simple:

Can the model see a physical process unfolding before a human names it?

If yes, it is a Nature Learning Model.

---

## Public product language

**NLM is Mycosoft's signal-native AI modeling framework for living Earth systems. It learns from wavelengths, waveforms, voltage, gas, temperature, pressure, chemistry, movement, geography, and time. It turns physical reality into operational state. Language is optional. Grounding is mandatory.**

---

## References and source foundation

1. Mycosoft NLM README: internal NLM definition, multi-modal modalities, architecture, data flow, integration, and usage examples.
2. Mycosoft NLM Manual and Gap Map, May 14 2026: current intended role, runtime surfaces, NMF translation path, training API, integration points, and remaining production work.
3. Mycosoft NLM Database Schema: model registry, training runs, knowledge entities, relations, observations, prediction history, and integrations.
4. Mycosoft NLM Implementation Plan: multi-modal encoders, cross-modal/temporal/spatial attention, decoders, knowledge graph, prediction engine, integrations, and tests.
5. Mycosoft FUSARIUM Architecture and Prime Capability materials: six-sense NLM, SSM/Mamba backbone, graph/hypergraph fusion, sparse attention, RootedNatureFrame, Merkle provenance, and operational environmental intelligence framing.
6. Nature Machine Intelligence: “Learning spatiotemporal dynamics with a pretrained generative model,” 2024.
7. Zenodo dataset 10.5281/zenodo.13925732 for KSE/Kolmogorov flow datasets and pretrained checkpoints.
8. Copernicus Climate Data Store: ERA5 hourly data on single levels from 1940 to present.
9. PDEBench GitHub repository and NeurIPS 2022 benchmark for scientific machine learning.
10. BirdNET official project and BirdNET-Analyzer GitHub repository.
11. Bosch Sensortec BME AI-Studio Manual for BME688 gas classification workflows.
12. SAHI GitHub repository and sliced inference paper for small-object detection.
13. YOLOv12 and YOLOE-26 research references for real-time object detection and open-vocabulary instance segmentation.
14. SDR++ GitHub repository for open-source SDR software.
15. Gibberlink GitHub repository and GGWave-style acoustic data transmission concept.
16. LiFi / optical wireless communication references for light-based networking and sensing.
