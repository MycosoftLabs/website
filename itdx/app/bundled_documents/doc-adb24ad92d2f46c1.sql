-- STAGED MIGRATION — DO NOT APPLY DIRECTLY TO PRODUCTION
-- MINDEX Form Space Core
-- Rename 00XX to the next free MINDEX migration number before merge.
-- Dependencies: telemetry.device, telemetry.sample, app schema, pgcrypto.

BEGIN;

CREATE SCHEMA IF NOT EXISTS form_space;
COMMENT ON SCHEMA form_space IS
'Canonical Mycosoft Form Space Atlas and scientific lineage.';

CREATE OR REPLACE FUNCTION form_space.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, form_space
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS form_space.model_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  version text NOT NULL,
  model_type text NOT NULL,
  artifact_uri text,
  artifact_sha256 text,
  training_run_ref text,
  evaluation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_schema_version text NOT NULL,
  output_schema_version text NOT NULL,
  status text NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','validated','shadow','active','retired','rejected')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  retired_at timestamptz,
  UNIQUE (model_name, version)
);
CREATE INDEX IF NOT EXISTS idx_fs_model_status
  ON form_space.model_version(status);
CREATE INDEX IF NOT EXISTS idx_fs_model_type
  ON form_space.model_version(model_type);

CREATE TABLE IF NOT EXISTS form_space.space (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  name text NOT NULL,
  domain text NOT NULL,
  definition text NOT NULL,
  ontology_version text NOT NULL,
  coordinate_domains text[] NOT NULL DEFAULT '{}',
  default_metric_id uuid,
  visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('public','internal','restricted','classified')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','deprecated','retired')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_space_domain_status
  ON form_space.space(domain, status);

CREATE TABLE IF NOT EXISTS form_space.metric (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE CASCADE,
  name text NOT NULL,
  metric_type text NOT NULL,
  definition jsonb NOT NULL,
  context_selector jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version_id uuid REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','validated','active','retired','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, name)
);
CREATE INDEX IF NOT EXISTS idx_fs_metric_space
  ON form_space.metric(space_id);
CREATE INDEX IF NOT EXISTS idx_fs_metric_model
  ON form_space.metric(model_version_id);

ALTER TABLE form_space.space
  DROP CONSTRAINT IF EXISTS fk_fs_space_default_metric;
ALTER TABLE form_space.space
  ADD CONSTRAINT fk_fs_space_default_metric
  FOREIGN KEY (default_metric_id)
  REFERENCES form_space.metric(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS form_space.chart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE CASCADE,
  name text NOT NULL,
  chart_version text NOT NULL,
  dimensions integer NOT NULL CHECK (dimensions > 0),
  coordinate_schema jsonb NOT NULL,
  selector_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  metric_id uuid REFERENCES form_space.metric(id) ON DELETE RESTRICT,
  model_version_id uuid REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  open_set_threshold double precision
    CHECK (open_set_threshold IS NULL OR open_set_threshold BETWEEN 0 AND 1),
  status text NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','validated','active','retired','rejected')),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, name, chart_version),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);
CREATE INDEX IF NOT EXISTS idx_fs_chart_space_status
  ON form_space.chart(space_id, status);
CREATE INDEX IF NOT EXISTS idx_fs_chart_metric
  ON form_space.chart(metric_id);
CREATE INDEX IF NOT EXISTS idx_fs_chart_model
  ON form_space.chart(model_version_id);

CREATE TABLE IF NOT EXISTS form_space.chart_transition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_chart_id uuid NOT NULL REFERENCES form_space.chart(id) ON DELETE CASCADE,
  target_chart_id uuid NOT NULL REFERENCES form_space.chart(id) ON DELETE CASCADE,
  transform_definition jsonb NOT NULL,
  inverse_definition jsonb,
  model_version_id uuid REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  validation_error double precision
    CHECK (validation_error IS NULL OR validation_error >= 0),
  validity_region jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','validated','active','retired','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_chart_id, target_chart_id),
  CHECK (source_chart_id <> target_chart_id)
);
CREATE INDEX IF NOT EXISTS idx_fs_chart_transition_source
  ON form_space.chart_transition(source_chart_id);
