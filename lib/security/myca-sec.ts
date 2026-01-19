/**
 * MYCA-SEC: AI-Driven Security Engine
 * 
 * Provides threat pattern recognition, risk scoring,
 * autonomous decision framework, and learning capabilities.
 */

import type { ThreatLevel, IPReputation } from './threat-intel';
import type { PlaybookTrigger } from './playbooks';

export interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  indicators: PatternIndicator[];
  severity: ThreatLevel;
  confidence: number; // 0-100
  ttps: string[]; // MITRE ATT&CK TTPs
  recommendedActions: string[];
}

export interface PatternIndicator {
  type: 'ip' | 'port' | 'protocol' | 'behavior' | 'time' | 'geo';
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'regex';
  value: string | number | string[];
  weight: number; // 0-1
}

export interface RiskScore {
  overall: number; // 0-100
  components: {
    reputation: number;
    behavior: number;
    context: number;
    historical: number;
  };
  factors: RiskFactor[];
  recommendation: 'allow' | 'monitor' | 'rate_limit' | 'challenge' | 'block';
  confidence: number;
  reasoning: string;
}

export interface RiskFactor {
  name: string;
  impact: number; // -50 to +50
  description: string;
}

export interface SecurityDecision {
  id: string;
  timestamp: string;
  trigger: string;
  context: Record<string, unknown>;
  analysis: RiskScore;
  decision: 'allow' | 'block' | 'escalate' | 'investigate';
  actions: string[];
  automated: boolean;
  reviewRequired: boolean;
}

export interface LearningEvent {
  id: string;
  timestamp: string;
  decisionId: string;
  feedback: 'correct' | 'false_positive' | 'false_negative' | 'uncertain';
  providedBy: string;
  notes?: string;
}

// Built-in threat patterns (MITRE ATT&CK aligned)
const THREAT_PATTERNS: ThreatPattern[] = [
  {
    id: 'tp-brute-force',
    name: 'Credential Brute Force',
    description: 'Multiple failed authentication attempts indicating password guessing attack',
    indicators: [
      { type: 'behavior', field: 'failed_auth_count', operator: 'greater_than', value: 5, weight: 0.8 },
      { type: 'time', field: 'time_window_seconds', operator: 'less_than', value: 300, weight: 0.6 },
      { type: 'behavior', field: 'unique_usernames', operator: 'greater_than', value: 1, weight: 0.4 },
    ],
    severity: 'high',
    confidence: 85,
    ttps: ['T1110', 'T1110.001', 'T1110.003'],
    recommendedActions: ['block_ip', 'alert_soc', 'log_event'],
  },
  {
    id: 'tp-port-scan',
    name: 'Network Reconnaissance',
    description: 'Systematic port scanning indicating network reconnaissance',
    indicators: [
      { type: 'behavior', field: 'unique_ports_accessed', operator: 'greater_than', value: 20, weight: 0.9 },
      { type: 'time', field: 'time_window_seconds', operator: 'less_than', value: 60, weight: 0.7 },
      { type: 'behavior', field: 'connection_type', operator: 'equals', value: 'syn_only', weight: 0.5 },
    ],
    severity: 'medium',
    confidence: 80,
    ttps: ['T1046'],
    recommendedActions: ['rate_limit', 'alert_soc', 'log_event'],
  },
  {
    id: 'tp-data-exfil',
    name: 'Data Exfiltration',
    description: 'Unusual outbound data transfer indicating potential data theft',
    indicators: [
      { type: 'behavior', field: 'outbound_bytes', operator: 'greater_than', value: 524288000, weight: 0.9 },
      { type: 'time', field: 'transfer_duration_minutes', operator: 'less_than', value: 60, weight: 0.6 },
      { type: 'behavior', field: 'destination_type', operator: 'in', value: ['cloud_storage', 'unknown'], weight: 0.7 },
    ],
    severity: 'critical',
    confidence: 75,
    ttps: ['T1048', 'T1567'],
    recommendedActions: ['block_connection', 'quarantine_device', 'alert_soc', 'escalate'],
  },
  {
    id: 'tp-lateral-movement',
    name: 'Lateral Movement',
    description: 'Internal system-to-system connections indicating lateral movement',
    indicators: [
      { type: 'behavior', field: 'internal_connections', operator: 'greater_than', value: 10, weight: 0.8 },
      { type: 'behavior', field: 'smb_connections', operator: 'greater_than', value: 3, weight: 0.7 },
      { type: 'behavior', field: 'admin_share_access', operator: 'equals', value: true, weight: 0.9 },
    ],
    severity: 'high',
    confidence: 70,
    ttps: ['T1021', 'T1021.002'],
    recommendedActions: ['investigate', 'isolate_source', 'alert_soc'],
  },
  {
    id: 'tp-c2-beacon',
    name: 'Command & Control Beacon',
    description: 'Periodic outbound connections indicating C2 communication',
    indicators: [
      { type: 'behavior', field: 'connection_pattern', operator: 'equals', value: 'periodic', weight: 0.9 },
      { type: 'behavior', field: 'destination_reputation', operator: 'equals', value: 'suspicious', weight: 0.8 },
      { type: 'protocol', field: 'protocol', operator: 'in', value: ['dns', 'https', 'http'], weight: 0.5 },
    ],
    severity: 'critical',
    confidence: 65,
    ttps: ['T1071', 'T1573'],
    recommendedActions: ['block_destination', 'quarantine_device', 'forensic_capture', 'escalate'],
  },
];

