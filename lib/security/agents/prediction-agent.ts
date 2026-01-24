/**
 * Cascade Prediction Agent
 * 
 * Continuously monitors incidents and generates cascade predictions.
 * Persists predictions to database and triggers prevention actions.
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CascadePrediction {
  id?: string;
  incident_id: string;
  predicted_by_agent: string;
  prediction_type: string;
  potential_incident_type: string;
  confidence: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  recommended_action: string;
  prediction_basis: string;
  status: 'active' | 'prevented' | 'occurred' | 'dismissed' | 'expired';
  created_at?: string;
}

export interface AgentResolution {
  id?: string;
  incident_id: string;
  agent_id: string;
  agent_name: string;
  resolution_type: 'automatic' | 'semi-automatic' | 'assisted' | 'manual';
  action_taken: string;
  action_details: Record<string, unknown>;
  success: boolean;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  cascades_prevented?: number;
  related_predictions?: string[];
}

export interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: string;
  category?: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE INCIDENT PATTERNS (100+ patterns)
// ═══════════════════════════════════════════════════════════════

export const INCIDENT_PATTERNS: Record<string, string[]> = {
  // Network Security
  network: ['network', 'firewall', 'traffic', 'packet', 'router', 'switch', 'vlan', 'subnet', 'gateway', 'proxy', 'load balancer'],
  ddos: ['ddos', 'dos', 'flood', 'syn', 'amplification', 'reflection', 'volumetric', 'slowloris', 'ping of death'],
  portscan: ['port scan', 'portscan', 'nmap', 'masscan', 'reconnaissance', 'probing', 'enumeration'],
  
  // Authentication & Identity
  authentication: ['login', 'logout', 'password', 'credential', 'mfa', '2fa', 'totp', 'sso', 'oauth', 'saml', 'ldap', 'kerberos'],
  bruteforce: ['brute force', 'bruteforce', 'password spray', 'credential stuffing', 'dictionary attack', 'hydra'],
  accountTakeover: ['account takeover', 'ato', 'session hijack', 'cookie theft', 'impersonation', 'unauthorized access'],
  
  // Malware & Threats
  malware: ['malware', 'virus', 'trojan', 'worm', 'backdoor', 'dropper', 'loader', 'shellcode', 'payload'],
  ransomware: ['ransomware', 'encryption', 'ransom', 'crypto locker', 'lockbit', 'revil', 'conti', 'blackcat'],
  apt: ['apt', 'advanced persistent', 'nation state', 'targeted attack', 'spear phishing', 'watering hole'],
  rootkit: ['rootkit', 'bootkit', 'kernel mode', 'ring0', 'hidden process', 'stealth'],
  
  // Data Security
  dataExfil: ['exfiltration', 'data leak', 'data theft', 'sensitive data', 'pii', 'phi', 'pci', 'confidential', 'classified'],
  dataBreach: ['data breach', 'breach', 'exposure', 'disclosure', 'leaked', 'dumped', 'compromised data'],
  dlp: ['dlp', 'data loss', 'data prevention', 'content inspection', 'fingerprinting'],
  
  // Access Control
  accessControl: ['access', 'permission', 'authorization', 'rbac', 'abac', 'acl', 'policy violation'],
  privilegeEscalation: ['privilege escalation', 'privesc', 'elevated', 'root access', 'admin access', 'sudo', 'runas'],
  lateralMovement: ['lateral movement', 'pivot', 'pass the hash', 'pth', 'pass the ticket', 'mimikatz', 'psexec'],
  
  // Endpoint Security
  endpoint: ['endpoint', 'workstation', 'laptop', 'desktop', 'mobile device', 'byod', 'edr', 'xdr'],
  process: ['suspicious process', 'malicious process', 'process injection', 'dll injection', 'hollow process'],
  fileless: ['fileless', 'memory only', 'living off the land', 'lolbin', 'powershell', 'wmi', 'script based'],
  
  // Web Application Security
  injection: ['sql injection', 'sqli', 'command injection', 'code injection', 'ldap injection', 'xpath injection'],
  xss: ['xss', 'cross site scripting', 'reflected xss', 'stored xss', 'dom xss', 'javascript injection'],
  csrf: ['csrf', 'cross site request', 'request forgery', 'session riding'],
  ssrf: ['ssrf', 'server side request', 'internal request', 'metadata access'],
  api: ['api', 'rest', 'graphql', 'soap', 'webhook', 'rate limit', 'api key', 'api abuse'],
  
  // Cloud & Infrastructure
  cloud: ['cloud', 'aws', 'azure', 'gcp', 's3', 'ec2', 'lambda', 'container', 'kubernetes', 'k8s', 'docker'],
  misconfiguration: ['misconfiguration', 'exposed', 'public', 'open bucket', 'insecure config', 'default credentials'],
  iam: ['iam', 'identity', 'role', 'service account', 'key rotation', 'access key'],
  
  // Crypto & Blockchain
  cryptojacking: ['cryptojacking', 'mining', 'cryptocurrency', 'monero', 'bitcoin', 'coinhive', 'cpu spike'],
  wallet: ['wallet', 'private key', 'seed phrase', 'blockchain', 'smart contract', 'defi'],
  
  // Insider Threats
  insider: ['insider', 'employee', 'contractor', 'privileged user', 'trusted entity', 'internal threat'],
  sabotage: ['sabotage', 'destruction', 'deletion', 'wipe', 'corruption', 'malicious insider'],
  fraud: ['fraud', 'embezzlement', 'financial crime', 'wire fraud', 'invoice fraud'],
  
  // Physical & IoT
  physical: ['physical', 'badge', 'tailgating', 'building access', 'camera', 'cctv', 'datacenter'],
  iot: ['iot', 'scada', 'ics', 'plc', 'modbus', 'operational technology', 'ot', 'smart device'],
  
  // DNS & Email
  dns: ['dns', 'domain', 'nameserver', 'dns poisoning', 'dns hijack', 'typosquatting', 'dns tunneling'],
  email: ['email', 'phishing', 'spear phishing', 'whaling', 'bec', 'business email', 'spam', 'malspam'],
  
  // Certificates & Encryption
  certificate: ['certificate', 'ssl', 'tls', 'x509', 'pki', 'ca', 'expired cert', 'invalid cert', 'self signed'],
  encryption: ['encryption', 'cryptographic', 'cipher', 'key management', 'hsm', 'kms', 'weak crypto'],
  
  // Compliance & Audit
  compliance: ['compliance', 'audit', 'regulation', 'gdpr', 'hipaa', 'sox', 'pci dss', 'nist', 'iso27001'],
  logging: ['logging', 'audit log', 'siem', 'log tampering', 'log deletion', 'event forwarding'],
  
  // Supply Chain
  supplyChain: ['supply chain', 'third party', 'vendor', 'dependency', 'package', 'npm', 'pypi', 'maven'],
  softwareUpdate: ['update', 'patch', 'version', 'upgrade', 'software distribution', 'repository compromise'],
  
  // Zero Day & Exploits
  zeroDay: ['zero day', '0day', 'unknown vulnerability', 'novel attack', 'unpatched'],
  exploit: ['exploit', 'cve', 'vulnerability', 'buffer overflow', 'heap spray', 'use after free', 'rce'],
  
  // Social Engineering
  socialEngineering: ['social engineering', 'pretexting', 'baiting', 'quid pro quo', 'vishing', 'smishing'],
  impersonation: ['impersonation', 'spoofing', 'masquerade', 'fake identity', 'deepfake'],
};

// ═══════════════════════════════════════════════════════════════
// CASCADE MAPPINGS (What can lead to what)
// ═══════════════════════════════════════════════════════════════

interface CascadeConfig {
  type: string;
  baseConfidence: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  timeToImpact: string;
}

export const CASCADE_MAP: Record<string, CascadeConfig[]> = {
  network: [
    { type: 'Service Outage', baseConfidence: 0.72, riskLevel: 'high', action: 'Enable DDoS protection and rate limiting', timeToImpact: '< 1 hour' },
    { type: 'Lateral Movement', baseConfidence: 0.58, riskLevel: 'high', action: 'Segment network and review firewall rules', timeToImpact: '< 4 hours' },
    { type: 'Data Exfiltration', baseConfidence: 0.45, riskLevel: 'critical', action: 'Monitor outbound traffic patterns', timeToImpact: '< 24 hours' },
    { type: 'Command & Control Establishment', baseConfidence: 0.52, riskLevel: 'critical', action: 'Block suspicious external IPs', timeToImpact: '< 2 hours' },
  ],
  ddos: [
    { type: 'Complete Service Unavailability', baseConfidence: 0.88, riskLevel: 'critical', action: 'Activate DDoS mitigation services', timeToImpact: '< 30 min' },
    { type: 'Customer Impact', baseConfidence: 0.82, riskLevel: 'high', action: 'Prepare status page update', timeToImpact: '< 15 min' },
    { type: 'Revenue Loss', baseConfidence: 0.75, riskLevel: 'high', action: 'Document for SLA credits', timeToImpact: '< 1 hour' },
    { type: 'Secondary Attack Under Cover', baseConfidence: 0.55, riskLevel: 'critical', action: 'Monitor for other attack vectors', timeToImpact: '< 2 hours' },
  ],
  portscan: [
    { type: 'Targeted Exploitation Attempt', baseConfidence: 0.72, riskLevel: 'high', action: 'Review exposed services', timeToImpact: '< 6 hours' },
    { type: 'Vulnerability Discovery', baseConfidence: 0.68, riskLevel: 'medium', action: 'Run vulnerability scan on targeted hosts', timeToImpact: '< 12 hours' },
    { type: 'Full Compromise Attempt', baseConfidence: 0.55, riskLevel: 'critical', action: 'Monitor for follow-up attacks', timeToImpact: '< 24 hours' },
  ],
  authentication: [
    { type: 'Account Takeover', baseConfidence: 0.85, riskLevel: 'critical', action: 'Force password reset for affected accounts', timeToImpact: '< 1 hour' },
    { type: 'Lateral Movement via Credentials', baseConfidence: 0.72, riskLevel: 'high', action: 'Review related user sessions', timeToImpact: '< 2 hours' },
    { type: 'Privilege Escalation', baseConfidence: 0.65, riskLevel: 'high', action: 'Audit admin account activity', timeToImpact: '< 4 hours' },
    { type: 'Data Breach via Stolen Credentials', baseConfidence: 0.55, riskLevel: 'critical', action: 'Assess exposed data scope', timeToImpact: '< 24 hours' },
  ],
  bruteforce: [
    { type: 'Successful Account Compromise', baseConfidence: 0.78, riskLevel: 'critical', action: 'Implement account lockout policies', timeToImpact: '< 2 hours' },
    { type: 'Credential Database Exposure', baseConfidence: 0.62, riskLevel: 'critical', action: 'Force org-wide password reset', timeToImpact: '< 6 hours' },
    { type: 'Service Degradation', baseConfidence: 0.58, riskLevel: 'medium', action: 'Rate limit authentication endpoints', timeToImpact: '< 1 hour' },
  ],
  accountTakeover: [
    { type: 'Financial Fraud', baseConfidence: 0.82, riskLevel: 'critical', action: 'Freeze affected accounts immediately', timeToImpact: '< 30 min' },
    { type: 'Data Access & Exfiltration', baseConfidence: 0.88, riskLevel: 'critical', action: 'Revoke all session tokens', timeToImpact: '< 1 hour' },
    { type: 'Phishing Campaign Launch', baseConfidence: 0.65, riskLevel: 'high', action: 'Alert contacts of compromise', timeToImpact: '< 4 hours' },
    { type: 'Privilege Escalation Chain', baseConfidence: 0.72, riskLevel: 'critical', action: 'Audit all account permissions', timeToImpact: '< 2 hours' },
  ],
  malware: [
    { type: 'Ransomware Deployment', baseConfidence: 0.78, riskLevel: 'critical', action: 'Isolate affected systems immediately', timeToImpact: '< 30 min' },
    { type: 'Data Exfiltration', baseConfidence: 0.82, riskLevel: 'critical', action: 'Block C2 communications', timeToImpact: '< 1 hour' },
    { type: 'Lateral Spread', baseConfidence: 0.75, riskLevel: 'high', action: 'Network segmentation and endpoint isolation', timeToImpact: '< 2 hours' },
    { type: 'Persistence Mechanism Installation', baseConfidence: 0.68, riskLevel: 'high', action: 'Review scheduled tasks and startup items', timeToImpact: '< 4 hours' },
    { type: 'Credential Harvesting', baseConfidence: 0.72, riskLevel: 'high', action: 'Force credential rotation', timeToImpact: '< 6 hours' },
  ],
  ransomware: [
    { type: 'Complete Data Encryption', baseConfidence: 0.92, riskLevel: 'critical', action: 'Emergency isolation of all connected systems', timeToImpact: '< 15 min' },
    { type: 'Backup Destruction', baseConfidence: 0.78, riskLevel: 'critical', action: 'Protect and verify backup integrity', timeToImpact: '< 30 min' },
    { type: 'Double Extortion - Data Leak', baseConfidence: 0.72, riskLevel: 'critical', action: 'Assess data exposure scope', timeToImpact: '< 24 hours' },
    { type: 'Business Operations Halt', baseConfidence: 0.88, riskLevel: 'critical', action: 'Activate business continuity plan', timeToImpact: '< 1 hour' },
    { type: 'Regulatory Notification Required', baseConfidence: 0.85, riskLevel: 'high', action: 'Prepare breach notification', timeToImpact: '< 72 hours' },
  ],
  apt: [
    { type: 'Long-term Persistent Access', baseConfidence: 0.88, riskLevel: 'critical', action: 'Comprehensive threat hunt required', timeToImpact: 'Ongoing' },
    { type: 'Intellectual Property Theft', baseConfidence: 0.82, riskLevel: 'critical', action: 'Review R&D system access', timeToImpact: '< 1 week' },
    { type: 'Supply Chain Compromise', baseConfidence: 0.65, riskLevel: 'critical', action: 'Audit software distribution', timeToImpact: '< 1 month' },
    { type: 'Future Attack Campaign', baseConfidence: 0.75, riskLevel: 'high', action: 'Enhance monitoring and detection', timeToImpact: 'Unknown' },
  ],
  dataExfil: [
    { type: 'Regulatory Violation', baseConfidence: 0.88, riskLevel: 'critical', action: 'Initiate breach notification process', timeToImpact: '< 72 hours' },
    { type: 'Reputational Damage', baseConfidence: 0.75, riskLevel: 'high', action: 'Prepare communications response', timeToImpact: '< 1 week' },
    { type: 'Financial Loss & Fines', baseConfidence: 0.65, riskLevel: 'high', action: 'Document for legal proceedings', timeToImpact: '< 1 month' },
    { type: 'Competitive Disadvantage', baseConfidence: 0.58, riskLevel: 'high', action: 'Assess exposed trade secrets', timeToImpact: 'Long-term' },
  ],
  dataBreach: [
    { type: 'Mass Credential Compromise', baseConfidence: 0.85, riskLevel: 'critical', action: 'Force password reset for all affected users', timeToImpact: '< 24 hours' },
    { type: 'Identity Theft Wave', baseConfidence: 0.72, riskLevel: 'critical', action: 'Offer credit monitoring to affected users', timeToImpact: '< 1 week' },
    { type: 'Class Action Lawsuit', baseConfidence: 0.55, riskLevel: 'high', action: 'Engage legal counsel', timeToImpact: '< 1 month' },
    { type: 'Regulatory Investigation', baseConfidence: 0.78, riskLevel: 'high', action: 'Prepare compliance documentation', timeToImpact: '< 1 month' },
  ],
  accessControl: [
    { type: 'Full System Compromise', baseConfidence: 0.72, riskLevel: 'critical', action: 'Review all privileged access', timeToImpact: '< 4 hours' },
    { type: 'Data Access Violation', baseConfidence: 0.68, riskLevel: 'high', action: 'Audit data access logs', timeToImpact: '< 8 hours' },
    { type: 'Backdoor Installation', baseConfidence: 0.55, riskLevel: 'high', action: 'Scan for persistence mechanisms', timeToImpact: '< 24 hours' },
  ],
  privilegeEscalation: [
    { type: 'Domain Admin Compromise', baseConfidence: 0.82, riskLevel: 'critical', action: 'Reset all admin credentials', timeToImpact: '< 1 hour' },
    { type: 'Complete Infrastructure Control', baseConfidence: 0.75, riskLevel: 'critical', action: 'Initiate full incident response', timeToImpact: '< 2 hours' },
    { type: 'Audit Trail Manipulation', baseConfidence: 0.65, riskLevel: 'high', action: 'Preserve and verify logs', timeToImpact: '< 4 hours' },
  ],
  lateralMovement: [
    { type: 'Multi-System Compromise', baseConfidence: 0.85, riskLevel: 'critical', action: 'Network-wide threat hunting', timeToImpact: '< 2 hours' },
    { type: 'Data Collection Across Systems', baseConfidence: 0.78, riskLevel: 'critical', action: 'Monitor inter-system traffic', timeToImpact: '< 4 hours' },
    { type: 'Ransomware Pre-positioning', baseConfidence: 0.62, riskLevel: 'critical', action: 'Isolate critical systems', timeToImpact: '< 8 hours' },
  ],
  endpoint: [
    { type: 'Malware Spread to Other Endpoints', baseConfidence: 0.65, riskLevel: 'high', action: 'Quarantine affected endpoint', timeToImpact: '< 2 hours' },
    { type: 'Local Data Theft', baseConfidence: 0.58, riskLevel: 'high', action: 'Review endpoint data access', timeToImpact: '< 4 hours' },
    { type: 'Credential Harvesting', baseConfidence: 0.52, riskLevel: 'medium', action: 'Force credential rotation', timeToImpact: '< 6 hours' },
  ],
  injection: [
    { type: 'Database Compromise', baseConfidence: 0.82, riskLevel: 'critical', action: 'Audit database for unauthorized access', timeToImpact: '< 1 hour' },
    { type: 'Full Application Takeover', baseConfidence: 0.72, riskLevel: 'critical', action: 'Review application logs', timeToImpact: '< 2 hours' },
    { type: 'Command Execution on Server', baseConfidence: 0.68, riskLevel: 'critical', action: 'Check for webshells', timeToImpact: '< 4 hours' },
    { type: 'Data Extraction via SQLi', baseConfidence: 0.78, riskLevel: 'critical', action: 'Implement WAF rules', timeToImpact: '< 30 min' },
  ],
  xss: [
    { type: 'Session Hijacking', baseConfidence: 0.75, riskLevel: 'high', action: 'Implement proper session management', timeToImpact: '< 2 hours' },
    { type: 'Credential Theft via Keylogging', baseConfidence: 0.65, riskLevel: 'high', action: 'Alert affected users', timeToImpact: '< 4 hours' },
    { type: 'Malware Distribution', baseConfidence: 0.55, riskLevel: 'medium', action: 'Review CSP policies', timeToImpact: '< 24 hours' },
  ],
  api: [
    { type: 'Mass Data Extraction', baseConfidence: 0.75, riskLevel: 'critical', action: 'Implement rate limiting and monitoring', timeToImpact: '< 1 hour' },
    { type: 'Service Denial', baseConfidence: 0.62, riskLevel: 'high', action: 'Enable API quotas', timeToImpact: '< 30 min' },
    { type: 'Authentication Bypass', baseConfidence: 0.58, riskLevel: 'critical', action: 'Audit API security controls', timeToImpact: '< 2 hours' },
  ],
  cloud: [
    { type: 'Mass Resource Compromise', baseConfidence: 0.72, riskLevel: 'critical', action: 'Review IAM policies', timeToImpact: '< 2 hours' },
    { type: 'Cryptojacking at Scale', baseConfidence: 0.68, riskLevel: 'high', action: 'Monitor compute spending', timeToImpact: '< 4 hours' },
    { type: 'Data Lake Exposure', baseConfidence: 0.62, riskLevel: 'critical', action: 'Audit storage permissions', timeToImpact: '< 6 hours' },
  ],
  misconfiguration: [
    { type: 'Public Data Exposure', baseConfidence: 0.82, riskLevel: 'critical', action: 'Immediately secure exposed resources', timeToImpact: '< 30 min' },
    { type: 'Compliance Violation', baseConfidence: 0.75, riskLevel: 'medium', action: 'Document and remediate', timeToImpact: '< 24 hours' },
    { type: 'Exploitation by Attackers', baseConfidence: 0.68, riskLevel: 'high', action: 'Emergency remediation required', timeToImpact: '< 4 hours' },
  ],
  cryptojacking: [
    { type: 'Massive Cloud Bill Increase', baseConfidence: 0.88, riskLevel: 'high', action: 'Terminate unauthorized workloads', timeToImpact: '< 24 hours' },
    { type: 'Performance Degradation', baseConfidence: 0.82, riskLevel: 'medium', action: 'Identify and kill mining processes', timeToImpact: '< 1 hour' },
    { type: 'Persistence for Future Attacks', baseConfidence: 0.55, riskLevel: 'high', action: 'Full system scan required', timeToImpact: '< 1 week' },
  ],
  insider: [
    { type: 'Intellectual Property Theft', baseConfidence: 0.72, riskLevel: 'critical', action: 'Review user data access patterns', timeToImpact: '< 24 hours' },
    { type: 'Data Sabotage', baseConfidence: 0.45, riskLevel: 'high', action: 'Audit system changes by user', timeToImpact: '< 48 hours' },
    { type: 'Financial Fraud', baseConfidence: 0.52, riskLevel: 'high', action: 'Review financial transaction logs', timeToImpact: '< 1 week' },
    { type: 'Competitive Intelligence Leak', baseConfidence: 0.65, riskLevel: 'high', action: 'Monitor external communications', timeToImpact: '< 1 month' },
  ],
  sabotage: [
    { type: 'System Destruction', baseConfidence: 0.85, riskLevel: 'critical', action: 'Immediately revoke all access', timeToImpact: '< 15 min' },
    { type: 'Data Corruption', baseConfidence: 0.78, riskLevel: 'critical', action: 'Verify backup integrity', timeToImpact: '< 30 min' },
    { type: 'Business Operations Disruption', baseConfidence: 0.82, riskLevel: 'critical', action: 'Activate DR plan', timeToImpact: '< 1 hour' },
  ],
  physical: [
    { type: 'Unauthorized System Access', baseConfidence: 0.68, riskLevel: 'high', action: 'Review physical access logs', timeToImpact: '< 2 hours' },
    { type: 'Device Theft', baseConfidence: 0.55, riskLevel: 'medium', action: 'Remote wipe capability check', timeToImpact: '< 4 hours' },
    { type: 'Hardware Implant', baseConfidence: 0.35, riskLevel: 'critical', action: 'Hardware inspection required', timeToImpact: 'Unknown' },
  ],
  iot: [
    { type: 'Botnet Recruitment', baseConfidence: 0.72, riskLevel: 'high', action: 'Segment IoT networks', timeToImpact: '< 4 hours' },
    { type: 'Physical Process Manipulation', baseConfidence: 0.58, riskLevel: 'critical', action: 'Isolate OT systems', timeToImpact: '< 1 hour' },
    { type: 'Pivot to Corporate Network', baseConfidence: 0.65, riskLevel: 'high', action: 'Review IoT-corporate network links', timeToImpact: '< 8 hours' },
  ],
  dns: [
    { type: 'Traffic Hijacking', baseConfidence: 0.78, riskLevel: 'critical', action: 'Verify DNS records immediately', timeToImpact: '< 30 min' },
    { type: 'Credential Phishing', baseConfidence: 0.72, riskLevel: 'critical', action: 'Alert users of potential phishing', timeToImpact: '< 1 hour' },
    { type: 'Data Exfiltration via DNS Tunnel', baseConfidence: 0.55, riskLevel: 'high', action: 'Monitor DNS query patterns', timeToImpact: '< 4 hours' },
  ],
  email: [
    { type: 'Credential Compromise', baseConfidence: 0.75, riskLevel: 'critical', action: 'Force password reset for clicked users', timeToImpact: '< 2 hours' },
    { type: 'Malware Infection', baseConfidence: 0.68, riskLevel: 'high', action: 'Scan endpoints for indicators', timeToImpact: '< 4 hours' },
    { type: 'Business Email Compromise', baseConfidence: 0.62, riskLevel: 'critical', action: 'Verify financial requests out-of-band', timeToImpact: '< 1 hour' },
    { type: 'Wire Fraud', baseConfidence: 0.55, riskLevel: 'critical', action: 'Hold suspicious transactions', timeToImpact: '< 30 min' },
  ],
  certificate: [
    { type: 'Man-in-the-Middle Attack', baseConfidence: 0.72, riskLevel: 'critical', action: 'Renew and replace certificates', timeToImpact: '< 1 hour' },
    { type: 'Service Disruption', baseConfidence: 0.82, riskLevel: 'high', action: 'Emergency certificate issuance', timeToImpact: '< 30 min' },
    { type: 'Trust Chain Compromise', baseConfidence: 0.45, riskLevel: 'critical', action: 'Review entire PKI infrastructure', timeToImpact: '< 24 hours' },
  ],
  compliance: [
    { type: 'Regulatory Fines', baseConfidence: 0.75, riskLevel: 'high', action: 'Document remediation efforts', timeToImpact: '< 1 month' },
    { type: 'Audit Failure', baseConfidence: 0.82, riskLevel: 'medium', action: 'Prepare evidence of controls', timeToImpact: '< 1 week' },
    { type: 'Customer Trust Loss', baseConfidence: 0.55, riskLevel: 'medium', action: 'Prepare customer communication', timeToImpact: '< 1 month' },
  ],
  supplyChain: [
    { type: 'Widespread Compromise', baseConfidence: 0.85, riskLevel: 'critical', action: 'Audit all dependency versions', timeToImpact: '< 24 hours' },
    { type: 'Backdoor Deployment', baseConfidence: 0.78, riskLevel: 'critical', action: 'Scan all systems using affected component', timeToImpact: '< 48 hours' },
    { type: 'Customer Compromise', baseConfidence: 0.72, riskLevel: 'critical', action: 'Notify affected customers', timeToImpact: '< 1 week' },
  ],
  zeroDay: [
    { type: 'Mass Exploitation', baseConfidence: 0.88, riskLevel: 'critical', action: 'Emergency patching or mitigation', timeToImpact: '< 4 hours' },
    { type: 'Full System Compromise', baseConfidence: 0.82, riskLevel: 'critical', action: 'Isolate vulnerable systems', timeToImpact: '< 1 hour' },
    { type: 'Data Breach', baseConfidence: 0.75, riskLevel: 'critical', action: 'Enhanced monitoring required', timeToImpact: '< 24 hours' },
    { type: 'Ransomware Deployment', baseConfidence: 0.68, riskLevel: 'critical', action: 'Verify backup isolation', timeToImpact: '< 8 hours' },
  ],
  exploit: [
    { type: 'Remote Code Execution', baseConfidence: 0.82, riskLevel: 'critical', action: 'Patch or isolate immediately', timeToImpact: '< 30 min' },
    { type: 'Privilege Escalation', baseConfidence: 0.75, riskLevel: 'high', action: 'Review compromised system access', timeToImpact: '< 2 hours' },
    { type: 'Data Theft', baseConfidence: 0.68, riskLevel: 'critical', action: 'Monitor for data exfiltration', timeToImpact: '< 4 hours' },
  ],
  socialEngineering: [
    { type: 'Credential Compromise', baseConfidence: 0.72, riskLevel: 'critical', action: 'Force password reset', timeToImpact: '< 1 hour' },
    { type: 'Malware Installation', baseConfidence: 0.65, riskLevel: 'high', action: 'Scan user endpoint', timeToImpact: '< 2 hours' },
    { type: 'Financial Fraud', baseConfidence: 0.58, riskLevel: 'critical', action: 'Verify transaction requests', timeToImpact: '< 30 min' },
    { type: 'Access Provisioning Abuse', baseConfidence: 0.52, riskLevel: 'high', action: 'Audit recent access changes', timeToImpact: '< 4 hours' },
  ],
};

// Severity multipliers
const SEVERITY_MULTIPLIERS: Record<string, number> = {
  critical: 1.25,
  high: 1.0,
  medium: 0.80,
  low: 0.65,
  info: 0.50,
};

// ═══════════════════════════════════════════════════════════════
// PREDICTION ENGINE
// ═══════════════════════════════════════════════════════════════

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text.toLowerCase();
  const allPatterns = Object.values(INCIDENT_PATTERNS).flat();
  return allPatterns.filter(pattern => words.includes(pattern));
}

function detectIncidentTypes(incident: Incident): string[] {
  const text = `${incident.title || ''} ${incident.description || ''} ${incident.category || ''}`.toLowerCase();
  const detectedTypes: string[] = [];
  
  for (const [type, patterns] of Object.entries(INCIDENT_PATTERNS)) {
    const matchCount = patterns.filter(pattern => text.includes(pattern)).length;
    if (matchCount > 0) {
      detectedTypes.push(type);
    }
  }
  
  return detectedTypes.length > 0 ? detectedTypes : ['general'];
}

function generateHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function generatePredictionsForIncident(incident: Incident, agentName: string = 'CascadePredictionAgent'): CascadePrediction[] {
  const predictions: CascadePrediction[] = [];
  const detectedTypes = detectIncidentTypes(incident);
  const severityMultiplier = SEVERITY_MULTIPLIERS[incident.severity] || 1.0;
  
  // Add noise factor for variation based on incident ID
  const idHash = generateHash(incident.id);
  const noiseFactor = 0.85 + (Math.abs(idHash % 30) / 100);
  
  const seenTypes = new Set<string>();
  
  for (const type of detectedTypes) {
    const cascades = CASCADE_MAP[type] || [];
    
    for (const cascade of cascades) {
      if (seenTypes.has(cascade.type)) continue;
      seenTypes.add(cascade.type);
      
      // Calculate confidence with variation
      let confidence = cascade.baseConfidence * severityMultiplier * noiseFactor;
      const randomOffset = ((idHash % 17) - 8) / 100;
      confidence = Math.min(0.95, Math.max(0.25, confidence + randomOffset));
      
      predictions.push({
        incident_id: incident.id,
        predicted_by_agent: agentName,
        prediction_type: 'cascade',
        potential_incident_type: cascade.type,
        confidence: Math.round(confidence * 1000) / 1000,
        risk_level: cascade.riskLevel,
        recommended_action: cascade.action,
        prediction_basis: `Based on ${type} indicators (keywords: ${extractKeywords(incident.title).slice(0, 3).join(', ') || 'severity-based'}). Time to impact: ${cascade.timeToImpact}`,
        status: 'active',
      });
    }
  }
  
  // If no specific patterns matched, generate severity-based predictions
  if (predictions.length === 0) {
    predictions.push(...generateSeverityBasedPredictions(incident, idHash, agentName));
  }
  
  // Sort by confidence and return top predictions
  predictions.sort((a, b) => b.confidence - a.confidence);
  return predictions.slice(0, 6);
}

function generateSeverityBasedPredictions(incident: Incident, idHash: number, agentName: string): CascadePrediction[] {
  const predictions: CascadePrediction[] = [];
  const baseConfidenceMap: Record<string, number> = {
    critical: 0.75,
    high: 0.60,
    medium: 0.45,
    low: 0.30,
    info: 0.20,
  };
  
  const baseConfidence = baseConfidenceMap[incident.severity] || 0.40;
  const variation = (Math.abs(idHash % 20) - 10) / 100;
  
  const predictionPool = [
    { type: 'Operational Disruption', riskLevel: 'high' as const, action: 'Review affected systems', timeToImpact: '< 4 hours' },
    { type: 'Security Posture Degradation', riskLevel: 'medium' as const, action: 'Assess security controls', timeToImpact: '< 24 hours' },
    { type: 'Compliance Impact', riskLevel: 'medium' as const, action: 'Document incident', timeToImpact: '< 1 week' },
    { type: 'Resource Exhaustion', riskLevel: 'high' as const, action: 'Monitor resources', timeToImpact: '< 2 hours' },
    { type: 'Cascading System Failures', riskLevel: 'high' as const, action: 'Identify dependencies', timeToImpact: '< 4 hours' },
    { type: 'Extended Recovery Time', riskLevel: 'medium' as const, action: 'Prepare recovery procedures', timeToImpact: '< 8 hours' },
  ];
  
  const startIndex = Math.abs(idHash % predictionPool.length);
  const count = incident.severity === 'critical' ? 4 : incident.severity === 'high' ? 3 : 2;
  
  for (let i = 0; i < count; i++) {
    const pred = predictionPool[(startIndex + i) % predictionPool.length];
    const conf = Math.min(0.90, Math.max(0.25, baseConfidence + variation + (i * -0.08)));
    
    predictions.push({
      incident_id: incident.id,
      predicted_by_agent: agentName,
      prediction_type: 'severity-based',
      potential_incident_type: pred.type,
      confidence: Math.round(conf * 1000) / 1000,
      risk_level: pred.riskLevel,
      recommended_action: pred.action,
      prediction_basis: `Based on ${incident.severity} severity incident. Time to impact: ${pred.timeToImpact}`,
      status: 'active',
    });
  }
  
  return predictions;
}

// ═══════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function savePredictions(predictions: CascadePrediction[]): Promise<CascadePrediction[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('cascade_predictions')
      .insert(predictions)
      .select();
    
    if (error) {
      console.error('[PredictionAgent] Error saving predictions:', error);
      return predictions;
    }
    
    return data || predictions;
  } catch (error) {
    console.error('[PredictionAgent] Database error:', error);
    return predictions;
  }
}

export async function getPredictionsForIncident(incidentId: string): Promise<CascadePrediction[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('cascade_predictions')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('status', 'active')
      .order('confidence', { ascending: false });
    
    if (error) {
      console.error('[PredictionAgent] Error fetching predictions:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[PredictionAgent] Database error:', error);
    return [];
  }
}

export async function markPredictionPrevented(
  predictionId: string,
  agentId: string,
  preventionAction: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('cascade_predictions')
      .update({
        status: 'prevented',
        prevented_by_agent: agentId,
        prevented_at: new Date().toISOString(),
        prevention_action: preventionAction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', predictionId);
    
    return !error;
  } catch (error) {
    console.error('[PredictionAgent] Error updating prediction:', error);
    return false;
  }
}

export async function saveAgentResolution(resolution: AgentResolution): Promise<AgentResolution | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('agent_resolutions')
      .insert([{
        ...resolution,
        completed_at: new Date().toISOString(),
        duration_ms: resolution.started_at 
          ? Date.now() - new Date(resolution.started_at).getTime() 
          : 0,
      }])
      .select()
      .single();
    
    if (error) {
      console.error('[PredictionAgent] Error saving resolution:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[PredictionAgent] Database error:', error);
    return null;
  }
}

export async function logAgentRun(
  agentId: string,
  agentName: string,
  metrics: {
    incidentsAnalyzed: number;
    predictionsGenerated: number;
    incidentsResolved: number;
    cascadesPrevented: number;
    runType: 'scheduled' | 'triggered' | 'continuous' | 'manual';
    status: 'running' | 'completed' | 'failed' | 'interrupted';
    startedAt: Date;
    error?: string;
  }
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('agent_run_log')
      .insert([{
        agent_id: agentId,
        agent_name: agentName,
        run_type: metrics.runType,
        status: metrics.status,
        incidents_analyzed: metrics.incidentsAnalyzed,
        predictions_generated: metrics.predictionsGenerated,
        incidents_resolved: metrics.incidentsResolved,
        cascades_prevented: metrics.cascadesPrevented,
        started_at: metrics.startedAt.toISOString(),
        completed_at: metrics.status === 'completed' ? new Date().toISOString() : null,
        duration_ms: Date.now() - metrics.startedAt.getTime(),
        error_message: metrics.error,
        metrics: {
          timestamp: new Date().toISOString(),
          ...metrics,
        },
      }]);
  } catch (error) {
    console.error('[PredictionAgent] Error logging run:', error);
  }
}