CREATE INDEX IF NOT EXISTS idx_fs_chart_transition_target
  ON form_space.chart_transition(target_chart_id);
CREATE INDEX IF NOT EXISTS idx_fs_chart_transition_model
  ON form_space.chart_transition(model_version_id);

CREATE TABLE IF NOT EXISTS form_space.embodiment_binding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  system_id text NOT NULL,
  device_id uuid REFERENCES telemetry.device(id) ON DELETE SET NULL,
  embodiment_type text NOT NULL,
  architecture_hash text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  boundary_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','superseded','retired')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);
CREATE INDEX IF NOT EXISTS idx_fs_embodiment_system
  ON form_space.embodiment_binding(system_id, status);
CREATE INDEX IF NOT EXISTS idx_fs_embodiment_device
  ON form_space.embodiment_binding(device_id);

CREATE TABLE IF NOT EXISTS form_space.target (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE CASCADE,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  name text NOT NULL,
  target_type text NOT NULL
    CHECK (target_type IN
      ('manifold','setpoint','blueprint','goal_region','maintenance_region','unknown')),
  manifold_definition jsonb NOT NULL,
  acceptance_metric_id uuid REFERENCES form_space.metric(id) ON DELETE RESTRICT,
  acceptance_epsilon double precision
    CHECK (acceptance_epsilon IS NULL OR acceptance_epsilon >= 0),
  invariants jsonb NOT NULL DEFAULT '[]'::jsonb,
  stop_condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  epistemic_status text NOT NULL DEFAULT 'candidate'
    CHECK (epistemic_status IN
      ('candidate','supported','cross_substrate_supported','falsified','retired')),
  model_version_id uuid REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  evidence_root text,
  falsifiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, name)
);
CREATE INDEX IF NOT EXISTS idx_fs_target_space_status
  ON form_space.target(space_id, epistemic_status);
CREATE INDEX IF NOT EXISTS idx_fs_target_chart
  ON form_space.target(chart_id);
CREATE INDEX IF NOT EXISTS idx_fs_target_metric
  ON form_space.target(acceptance_metric_id);
CREATE INDEX IF NOT EXISTS idx_fs_target_model
  ON form_space.target(model_version_id);

CREATE TABLE IF NOT EXISTS form_space.attractor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE CASCADE,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  target_id uuid REFERENCES form_space.target(id) ON DELETE SET NULL,
  name text NOT NULL,
  attractor_type text NOT NULL
    CHECK (attractor_type IN
      ('fixed_point','limit_cycle','manifold','metastable','switching','unknown')),
  representation jsonb NOT NULL,
  energy_model_ref text,
  stability_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  basin_estimate jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version_id uuid REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  evidence_root text,
  epistemic_status text NOT NULL DEFAULT 'candidate'
    CHECK (epistemic_status IN ('candidate','supported','falsified','retired')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, name)
);
CREATE INDEX IF NOT EXISTS idx_fs_attractor_space_status
  ON form_space.attractor(space_id, epistemic_status);
CREATE INDEX IF NOT EXISTS idx_fs_attractor_chart
  ON form_space.attractor(chart_id);
CREATE INDEX IF NOT EXISTS idx_fs_attractor_target
  ON form_space.attractor(target_id);
CREATE INDEX IF NOT EXISTS idx_fs_attractor_model
  ON form_space.attractor(model_version_id);

