export const SINE_EVIDENCE_QUERY_DEFAULTS: Record<string, string> = {
  require_real_audio: "true",
  require_model_evidence: "true",
  allow_detector_only: "true",
  semantic_fallback: "false",
  llm_fallback: "false",
  prototype_matching: "true",
  sound_transcripts: "evidence_backed_only",
}

export const SINE_REQUESTED_OUTPUTS = [
  "detector_events",
  "model_outputs",
  "embeddings",
  "prototype_matches",
  "fusion_evidence",
  "sound_transcripts",
  "diagnostics",
] as const

export const SINE_TARGET_DOMAINS = ["water", "air", "ground"] as const

export const SINE_CLASS_FAMILIES = [
  "marine_bioacoustics",
  "terrestrial_bioacoustics",
  "insect_bioacoustics",
  "air_propeller",
  "water_propeller",
  "vessel_engine",
  "weather_lightning",
  "impulse_explosion",
  "ground_seismic",
  "mechanical",
  "geophysical",
  "unknown_pattern",
] as const

export const SINE_SOUND_TARGETS = [
  "whale_vocalization",
  "dolphin_clicks_whistles",
  "fish_chorus",
  "bird_call_song",
  "mammal_call",
  "amphibian_call",
  "insect_stridulation",
  "soil_bioacoustics",
  "hydrophone_biologic_unknown",
  "uav_quadcopter_rotor",
  "helicopter_rotor",
  "fixed_wing_aircraft",
  "air_drone_propeller",
  "boat_propeller",
  "submerged_propeller",
  "vessel_engine_hum",
  "submarine_mechanical_hum",
  "sonar_ping",
  "machinery_motor",
  "actuator_servo_stepper",
  "explosion_impulse",
  "gunshot_or_blast",
  "impact_pressure_spike",
  "lightning_thunder",
  "rain_wind_weather",
  "earthquake_seismic",
  "ground_surface_vibration",
  "underground_soil_motion",
  "water_pressure_impulse",
  "unknown_out_of_domain",
  "human_contested_label",
] as const

export const SINE_MODEL_FAMILY_TARGETS = [
  "deterministic_dsp",
  "log_mel_resnetish",
  "crnn_gru_temporal",
  "audio_spectrogram_transformer",
  "contrastive_embedding",
  "prototype_cosine_retrieval",
  "evidence_fusion",
  "sound_transcript_windows",
] as const

export const SINE_VISUALISATION_QUALITY = {
  max_waveform_points: 8192,
  max_time_frames: 1024,
  max_frequency_bins: 256,
  fft_size: 2048,
  hop_length: 128,
  window_function: "hann",
  include_peaks: true,
} as const

export const SINE_DEFAULT_ANALYSIS_WINDOW_SEC = 30
export const SINE_DEFAULT_ANALYSIS_OVERLAP_SEC = 5

export const SINE_EVIDENCE_CONTRACT = {
  require_real_audio_decode: true,
  require_explicit_model_status: true,
  require_model_provenance_for_semantic_labels: true,
  require_registered_model_for_identification_summary: true,
  require_model_outputs_for_identification_summary: true,
  require_runtime_artifact_checksum_for_model_outputs: true,
  require_prototype_identity_for_deep_signal_matches: true,
  require_vector_checksum_for_deep_signal_matches: true,
  require_fusion_links_for_semantic_labels: true,
  require_evidence_links_for_sound_transcripts: true,
  require_window_metadata_for_long_audio: true,
  allow_detector_only_response: true,
  allow_llm_semantic_fallback: false,
  allow_filename_semantic_fallback: false,
  allow_metadata_semantic_fallback: false,
  allow_mock_or_synthetic_outputs: false,
  expected_missing_model_status: "model_unavailable",
  expected_unsupported_domain_status: "out_of_domain",
  expected_low_confidence_status: "unknown",
  requested_outputs: SINE_REQUESTED_OUTPUTS,
} as const

export const SINE_REQUEST_CONTRACT = {
  target_domains: SINE_TARGET_DOMAINS,
  class_families: SINE_CLASS_FAMILIES,
  sound_targets: SINE_SOUND_TARGETS,
  model_family_targets: SINE_MODEL_FAMILY_TARGETS,
  prototype_matching: true,
  out_of_domain_required: true,
  human_review_required: true,
  require_chronological_sound_transcripts: true,
  require_model_provenance: true,
  require_prototype_vector_provenance: true,
  require_human_review_queue: true,
  default_window_sec: SINE_DEFAULT_ANALYSIS_WINDOW_SEC,
  default_overlap_sec: SINE_DEFAULT_ANALYSIS_OVERLAP_SEC,
  visualisation_quality: SINE_VISUALISATION_QUALITY,
} as const
