/**
 * M-Wave Seismic Data Integration Module
 * 
 * Based on the research paper: "The M-Wave: Harnessing Mycelium Networks 
 * for Earthquake Prediction"
 * DOI: 10.55277/ResearchHub.h62c7qdp.1
 * 
 * This module implements:
 * - Distributed mycelium sensor network data aggregation
 * - Seismic precursor pattern detection in bioelectric signals
 * - Correlation analysis between fungal network responses and geological events
 * - Early warning system integration
 * 
 * @see https://www.researchhub.com/paper/9306882/the-m-wave-harnessing-mycelium-networks-for-earthquake-prediction
 */

/**
 * M-Wave sensor reading from a mycelium network
 */
export interface MWaveReading {
  device_id: string;
  timestamp: string;
  
  // Bioelectric measurements
  bioelectric: {
    voltage_mv: number;           // Raw voltage reading
    impedance_kohm: number;       // Mycelium impedance
    conductivity_us: number;      // Electrical conductivity
    frequency_hz?: number;        // Dominant oscillation frequency
  };
  
  // Environmental context
  environment: {
    soil_moisture_pct: number;
    soil_temperature_c: number;
    ph: number;
    depth_cm: number;
  };
  
  // Location
  location: {
    latitude: number;
    longitude: number;
    elevation_m: number;
  };
  
  // Signal quality
  quality: {
    snr_db: number;               // Signal to noise ratio
    confidence: number;           // 0-1 reading confidence
    sensor_health: number;        // 0-1 sensor health
  };
}

/**
 * Detected anomaly in the mycelium network
 */
export interface MWaveAnomaly {
  id: string;
  detected_at: string;
  
  // Anomaly classification
  type: 
    | 'impedance_spike'           // Sudden impedance change
    | 'conductivity_drop'         // Loss of conductivity
    | 'frequency_shift'           // Change in oscillation patterns
    | 'synchronized_response'     // Multiple nodes responding together
    | 'propagation_wave'          // Signal propagating through network
    | 'silent_zone'               // Area of no response
    | 'hypersensitivity';         // Increased reactivity
  
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;             // 0-1 detection confidence
  
  // Affected area
  epicenter?: {
    latitude: number;
    longitude: number;
    radius_km: number;
  };
  
  // Contributing readings
  contributing_devices: string[];
  reading_count: number;
  
  // Potential geological correlation
  geological_correlation?: {
    possible_cause: 'tectonic_stress' | 'groundwater_change' | 'gas_release' | 'unknown';
    estimated_depth_km?: number;
    estimated_magnitude?: number;
  };
}

/**
 * M-Wave network configuration
 */
export interface MWaveNetworkConfig {
  // Detection thresholds
  thresholds: {
    impedance_spike_pct: number;        // % change to trigger spike
    conductivity_drop_pct: number;      // % drop to trigger alert
    frequency_shift_hz: number;         // Hz change to detect
    sync_correlation_min: number;       // Min correlation for sync detection
    propagation_velocity_m_s: number;   // Expected signal velocity
  };
  
  // Analysis windows
  windows: {
    baseline_hours: number;             // Hours for baseline calculation
    detection_seconds: number;          // Analysis window size
    prediction_hours: number;           // Forecast horizon
  };
  
  // Alert configuration
  alerts: {
    enabled: boolean;
    min_severity: 'low' | 'medium' | 'high' | 'critical';
    notify_endpoints: string[];
  };
}

/**
 * Default network configuration
 */
export const DEFAULT_MWAVE_CONFIG: MWaveNetworkConfig = {
  thresholds: {
    impedance_spike_pct: 20,
    conductivity_drop_pct: 15,
    frequency_shift_hz: 0.5,
    sync_correlation_min: 0.7,
    propagation_velocity_m_s: 100,  // Estimated based on soil type
  },
  windows: {
    baseline_hours: 24,
    detection_seconds: 60,
    prediction_hours: 6,
  },
  alerts: {
    enabled: true,
    min_severity: 'medium',
    notify_endpoints: [],
  },
};

/**
 * M-Wave Analysis Engine
 * 
 * Analyzes bioelectric signals from distributed mycelium networks
 * to detect potential seismic precursors.
 */
export class MWaveAnalyzer {
  private config: MWaveNetworkConfig;
  private readingBuffer: Map<string, MWaveReading[]> = new Map();
  private baselines: Map<string, MWaveBaseline> = new Map();
  private anomalyHistory: MWaveAnomaly[] = [];
  
  constructor(config: Partial<MWaveNetworkConfig> = {}) {
    this.config = { ...DEFAULT_MWAVE_CONFIG, ...config };
  }
  
  /**
   * Process a new reading from a device
   */
  processReading(reading: MWaveReading): MWaveAnomaly | null {
    // Store reading
    const buffer = this.readingBuffer.get(reading.device_id) || [];
    buffer.push(reading);
    
    // Trim buffer to window size
    const maxReadings = this.config.windows.baseline_hours * 3600; // Assuming 1 reading/sec
    if (buffer.length > maxReadings) {
      buffer.splice(0, buffer.length - maxReadings);
    }
    this.readingBuffer.set(reading.device_id, buffer);
    
    // Update baseline
    this.updateBaseline(reading.device_id, buffer);
    
    // Check for anomalies
    return this.detectAnomalies(reading);
  }
  