CREATE TABLE IF NOT EXISTS form_space.state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  schema_version text NOT NULL,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE RESTRICT,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  system_id text NOT NULL,
  embodiment_binding_id uuid
    REFERENCES form_space.embodiment_binding(id) ON DELETE SET NULL,
  observed_at timestamptz NOT NULL,
  valid_until timestamptz,
  coordinates jsonb NOT NULL,
  form_signature_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_posterior jsonb NOT NULL DEFAULT '{}'::jsonb,
  nearest_attractors jsonb NOT NULL DEFAULT '[]'::jsonb,
  distance_to_target jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_velocity jsonb NOT NULL DEFAULT '{}'::jsonb,
  reachable_region_ref text,
  viability_status text NOT NULL DEFAULT 'unknown'
    CHECK (viability_status IN ('inside','near_boundary','outside','unknown')),
  completion_probability double precision
    CHECK (completion_probability IS NULL OR completion_probability BETWEEN 0 AND 1),
  stop_probability double precision
    CHECK (stop_probability IS NULL OR stop_probability BETWEEN 0 AND 1),
  uncertainty jsonb NOT NULL,
  evidence_root text,
  model_version_id uuid NOT NULL
    REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  avani_status text NOT NULL DEFAULT 'NOT_EVALUATED'
    CHECK (avani_status IN ('NOT_EVALUATED','PASS','GATE','VETO')),
  epistemic_status text NOT NULL DEFAULT 'candidate'
    CHECK (epistemic_status IN
      ('observation','candidate','supported','falsified','superseded')),
  supersedes_state_id uuid REFERENCES form_space.state(id) ON DELETE SET NULL,
  correction_reason text,
  correlation_id uuid,
  causation_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  provenance jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > observed_at),
  CHECK (supersedes_state_id IS NULL OR supersedes_state_id <> id)
);
CREATE INDEX IF NOT EXISTS idx_fs_state_system_time
  ON form_space.state(system_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fs_state_space_time
  ON form_space.state(space_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fs_state_chart_time
  ON form_space.state(chart_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fs_state_model
  ON form_space.state(model_version_id);
CREATE INDEX IF NOT EXISTS idx_fs_state_embodiment
  ON form_space.state(embodiment_binding_id);
CREATE INDEX IF NOT EXISTS idx_fs_state_supersedes
  ON form_space.state(supersedes_state_id);
CREATE INDEX IF NOT EXISTS idx_fs_state_observed_brin
  ON form_space.state USING BRIN(observed_at);

CREATE TABLE IF NOT EXISTS form_space.state_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid NOT NULL REFERENCES form_space.state(id) ON DELETE CASCADE,
  sample_id uuid REFERENCES telemetry.sample(id) ON DELETE RESTRICT,
  evidence_uri text,
  evidence_type text NOT NULL,
  role text NOT NULL DEFAULT 'supporting'
    CHECK (role IN
      ('primary','supporting','context','counterevidence','calibration','control')),
  content_hash text,
  verified boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sample_id IS NOT NULL OR evidence_uri IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fs_state_evidence_sample
  ON form_space.state_evidence(state_id, sample_id)
  WHERE sample_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_fs_state_evidence_uri
  ON form_space.state_evidence(state_id, evidence_uri)
  WHERE evidence_uri IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fs_state_evidence_state
  ON form_space.state_evidence(state_id);
CREATE INDEX IF NOT EXISTS idx_fs_state_evidence_sample
  ON form_space.state_evidence(sample_id);
CREATE INDEX IF NOT EXISTS idx_fs_state_evidence_hash
  ON form_space.state_evidence(content_hash);

CREATE TABLE IF NOT EXISTS form_space.goal_contract (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  schema_version text NOT NULL,
  system_id text NOT NULL,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE RESTRICT,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  target_id uuid REFERENCES form_space.target(id) ON DELETE RESTRICT,
  requested_by text NOT NULL,
  title text NOT NULL,
  target_manifold jsonb NOT NULL,
  acceptable_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_invariants jsonb NOT NULL DEFAULT '[]'::jsonb,
  forbidden_regions jsonb NOT NULL DEFAULT '[]'::jsonb,
  resource_budget jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  uncertainty_limit double precision
    CHECK (uncertainty_limit IS NULL OR uncertainty_limit BETWEEN 0 AND 1),
  completion_test jsonb NOT NULL,
  stop_conditions jsonb NOT NULL,
  rollback_conditions jsonb NOT NULL,
  repair_authority jsonb NOT NULL DEFAULT '{}'::jsonb,
  avani_policy_ref text NOT NULL,
  avani_status text NOT NULL DEFAULT 'NOT_EVALUATED'
    CHECK (avani_status IN ('NOT_EVALUATED','PASS','GATE','VETO')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN
      ('draft','submitted','planning','gated','approved','active','paused',
       'completed','failed','rolled_back','cancelled','vetoed')),
  correlation_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_goal_system_status
  ON form_space.goal_contract(system_id, status);
CREATE INDEX IF NOT EXISTS idx_fs_goal_space
  ON form_space.goal_contract(space_id);
CREATE INDEX IF NOT EXISTS idx_fs_goal_chart
  ON form_space.goal_contract(chart_id);
CREATE INDEX IF NOT EXISTS idx_fs_goal_target
  ON form_space.goal_contract(target_id);

CREATE TABLE IF NOT EXISTS form_space.goal_contract_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_contract_id uuid NOT NULL
    REFERENCES form_space.goal_contract(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid,
  causation_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  provenance_hash text
);
CREATE INDEX IF NOT EXISTS idx_fs_goal_event_goal_time
  ON form_space.goal_contract_event(goal_contract_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS form_space.trajectory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  system_id text NOT NULL,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE RESTRICT,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  goal_contract_id uuid
    REFERENCES form_space.goal_contract(id) ON DELETE SET NULL,
  start_state_id uuid REFERENCES form_space.state(id) ON DELETE RESTRICT,
  terminal_state_id uuid REFERENCES form_space.state(id) ON DELETE SET NULL,
  trajectory_type text NOT NULL
    CHECK (trajectory_type IN
      ('observed','predicted','counterfactual','planned','recovery','simulation')),
  status text NOT NULL DEFAULT 'candidate'
    CHECK (status IN
      ('candidate','selected','active','completed','failed','aborted','rejected')),
  planned_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  predicted_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version_id uuid
    REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  avani_status text NOT NULL DEFAULT 'NOT_EVALUATED'
    CHECK (avani_status IN ('NOT_EVALUATED','PASS','GATE','VETO')),
  started_at timestamptz,
  ended_at timestamptz,
  correlation_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS idx_fs_trajectory_system_time
  ON form_space.trajectory(system_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fs_trajectory_goal
  ON form_space.trajectory(goal_contract_id);
CREATE INDEX IF NOT EXISTS idx_fs_trajectory_start
  ON form_space.trajectory(start_state_id);
CREATE INDEX IF NOT EXISTS idx_fs_trajectory_terminal
  ON form_space.trajectory(terminal_state_id);
CREATE INDEX IF NOT EXISTS idx_fs_trajectory_model
  ON form_space.trajectory(model_version_id);

CREATE TABLE IF NOT EXISTS form_space.trajectory_state (
  trajectory_id uuid NOT NULL
    REFERENCES form_space.trajectory(id) ON DELETE CASCADE,
  sequence_no integer NOT NULL CHECK (sequence_no >= 0),
  state_id uuid REFERENCES form_space.state(id) ON DELETE RESTRICT,
  predicted_state jsonb,
  expected_at timestamptz,
  observed_at timestamptz,
  role text NOT NULL DEFAULT 'intermediate'
    CHECK (role IN ('start','intermediate','target','terminal','counterfactual')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (trajectory_id, sequence_no),
  CHECK (state_id IS NOT NULL OR predicted_state IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_fs_trajectory_state_state
  ON form_space.trajectory_state(state_id);

CREATE TABLE IF NOT EXISTS form_space.intervention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  system_id text NOT NULL,
  goal_contract_id uuid
    REFERENCES form_space.goal_contract(id) ON DELETE SET NULL,
  trajectory_id uuid REFERENCES form_space.trajectory(id) ON DELETE SET NULL,
  intervention_type text NOT NULL,
  parameters jsonb NOT NULL,
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by text,
  approved_at timestamptz,
  executed_by text,
  executed_at timestamptz,
  completed_at timestamptz,
  reversibility text NOT NULL
    CHECK (reversibility IN ('full','partial','none','unknown')),
  rollback_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  avani_status text NOT NULL DEFAULT 'NOT_EVALUATED'
    CHECK (avani_status IN ('NOT_EVALUATED','PASS','GATE','VETO')),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN
      ('proposed','gated','approved','executing','completed','failed',
       'aborted','rolled_back','vetoed')),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid,
  causation_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_intervention_system_time
  ON form_space.intervention(system_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_fs_intervention_goal
  ON form_space.intervention(goal_contract_id);
CREATE INDEX IF NOT EXISTS idx_fs_intervention_trajectory
  ON form_space.intervention(trajectory_id);
CREATE INDEX IF NOT EXISTS idx_fs_intervention_status
  ON form_space.intervention(status);

CREATE TABLE IF NOT EXISTS form_space.recovery_trial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text NOT NULL UNIQUE,
  system_id text NOT NULL,
  space_id uuid NOT NULL REFERENCES form_space.space(id) ON DELETE RESTRICT,
  chart_id uuid REFERENCES form_space.chart(id) ON DELETE RESTRICT,
  target_id uuid REFERENCES form_space.target(id) ON DELETE RESTRICT,
  intervention_id uuid
    REFERENCES form_space.intervention(id) ON DELETE SET NULL,
  baseline_state_id uuid NOT NULL
    REFERENCES form_space.state(id) ON DELETE RESTRICT,
  perturbed_state_id uuid REFERENCES form_space.state(id) ON DELETE RESTRICT,
  terminal_state_id uuid REFERENCES form_space.state(id) ON DELETE RESTRICT,
  passive_model_version_id uuid
    REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  goal_model_version_id uuid
    REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  recovery_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  passive_baseline_comparison jsonb NOT NULL DEFAULT '{}'::jsonb,
  route_signature jsonb NOT NULL DEFAULT '{}'::jsonb,
  stop_behavior jsonb NOT NULL DEFAULT '{}'::jsonb,
  replication_group text,
  blinded boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN
      ('planned','active','completed','failed','aborted','invalidated')),
  epistemic_result text NOT NULL DEFAULT 'pending'
    CHECK (epistemic_result IN
      ('pending','supports_target','supports_passive','inconclusive','falsifies_target')),
  evidence_root text,
  correlation_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);
CREATE INDEX IF NOT EXISTS idx_fs_recovery_system_time
  ON form_space.recovery_trial(system_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_fs_recovery_target
  ON form_space.recovery_trial(target_id);
CREATE INDEX IF NOT EXISTS idx_fs_recovery_intervention
  ON form_space.recovery_trial(intervention_id);
CREATE INDEX IF NOT EXISTS idx_fs_recovery_baseline
  ON form_space.recovery_trial(baseline_state_id);
CREATE INDEX IF NOT EXISTS idx_fs_recovery_perturbed
  ON form_space.recovery_trial(perturbed_state_id);
CREATE INDEX IF NOT EXISTS idx_fs_recovery_terminal
  ON form_space.recovery_trial(terminal_state_id);
CREATE INDEX IF NOT EXISTS idx_fs_recovery_passive_model
  ON form_space.recovery_trial(passive_model_version_id);
CREATE INDEX IF NOT EXISTS idx_fs_recovery_goal_model
  ON form_space.recovery_trial(goal_model_version_id);

CREATE TABLE IF NOT EXISTS form_space.uncertainty_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid REFERENCES form_space.state(id) ON DELETE CASCADE,
  target_id uuid REFERENCES form_space.target(id) ON DELETE CASCADE,
  trajectory_id uuid REFERENCES form_space.trajectory(id) ON DELETE CASCADE,
  uncertainty_type text NOT NULL
    CHECK (uncertainty_type IN
      ('aleatoric','epistemic','model','measurement','missingness','context','combined')),
  value double precision CHECK (value IS NULL OR value BETWEEN 0 AND 1),
  interval jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  calibration_method text,
  model_version_id uuid
    REFERENCES form_space.model_version(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (
    ((state_id IS NOT NULL)::integer
      + (target_id IS NOT NULL)::integer
      + (trajectory_id IS NOT NULL)::integer) = 1
  )
);
CREATE INDEX IF NOT EXISTS idx_fs_uncertainty_state
  ON form_space.uncertainty_record(state_id);
CREATE INDEX IF NOT EXISTS idx_fs_uncertainty_target
  ON form_space.uncertainty_record(target_id);
CREATE INDEX IF NOT EXISTS idx_fs_uncertainty_trajectory
  ON form_space.uncertainty_record(trajectory_id);
CREATE INDEX IF NOT EXISTS idx_fs_uncertainty_model
  ON form_space.uncertainty_record(model_version_id);

CREATE TABLE IF NOT EXISTS form_space.event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  schema_version text NOT NULL,
  producer text NOT NULL,
  system_id text,
  space_uri text,
  chart_uri text,
  form_state_uri text,
  correlation_id uuid,
  causation_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  provenance_hash text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN
      ('pending','publishing','published','failed','dead_letter')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  published_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fs_outbox_claim
  ON form_space.event_outbox(status, available_at, created_at)
  WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_fs_outbox_aggregate
  ON form_space.event_outbox(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_fs_outbox_correlation
  ON form_space.event_outbox(correlation_id);

CREATE OR REPLACE VIEW app.v_form_state_latest AS
SELECT DISTINCT ON (s.system_id, s.space_id)
  s.id,
  s.uri,
  s.schema_version,
  s.system_id,
  sp.uri AS space_uri,
  c.uri AS chart_uri,
  s.observed_at,
  s.valid_until,
  s.coordinates,
  s.form_signature_ref,
  s.target_posterior,
  s.nearest_attractors,
  s.distance_to_target,
  s.form_velocity,
  s.reachable_region_ref,
  s.viability_status,
  s.completion_probability,
  s.stop_probability,
  s.uncertainty,
  s.evidence_root,
  mv.model_name,
  mv.version AS model_version,
  s.avani_status,
  s.epistemic_status,
  s.provenance
FROM form_space.state s
JOIN form_space.space sp ON sp.id = s.space_id
LEFT JOIN form_space.chart c ON c.id = s.chart_id
JOIN form_space.model_version mv ON mv.id = s.model_version_id
ORDER BY s.system_id, s.space_id, s.observed_at DESC, s.created_at DESC;

CREATE OR REPLACE VIEW app.v_form_goal_status AS
SELECT
  g.id,
  g.uri,
  g.system_id,
  sp.uri AS space_uri,
  c.uri AS chart_uri,
  t.uri AS target_uri,
  g.title,
  g.status,
  g.avani_status,
  g.uncertainty_limit,
  g.created_at,
  g.updated_at
FROM form_space.goal_contract g
JOIN form_space.space sp ON sp.id = g.space_id
LEFT JOIN form_space.chart c ON c.id = g.chart_id
LEFT JOIN form_space.target t ON t.id = g.target_id;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT unnest(ARRAY[
      'space','metric','chart','chart_transition','embodiment_binding',
      'target','attractor','goal_contract','trajectory','intervention','recovery_trial'
    ]) AS table_name
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_fs_%I_touch ON form_space.%I',
                   rec.table_name, rec.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_fs_%I_touch BEFORE UPDATE ON form_space.%I '
      'FOR EACH ROW EXECUTE FUNCTION form_space.touch_updated_at()',
      rec.table_name, rec.table_name
    );
  END LOOP;
END;
$$;

COMMIT;
