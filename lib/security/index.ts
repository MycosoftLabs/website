/**
 * Mycosoft Security Library
 * Central export for all security-related modules
 * 
 * Supports compliance frameworks:
 * - NIST SP 800-53 (Federal Information Systems)
 * - NIST SP 800-171 (CUI Protection)
 * - CMMC 2.0 (DoD Contractor Cybersecurity)
 * - Exostar Integration (Supply Chain Risk Management)
 */

// Compliance frameworks (NIST 800-53, NIST 800-171, CMMC, Exostar)
export * from './compliance-frameworks';

// Database persistence
export * from './database';

// Email alerting
export * from './email-alerts';

// Real-time WebSocket/SSE alerts
export * from './websocket-alerts';

// Automated playbook engine
export * from './playbook-engine';

// Network scanning
export * from './network-scanner';

// Suricata IDS integration
export * from './suricata-ids';

// Legacy exports (for backwards compatibility)
export * from './threat-intel';
export * from './playbooks';
export * from './scanner';
export * from './alerting';
export * from './myca-sec';
export * from './anomaly-detector';
export * from './recovery';