  /**
   * Update baseline statistics for a device
   */
  private updateBaseline(deviceId: string, readings: MWaveReading[]): void {
    if (readings.length < 100) return;
    
    const recentReadings = readings.slice(-100);
    
    const impedances = recentReadings.map(r => r.bioelectric.impedance_kohm);
    const conductivities = recentReadings.map(r => r.bioelectric.conductivity_us);
    const voltages = recentReadings.map(r => r.bioelectric.voltage_mv);
    
    const baseline: MWaveBaseline = {
      device_id: deviceId,
      updated_at: new Date().toISOString(),
      impedance: {
        mean: this.mean(impedances),
        std: this.std(impedances),
      },
      conductivity: {
        mean: this.mean(conductivities),
        std: this.std(conductivities),
      },
      voltage: {
        mean: this.mean(voltages),
        std: this.std(voltages),
      },
    };
    
    this.baselines.set(deviceId, baseline);
  }
  
  /**
   * Detect anomalies in a reading
   */
  private detectAnomalies(reading: MWaveReading): MWaveAnomaly | null {
    const baseline = this.baselines.get(reading.device_id);
    if (!baseline) return null;
    
    const anomalies: MWaveAnomaly[] = [];
    
    // Check impedance spike
    const impedanceChange = Math.abs(
      (reading.bioelectric.impedance_kohm - baseline.impedance.mean) / baseline.impedance.mean
    ) * 100;
    
    if (impedanceChange > this.config.thresholds.impedance_spike_pct) {
      anomalies.push(this.createAnomaly(
        'impedance_spike',
        reading,
        this.calculateSeverity(impedanceChange, 20, 50, 100),
        impedanceChange / 100
      ));
    }
    
    // Check conductivity drop
    const conductivityDrop = (baseline.conductivity.mean - reading.bioelectric.conductivity_us) 
      / baseline.conductivity.mean * 100;
    
    if (conductivityDrop > this.config.thresholds.conductivity_drop_pct) {
      anomalies.push(this.createAnomaly(
        'conductivity_drop',
        reading,
        this.calculateSeverity(conductivityDrop, 15, 30, 60),
        conductivityDrop / 100
      ));
    }
    
    // Check for network-wide synchronized response
    const syncAnomaly = this.detectSynchronizedResponse(reading);
    if (syncAnomaly) {
      anomalies.push(syncAnomaly);
    }
    
    // Return most severe anomaly
    if (anomalies.length === 0) return null;
    
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    anomalies.sort((a, b) => 
      severityOrder.indexOf(b.severity) - severityOrder.indexOf(a.severity)
    );
    
    const anomaly = anomalies[0];
    this.anomalyHistory.push(anomaly);
    
    return anomaly;
  }
  
  /**
   * Detect synchronized responses across multiple devices
   */
  private detectSynchronizedResponse(reading: MWaveReading): MWaveAnomaly | null {
    const devices = Array.from(this.readingBuffer.keys());
    if (devices.length < 3) return null;
    
    const recentWindow = 60 * 1000; // 60 seconds
    const readingTime = new Date(reading.timestamp).getTime();
    
    const synchronizedDevices: string[] = [];
    const allRecentReadings: MWaveReading[] = [];
    
    for (const deviceId of devices) {
      const buffer = this.readingBuffer.get(deviceId) || [];
      const recent = buffer.filter(r => 
        readingTime - new Date(r.timestamp).getTime() < recentWindow
      );
      
      if (recent.length > 0) {
        // Check if this device shows similar deviation
        const baseline = this.baselines.get(deviceId);
        if (baseline) {
          const avgRecentImpedance = this.mean(recent.map(r => r.bioelectric.impedance_kohm));
          const deviation = Math.abs(avgRecentImpedance - baseline.impedance.mean) / baseline.impedance.std;
          
          if (deviation > 2) {  // More than 2 standard deviations
            synchronizedDevices.push(deviceId);
            allRecentReadings.push(...recent);
          }
        }
      }
    }
    
    // If more than 30% of devices show synchronized response
    if (synchronizedDevices.length >= devices.length * 0.3) {
      // Calculate epicenter based on timing of first responses
      const epicenter = this.estimateEpicenter(allRecentReadings);
      
      return {
        id: `mwave:sync:${Date.now()}`,
        detected_at: new Date().toISOString(),
        type: 'synchronized_response',
        severity: synchronizedDevices.length > devices.length * 0.6 ? 'critical' : 'high',
        confidence: synchronizedDevices.length / devices.length,
        epicenter,
        contributing_devices: synchronizedDevices,
        reading_count: allRecentReadings.length,
        geological_correlation: {
          possible_cause: 'tectonic_stress',
        },
      };
    }
    
    return null;
  }
  