// Decision history for learning
const decisionHistory: SecurityDecision[] = [];
const learningEvents: LearningEvent[] = [];

// Baseline metrics for anomaly detection
const baselines = new Map<string, { mean: number; stdDev: number; samples: number[] }>();

/**
 * Calculate risk score for an entity
 */
export async function calculateRiskScore(
  context: {
    ip?: string;
    reputation?: IPReputation;
    behaviorMetrics?: Record<string, number>;
    historicalEvents?: number;
    geoData?: { country: string; isHighRisk: boolean };
  }
): Promise<RiskScore> {
  const factors: RiskFactor[] = [];
  let reputationScore = 0;
  let behaviorScore = 0;
  let contextScore = 0;
  let historicalScore = 0;

  // Reputation component (0-100)
  if (context.reputation) {
    reputationScore = context.reputation.score;
    
    if (context.reputation.isTor) {
      factors.push({ name: 'Tor Exit Node', impact: 20, description: 'IP is a known Tor exit node' });
    }
    if (context.reputation.isVpn) {
      factors.push({ name: 'VPN/Proxy', impact: 10, description: 'Connection through VPN or proxy' });
    }
    if (context.reputation.reportsCount > 10) {
      factors.push({ name: 'Multiple Reports', impact: 15, description: `${context.reputation.reportsCount} abuse reports` });
    }
  }

  // Behavior component (0-100)
  if (context.behaviorMetrics) {
    const metrics = context.behaviorMetrics;
    
    if (metrics.failed_auth_count > 3) {
      behaviorScore += 25;
      factors.push({ name: 'Failed Auth', impact: 25, description: `${metrics.failed_auth_count} failed attempts` });
    }
    if (metrics.unique_ports_accessed > 10) {
      behaviorScore += 20;
      factors.push({ name: 'Port Scanning', impact: 20, description: `${metrics.unique_ports_accessed} ports accessed` });
    }
    if (metrics.outbound_bytes > 100000000) {
      behaviorScore += 30;
      factors.push({ name: 'High Outbound', impact: 30, description: 'Unusual data transfer volume' });
    }
  }

  // Context component (0-100)
  if (context.geoData) {
    if (context.geoData.isHighRisk) {
      contextScore += 40;
      factors.push({ name: 'High-Risk Country', impact: 40, description: `Origin: ${context.geoData.country}` });
    }
  }

  // Historical component (0-100)
  if (context.historicalEvents !== undefined) {
    historicalScore = Math.min(100, context.historicalEvents * 10);
    if (context.historicalEvents > 0) {
      factors.push({ name: 'Previous Incidents', impact: context.historicalEvents * 10, description: `${context.historicalEvents} prior events` });
    }
  }

  // Calculate overall score (weighted average)
  const overall = Math.min(100, Math.round(
    reputationScore * 0.35 +
    behaviorScore * 0.30 +
    contextScore * 0.20 +
    historicalScore * 0.15
  ));

  // Determine recommendation
  let recommendation: RiskScore['recommendation'];
  if (overall >= 80) recommendation = 'block';
  else if (overall >= 60) recommendation = 'challenge';
  else if (overall >= 40) recommendation = 'rate_limit';
  else if (overall >= 20) recommendation = 'monitor';
  else recommendation = 'allow';

  // Generate reasoning
  const topFactors = factors.sort((a, b) => b.impact - a.impact).slice(0, 3);
  const reasoning = topFactors.length > 0
    ? `Risk elevated due to: ${topFactors.map(f => f.name).join(', ')}`
    : 'No significant risk factors identified';

  return {
    overall,
    components: {
      reputation: reputationScore,
      behavior: behaviorScore,
      context: contextScore,
      historical: historicalScore,
    },
    factors,
    recommendation,
    confidence: calculateConfidence(factors),
    reasoning,
  };
}

/**
 * Calculate confidence based on available data
 */
function calculateConfidence(factors: RiskFactor[]): number {
  // More factors = more confidence in the assessment
  const baseConfidence = 50;
  const factorBonus = Math.min(40, factors.length * 10);
  const impactCertainty = factors.reduce((sum, f) => sum + Math.abs(f.impact), 0) / 10;
  
  return Math.min(100, Math.round(baseConfidence + factorBonus + impactCertainty));
}

