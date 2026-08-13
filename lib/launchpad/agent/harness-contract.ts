/**
 * Local MYCA harness → cloud contract (WP-3).
 *
 * Cloud stores sanitized check results only. Agents never flip a control.
 * Claude console: proposals land in the approval inbox; humans confirm.
 */

export const MYCA_HARNESS_CHECK_PREFIX = 'myca.';

export const MYCA_HARNESS_SUBAGENTS = [
  'readiness',
  'evidence',
  'document',
  'systems_check',
  'radar',
] as const;

export const MYCA_HARNESS_SYNC = {
  resultsPath: '/api/fusarium/launchpad/local-agent/results',
  enrollPath: '/api/fusarium/launchpad/local-agent/enroll',
  tasksPath: '/api/fusarium/launchpad/tasks',
  controlsPath: '/api/fusarium/launchpad/readiness/controls',
  radarPath: '/api/fusarium/launchpad/radar/opportunities',
  radarRankPath: '/api/fusarium/launchpad/radar/rank',
} as const;

/** Hard rule: no AI/agent path may set implemented. */
export const HARNESS_NEVER_FLIPS_CONTROL = true;