  /**
   * Estimate epicenter of an anomaly based on signal timing
   */
  private estimateEpicenter(readings: MWaveReading[]): MWaveAnomaly['epicenter'] | undefined {
    if (readings.length < 3) return undefined;
    
    // Sort by timestamp
    readings.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Use first responding device as approximate epicenter
    const firstReading = readings[0];
    
    // Calculate spread radius
    const lats = readings.map(r => r.location.latitude);
    const lngs = readings.map(r => r.location.longitude);
    
    const centerLat = this.mean(lats);
    const centerLng = this.mean(lngs);
    
    // Rough radius calculation (would need proper geodesic calculation)
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const radiusKm = Math.max(latSpread, lngSpread) * 111; // Rough km/degree
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      radius_km: radiusKm,
    };
  }
  
  /**
   * Create an anomaly object
   */
  private createAnomaly(
    type: MWaveAnomaly['type'],
    reading: MWaveReading,
    severity: MWaveAnomaly['severity'],
    confidence: number
  ): MWaveAnomaly {
    return {
      id: `mwave:${type}:${Date.now()}`,
      detected_at: new Date().toISOString(),
      type,
      severity,
      confidence,
      epicenter: {
        latitude: reading.location.latitude,
        longitude: reading.location.longitude,
        radius_km: 1,
      },
      contributing_devices: [reading.device_id],
      reading_count: 1,
    };
  }
  
  /**
   * Calculate severity based on thresholds
   */
  private calculateSeverity(
    value: number,
    lowThreshold: number,
    mediumThreshold: number,
    highThreshold: number
  ): MWaveAnomaly['severity'] {
    if (value >= highThreshold) return 'critical';
    if (value >= mediumThreshold) return 'high';
    if (value >= lowThreshold) return 'medium';
    return 'low';
  }
  
  /**
   * Get prediction based on current network state
   */
  getPrediction(): MWavePrediction {
    const recentAnomalies = this.anomalyHistory.filter(a => 
      Date.now() - new Date(a.detected_at).getTime() < 6 * 60 * 60 * 1000 // Last 6 hours
    );
    
    const criticalCount = recentAnomalies.filter(a => a.severity === 'critical').length;
    const highCount = recentAnomalies.filter(a => a.severity === 'high').length;
    const syncCount = recentAnomalies.filter(a => a.type === 'synchronized_response').length;
    
    // Calculate risk score
    let riskScore = 0;
    riskScore += criticalCount * 30;
    riskScore += highCount * 15;
    riskScore += syncCount * 25;
    riskScore = Math.min(100, riskScore);
    
    let riskLevel: 'normal' | 'elevated' | 'high' | 'critical' = 'normal';
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 20) riskLevel = 'elevated';
    
    return {
      timestamp: new Date().toISOString(),
      risk_level: riskLevel,
      risk_score: riskScore,
      anomaly_count: recentAnomalies.length,
      network_coverage: this.readingBuffer.size,
      confidence: Math.min(1, this.readingBuffer.size / 10), // More devices = more confidence
      prediction_horizon_hours: this.config.windows.prediction_hours,
    };
  }
  
  /**
   * Get recent anomaly history
   */
  getAnomalyHistory(hours: number = 24): MWaveAnomaly[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.anomalyHistory.filter(a => 
      new Date(a.detected_at).getTime() > cutoff
    );
  }
  
  // Utility functions
  private mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private std(values: number[]): number {
    const m = this.mean(values);
    const variance = values.reduce((a, v) => a + Math.pow(v - m, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

/**
 * Baseline statistics for a device
 */
interface MWaveBaseline {
  device_id: string;
  updated_at: string;
  impedance: { mean: number; std: number };
  conductivity: { mean: number; std: number };
  voltage: { mean: number; std: number };
}

/**
 * M-Wave prediction output
 */
export interface MWavePrediction {
  timestamp: string;
  risk_level: 'normal' | 'elevated' | 'high' | 'critical';
  risk_score: number;             // 0-100
  anomaly_count: number;
  network_coverage: number;       // Number of active devices
  confidence: number;             // 0-1
  prediction_horizon_hours: number;
}

/**
 * Integration with MINDEX - submit M-Wave data
 */
export async function submitToMINDEX(
  reading: MWaveReading,
  anomaly?: MWaveAnomaly
): Promise<void> {
  const payload = {
    type: 'mwave_reading',
    reading,
    anomaly,
    source: 'mwave_network',
    protocol_version: '1.0',
  };
  
  // In production, this would call the MINDEX API
  console.log('[M-Wave] Submitting to MINDEX:', payload);
}

/**
 * Integration with Mycorrhizae Protocol for real-time streaming
 */
export function createMycorrhizaeChannel(): {
  type: 'computed';
  id: 'mwave-analysis';
  filters: Record<string, unknown>;
} {
  return {
    type: 'computed',
    id: 'mwave-analysis',
    filters: {
      include_predictions: true,
      include_anomalies: true,
      min_severity: 'low',
    },
  };
}
