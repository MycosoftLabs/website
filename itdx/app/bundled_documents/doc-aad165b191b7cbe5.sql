-- STAGED MIGRATION — DO NOT APPLY DIRECTLY TO PRODUCTION
-- MINDEX Form Space Advanced Research Layer
-- Run only after 00XX_form_space_core.sql and core API/outbox validation.

BEGIN;

CREATE TABLE IF NOT EXISTS form_space.basin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  attractor_id uuid NOT NULL REFERENCES form_space.attractor(id) ON DELETE CASCADE,
  chart_id uuid NOT NULL REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  boundary_definition jsonb NOT NULL,
  membership_model_ref text,
  volume_estimate jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence double precision CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  evidence_root text,
  status text NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','supported','falsified','retired')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_basin_attractor ON form_space.basin(attractor_id);
CREATE INDEX IF NOT EXISTS idx_fs_basin_chart ON form_space.basin(chart_id);

CREATE TABLE IF NOT EXISTS form_space.boundary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE CASCADE,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  boundary_type text NOT NULL
    CHECK (boundary_type IN
      ('viability','ethical','physical','ecological','identity',
       'security','classification','unknown')),
  definition jsonb NOT NULL,
  avani_policy_ref text,
  severity text NOT NULL DEFAULT 'gate'
    CHECK (severity IN ('inform','warn','gate','veto')),
  model_version_id uuid REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('candidate','active','retired')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_boundary_space_type
  ON form_space.boundary(space_id, boundary_type);
CREATE INDEX IF NOT EXISTS idx_fs_boundary_chart
  ON form_space.boundary(chart_id);
CREATE INDEX IF NOT EXISTS idx_fs_boundary_model
  ON form_space.boundary(model_version_id);

CREATE TABLE IF NOT EXISTS form_space.invariant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE CASCADE,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  name text NOT NULL,
  invariant_type text NOT NULL
    CHECK (invariant_type IN
      ('topological','geometric','functional','causal','goal',
       'repair','information','physical','unknown')),
  definition jsonb NOT NULL,
  tolerance jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  epistemic_status text NOT NULL DEFAULT 'candidate'
    CHECK (epistemic_status IN ('candidate','supported','falsified','retired')),
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, name)
);
CREATE INDEX IF NOT EXISTS idx_fs_invariant_space ON form_space.invariant(space_id);
CREATE INDEX IF NOT EXISTS idx_fs_invariant_chart ON form_space.invariant(chart_id);

