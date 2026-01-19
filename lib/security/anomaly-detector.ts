/**
 * Mycosoft Anomaly Detection Library
 * 
 * Provides traffic baseline calculation, deviation alerting,
 * time-series analysis, and behavioral profiling.
 */

export interface Baseline {
  metric: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  samples: number;
  lastUpdated: string;
}

export interface Anomaly {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  baseline: Baseline;
  deviation: number; // Standard deviations from mean
  severity: 'info' | 'warning' | 'alert' | 'critical';
  context: Record<string, unknown>;
}

export interface BehaviorProfile {
  entityId: string; // IP, device MAC, user ID
  entityType: 'ip' | 'device' | 'user';
  baselines: Map<string, Baseline>;
  typicalHours: number[]; // 0-23
  typicalDays: number[]; // 0-6 (Sun-Sat)
  anomalyCount: number;
  lastSeen: string;
  riskScore: number;
}

// In-memory storage
const baselines = new Map<string, Baseline>();
const profiles = new Map<string, BehaviorProfile>();
const anomalyHistory: Anomaly[] = [];
const metricHistory = new Map<string, { timestamp: string; value: number }[]>();

// Configuration
const CONFIG = {
  minSamplesForBaseline: 100,
  baselineWindowHours: 24 * 7, // 1 week
  deviationThresholds: {
    info: 2,
    warning: 3,
    alert: 4,
    critical: 5,
  },
  maxHistorySize: 10000,
  profileMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Record a metric value
 */
export function recordMetric(
  metric: string,
  value: number,
  context?: Record<string, unknown>
): Anomaly | null {
  const now = new Date().toISOString();
  
  // Add to history
  const history = metricHistory.get(metric) || [];
  history.push({ timestamp: now, value });
  
  // Trim old data
  const cutoff = new Date(Date.now() - CONFIG.baselineWindowHours * 60 * 60 * 1000).toISOString();
  const filtered = history.filter(h => h.timestamp >= cutoff);
  metricHistory.set(metric, filtered);

  // Update baseline
  const values = filtered.map(h => h.value);
  if (values.length >= CONFIG.minSamplesForBaseline) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = calculateStdDev(values, mean);
    
    const baseline: Baseline = {
      metric,
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      samples: values.length,
      lastUpdated: now,
    };
    
    baselines.set(metric, baseline);

    // Check for anomaly
    if (stdDev > 0) {
      const deviation = Math.abs(value - mean) / stdDev;
      
      if (deviation >= CONFIG.deviationThresholds.info) {
        const severity = getSeverity(deviation);
        const anomaly: Anomaly = {
          id: `anom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: now,
          metric,
          value,
          baseline,
          deviation,
          severity,
          context: context || {},
        };
        
        anomalyHistory.unshift(anomaly);
        if (anomalyHistory.length > CONFIG.maxHistorySize) {
          anomalyHistory.pop();
        }
        
        return anomaly;
      }
    }
  }

  return null;
}

/**
 * Get severity based on deviation
 */
function getSeverity(deviation: number): Anomaly['severity'] {
  if (deviation >= CONFIG.deviationThresholds.critical) return 'critical';
  if (deviation >= CONFIG.deviationThresholds.alert) return 'alert';
  if (deviation >= CONFIG.deviationThresholds.warning) return 'warning';
  return 'info';
}

/**
 * Get or create a behavior profile
 */
export function getOrCreateProfile(
  entityId: string,
  entityType: BehaviorProfile['entityType']
): BehaviorProfile {
  let profile = profiles.get(entityId);
  
  if (!profile) {
    profile = {
      entityId,
      entityType,
      baselines: new Map(),
      typicalHours: [],
      typicalDays: [],
      anomalyCount: 0,
      lastSeen: new Date().toISOString(),
      riskScore: 0,
    };
    profiles.set(entityId, profile);
  }
  
  return profile;
}

/**
 * Update behavior profile with new activity
 */
export function updateProfile(
  entityId: string,
  entityType: BehaviorProfile['entityType'],
  activity: {
    hour?: number;
    dayOfWeek?: number;
    metrics?: Record<string, number>;
  }
): BehaviorProfile {
  const profile = getOrCreateProfile(entityId, entityType);
  const now = new Date();
  
  // Update activity times
  if (activity.hour !== undefined && !profile.typicalHours.includes(activity.hour)) {
    profile.typicalHours.push(activity.hour);
    profile.typicalHours.sort((a, b) => a - b);
  }
  
  if (activity.dayOfWeek !== undefined && !profile.typicalDays.includes(activity.dayOfWeek)) {
    profile.typicalDays.push(activity.dayOfWeek);
    profile.typicalDays.sort((a, b) => a - b);
  }
  
  // Update metric baselines
  if (activity.metrics) {
    for (const [metric, value] of Object.entries(activity.metrics)) {
      const metricKey = `${entityId}:${metric}`;
      const anomaly = recordMetric(metricKey, value, { entityId, entityType });
      
      if (anomaly) {
        profile.anomalyCount++;
        // Increase risk score based on anomalies
        profile.riskScore = Math.min(100, profile.riskScore + (anomaly.severity === 'critical' ? 20 : 
                                                               anomaly.severity === 'alert' ? 10 : 
                                                               anomaly.severity === 'warning' ? 5 : 2));
      } else {
        // Gradually decrease risk score with normal activity
        profile.riskScore = Math.max(0, profile.riskScore - 0.1);
      }
      
      // Store baseline in profile
      const baseline = baselines.get(metricKey);
      if (baseline) {
        profile.baselines.set(metric, baseline);
      }
    }
  }
  
  profile.lastSeen = now.toISOString();
  
  return profile;
}

/**
 * Check if activity is anomalous for a profile
 */
export function isAnomalous(
  entityId: string,
  activity: {
    hour?: number;
    dayOfWeek?: number;
    metrics?: Record<string, number>;
  }
): {
  isAnomaly: boolean;
  reasons: string[];
  severity: Anomaly['severity'];
} {
  const profile = profiles.get(entityId);
  const reasons: string[] = [];
  let maxSeverity: Anomaly['severity'] = 'info';
  
  if (!profile) {
    return { isAnomaly: false, reasons: ['No profile established'], severity: 'info' };
  }
  
  // Check activity time
  if (activity.hour !== undefined && profile.typicalHours.length >= 5) {
    if (!profile.typicalHours.includes(activity.hour)) {
      reasons.push(`Unusual hour: ${activity.hour}:00 (typical: ${profile.typicalHours.join(', ')})`);
      maxSeverity = 'warning';
    }
  }
  
  if (activity.dayOfWeek !== undefined && profile.typicalDays.length >= 3) {
    if (!profile.typicalDays.includes(activity.dayOfWeek)) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      reasons.push(`Unusual day: ${days[activity.dayOfWeek]}`);
      maxSeverity = 'warning';
    }
  }
  
  // Check metrics against baselines
  if (activity.metrics) {
    for (const [metric, value] of Object.entries(activity.metrics)) {
      const baseline = profile.baselines.get(metric);
      if (baseline && baseline.stdDev > 0) {
        const deviation = Math.abs(value - baseline.mean) / baseline.stdDev;
        
        if (deviation >= CONFIG.deviationThresholds.info) {
          const severity = getSeverity(deviation);
          reasons.push(`${metric}: ${value.toFixed(2)} (${deviation.toFixed(1)}σ from baseline)`);
          
          if (severityRank(severity) > severityRank(maxSeverity)) {
            maxSeverity = severity;
          }
        }
      }
    }
  }
  
  return {
    isAnomaly: reasons.length > 0,
    reasons,
    severity: maxSeverity,
  };
}

/**
 * Get severity rank for comparison
 */
function severityRank(severity: Anomaly['severity']): number {
  switch (severity) {
    case 'critical': return 4;
    case 'alert': return 3;
    case 'warning': return 2;
    case 'info': return 1;
    default: return 0;
  }
}

/**
 * Get all baselines
 */
export function getBaselines(): Baseline[] {
  return Array.from(baselines.values());
}

/**
 * Get baseline for a specific metric
 */
export function getBaseline(metric: string): Baseline | undefined {
  return baselines.get(metric);
}

/**
 * Get anomaly history
 */
export function getAnomalies(options?: {
  limit?: number;
  severity?: Anomaly['severity'][];
  since?: string;
}): Anomaly[] {
  let filtered = [...anomalyHistory];
  
  if (options?.severity) {
    filtered = filtered.filter(a => options.severity!.includes(a.severity));
  }
  
  if (options?.since) {
    filtered = filtered.filter(a => a.timestamp >= options.since!);
  }
  
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

/**
 * Get anomaly statistics
 */
export function getAnomalyStats(): {
  total: number;
  last24h: number;
  bySeverity: Record<Anomaly['severity'], number>;
  topMetrics: { metric: string; count: number }[];
} {
  const now = Date.now();
  const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  
  const bySeverity: Record<Anomaly['severity'], number> = {
    info: 0,
    warning: 0,
    alert: 0,
    critical: 0,
  };
  
  const metricCounts = new Map<string, number>();
  let last24hCount = 0;
  
  for (const anomaly of anomalyHistory) {
    bySeverity[anomaly.severity]++;
    metricCounts.set(anomaly.metric, (metricCounts.get(anomaly.metric) || 0) + 1);
    
    if (anomaly.timestamp >= last24h) {
      last24hCount++;
    }
  }
  
  const topMetrics = Array.from(metricCounts.entries())
    .map(([metric, count]) => ({ metric, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    total: anomalyHistory.length,
    last24h: last24hCount,
    bySeverity,
    topMetrics,
  };
}

/**
 * Get all profiles
 */
export function getProfiles(): BehaviorProfile[] {
  return Array.from(profiles.values());
}

/**
 * Get profile by entity ID
 */
export function getProfile(entityId: string): BehaviorProfile | undefined {
  return profiles.get(entityId);
}

/**
 * Clear old profiles
 */
export function cleanupProfiles(): number {
  const cutoff = new Date(Date.now() - CONFIG.profileMaxAge).toISOString();
  let removed = 0;
  
  for (const [id, profile] of profiles.entries()) {
    if (profile.lastSeen < cutoff) {
      profiles.delete(id);
      removed++;
    }
  }
  
  return removed;
}

export default {
  recordMetric,
  getOrCreateProfile,
  updateProfile,
  isAnomalous,
  getBaselines,
  getBaseline,
  getAnomalies,
  getAnomalyStats,
  getProfiles,
  getProfile,
  cleanupProfiles,
};