/**
 * Match event against threat patterns
 */
export function matchThreatPatterns(
  event: Record<string, unknown>
): ThreatPattern[] {
  const matches: ThreatPattern[] = [];

  for (const pattern of THREAT_PATTERNS) {
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const indicator of pattern.indicators) {
      totalWeight += indicator.weight;
      const value = event[indicator.field];
      
      if (value === undefined) continue;

      let matched = false;
      switch (indicator.operator) {
        case 'equals':
          matched = value === indicator.value;
          break;
        case 'greater_than':
          matched = typeof value === 'number' && value > (indicator.value as number);
          break;
        case 'less_than':
          matched = typeof value === 'number' && value < (indicator.value as number);
          break;
        case 'contains':
          matched = String(value).includes(String(indicator.value));
          break;
        case 'in':
          matched = Array.isArray(indicator.value) && indicator.value.includes(value);
          break;
        case 'regex':
          matched = new RegExp(String(indicator.value)).test(String(value));
          break;
      }

      if (matched) {
        matchedWeight += indicator.weight;
      }
    }

    // Pattern matches if we have >50% indicator match
    if (totalWeight > 0 && matchedWeight / totalWeight > 0.5) {
      matches.push(pattern);
    }
  }

  return matches.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, safe: 4, unknown: 5 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Make autonomous security decision
 */
export async function makeSecurityDecision(
  trigger: PlaybookTrigger,
  context: Record<string, unknown>
): Promise<SecurityDecision> {
  const riskScore = await calculateRiskScore({
    ip: context.sourceIp as string,
    behaviorMetrics: context.metrics as Record<string, number>,
    historicalEvents: context.previousEvents as number,
    geoData: context.geo as { country: string; isHighRisk: boolean },
  });

  const patterns = matchThreatPatterns(context);
  const topPattern = patterns[0];

  // Determine decision based on risk and patterns
  let decision: SecurityDecision['decision'];
  let actions: string[] = [];
  let automated = true;
  let reviewRequired = false;

  if (riskScore.overall >= 80 || topPattern?.severity === 'critical') {
    decision = 'block';
    actions = ['block_ip', 'alert_soc', 'log_forensics'];
    reviewRequired = true;
  } else if (riskScore.overall >= 60 || topPattern?.severity === 'high') {
    decision = 'escalate';
    actions = ['rate_limit', 'alert_soc', 'monitor_enhanced'];
    reviewRequired = true;
  } else if (riskScore.overall >= 40) {
    decision = 'investigate';
    actions = ['log_detailed', 'monitor'];
    automated = true;
  } else {
    decision = 'allow';
    actions = ['log'];
    automated = true;
  }

  const securityDecision: SecurityDecision = {
    id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    trigger,
    context,
    analysis: riskScore,
    decision,
    actions,
    automated,
    reviewRequired,
  };

  // Store for learning
  decisionHistory.unshift(securityDecision);
  if (decisionHistory.length > 10000) {
    decisionHistory.pop();
  }

  return securityDecision;
}

/**
 * Record feedback for learning
 */
export function recordFeedback(
  decisionId: string,
  feedback: LearningEvent['feedback'],
  providedBy: string,
  notes?: string
): LearningEvent {
  const event: LearningEvent = {
    id: `learn-${Date.now()}`,
    timestamp: new Date().toISOString(),
    decisionId,
    feedback,
    providedBy,
    notes,
  };

  learningEvents.push(event);

  // In a real implementation, this would update ML models
  console.log(`[MYCA-SEC] Learning from feedback: ${feedback} for decision ${decisionId}`);

  return event;
}

/**
 * Get decision history
 */
export function getDecisionHistory(limit = 100): SecurityDecision[] {
  return decisionHistory.slice(0, limit);
}

/**
 * Get learning statistics
 */
export function getLearningStats(): {
  totalDecisions: number;
  feedbackReceived: number;
  accuracy: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
} {
  const feedbackByType = learningEvents.reduce((acc, e) => {
    acc[e.feedback] = (acc[e.feedback] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = learningEvents.length || 1;
  const correct = feedbackByType['correct'] || 0;
  const fp = feedbackByType['false_positive'] || 0;
  const fn = feedbackByType['false_negative'] || 0;

  return {
    totalDecisions: decisionHistory.length,
    feedbackReceived: learningEvents.length,
    accuracy: Math.round((correct / total) * 100),
    falsePositiveRate: Math.round((fp / total) * 100),
    falseNegativeRate: Math.round((fn / total) * 100),
  };
}

/**
 * Get all threat patterns
 */
export function getThreatPatterns(): ThreatPattern[] {
  return THREAT_PATTERNS;
}

export default {
  calculateRiskScore,
  matchThreatPatterns,
  makeSecurityDecision,
  recordFeedback,
  getDecisionHistory,
  getLearningStats,
  getThreatPatterns,
};