CREATE TABLE IF NOT EXISTS form_space.equivalence_class (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE CASCADE,
  name text NOT NULL,
  equivalence_definition jsonb NOT NULL,
  invariant_ids uuid[] NOT NULL DEFAULT '{}',
  mapping_model_ref text,
  epistemic_status text NOT NULL DEFAULT 'candidate'
    CHECK (epistemic_status IN
      ('candidate','supported','cross_substrate_supported','falsified','retired')),
  evidence_root text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_equivalence_space
  ON form_space.equivalence_class(space_id);

CREATE TABLE IF NOT EXISTS form_space.equivalence_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equivalence_class_id uuid NOT NULL
    REFERENCES form_space.equivalence_class(id) ON DELETE CASCADE,
  system_id text NOT NULL,
  state_id uuid REFERENCES form_space.state(id) ON DELETE RESTRICT,
  embodiment_binding_id uuid
    REFERENCES form_space.embodiment_binding(id) ON DELETE SET NULL,
  mapping_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  membership_score double precision
    CHECK (membership_score IS NULL OR membership_score BETWEEN 0 AND 1),
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (state_id IS NOT NULL OR embodiment_binding_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fs_equivalence_member_state
  ON form_space.equivalence_member(equivalence_class_id, system_id, state_id)
  WHERE state_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fs_equivalence_member_class
  ON form_space.equivalence_member(equivalence_class_id);
CREATE INDEX IF NOT EXISTS idx_fs_equivalence_member_state
  ON form_space.equivalence_member(state_id);
CREATE INDEX IF NOT EXISTS idx_fs_equivalence_member_embodiment
  ON form_space.equivalence_member(embodiment_binding_id);

CREATE TABLE IF NOT EXISTS form_space.cross_substrate_test (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  equivalence_class_id uuid
    REFERENCES form_space.equivalence_class(id) ON DELETE SET NULL,
  source_system_id text NOT NULL,
  target_system_id text NOT NULL,
  source_embodiment_id uuid
    REFERENCES form_space.embodiment_binding(id) ON DELETE RESTRICT,
  target_embodiment_id uuid
    REFERENCES form_space.embodiment_binding(id) ON DELETE RESTRICT,
  mapping_definition jsonb NOT NULL,
  transition_error double precision
    CHECK (transition_error IS NULL OR transition_error >= 0),
  goal_error double precision
    CHECK (goal_error IS NULL OR goal_error >= 0),
  heldout_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','active','completed','failed','invalidated')),
  epistemic_result text NOT NULL DEFAULT 'pending'
    CHECK (epistemic_result IN ('pending','supported','inconclusive','falsified')),
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_system_id <> target_system_id)
);
CREATE INDEX IF NOT EXISTS idx_fs_xsub_equivalence
  ON form_space.cross_substrate_test(equivalence_class_id);
CREATE INDEX IF NOT EXISTS idx_fs_xsub_source_embodiment
  ON form_space.cross_substrate_test(source_embodiment_id);
CREATE INDEX IF NOT EXISTS idx_fs_xsub_target_embodiment
  ON form_space.cross_substrate_test(target_embodiment_id);

CREATE TABLE IF NOT EXISTS form_space.goal_field (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE CASCADE,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  system_id text NOT NULL,
  target_id uuid REFERENCES form_space.target(id) ON DELETE SET NULL,
  field_definition jsonb NOT NULL,
  local_goal_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  conflict_index double precision
    CHECK (conflict_index IS NULL OR conflict_index BETWEEN 0 AND 1),
  coherence_score double precision
    CHECK (coherence_score IS NULL OR coherence_score BETWEEN 0 AND 1),
  model_version_id uuid REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);
CREATE INDEX IF NOT EXISTS idx_fs_goal_field_system_time
  ON form_space.goal_field(system_id, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_fs_goal_field_space ON form_space.goal_field(space_id);
CREATE INDEX IF NOT EXISTS idx_fs_goal_field_chart ON form_space.goal_field(chart_id);
CREATE INDEX IF NOT EXISTS idx_fs_goal_field_target ON form_space.goal_field(target_id);
CREATE INDEX IF NOT EXISTS idx_fs_goal_field_model ON form_space.goal_field(model_version_id);

CREATE TABLE IF NOT EXISTS form_space.coherence_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id text NOT NULL,
  goal_field_id uuid REFERENCES form_space.goal_field(id) ON DELETE SET NULL,
  event_type text NOT NULL
    CHECK (event_type IN
      ('coherence_gain','coherence_loss','fragmentation',
       'coalition_change','local_defection','repair','unknown')),
  severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','critical')),
  score_before double precision
    CHECK (score_before IS NULL OR score_before BETWEEN 0 AND 1),
  score_after double precision
    CHECK (score_after IS NULL OR score_after BETWEEN 0 AND 1),
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  occurred_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_fs_coherence_system_time
  ON form_space.coherence_event(system_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fs_coherence_goal_field
  ON form_space.coherence_event(goal_field_id);

CREATE TABLE IF NOT EXISTS form_space.light_cone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  system_id text NOT NULL,
  space_id uuid REFERENCES form_space.space(id) ON DELETE CASCADE,
  state_id uuid REFERENCES form_space.state(id) ON DELETE SET NULL,
  spatial_sensing jsonb NOT NULL DEFAULT '{}'::jsonb,
  spatial_action jsonb NOT NULL DEFAULT '{}'::jsonb,
  memory_horizon jsonb NOT NULL DEFAULT '{}'::jsonb,
  forecast_horizon jsonb NOT NULL DEFAULT '{}'::jsonb,
  causal_depth jsonb NOT NULL DEFAULT '{}'::jsonb,
  network_extent jsonb NOT NULL DEFAULT '{}'::jsonb,
  ecological_extent jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimation_method text NOT NULL,
  confidence double precision
    CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  model_version_id uuid REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);
CREATE INDEX IF NOT EXISTS idx_fs_light_cone_system_time
  ON form_space.light_cone(system_id, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_fs_light_cone_space
  ON form_space.light_cone(space_id);
CREATE INDEX IF NOT EXISTS idx_fs_light_cone_state
  ON form_space.light_cone(state_id);
CREATE INDEX IF NOT EXISTS idx_fs_light_cone_model
  ON form_space.light_cone(model_version_id);

CREATE TABLE IF NOT EXISTS form_space.persuadability_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  system_id text NOT NULL,
  state_id uuid REFERENCES form_space.state(id) ON DELETE SET NULL,
  intervention_axis jsonb NOT NULL,
  least_invasive_effective_level text,
  response_curve jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_root text,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);
CREATE INDEX IF NOT EXISTS idx_fs_persuadability_system_time
  ON form_space.persuadability_profile(system_id, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_fs_persuadability_state
  ON form_space.persuadability_profile(state_id);

CREATE TABLE IF NOT EXISTS form_space.polycomputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  system_id text NOT NULL,
  trajectory_id uuid REFERENCES form_space.trajectory(id) ON DELETE SET NULL,
  observer_id text NOT NULL,
  decoded_computation text NOT NULL,
  decoder_ref text NOT NULL,
  predictive_information double precision
    CHECK (predictive_information IS NULL OR predictive_information >= 0),
  independence_score double precision
    CHECK (independence_score IS NULL OR independence_score BETWEEN 0 AND 1),
  stability_score double precision
    CHECK (stability_score IS NULL OR stability_score BETWEEN 0 AND 1),
  causal_support double precision
    CHECK (causal_support IS NULL OR causal_support BETWEEN 0 AND 1),
  complexity_penalty double precision
    CHECK (complexity_penalty IS NULL OR complexity_penalty >= 0),
  replication_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  epistemic_status text NOT NULL DEFAULT 'candidate'
    CHECK (epistemic_status IN ('candidate','supported','falsified','retired')),
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_poly_system
  ON form_space.polycomputation(system_id);
CREATE INDEX IF NOT EXISTS idx_fs_poly_trajectory
  ON form_space.polycomputation(trajectory_id);

CREATE TABLE IF NOT EXISTS form_space.side_quest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  system_id text NOT NULL,
  polycomputation_id uuid
    REFERENCES form_space.polycomputation(id) ON DELETE SET NULL,
  description text NOT NULL,
  side_quest_score double precision
    CHECK (side_quest_score IS NULL OR side_quest_score >= 0),
  persistence_score double precision
    CHECK (persistence_score IS NULL OR persistence_score BETWEEN 0 AND 1),
  independence_score double precision
    CHECK (independence_score IS NULL OR independence_score BETWEEN 0 AND 1),
  revealed_preference_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  anthropomorphic_interpretation_forbidden boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'candidate'
    CHECK (status IN
      ('candidate','replicating','supported','suppressed','sandboxed',
       'promoted','falsified','retired')),
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_sidequest_system_status
  ON form_space.side_quest(system_id, status);
CREATE INDEX IF NOT EXISTS idx_fs_sidequest_poly
  ON form_space.side_quest(polycomputation_id);

CREATE TABLE IF NOT EXISTS form_space.rewrite_trial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  system_id text NOT NULL,
  original_target_id uuid REFERENCES form_space.target(id) ON DELETE RESTRICT,
  candidate_target_id uuid REFERENCES form_space.target(id) ON DELETE RESTRICT,
  intervention_id uuid REFERENCES form_space.intervention(id) ON DELETE SET NULL,
  pre_state_id uuid REFERENCES form_space.state(id) ON DELETE RESTRICT,
  post_washout_state_id uuid REFERENCES form_space.state(id) ON DELETE RESTRICT,
  posterior_shift jsonb NOT NULL DEFAULT '{}'::jsonb,
  persistence_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  recovery_comparison jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','active','completed','failed','invalidated')),
  epistemic_result text NOT NULL DEFAULT 'pending'
    CHECK (epistemic_result IN
      ('pending','rewrite_supported','transient_only','inconclusive','falsified')),
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_rewrite_original
  ON form_space.rewrite_trial(original_target_id);
CREATE INDEX IF NOT EXISTS idx_fs_rewrite_candidate
  ON form_space.rewrite_trial(candidate_target_id);
CREATE INDEX IF NOT EXISTS idx_fs_rewrite_intervention
  ON form_space.rewrite_trial(intervention_id);
CREATE INDEX IF NOT EXISTS idx_fs_rewrite_pre
  ON form_space.rewrite_trial(pre_state_id);
CREATE INDEX IF NOT EXISTS idx_fs_rewrite_post
  ON form_space.rewrite_trial(post_washout_state_id);

CREATE TABLE IF NOT EXISTS form_space.psilo_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  requested_by text NOT NULL,
  scope jsonb NOT NULL,
  baseline_graph_ref text NOT NULL,
  phase text NOT NULL DEFAULT 'idle'
    CHECK (phase IN
      ('idle','onset','peak','comedown','integration','complete','killed')),
  dose_vector jsonb NOT NULL,
  hard_safety_policy_ref text NOT NULL,
  actions_enabled boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  ended_at timestamptz,
  integration_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  avani_status text NOT NULL DEFAULT 'NOT_EVALUATED'
    CHECK (avani_status IN ('NOT_EVALUATED','PASS','GATE','VETO')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN
      ('draft','approved','active','paused','complete','killed','failed','vetoed')),
  correlation_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (actions_enabled = false),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS idx_fs_psilo_status
  ON form_space.psilo_session(status, created_at DESC);

CREATE TABLE IF NOT EXISTS form_space.psilo_edge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL
    REFERENCES form_space.psilo_session(id) ON DELETE CASCADE,
  source_node_id text NOT NULL,
  target_node_id text NOT NULL,
  edge_type text NOT NULL,
  weight double precision NOT NULL CHECK (weight >= 0),
  ttl interval NOT NULL CHECK (ttl > interval '0 seconds'),
  reason text NOT NULL,
  trust_evaluation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  expired_at timestamptz,
  promoted boolean NOT NULL DEFAULT false,
  CHECK (source_node_id <> target_node_id),
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_fs_psilo_edge_session
  ON form_space.psilo_edge(session_id);
CREATE INDEX IF NOT EXISTS idx_fs_psilo_edge_expiry
  ON form_space.psilo_edge(expires_at)
  WHERE expired_at IS NULL;

CREATE TABLE IF NOT EXISTS form_space.psilo_afterimage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  session_id uuid NOT NULL
    REFERENCES form_space.psilo_session(id) ON DELETE CASCADE,
  afterimage_type text NOT NULL
    CHECK (afterimage_type IN
      ('candidate_edge','representation_bridge','hypothesis',
       'policy_change','agent_variant','other')),
  content jsonb NOT NULL,
  novelty_score double precision
    CHECK (novelty_score IS NULL OR novelty_score >= 0),
  validation_score double precision
    CHECK (validation_score IS NULL OR validation_score BETWEEN 0 AND 1),
  risk_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  promotion_status text NOT NULL DEFAULT 'candidate'
    CHECK (promotion_status IN
      ('candidate','testing','rejected','approved','promoted','retired')),
  sober_validation_ref text,
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_psilo_afterimage_session
  ON form_space.psilo_afterimage(session_id);

CREATE TABLE IF NOT EXISTS form_space.fci_trial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  protocol_version text NOT NULL,
  system_id text NOT NULL,
  organism_ref text,
  taxon_id uuid REFERENCES core.taxon(id) ON DELETE SET NULL,
  culture_or_site_ref text NOT NULL,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE RESTRICT,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  goal_contract_id uuid
    REFERENCES form_space.goal_contract(id) ON DELETE SET NULL,
  baseline_window tstzrange NOT NULL,
  perturbation_plan jsonb NOT NULL,
  control_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  washout_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  observables jsonb NOT NULL,
  avani_status text NOT NULL DEFAULT 'NOT_EVALUATED'
    CHECK (avani_status IN ('NOT_EVALUATED','PASS','GATE','VETO')),
  human_approval_ref text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN
      ('planned','approved','active','washout','completed','failed',
       'aborted','vetoed','invalidated')),
  evidence_root text,
  correlation_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_fci_trial_system_time
  ON form_space.fci_trial(system_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fs_fci_trial_taxon
  ON form_space.fci_trial(taxon_id);
CREATE INDEX IF NOT EXISTS idx_fs_fci_trial_space
  ON form_space.fci_trial(space_id);
CREATE INDEX IF NOT EXISTS idx_fs_fci_trial_chart
  ON form_space.fci_trial(chart_id);
CREATE INDEX IF NOT EXISTS idx_fs_fci_trial_goal
  ON form_space.fci_trial(goal_contract_id);

COMMIT;
