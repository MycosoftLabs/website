/**
 * Compliance Frameworks Library
 * 
 * Supports multiple security frameworks:
 * - NIST SP 800-53 (Federal Information Systems)
 * - NIST SP 800-171 (CUI Protection)
 * - CMMC 2.0 (DoD Contractor Cybersecurity)
 * - NISPOM/32 CFR 117 (National Industrial Security Program)
 * - FOCI (Foreign Ownership, Control, or Influence)
 * - SBIR/STTR (Small Business Innovation Research)
 * - Exostar Integration (Supply Chain Risk Management)
 * 
 * Based on Executive Order 12829 and DCSA/CDSE requirements
 */

// ═══════════════════════════════════════════════════════════════
// FRAMEWORK TYPES
// ═══════════════════════════════════════════════════════════════

export type ComplianceFramework = 
  | 'NIST-800-53'
  | 'NIST-800-171'
  | 'CMMC-L1'
  | 'CMMC-L2'
  | 'CMMC-L3'
  | 'NISPOM'      // 32 CFR Part 117 - National Industrial Security Program
  | 'FOCI'        // Foreign Ownership, Control, or Influence
  | 'SBIR-STTR'   // Small Business Innovation Research / Technology Transfer
  | 'ITAR'        // International Traffic in Arms Regulations
  | 'EAR'         // Export Administration Regulations
  | 'ICD-503'     // Intelligence Community Directive 503
  | 'CNSSI-1253'  // CNSSI 1253 - National Security Systems
  | 'FEDRAMP-HIGH'; // FedRAMP High Baseline

export type CMMCLevel = 1 | 2 | 3;

// Clearance levels for NISP
export type ClearanceLevel = 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET' | 'TS_SCI';

// SBIR/STTR phases
export type SBIRPhase = 'Phase_I' | 'Phase_II' | 'Phase_III';

export interface FrameworkInfo {
  id: ComplianceFramework;
  name: string;
  fullName: string;
  version: string;
  description: string;
  icon: string;
  color: string;
  applicableTo: string[];
  requiredFor: string[];
  totalControls: number;
}

export interface ControlFamily {
  id: string;
  name: string;
  icon: string;
  description: string;
  framework: ComplianceFramework;
}

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  family: string;
  name: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence: string[];
  lastAudit: string;
  lastAuditBy: string;
  priority: 'high' | 'medium' | 'low';
  notes: string;
  // CMMC-specific fields
  cmmcLevel?: CMMCLevel;
  cmmcPractice?: string;
  // Cross-framework mappings
  mappings?: {
    'NIST-800-53'?: string[];
    'NIST-800-171'?: string[];
    'CMMC-L2'?: string[];
    'NISPOM'?: string[];
    'FOCI'?: string[];
  };
  // Assessment data
  assessmentMethod?: 'examine' | 'interview' | 'test';
  implementationStatus?: 'implemented' | 'planned' | 'alternative' | 'not_implemented';
  poamId?: string; // Plan of Action and Milestones reference
  // NISPOM/NISP specific
  clearanceRequired?: ClearanceLevel;
  scifRequired?: boolean;
  // SBIR/STTR specific
  sbirPhase?: SBIRPhase;
}

// ═══════════════════════════════════════════════════════════════
// NISP/NISPOM TYPES (E.O. 12829, 32 CFR Part 117)
// ═══════════════════════════════════════════════════════════════

export interface FacilityClearance {
  cageCode: string;
  facilityName: string;
  clearanceLevel: ClearanceLevel;
  sponsoringAgency: string;
  expirationDate: string;
  status: 'active' | 'pending' | 'suspended' | 'revoked';
  fociMitigation?: FOCIMitigation;
  lastInspection: string;
  nextInspectionDue: string;
}

export interface FOCIMitigation {
  required: boolean;
  mitigationType?: 'board_resolution' | 'security_control_agreement' | 'special_security_agreement' | 
                   'voting_trust_agreement' | 'proxy_agreement';
  status: 'approved' | 'pending' | 'under_review' | 'not_required';
  approvalDate?: string;
  reviewDate?: string;
  foreignEntity?: {
    name: string;
    country: string;
    ownershipPercentage: number;
    controlType: 'ownership' | 'control' | 'influence';
  };
}

export interface PersonnelClearance {
  id: string;
  name: string;
  clearanceLevel: ClearanceLevel;
  investigationType: 'NACLC' | 'SSBI' | 'SSBI-PR' | 'Tier_3' | 'Tier_5';
  grantDate: string;
  reinvestigationDue: string;
  status: 'active' | 'pending' | 'suspended' | 'revoked' | 'debriefed';
  accessToBriefings: string[];
  cdseTrainingComplete: boolean;
  lastSecurityBriefing: string;
}

export interface SBIRSTTRProgram {
  awardNumber: string;
  agency: 'DoD' | 'DHS' | 'DOE' | 'NASA' | 'NSF' | 'NIH' | 'USDA' | 'EPA' | 'DOC' | 'DOT' | 'ED';
  programType: 'SBIR' | 'STTR';
  phase: SBIRPhase;
  topic: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'pending' | 'terminated';
  dataRights: 'limited' | 'unlimited' | 'government_purpose';
  exportControlled: boolean;
  securityClassification: 'unclassified' | 'cui' | 'classified';
  techTransferRequired: boolean;
}

export interface ExostarIntegration {
  enabled: boolean;
  organizationId: string;
  apiEndpoint: string;
  apiKeyConfigured: boolean;
  lastSync: string | null;
  syncStatus: 'connected' | 'disconnected' | 'error';
  features: {
    riskManagement: boolean;
    supplierAssessment: boolean;
    credentialing: boolean;
    incidentReporting: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// FRAMEWORK DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const FRAMEWORKS: Record<ComplianceFramework, FrameworkInfo> = {
  'NIST-800-53': {
    id: 'NIST-800-53',
    name: 'NIST 800-53',
    fullName: 'NIST Special Publication 800-53 Rev. 5',
    version: 'Rev. 5',
    description: 'Security and Privacy Controls for Information Systems and Organizations',
    icon: '🏛️',
    color: 'blue',
    applicableTo: ['Federal Agencies', 'Government Contractors', 'Critical Infrastructure'],
    requiredFor: ['FISMA Compliance', 'FedRAMP Authorization'],
    totalControls: 1189,
  },
  'NIST-800-171': {
    id: 'NIST-800-171',
    name: 'NIST 800-171',
    fullName: 'NIST Special Publication 800-171 Rev. 2',
    version: 'Rev. 2',
    description: 'Protecting Controlled Unclassified Information (CUI) in Nonfederal Systems',
    icon: '🔒',
    color: 'purple',
    applicableTo: ['DoD Contractors', 'Defense Industrial Base', 'CUI Handlers'],
    requiredFor: ['DFARS 252.204-7012', 'CMMC Certification'],
    totalControls: 110,
  },
  'CMMC-L1': {
    id: 'CMMC-L1',
    name: 'CMMC Level 1',
    fullName: 'Cybersecurity Maturity Model Certification Level 1 (Foundational)',
    version: '2.0',
    description: 'Basic safeguarding of Federal Contract Information (FCI)',
    icon: '🛡️',
    color: 'green',
    applicableTo: ['DoD Contractors handling FCI'],
    requiredFor: ['DoD Contracts with FCI'],
    totalControls: 17,
  },
  'CMMC-L2': {
    id: 'CMMC-L2',
    name: 'CMMC Level 2',
    fullName: 'Cybersecurity Maturity Model Certification Level 2 (Advanced)',
    version: '2.0',
    description: 'Protection of Controlled Unclassified Information (CUI)',
    icon: '🛡️',
    color: 'amber',
    applicableTo: ['DoD Contractors handling CUI'],
    requiredFor: ['DoD Contracts with CUI', 'DFARS Compliance'],
    totalControls: 110,
  },
  'CMMC-L3': {
    id: 'CMMC-L3',
    name: 'CMMC Level 3',
    fullName: 'Cybersecurity Maturity Model Certification Level 3 (Expert)',
    version: '2.0',
    description: 'Enhanced protection against Advanced Persistent Threats (APT)',
    icon: '🛡️',
    color: 'red',
    applicableTo: ['DoD Contractors with highest priority programs'],
    requiredFor: ['Critical DoD Programs', 'APT Protection Requirements'],
    totalControls: 134,
  },
  'NISPOM': {
    id: 'NISPOM',
    name: 'NISPOM',
    fullName: 'National Industrial Security Program Operating Manual (32 CFR Part 117)',
    version: '32 CFR 117',
    description: 'E.O. 12829 - Uniform procedures for classified information protection in industry',
    icon: '🔐',
    color: 'indigo',
    applicableTo: ['Cleared DoD Contractors', 'TRADOC', 'SOCOM', 'Intelligence Community'],
    requiredFor: ['Facility Clearances (FCL)', 'SCIF Access', 'Classified Contracts'],
    totalControls: 45,
  },
  'FOCI': {
    id: 'FOCI',
    name: 'FOCI',
    fullName: 'Foreign Ownership, Control, or Influence',
    version: '32 CFR 117.11',
    description: 'Mitigation requirements for foreign ownership or control of cleared contractors',
    icon: '🌍',
    color: 'orange',
    applicableTo: ['Foreign-Owned Contractors', 'Joint Ventures', 'Acquisitions'],
    requiredFor: ['FCL Eligibility', 'Classified Access', 'DCSA Approval'],
    totalControls: 18,
  },
  'SBIR-STTR': {
    id: 'SBIR-STTR',
    name: 'SBIR/STTR',
    fullName: 'Small Business Innovation Research / Technology Transfer',
    version: 'SBA Policy Directive',
    description: 'Federal R&D program requirements for small businesses',
    icon: '🚀',
    color: 'teal',
    applicableTo: ['Small Businesses', 'R&D Contractors', 'Tech Startups'],
    requiredFor: ['SBIR Phase I/II/III', 'STTR Funding', 'Federal R&D Contracts'],
    totalControls: 22,
  },
  'ITAR': {
    id: 'ITAR',
    name: 'ITAR',
    fullName: 'International Traffic in Arms Regulations (22 CFR 120-130)',
    version: '22 CFR 120-130',
    description: 'Export control of defense articles and services',
    icon: '⚔️',
    color: 'rose',
    applicableTo: ['Defense Contractors', 'Weapons Manufacturers', 'Defense Services'],
    requiredFor: ['USML Items', 'Defense Exports', 'Technical Data Transfer'],
    totalControls: 15,
  },
  'EAR': {
    id: 'EAR',
    name: 'EAR',
    fullName: 'Export Administration Regulations (15 CFR 730-774)',
    version: '15 CFR 730-774',
    description: 'Export control of dual-use items and technology',
    icon: '📦',
    color: 'sky',
    applicableTo: ['Technology Companies', 'Dual-Use Manufacturers', 'Exporters'],
    requiredFor: ['CCL Items', 'Dual-Use Exports', 'Technology Transfer'],
    totalControls: 12,
  },
  'ICD-503': {
    id: 'ICD-503',
    name: 'ICD 503',
    fullName: 'Intelligence Community Directive 503',
    version: 'ICD 503 Rev. 3',
    description: 'Security Controls for Intelligence Community Systems',
    icon: '🕵️',
    color: 'slate',
    applicableTo: ['Intelligence Community', 'IC Contractors', 'SCI Systems'],
    requiredFor: ['SCI Processing', 'IC Networks', 'TS/SCI Operations'],
    totalControls: 189,
  },
  'CNSSI-1253': {
    id: 'CNSSI-1253',
    name: 'CNSSI 1253',
    fullName: 'CNSSI 1253 - Security Categorization for National Security Systems',
    version: 'March 2014 (Updated 2022)',
    description: 'Security categorization and control selection for National Security Systems',
    icon: '🏛️',
    color: 'zinc',
    applicableTo: ['National Security Systems', 'DoD Classified', 'IC Systems'],
    requiredFor: ['NSS Authorization', 'Classified System ATO', 'IL-5/IL-6 Operations'],
    totalControls: 156,
  },
  'FEDRAMP-HIGH': {
    id: 'FEDRAMP-HIGH',
    name: 'FedRAMP High',
    fullName: 'Federal Risk and Authorization Management Program - High Baseline',
    version: 'Rev. 5 (2023)',
    description: 'Cloud security authorization for high-impact federal systems',
    icon: '☁️',
    color: 'cyan',
    applicableTo: ['Cloud Service Providers', 'Federal Contractors', 'SaaS Providers'],
    requiredFor: ['Federal Cloud Authorization', 'High-Impact Systems', 'DoD IL-4+'],
    totalControls: 421,
  },
};

// ═══════════════════════════════════════════════════════════════
// NIST 800-171 CONTROL FAMILIES (14 Families, 110 Controls)
// ═══════════════════════════════════════════════════════════════

export const NIST_800_171_FAMILIES: ControlFamily[] = [
  { id: '3.1', name: 'Access Control', icon: '🔐', description: 'Limit access to CUI and system functions', framework: 'NIST-800-171' },
  { id: '3.2', name: 'Awareness and Training', icon: '📚', description: 'Ensure personnel are trained in security', framework: 'NIST-800-171' },
  { id: '3.3', name: 'Audit and Accountability', icon: '📝', description: 'Create, protect, and retain audit records', framework: 'NIST-800-171' },
  { id: '3.4', name: 'Configuration Management', icon: '⚙️', description: 'Establish and maintain system configurations', framework: 'NIST-800-171' },
  { id: '3.5', name: 'Identification and Authentication', icon: '🪪', description: 'Identify and authenticate users and devices', framework: 'NIST-800-171' },
  { id: '3.6', name: 'Incident Response', icon: '🚨', description: 'Detect, respond to, and recover from incidents', framework: 'NIST-800-171' },
  { id: '3.7', name: 'Maintenance', icon: '🔧', description: 'Perform system maintenance', framework: 'NIST-800-171' },
  { id: '3.8', name: 'Media Protection', icon: '💾', description: 'Protect system media containing CUI', framework: 'NIST-800-171' },
  { id: '3.9', name: 'Personnel Security', icon: '👥', description: 'Screen and protect personnel', framework: 'NIST-800-171' },
  { id: '3.10', name: 'Physical Protection', icon: '🏢', description: 'Limit physical access to systems', framework: 'NIST-800-171' },
  { id: '3.11', name: 'Risk Assessment', icon: '⚠️', description: 'Assess and manage risk', framework: 'NIST-800-171' },
  { id: '3.12', name: 'Security Assessment', icon: '✅', description: 'Assess security controls periodically', framework: 'NIST-800-171' },
  { id: '3.13', name: 'System and Communications Protection', icon: '🌐', description: 'Monitor and protect communications', framework: 'NIST-800-171' },
  { id: '3.14', name: 'System and Information Integrity', icon: '🛡️', description: 'Identify and correct system flaws', framework: 'NIST-800-171' },
];

// ═══════════════════════════════════════════════════════════════
// CMMC 2.0 DOMAINS
// ═══════════════════════════════════════════════════════════════

export const CMMC_DOMAINS: ControlFamily[] = [
  { id: 'AC', name: 'Access Control', icon: '🔐', description: 'Control access to systems and data', framework: 'CMMC-L2' },
  { id: 'AT', name: 'Awareness & Training', icon: '📚', description: 'Security awareness and training', framework: 'CMMC-L2' },
  { id: 'AU', name: 'Audit & Accountability', icon: '📝', description: 'Audit and accountability practices', framework: 'CMMC-L2' },
  { id: 'CM', name: 'Configuration Management', icon: '⚙️', description: 'Configuration management practices', framework: 'CMMC-L2' },
  { id: 'IA', name: 'Identification & Authentication', icon: '🪪', description: 'Identity verification', framework: 'CMMC-L2' },
  { id: 'IR', name: 'Incident Response', icon: '🚨', description: 'Incident detection and response', framework: 'CMMC-L2' },
  { id: 'MA', name: 'Maintenance', icon: '🔧', description: 'System maintenance', framework: 'CMMC-L2' },
  { id: 'MP', name: 'Media Protection', icon: '💾', description: 'Protect media and data', framework: 'CMMC-L2' },
  { id: 'PS', name: 'Personnel Security', icon: '👥', description: 'Personnel security screening', framework: 'CMMC-L2' },
  { id: 'PE', name: 'Physical Protection', icon: '🏢', description: 'Physical access controls', framework: 'CMMC-L2' },
  { id: 'RA', name: 'Risk Assessment', icon: '⚠️', description: 'Risk assessment and management', framework: 'CMMC-L2' },
  { id: 'CA', name: 'Security Assessment', icon: '✅', description: 'Security assessment practices', framework: 'CMMC-L2' },
  { id: 'SC', name: 'Systems & Communications Protection', icon: '🌐', description: 'Network and communication security', framework: 'CMMC-L2' },
  { id: 'SI', name: 'System & Information Integrity', icon: '🛡️', description: 'System integrity protection', framework: 'CMMC-L2' },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - NIST 800-171
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_NIST_171_CONTROLS: ComplianceControl[] = [
  // Access Control (3.1)
  {
    id: '3.1.1',
    framework: 'NIST-800-171',
    family: '3.1',
    name: 'Authorized Access Control',
    description: 'Limit information system access to authorized users, processes acting on behalf of authorized users, or devices (including other information systems)',
    status: 'compliant',
    evidence: ['Supabase RLS policies', 'UniFi network segmentation', 'User authentication logs'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated access control via Supabase and UniFi',
    mappings: { 'NIST-800-53': ['AC-2', 'AC-3', 'AC-17'], 'CMMC-L2': ['AC.L1-3.1.1'] },
  },
  {
    id: '3.1.2',
    framework: 'NIST-800-171',
    family: '3.1',
    name: 'Transaction & Function Control',
    description: 'Limit information system access to the types of transactions and functions that authorized users are permitted to execute',
    status: 'compliant',
    evidence: ['Role-based access control', 'API authorization middleware'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'RBAC implemented in application layer',
    mappings: { 'NIST-800-53': ['AC-2', 'AC-3'], 'CMMC-L2': ['AC.L1-3.1.2'] },
  },
  {
    id: '3.1.3',
    framework: 'NIST-800-171',
    family: '3.1',
    name: 'CUI Flow Control',
    description: 'Control the flow of CUI in accordance with approved authorizations',
    status: 'partial',
    evidence: ['Network segmentation', 'Data classification in progress'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'Morgan',
    priority: 'high',
    notes: 'CUI data flow mapping in progress',
    mappings: { 'NIST-800-53': ['AC-4'], 'CMMC-L2': ['AC.L2-3.1.3'] },
  },
  // Audit and Accountability (3.3)
  {
    id: '3.3.1',
    framework: 'NIST-800-171',
    family: '3.3',
    name: 'System Auditing',
    description: 'Create, protect, and retain information system audit records to the extent needed to enable the monitoring, analysis, investigation, and reporting of unlawful, unauthorized, or inappropriate information system activity',
    status: 'compliant',
    evidence: ['Security event logging', 'Compliance audit logs', 'Suricata IDS logs'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Comprehensive audit logging implemented',
    mappings: { 'NIST-800-53': ['AU-2', 'AU-3', 'AU-6'], 'CMMC-L2': ['AU.L2-3.3.1'] },
  },
  {
    id: '3.3.2',
    framework: 'NIST-800-171',
    family: '3.3',
    name: 'User Accountability',
    description: 'Ensure that the actions of individual information system users can be uniquely traced to those users so they can be held accountable for their actions',
    status: 'compliant',
    evidence: ['User session tracking', 'Action attribution in logs'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'All actions logged with user attribution',
    mappings: { 'NIST-800-53': ['AU-2', 'AU-6'], 'CMMC-L2': ['AU.L2-3.3.2'] },
  },
  // Incident Response (3.6)
  {
    id: '3.6.1',
    framework: 'NIST-800-171',
    family: '3.6',
    name: 'Incident Handling',
    description: 'Establish an operational incident-handling capability for organizational information systems that includes adequate preparation, detection, analysis, containment, recovery, and user response activities',
    status: 'compliant',
    evidence: ['SOC dashboard', 'Incident management system', 'Response playbooks'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Full incident management capability operational',
    mappings: { 'NIST-800-53': ['IR-2', 'IR-4', 'IR-5', 'IR-6'], 'CMMC-L2': ['IR.L2-3.6.1'] },
  },
  {
    id: '3.6.2',
    framework: 'NIST-800-171',
    family: '3.6',
    name: 'Incident Reporting',
    description: 'Track, document, and report incidents to appropriate officials and/or authorities both internal and external to the organization',
    status: 'compliant',
    evidence: ['Incident timeline tracking', 'Email notifications', 'Audit logs'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated incident reporting configured',
    mappings: { 'NIST-800-53': ['IR-6'], 'CMMC-L2': ['IR.L2-3.6.2'] },
  },
  // System and Communications Protection (3.13)
  {
    id: '3.13.1',
    framework: 'NIST-800-171',
    family: '3.13',
    name: 'Boundary Protection',
    description: 'Monitor, control, and protect organizational communications at the external boundaries and key internal boundaries of the information systems',
    status: 'compliant',
    evidence: ['UniFi Dream Machine Pro', 'Suricata IDS/IPS', 'Cloudflare WAF'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Multi-layer boundary protection active',
    mappings: { 'NIST-800-53': ['SC-7'], 'CMMC-L2': ['SC.L1-3.13.1'] },
  },
  {
    id: '3.13.5',
    framework: 'NIST-800-171',
    family: '3.13',
    name: 'Network Segmentation',
    description: 'Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks',
    status: 'compliant',
    evidence: ['VLAN configuration', 'UniFi network zones'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Network segmentation via UniFi VLANs',
    mappings: { 'NIST-800-53': ['SC-7'], 'CMMC-L2': ['SC.L2-3.13.5'] },
  },
  // System and Information Integrity (3.14)
  {
    id: '3.14.1',
    framework: 'NIST-800-171',
    family: '3.14',
    name: 'Flaw Remediation',
    description: 'Identify, report, and correct information and information system flaws in a timely manner',
    status: 'compliant',
    evidence: ['Vulnerability scanning', 'Patch management', 'Red Team assessments'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated vulnerability detection active',
    mappings: { 'NIST-800-53': ['SI-2'], 'CMMC-L2': ['SI.L1-3.14.1'] },
  },
  {
    id: '3.14.6',
    framework: 'NIST-800-171',
    family: '3.14',
    name: 'Security Monitoring',
    description: 'Monitor organizational information systems to detect attacks and indicators of potential attacks',
    status: 'compliant',
    evidence: ['24/7 SOC monitoring', 'Suricata IDS', 'Anomaly detection'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Real-time monitoring via UniFi + Suricata',
    mappings: { 'NIST-800-53': ['SI-4'], 'CMMC-L2': ['SI.L2-3.14.6'] },
  },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - CMMC LEVEL 2
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_CMMC_L2_CONTROLS: ComplianceControl[] = [
  // Access Control
  {
    id: 'AC.L1-3.1.1',
    framework: 'CMMC-L2',
    family: 'AC',
    name: 'Authorized Access Control',
    description: 'Limit information system access to authorized users, processes, or devices',
    status: 'compliant',
    evidence: ['Supabase RLS', 'UniFi ACLs', 'User provisioning logs'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated access control',
    cmmcLevel: 1,
    cmmcPractice: 'AC.1.001',
    mappings: { 'NIST-800-171': ['3.1.1'] },
  },
  {
    id: 'AC.L1-3.1.2',
    framework: 'CMMC-L2',
    family: 'AC',
    name: 'Transaction Control',
    description: 'Limit information system access to the types of transactions and functions that authorized users are permitted to execute',
    status: 'compliant',
    evidence: ['RBAC policies', 'API authorization'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Role-based access implemented',
    cmmcLevel: 1,
    cmmcPractice: 'AC.1.002',
    mappings: { 'NIST-800-171': ['3.1.2'] },
  },
  {
    id: 'AC.L2-3.1.3',
    framework: 'CMMC-L2',
    family: 'AC',
    name: 'CUI Flow Enforcement',
    description: 'Control the flow of CUI in accordance with approved authorizations',
    status: 'partial',
    evidence: ['Network segmentation', 'Data classification policy'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'Morgan',
    priority: 'high',
    notes: 'CUI boundary definition in progress',
    cmmcLevel: 2,
    cmmcPractice: 'AC.2.005',
    mappings: { 'NIST-800-171': ['3.1.3'] },
  },
  // Audit & Accountability
  {
    id: 'AU.L2-3.3.1',
    framework: 'CMMC-L2',
    family: 'AU',
    name: 'System Auditing',
    description: 'Create, protect, and retain system audit records',
    status: 'compliant',
    evidence: ['Security event database', 'Audit log retention', 'Log integrity checks'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Comprehensive audit logging active',
    cmmcLevel: 2,
    cmmcPractice: 'AU.2.041',
    mappings: { 'NIST-800-171': ['3.3.1'] },
  },
  {
    id: 'AU.L2-3.3.2',
    framework: 'CMMC-L2',
    family: 'AU',
    name: 'User Accountability',
    description: 'Ensure actions can be traced to individual users',
    status: 'compliant',
    evidence: ['User session tracking', 'Activity attribution'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'All actions attributed to users',
    cmmcLevel: 2,
    cmmcPractice: 'AU.2.042',
    mappings: { 'NIST-800-171': ['3.3.2'] },
  },
  // Incident Response
  {
    id: 'IR.L2-3.6.1',
    framework: 'CMMC-L2',
    family: 'IR',
    name: 'Incident Handling Capability',
    description: 'Establish an operational incident-handling capability',
    status: 'compliant',
    evidence: ['SOC dashboard', 'Incident management', 'Playbooks'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Full IR capability operational',
    cmmcLevel: 2,
    cmmcPractice: 'IR.2.092',
    mappings: { 'NIST-800-171': ['3.6.1'] },
  },
  {
    id: 'IR.L2-3.6.2',
    framework: 'CMMC-L2',
    family: 'IR',
    name: 'Incident Reporting',
    description: 'Track, document, and report incidents',
    status: 'compliant',
    evidence: ['Incident timeline', 'Email alerts', 'Audit logs'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated incident reporting',
    cmmcLevel: 2,
    cmmcPractice: 'IR.2.093',
    mappings: { 'NIST-800-171': ['3.6.2'] },
  },
  // Systems & Communications Protection
  {
    id: 'SC.L1-3.13.1',
    framework: 'CMMC-L2',
    family: 'SC',
    name: 'Boundary Protection',
    description: 'Monitor, control, and protect communications at system boundaries',
    status: 'compliant',
    evidence: ['UniFi DMP', 'Suricata IDS', 'Cloudflare'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Multi-layer protection',
    cmmcLevel: 1,
    cmmcPractice: 'SC.1.175',
    mappings: { 'NIST-800-171': ['3.13.1'] },
  },
  {
    id: 'SC.L2-3.13.5',
    framework: 'CMMC-L2',
    family: 'SC',
    name: 'Network Segmentation',
    description: 'Implement subnetworks for publicly accessible components',
    status: 'compliant',
    evidence: ['VLAN configuration', 'Network zones'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Segmented via VLANs',
    cmmcLevel: 2,
    cmmcPractice: 'SC.2.179',
    mappings: { 'NIST-800-171': ['3.13.5'] },
  },
  // System & Information Integrity
  {
    id: 'SI.L1-3.14.1',
    framework: 'CMMC-L2',
    family: 'SI',
    name: 'Flaw Remediation',
    description: 'Identify, report, and correct system flaws in a timely manner',
    status: 'compliant',
    evidence: ['Vuln scanning', 'Patch management'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated flaw detection',
    cmmcLevel: 1,
    cmmcPractice: 'SI.1.210',
    mappings: { 'NIST-800-171': ['3.14.1'] },
  },
  {
    id: 'SI.L2-3.14.6',
    framework: 'CMMC-L2',
    family: 'SI',
    name: 'Security Monitoring',
    description: 'Monitor systems to detect attacks and indicators of potential attacks',
    status: 'compliant',
    evidence: ['SOC monitoring', 'Suricata IDS', 'Anomaly detection'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: '24/7 real-time monitoring',
    cmmcLevel: 2,
    cmmcPractice: 'SI.2.216',
    mappings: { 'NIST-800-171': ['3.14.6'] },
  },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - NISPOM (32 CFR Part 117, E.O. 12829)
// National Industrial Security Program Operating Manual
// ═══════════════════════════════════════════════════════════════

export const NISPOM_CONTROL_FAMILIES: ControlFamily[] = [
  { id: 'FCL', name: 'Facility Clearance', icon: '🏢', description: 'Facility security clearance requirements', framework: 'NISPOM' },
  { id: 'PCL', name: 'Personnel Clearance', icon: '👤', description: 'Personnel security clearance processing', framework: 'NISPOM' },
  { id: 'CLS', name: 'Classification Management', icon: '📋', description: 'Classified information marking and handling', framework: 'NISPOM' },
  { id: 'SAF', name: 'Safeguarding', icon: '🔒', description: 'Storage and transmission of classified information', framework: 'NISPOM' },
  { id: 'VIS', name: 'Visits & Access', icon: '🚪', description: 'Visitor control and access authorization', framework: 'NISPOM' },
  { id: 'SUB', name: 'Subcontracting', icon: '📄', description: 'Subcontract security requirements', framework: 'NISPOM' },
  { id: 'SEC', name: 'Security Training', icon: '📚', description: 'CDSE and security awareness training', framework: 'NISPOM' },
  { id: 'INC', name: 'Incident Reporting', icon: '🚨', description: 'Security incident and violation reporting', framework: 'NISPOM' },
  { id: 'SPP', name: 'Special Programs', icon: '⭐', description: 'SAP, SCI, and special access programs', framework: 'NISPOM' },
];

export const DEFAULT_NISPOM_CONTROLS: ComplianceControl[] = [
  // Facility Clearance
  {
    id: 'NISPOM-FCL-1',
    framework: 'NISPOM',
    family: 'FCL',
    name: 'Facility Clearance (FCL) Sponsorship',
    description: 'Maintain active FCL sponsorship from a government contracting activity (GCA)',
    status: 'compliant',
    evidence: ['DCSA FCL certificate', 'GCA sponsorship letter', 'CAGE Code registration'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'DCSA',
    priority: 'high',
    notes: 'FCL maintained through DCSA Industrial Security program',
    clearanceRequired: 'SECRET',
  },
  {
    id: 'NISPOM-FCL-2',
    framework: 'NISPOM',
    family: 'FCL',
    name: 'Key Management Personnel (KMP)',
    description: 'Ensure all KMP have appropriate clearances and are excluded from FOCI',
    status: 'compliant',
    evidence: ['KMP listing', 'SF-312 executed', 'Exclusion resolutions'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'All KMP cleared and briefed per 32 CFR 117.7',
  },
  // Personnel Clearance
  {
    id: 'NISPOM-PCL-1',
    framework: 'NISPOM',
    family: 'PCL',
    name: 'Personnel Security Processing',
    description: 'Process personnel clearances through DISS (Defense Information System for Security)',
    status: 'compliant',
    evidence: ['DISS access', 'e-QIP submissions', 'Clearance verification logs'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'All personnel processed through DCSA',
  },
  {
    id: 'NISPOM-PCL-2',
    framework: 'NISPOM',
    family: 'PCL',
    name: 'Continuous Evaluation (CE)',
    description: 'Participate in Continuous Evaluation for cleared personnel',
    status: 'compliant',
    evidence: ['CE enrollment', 'DCSA notifications', 'Incident reports'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated CE monitoring active',
  },
  // Classification Management
  {
    id: 'NISPOM-CLS-1',
    framework: 'NISPOM',
    family: 'CLS',
    name: 'Classification Guidance',
    description: 'Follow classification guidance from security classification guides (SCG)',
    status: 'compliant',
    evidence: ['DD Form 254', 'SCG copies', 'Classification markings training'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'Current DD-254 on file for all contracts',
  },
  {
    id: 'NISPOM-CLS-2',
    framework: 'NISPOM',
    family: 'CLS',
    name: 'Derivative Classification',
    description: 'Train personnel on derivative classification responsibilities',
    status: 'compliant',
    evidence: ['CDSE certificates', 'Training records', 'Annual refresher logs'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'All personnel completed IF103.16 or equivalent',
  },
  // Safeguarding
  {
    id: 'NISPOM-SAF-1',
    framework: 'NISPOM',
    family: 'SAF',
    name: 'Classified Storage',
    description: 'Store classified information in GSA-approved containers or SCIFs',
    status: 'compliant',
    evidence: ['Container inventory', 'SCIF accreditation', 'SF-700 forms'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'DCSA',
    priority: 'high',
    notes: 'All containers meet 32 CFR 117.15 requirements',
    scifRequired: true,
  },
  {
    id: 'NISPOM-SAF-2',
    framework: 'NISPOM',
    family: 'SAF',
    name: 'Transmission Requirements',
    description: 'Transmit classified information only through approved channels',
    status: 'compliant',
    evidence: ['COMSEC procedures', 'Courier designations', 'Transmission logs'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'All transmissions logged and verified',
  },
  // Visits & Access
  {
    id: 'NISPOM-VIS-1',
    framework: 'NISPOM',
    family: 'VIS',
    name: 'Visit Authorization Letters (VAL)',
    description: 'Process visit requests through DISS Joint Personnel Adjudication System',
    status: 'compliant',
    evidence: ['DISS VAL records', 'Visitor logs', 'Access lists'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'medium',
    notes: 'Electronic VAL processing implemented',
  },
  // Security Training
  {
    id: 'NISPOM-SEC-1',
    framework: 'NISPOM',
    family: 'SEC',
    name: 'Initial Security Briefing',
    description: 'Provide initial security briefing before access to classified information',
    status: 'compliant',
    evidence: ['SF-312 NDAs', 'Briefing acknowledgments', 'CDSE transcripts'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'All personnel briefed within 5 days of clearance',
  },
  {
    id: 'NISPOM-SEC-2',
    framework: 'NISPOM',
    family: 'SEC',
    name: 'Annual Refresher Training',
    description: 'Conduct annual security refresher training per CDSE requirements',
    status: 'compliant',
    evidence: ['CDSE transcripts', 'Training completion dates', 'Attestations'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated tracking via CDSE STEPP',
  },
  // Incident Reporting
  {
    id: 'NISPOM-INC-1',
    framework: 'NISPOM',
    family: 'INC',
    name: 'Security Incident Reporting',
    description: 'Report security incidents to DCSA within required timeframes',
    status: 'compliant',
    evidence: ['Incident reports', 'DCSA notifications', 'Corrective actions'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'Integrated with SOC incident management',
    mappings: { 'NIST-800-53': ['IR-6'], 'CMMC-L2': ['IR.L2-3.6.2'] },
  },
  // Special Programs
  {
    id: 'NISPOM-SPP-1',
    framework: 'NISPOM',
    family: 'SPP',
    name: 'SAP/SCI Access Controls',
    description: 'Implement additional controls for Special Access Programs and SCI',
    status: 'partial',
    evidence: ['SAP nomination packages', 'SCI NDA', 'Indoctrination records'],
    lastAudit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'GCA',
    priority: 'high',
    notes: 'SAP eligibility pending program requirements',
    clearanceRequired: 'TS_SCI',
    scifRequired: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - FOCI (32 CFR 117.11)
// Foreign Ownership, Control, or Influence
// ═══════════════════════════════════════════════════════════════

export const FOCI_CONTROL_FAMILIES: ControlFamily[] = [
  { id: 'DET', name: 'FOCI Determination', icon: '🔍', description: 'Initial FOCI assessment and determination', framework: 'FOCI' },
  { id: 'MIT', name: 'Mitigation Instruments', icon: '📜', description: 'FOCI mitigation agreements and instruments', framework: 'FOCI' },
  { id: 'GOV', name: 'Governance', icon: '⚖️', description: 'Board resolution and governance requirements', framework: 'FOCI' },
  { id: 'MON', name: 'Monitoring', icon: '👁️', description: 'Ongoing FOCI monitoring and compliance', framework: 'FOCI' },
];

export const DEFAULT_FOCI_CONTROLS: ComplianceControl[] = [
  {
    id: 'FOCI-DET-1',
    framework: 'FOCI',
    family: 'DET',
    name: 'SF-328 Certification',
    description: 'Complete and maintain current SF-328 (Certificate Pertaining to Foreign Interests)',
    status: 'compliant',
    evidence: ['SF-328 submitted', 'Annual updates', 'DCSA acknowledgment'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'DCSA',
    priority: 'high',
    notes: 'Annual SF-328 update submitted',
  },
  {
    id: 'FOCI-DET-2',
    framework: 'FOCI',
    family: 'DET',
    name: 'Foreign Ownership Analysis',
    description: 'Analyze and report foreign ownership, control, or influence factors',
    status: 'compliant',
    evidence: ['Ownership analysis', 'Stock registry', 'Beneficial ownership report'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Legal',
    priority: 'high',
    notes: 'No FOCI factors identified - US-owned',
  },
  {
    id: 'FOCI-MIT-1',
    framework: 'FOCI',
    family: 'MIT',
    name: 'Board Resolution',
    description: 'Maintain board resolution excluding foreign nationals from access',
    status: 'not_applicable',
    evidence: ['Board resolution'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Legal',
    priority: 'medium',
    notes: 'Not required - no FOCI factors',
  },
  {
    id: 'FOCI-GOV-1',
    framework: 'FOCI',
    family: 'GOV',
    name: 'Outside Director Requirements',
    description: 'Appoint cleared US citizen outside directors if FOCI mitigation required',
    status: 'not_applicable',
    evidence: ['Director agreements'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Legal',
    priority: 'high',
    notes: 'Not required - no FOCI factors',
  },
  {
    id: 'FOCI-MON-1',
    framework: 'FOCI',
    family: 'MON',
    name: 'Annual FOCI Review',
    description: 'Conduct annual review of FOCI status and report changes to DCSA',
    status: 'compliant',
    evidence: ['Annual review', 'Change reports', 'DCSA correspondence'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'Annual review completed - no changes',
  },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - SBIR/STTR
// Small Business Innovation Research / Technology Transfer
// ═══════════════════════════════════════════════════════════════

export const SBIR_CONTROL_FAMILIES: ControlFamily[] = [
  { id: 'ELG', name: 'Eligibility', icon: '✅', description: 'Small business eligibility requirements', framework: 'SBIR-STTR' },
  { id: 'IPR', name: 'Intellectual Property', icon: '💡', description: 'Data rights and IP protection', framework: 'SBIR-STTR' },
  { id: 'REP', name: 'Reporting', icon: '📊', description: 'Technical and financial reporting', framework: 'SBIR-STTR' },
  { id: 'COM', name: 'Commercialization', icon: '💰', description: 'Commercialization planning and execution', framework: 'SBIR-STTR' },
  { id: 'SEC', name: 'Security', icon: '🔒', description: 'Security requirements for classified/CUI work', framework: 'SBIR-STTR' },
];

export const DEFAULT_SBIR_CONTROLS: ComplianceControl[] = [
  {
    id: 'SBIR-ELG-1',
    framework: 'SBIR-STTR',
    family: 'ELG',
    name: 'Small Business Size Standard',
    description: 'Maintain eligibility as a small business per SBA size standards',
    status: 'compliant',
    evidence: ['SBA registration', 'SAM.gov profile', 'Size certification'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Contracts',
    priority: 'high',
    notes: 'Registered in SAM.gov with valid DUNS/UEI',
    sbirPhase: 'Phase_I',
  },
  {
    id: 'SBIR-ELG-2',
    framework: 'SBIR-STTR',
    family: 'ELG',
    name: 'US Ownership Requirement',
    description: 'Maintain majority US ownership and control (51%+ US citizens)',
    status: 'compliant',
    evidence: ['Ownership documentation', 'Citizenship verification'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Legal',
    priority: 'high',
    notes: '100% US-owned and controlled',
  },
  {
    id: 'SBIR-ELG-3',
    framework: 'SBIR-STTR',
    family: 'ELG',
    name: 'Principal Place of Business',
    description: 'Maintain principal place of business in the United States',
    status: 'compliant',
    evidence: ['Business registration', 'Facility address verification'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Contracts',
    priority: 'high',
    notes: 'San Diego, CA headquarters',
  },
  {
    id: 'SBIR-IPR-1',
    framework: 'SBIR-STTR',
    family: 'IPR',
    name: 'SBIR Data Rights',
    description: 'Protect SBIR data rights during the protection period (minimum 20 years)',
    status: 'compliant',
    evidence: ['Data rights clauses', 'Marking procedures', 'Disclosure tracking'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'IP Counsel',
    priority: 'high',
    notes: 'All deliverables properly marked with SBIR rights legend',
  },
  {
    id: 'SBIR-IPR-2',
    framework: 'SBIR-STTR',
    family: 'IPR',
    name: 'Patent Rights',
    description: 'Comply with Bayh-Dole Act patent rights requirements',
    status: 'compliant',
    evidence: ['Invention disclosures', 'Patent elections', 'iEdison submissions'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'IP Counsel',
    priority: 'high',
    notes: 'All inventions disclosed within 2 months',
  },
  {
    id: 'SBIR-REP-1',
    framework: 'SBIR-STTR',
    family: 'REP',
    name: 'Technical Reporting',
    description: 'Submit required technical reports per contract schedule',
    status: 'compliant',
    evidence: ['Monthly reports', 'Final reports', 'Submission confirmations'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'PM',
    priority: 'high',
    notes: 'All reports submitted on schedule',
  },
  {
    id: 'SBIR-COM-1',
    framework: 'SBIR-STTR',
    family: 'COM',
    name: 'Commercialization Plan',
    description: 'Develop and maintain commercialization plan for Phase II+',
    status: 'partial',
    evidence: ['Commercialization plan', 'Market analysis', 'Partner agreements'],
    lastAudit: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'BD',
    priority: 'medium',
    notes: 'Commercialization strategy in development',
    sbirPhase: 'Phase_II',
  },
  {
    id: 'SBIR-SEC-1',
    framework: 'SBIR-STTR',
    family: 'SEC',
    name: 'CUI Protection for SBIR',
    description: 'Protect CUI generated under SBIR/STTR contracts per DFARS 252.204-7012',
    status: 'compliant',
    evidence: ['NIST 800-171 compliance', 'CMMC readiness', 'CUI marking'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'CUI protection integrated with CMMC compliance',
    mappings: { 'NIST-800-171': ['3.1.1', '3.8.1'], 'CMMC-L2': ['AC.L1-3.1.1'] },
  },
  {
    id: 'SBIR-SEC-2',
    framework: 'SBIR-STTR',
    family: 'SEC',
    name: 'Export Control Compliance',
    description: 'Screen SBIR deliverables for export control (ITAR/EAR) applicability',
    status: 'compliant',
    evidence: ['Export classification', 'Technology control plan', 'License applications'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Empowered Official',
    priority: 'high',
    notes: 'All deliverables screened for export control',
    mappings: { 'ITAR': ['ITAR-TCM-1'], 'EAR': ['EAR-CLS-1'] },
  },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - ITAR (22 CFR 120-130)
// International Traffic in Arms Regulations
// ═══════════════════════════════════════════════════════════════

export const ITAR_CONTROL_FAMILIES: ControlFamily[] = [
  { id: 'REG', name: 'Registration', icon: '📝', description: 'DDTC registration requirements', framework: 'ITAR' },
  { id: 'CLS', name: 'Classification', icon: '🏷️', description: 'USML classification and jurisdiction', framework: 'ITAR' },
  { id: 'LIC', name: 'Licensing', icon: '📋', description: 'Export license requirements', framework: 'ITAR' },
  { id: 'TCM', name: 'Technology Control', icon: '🔐', description: 'Technical data and technology control', framework: 'ITAR' },
];

export const DEFAULT_ITAR_CONTROLS: ComplianceControl[] = [
  {
    id: 'ITAR-REG-1',
    framework: 'ITAR',
    family: 'REG',
    name: 'DDTC Registration',
    description: 'Register with Directorate of Defense Trade Controls if manufacturing/exporting defense articles',
    status: 'not_applicable',
    evidence: ['Registration status', 'Renewal dates'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Empowered Official',
    priority: 'high',
    notes: 'Not currently a registered manufacturer/exporter',
  },
  {
    id: 'ITAR-CLS-1',
    framework: 'ITAR',
    family: 'CLS',
    name: 'Commodity Jurisdiction',
    description: 'Determine jurisdiction of products/technology (ITAR vs EAR)',
    status: 'compliant',
    evidence: ['CJ requests', 'USML analysis', 'Classification records'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Export Counsel',
    priority: 'high',
    notes: 'All products classified for export control',
  },
  {
    id: 'ITAR-TCM-1',
    framework: 'ITAR',
    family: 'TCM',
    name: 'Technology Control Plan',
    description: 'Implement TCP for ITAR-controlled technical data',
    status: 'compliant',
    evidence: ['TCP document', 'Access controls', 'Training records'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'TCP integrated with personnel security',
  },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - EAR (15 CFR 730-774)
// Export Administration Regulations
// ═══════════════════════════════════════════════════════════════

export const EAR_CONTROL_FAMILIES: ControlFamily[] = [
  { id: 'CLS', name: 'Classification', icon: '🏷️', description: 'ECCN classification', framework: 'EAR' },
  { id: 'SCR', name: 'Screening', icon: '🔍', description: 'Denied party screening', framework: 'EAR' },
  { id: 'LIC', name: 'Licensing', icon: '📋', description: 'Export license requirements', framework: 'EAR' },
];

export const DEFAULT_EAR_CONTROLS: ComplianceControl[] = [
  {
    id: 'EAR-CLS-1',
    framework: 'EAR',
    family: 'CLS',
    name: 'ECCN Classification',
    description: 'Classify products/technology against Commerce Control List',
    status: 'compliant',
    evidence: ['ECCN determinations', 'Self-classification records'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'Export Counsel',
    priority: 'high',
    notes: 'All software classified under appropriate ECCNs',
  },
  {
    id: 'EAR-SCR-1',
    framework: 'EAR',
    family: 'SCR',
    name: 'Denied Party Screening',
    description: 'Screen all parties against denied/restricted party lists',
    status: 'compliant',
    evidence: ['Screening records', 'Visual Compliance logs', 'Red flag reviews'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated screening for all transactions',
  },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - ICD 503
// Intelligence Community Directive 503 - IC Security Controls
// ═══════════════════════════════════════════════════════════════

export const ICD_503_CONTROL_FAMILIES: ControlFamily[] = [
  { id: 'AC', name: 'Access Control', icon: '🔐', description: 'IC system access control requirements', framework: 'ICD-503' },
  { id: 'AU', name: 'Audit & Accountability', icon: '📝', description: 'IC audit logging and accountability', framework: 'ICD-503' },
  { id: 'AT', name: 'Awareness & Training', icon: '📚', description: 'IC security awareness training', framework: 'ICD-503' },
  { id: 'CM', name: 'Configuration Management', icon: '⚙️', description: 'IC baseline configuration management', framework: 'ICD-503' },
  { id: 'CP', name: 'Contingency Planning', icon: '🔄', description: 'IC continuity of operations', framework: 'ICD-503' },
  { id: 'IA', name: 'Identification & Authentication', icon: '🪪', description: 'IC identity verification', framework: 'ICD-503' },
  { id: 'IR', name: 'Incident Response', icon: '🚨', description: 'IC security incident handling', framework: 'ICD-503' },
  { id: 'MA', name: 'Maintenance', icon: '🔧', description: 'IC system maintenance', framework: 'ICD-503' },
  { id: 'MP', name: 'Media Protection', icon: '💾', description: 'IC classified media handling', framework: 'ICD-503' },
  { id: 'PE', name: 'Physical Protection', icon: '🏢', description: 'IC SCIF and physical security', framework: 'ICD-503' },
  { id: 'PL', name: 'Planning', icon: '📋', description: 'IC security planning', framework: 'ICD-503' },
  { id: 'PS', name: 'Personnel Security', icon: '👥', description: 'IC personnel clearances', framework: 'ICD-503' },
  { id: 'RA', name: 'Risk Assessment', icon: '⚠️', description: 'IC risk assessment process', framework: 'ICD-503' },
  { id: 'CA', name: 'Security Assessment', icon: '✅', description: 'IC Authorization to Operate', framework: 'ICD-503' },
  { id: 'SC', name: 'System & Communications', icon: '🌐', description: 'IC network protection', framework: 'ICD-503' },
  { id: 'SI', name: 'System Integrity', icon: '🛡️', description: 'IC system integrity monitoring', framework: 'ICD-503' },
  { id: 'PM', name: 'Program Management', icon: '📊', description: 'IC security program oversight', framework: 'ICD-503' },
  { id: 'PV', name: 'Privacy', icon: '👁️', description: 'IC privacy overlay controls', framework: 'ICD-503' },
];

export const DEFAULT_ICD_503_CONTROLS: ComplianceControl[] = [
  // Access Control
  {
    id: 'ICD503-AC-1',
    framework: 'ICD-503',
    family: 'AC',
    name: 'Access Control Policy & Procedures',
    description: 'Develop and maintain IC-compliant access control policy addressing purpose, scope, roles, responsibilities, and compliance',
    status: 'partial',
    evidence: ['Access control policy draft', 'IC overlay assessment'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'high',
    notes: 'Policy under development for IC systems',
    clearanceRequired: 'TS_SCI',
    scifRequired: true,
    mappings: { 'NIST-800-53': ['AC-1'], 'CNSSI-1253': ['AC-1'] },
  },
  {
    id: 'ICD503-AC-2',
    framework: 'ICD-503',
    family: 'AC',
    name: 'Account Management',
    description: 'Manage IC system accounts including establishment, activation, modification, review, disabling, and removal per IC standards',
    status: 'partial',
    evidence: ['Account management procedures', 'DISS verification'],
    lastAudit: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSO',
    priority: 'high',
    notes: 'Account lifecycle integrated with DISS',
    clearanceRequired: 'TS_SCI',
    mappings: { 'NIST-800-53': ['AC-2'], 'CNSSI-1253': ['AC-2'] },
  },
  {
    id: 'ICD503-AC-3',
    framework: 'ICD-503',
    family: 'AC',
    name: 'Access Enforcement',
    description: 'Enforce approved authorizations for logical access per IC security policies',
    status: 'compliant',
    evidence: ['RBAC configuration', 'Need-to-know enforcement', 'Compartment access controls'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Compartmentalized access controls active',
    clearanceRequired: 'TS_SCI',
    scifRequired: true,
    mappings: { 'NIST-800-53': ['AC-3'], 'CNSSI-1253': ['AC-3'] },
  },
  // Audit & Accountability
  {
    id: 'ICD503-AU-1',
    framework: 'ICD-503',
    family: 'AU',
    name: 'Audit Policy & Procedures',
    description: 'Establish IC-compliant audit and accountability policy',
    status: 'partial',
    evidence: ['Audit policy draft', 'IC audit requirements mapping'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'high',
    notes: 'Audit policy under development',
    mappings: { 'NIST-800-53': ['AU-1'], 'CNSSI-1253': ['AU-1'] },
  },
  {
    id: 'ICD503-AU-2',
    framework: 'ICD-503',
    family: 'AU',
    name: 'Audit Events',
    description: 'Identify and audit events that meet IC requirements including user actions and security-relevant events',
    status: 'compliant',
    evidence: ['Audit event configuration', 'SIEM integration', 'Classified log protection'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Comprehensive IC audit logging active',
    mappings: { 'NIST-800-53': ['AU-2'], 'CNSSI-1253': ['AU-2'] },
  },
  // Security Assessment & Authorization
  {
    id: 'ICD503-CA-1',
    framework: 'ICD-503',
    family: 'CA',
    name: 'Security Assessment Policy',
    description: 'Develop IC security assessment and authorization policies and procedures',
    status: 'partial',
    evidence: ['SA&A procedures draft', 'ATO package outline'],
    lastAudit: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'high',
    notes: 'SA&A procedures in development for IC ATO',
    mappings: { 'NIST-800-53': ['CA-1'], 'CNSSI-1253': ['CA-1'] },
  },
  {
    id: 'ICD503-CA-2',
    framework: 'ICD-503',
    family: 'CA',
    name: 'Security Assessments',
    description: 'Conduct IC security control assessments at defined frequency using IC-approved methodology',
    status: 'partial',
    evidence: ['Assessment plan', 'Security test procedures'],
    lastAudit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'SCA',
    priority: 'high',
    notes: 'Initial security assessment in progress',
    mappings: { 'NIST-800-53': ['CA-2'], 'CNSSI-1253': ['CA-2'] },
  },
  {
    id: 'ICD503-CA-6',
    framework: 'ICD-503',
    family: 'CA',
    name: 'Authorization',
    description: 'Obtain and maintain IC Authorization to Operate (ATO) from designated authorizing official',
    status: 'non_compliant',
    evidence: ['ATO package in development'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'high',
    notes: 'ATO package development required before IC system operation',
    clearanceRequired: 'TS_SCI',
    mappings: { 'NIST-800-53': ['CA-6'], 'CNSSI-1253': ['CA-6'] },
  },
  // Personnel Security
  {
    id: 'ICD503-PS-1',
    framework: 'ICD-503',
    family: 'PS',
    name: 'Personnel Security Policy',
    description: 'Establish IC personnel security policy addressing position risk designation, screening, and clearance requirements',
    status: 'compliant',
    evidence: ['Personnel security policy', 'Position designation records', 'Clearance tracking'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'IC personnel security program established',
    clearanceRequired: 'TS_SCI',
    mappings: { 'NIST-800-53': ['PS-1'], 'CNSSI-1253': ['PS-1'] },
  },
  {
    id: 'ICD503-PS-3',
    framework: 'ICD-503',
    family: 'PS',
    name: 'Personnel Screening',
    description: 'Screen individuals prior to authorizing access to IC systems per IC screening requirements',
    status: 'compliant',
    evidence: ['DISS verification', 'SCI indoctrination records', 'CE enrollment'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'SSO',
    priority: 'high',
    notes: 'All IC personnel screened through DCSA/DNI',
    clearanceRequired: 'TS_SCI',
    mappings: { 'NIST-800-53': ['PS-3'], 'CNSSI-1253': ['PS-3'] },
  },
  // Physical Protection
  {
    id: 'ICD503-PE-1',
    framework: 'ICD-503',
    family: 'PE',
    name: 'Physical Security Policy',
    description: 'Establish IC physical and environmental protection policy for SCIF operations',
    status: 'partial',
    evidence: ['Physical security plan', 'SCIF accreditation pending'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'FSO',
    priority: 'high',
    notes: 'SCIF construction/accreditation required',
    scifRequired: true,
    mappings: { 'NIST-800-53': ['PE-1'], 'CNSSI-1253': ['PE-1'] },
  },
  {
    id: 'ICD503-PE-3',
    framework: 'ICD-503',
    family: 'PE',
    name: 'Physical Access Control',
    description: 'Enforce physical access authorizations at SCIF entry points using IC-compliant access control systems',
    status: 'partial',
    evidence: ['Access control system specs', 'Badging procedures'],
    lastAudit: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'CPSO',
    priority: 'high',
    notes: 'ICD 705 compliant access control system planned',
    scifRequired: true,
    mappings: { 'NIST-800-53': ['PE-3'], 'CNSSI-1253': ['PE-3'] },
  },
  // Program Management
  {
    id: 'ICD503-PM-1',
    framework: 'ICD-503',
    family: 'PM',
    name: 'Information Security Program Plan',
    description: 'Develop and maintain IC information security program plan',
    status: 'partial',
    evidence: ['Security program plan draft', 'Organizational chart', 'Role assignments'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'CISO',
    priority: 'high',
    notes: 'IC security program plan in development',
    mappings: { 'NIST-800-53': ['PM-1'], 'CNSSI-1253': ['PM-1'] },
  },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - CNSSI 1253
// Security Categorization for National Security Systems
// ═══════════════════════════════════════════════════════════════

export const CNSSI_1253_CONTROL_FAMILIES: ControlFamily[] = [
  { id: 'CAT', name: 'Categorization', icon: '📊', description: 'System security categorization', framework: 'CNSSI-1253' },
  { id: 'BAS', name: 'Baseline Selection', icon: '🎯', description: 'Control baseline selection', framework: 'CNSSI-1253' },
  { id: 'OVR', name: 'Overlays', icon: '📋', description: 'Security overlay application', framework: 'CNSSI-1253' },
  { id: 'TAI', name: 'Tailoring', icon: '✂️', description: 'Baseline tailoring decisions', framework: 'CNSSI-1253' },
  { id: 'DOC', name: 'Documentation', icon: '📝', description: 'Security documentation', framework: 'CNSSI-1253' },
  { id: 'ATO', name: 'Authorization', icon: '✅', description: 'Authorization to Operate', framework: 'CNSSI-1253' },
];

export type ImpactLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface NSSCategorization {
  systemName: string;
  confidentiality: ImpactLevel;
  integrity: ImpactLevel;
  availability: ImpactLevel;
  overallImpact: ImpactLevel;
  overlaysApplied: string[];
  tailoringDecisions: string[];
}

export const DEFAULT_CNSSI_1253_CONTROLS: ComplianceControl[] = [
  // Categorization
  {
    id: 'CNSSI-CAT-1',
    framework: 'CNSSI-1253',
    family: 'CAT',
    name: 'Information Type Identification',
    description: 'Identify all information types processed, stored, or transmitted by the NSS',
    status: 'partial',
    evidence: ['Information type inventory', 'Data flow diagrams', 'Classification guides'],
    lastAudit: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'high',
    notes: 'Information type categorization in progress',
    mappings: { 'NIST-800-53': ['RA-2'], 'ICD-503': ['ICD503-RA-2'] },
  },
  {
    id: 'CNSSI-CAT-2',
    framework: 'CNSSI-1253',
    family: 'CAT',
    name: 'Impact Level Determination',
    description: 'Determine Confidentiality, Integrity, and Availability impact levels for each information type',
    status: 'partial',
    evidence: ['Impact analysis worksheet', 'Mission criticality assessment'],
    lastAudit: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'high',
    notes: 'C/I/A impact analysis in progress for IL-6',
  },
  {
    id: 'CNSSI-CAT-3',
    framework: 'CNSSI-1253',
    family: 'CAT',
    name: 'System Categorization Statement',
    description: 'Document the overall system categorization based on high-water mark of all information types',
    status: 'non_compliant',
    evidence: ['Categorization statement pending'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'high',
    notes: 'Requires completion of CAT-1 and CAT-2',
  },
  // Baseline Selection
  {
    id: 'CNSSI-BAS-1',
    framework: 'CNSSI-1253',
    family: 'BAS',
    name: 'Baseline Control Selection',
    description: 'Select the appropriate CNSSI 1253 control baseline based on system categorization',
    status: 'partial',
    evidence: ['Baseline selection rationale', 'Control mapping spreadsheet'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSO',
    priority: 'high',
    notes: 'HIGH baseline selected for IL-6 operations',
    mappings: { 'NIST-800-53': ['PL-2'], 'ICD-503': ['ICD503-PL-2'] },
  },
  {
    id: 'CNSSI-BAS-2',
    framework: 'CNSSI-1253',
    family: 'BAS',
    name: 'Control Enhancement Selection',
    description: 'Select control enhancements based on impact level and threat environment',
    status: 'partial',
    evidence: ['Enhancement selection worksheet', 'Threat assessment'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSO',
    priority: 'high',
    notes: 'Enhanced controls selected for TS/SCI environment',
  },
  // Overlays
  {
    id: 'CNSSI-OVR-1',
    framework: 'CNSSI-1253',
    family: 'OVR',
    name: 'Overlay Identification',
    description: 'Identify applicable CNSSI 1253 overlays (Privacy, Cloud, ICS, etc.)',
    status: 'compliant',
    evidence: ['Overlay applicability analysis', 'Cloud overlay selection'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'medium',
    notes: 'Cloud and Privacy overlays identified as applicable',
  },
  {
    id: 'CNSSI-OVR-2',
    framework: 'CNSSI-1253',
    family: 'OVR',
    name: 'Overlay Control Integration',
    description: 'Integrate overlay controls into the system security baseline',
    status: 'partial',
    evidence: ['Integrated control set', 'Overlay mapping'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSO',
    priority: 'medium',
    notes: 'Cloud overlay controls being integrated',
    mappings: { 'FEDRAMP-HIGH': ['FRP-OVR-1'] },
  },
  // Tailoring
  {
    id: 'CNSSI-TAI-1',
    framework: 'CNSSI-1253',
    family: 'TAI',
    name: 'Scoping Guidance Application',
    description: 'Apply CNSSI 1253 scoping guidance to baseline controls',
    status: 'partial',
    evidence: ['Scoping decisions document', 'Rationale for N/A controls'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSO',
    priority: 'medium',
    notes: 'Scoping guidance applied to mobile code controls',
  },
  {
    id: 'CNSSI-TAI-2',
    framework: 'CNSSI-1253',
    family: 'TAI',
    name: 'Compensating Controls',
    description: 'Document and justify any compensating controls used in lieu of baseline controls',
    status: 'compliant',
    evidence: ['Compensating control documentation', 'Risk acceptance'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'medium',
    notes: 'All compensating controls documented and approved',
  },
  // Documentation
  {
    id: 'CNSSI-DOC-1',
    framework: 'CNSSI-1253',
    family: 'DOC',
    name: 'System Security Plan',
    description: 'Develop and maintain NSS System Security Plan per CNSSI 1253 requirements',
    status: 'partial',
    evidence: ['SSP draft', 'Control implementation status'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'high',
    notes: 'SSP in development for ATO package',
    mappings: { 'NIST-800-53': ['PL-2'], 'ICD-503': ['ICD503-PL-2'] },
  },
  // Authorization
  {
    id: 'CNSSI-ATO-1',
    framework: 'CNSSI-1253',
    family: 'ATO',
    name: 'Authorization Package',
    description: 'Prepare complete NSS authorization package including SSP, SAR, and POA&M',
    status: 'non_compliant',
    evidence: ['Authorization package outline', 'Required documents checklist'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'ISSM',
    priority: 'high',
    notes: 'Authorization package development in progress',
    mappings: { 'NIST-800-53': ['CA-6'], 'ICD-503': ['ICD503-CA-6'] },
  },
  {
    id: 'CNSSI-ATO-2',
    framework: 'CNSSI-1253',
    family: 'ATO',
    name: 'Authorization Decision',
    description: 'Obtain AO authorization decision (ATO, IATO, DATO) for NSS operation',
    status: 'non_compliant',
    evidence: ['Authorization request pending'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'AO',
    priority: 'high',
    notes: 'ATO required before IL-6 operations',
    clearanceRequired: 'TS_SCI',
  },
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTROLS - FedRAMP HIGH
// Federal Risk and Authorization Management Program - High Baseline
// ═══════════════════════════════════════════════════════════════

export const FEDRAMP_HIGH_CONTROL_FAMILIES: ControlFamily[] = [
  { id: 'AC', name: 'Access Control', icon: '🔐', description: 'FedRAMP access control requirements', framework: 'FEDRAMP-HIGH' },
  { id: 'AU', name: 'Audit & Accountability', icon: '📝', description: 'FedRAMP audit logging', framework: 'FEDRAMP-HIGH' },
  { id: 'AT', name: 'Awareness & Training', icon: '📚', description: 'FedRAMP security training', framework: 'FEDRAMP-HIGH' },
  { id: 'CM', name: 'Configuration Management', icon: '⚙️', description: 'FedRAMP configuration controls', framework: 'FEDRAMP-HIGH' },
  { id: 'CP', name: 'Contingency Planning', icon: '🔄', description: 'FedRAMP COOP requirements', framework: 'FEDRAMP-HIGH' },
  { id: 'IA', name: 'Identification & Authentication', icon: '🪪', description: 'FedRAMP identity management', framework: 'FEDRAMP-HIGH' },
  { id: 'IR', name: 'Incident Response', icon: '🚨', description: 'FedRAMP incident handling', framework: 'FEDRAMP-HIGH' },
  { id: 'MA', name: 'Maintenance', icon: '🔧', description: 'FedRAMP maintenance controls', framework: 'FEDRAMP-HIGH' },
  { id: 'MP', name: 'Media Protection', icon: '💾', description: 'FedRAMP media protection', framework: 'FEDRAMP-HIGH' },
  { id: 'PE', name: 'Physical & Environmental', icon: '🏢', description: 'FedRAMP physical security', framework: 'FEDRAMP-HIGH' },
  { id: 'PL', name: 'Planning', icon: '📋', description: 'FedRAMP security planning', framework: 'FEDRAMP-HIGH' },
  { id: 'PS', name: 'Personnel Security', icon: '👥', description: 'FedRAMP personnel security', framework: 'FEDRAMP-HIGH' },
  { id: 'RA', name: 'Risk Assessment', icon: '⚠️', description: 'FedRAMP risk management', framework: 'FEDRAMP-HIGH' },
  { id: 'CA', name: 'Security Assessment', icon: '✅', description: 'FedRAMP 3PAO assessment', framework: 'FEDRAMP-HIGH' },
  { id: 'SC', name: 'System & Communications', icon: '🌐', description: 'FedRAMP network controls', framework: 'FEDRAMP-HIGH' },
  { id: 'SI', name: 'System Integrity', icon: '🛡️', description: 'FedRAMP integrity monitoring', framework: 'FEDRAMP-HIGH' },
  { id: 'SA', name: 'System Acquisition', icon: '🛒', description: 'FedRAMP acquisition controls', framework: 'FEDRAMP-HIGH' },
  { id: 'PM', name: 'Program Management', icon: '📊', description: 'FedRAMP program oversight', framework: 'FEDRAMP-HIGH' },
];

export const DEFAULT_FEDRAMP_HIGH_CONTROLS: ComplianceControl[] = [
  // Access Control
  {
    id: 'FRP-AC-1',
    framework: 'FEDRAMP-HIGH',
    family: 'AC',
    name: 'Access Control Policy and Procedures',
    description: 'Develop, document, and disseminate FedRAMP-compliant access control policy',
    status: 'compliant',
    evidence: ['Access control policy', 'FedRAMP template alignment', 'Annual review log'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'ISSO',
    priority: 'high',
    notes: 'Policy aligned with FedRAMP High baseline requirements',
    mappings: { 'NIST-800-53': ['AC-1'], 'NIST-800-171': ['3.1.1'] },
  },
  {
    id: 'FRP-AC-2',
    framework: 'FEDRAMP-HIGH',
    family: 'AC',
    name: 'Account Management',
    description: 'Implement FedRAMP account management including automated provisioning/deprovisioning',
    status: 'compliant',
    evidence: ['Automated account provisioning', 'Account review logs', 'Deprovisioning SOP'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated lifecycle management via IAM',
    mappings: { 'NIST-800-53': ['AC-2'], 'CMMC-L2': ['AC.L1-3.1.1'] },
  },
  {
    id: 'FRP-AC-17',
    framework: 'FEDRAMP-HIGH',
    family: 'AC',
    name: 'Remote Access',
    description: 'Establish and document usage restrictions, configuration requirements, and authorization for remote access',
    status: 'compliant',
    evidence: ['Remote access policy', 'VPN configuration', 'MFA enforcement'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'ISSO',
    priority: 'high',
    notes: 'All remote access requires MFA and is logged',
    mappings: { 'NIST-800-53': ['AC-17'], 'NIST-800-171': ['3.1.12'] },
  },
  // Audit & Accountability
  {
    id: 'FRP-AU-2',
    framework: 'FEDRAMP-HIGH',
    family: 'AU',
    name: 'Audit Events',
    description: 'Audit FedRAMP-required events including login, privileged functions, and data access',
    status: 'compliant',
    evidence: ['Audit event configuration', 'SIEM integration', 'Log retention policy'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Comprehensive audit logging per FedRAMP requirements',
    mappings: { 'NIST-800-53': ['AU-2'], 'NIST-800-171': ['3.3.1'] },
  },
  {
    id: 'FRP-AU-6',
    framework: 'FEDRAMP-HIGH',
    family: 'AU',
    name: 'Audit Review, Analysis, and Reporting',
    description: 'Review and analyze audit records at least weekly for indications of inappropriate activity',
    status: 'compliant',
    evidence: ['Weekly audit review log', 'Automated alerting', 'Incident correlation'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'SOC',
    priority: 'high',
    notes: 'Automated daily review with weekly manual review',
    mappings: { 'NIST-800-53': ['AU-6'], 'CMMC-L2': ['AU.L2-3.3.1'] },
  },
  // Security Assessment
  {
    id: 'FRP-CA-1',
    framework: 'FEDRAMP-HIGH',
    family: 'CA',
    name: 'Security Assessment Policy',
    description: 'Develop FedRAMP-compliant security assessment and authorization policies',
    status: 'partial',
    evidence: ['SA&A policy draft', 'FedRAMP package outline'],
    lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'CISO',
    priority: 'high',
    notes: 'Policy aligned with FedRAMP requirements',
    mappings: { 'NIST-800-53': ['CA-1'] },
  },
  {
    id: 'FRP-CA-2',
    framework: 'FEDRAMP-HIGH',
    family: 'CA',
    name: 'Security Assessments',
    description: 'Conduct annual 3PAO security assessments per FedRAMP requirements',
    status: 'partial',
    evidence: ['3PAO engagement planning', 'Assessment scope document'],
    lastAudit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAuditBy: 'CISO',
    priority: 'high',
    notes: '3PAO assessment planned for FedRAMP authorization',
    mappings: { 'NIST-800-53': ['CA-2'] },
  },
  {
    id: 'FRP-CA-7',
    framework: 'FEDRAMP-HIGH',
    family: 'CA',
    name: 'Continuous Monitoring',
    description: 'Implement FedRAMP continuous monitoring strategy including monthly vulnerability scanning',
    status: 'compliant',
    evidence: ['ConMon strategy', 'Vulnerability scan reports', 'POA&M tracking'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Continuous monitoring program established',
    mappings: { 'NIST-800-53': ['CA-7'], 'CMMC-L2': ['CA.L2-3.12.3'] },
  },
  // Incident Response
  {
    id: 'FRP-IR-6',
    framework: 'FEDRAMP-HIGH',
    family: 'IR',
    name: 'Incident Reporting',
    description: 'Report incidents to FedRAMP PMO and US-CERT within required timeframes',
    status: 'compliant',
    evidence: ['Incident reporting procedures', 'US-CERT POC designated', 'Reporting templates'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'ISSO',
    priority: 'high',
    notes: 'Incident reporting integrated with SOC procedures',
    mappings: { 'NIST-800-53': ['IR-6'], 'NIST-800-171': ['3.6.2'] },
  },
  // System Communications
  {
    id: 'FRP-SC-7',
    framework: 'FEDRAMP-HIGH',
    family: 'SC',
    name: 'Boundary Protection',
    description: 'Monitor and control communications at external and key internal boundaries',
    status: 'compliant',
    evidence: ['Network architecture', 'Firewall rules', 'IDS/IPS configuration'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Multi-layer boundary protection with DMZ',
    mappings: { 'NIST-800-53': ['SC-7'], 'NIST-800-171': ['3.13.1'] },
  },
  {
    id: 'FRP-SC-8',
    framework: 'FEDRAMP-HIGH',
    family: 'SC',
    name: 'Transmission Confidentiality and Integrity',
    description: 'Protect data in transit using FIPS 140-2 validated encryption',
    status: 'compliant',
    evidence: ['TLS 1.2+ enforcement', 'FIPS mode enabled', 'Certificate management'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'All data in transit encrypted with FIPS-validated cryptography',
    mappings: { 'NIST-800-53': ['SC-8'], 'NIST-800-171': ['3.13.8'] },
  },
  {
    id: 'FRP-SC-28',
    framework: 'FEDRAMP-HIGH',
    family: 'SC',
    name: 'Protection of Information at Rest',
    description: 'Protect data at rest using FIPS 140-2 validated encryption',
    status: 'compliant',
    evidence: ['Disk encryption', 'Database encryption', 'Key management'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'All data at rest encrypted with AES-256',
    mappings: { 'NIST-800-53': ['SC-28'], 'NIST-800-171': ['3.13.16'] },
  },
  // Vulnerability Management
  {
    id: 'FRP-RA-5',
    framework: 'FEDRAMP-HIGH',
    family: 'RA',
    name: 'Vulnerability Scanning',
    description: 'Conduct vulnerability scanning monthly and within 72 hours of new vulnerabilities',
    status: 'compliant',
    evidence: ['Monthly scan reports', 'CVE tracking', 'Remediation timelines'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'System',
    priority: 'high',
    notes: 'Automated vulnerability scanning with 30-day remediation SLA',
    mappings: { 'NIST-800-53': ['RA-5'], 'NIST-800-171': ['3.11.2'] },
  },
  // System Integrity
  {
    id: 'FRP-SI-2',
    framework: 'FEDRAMP-HIGH',
    family: 'SI',
    name: 'Flaw Remediation',
    description: 'Remediate high vulnerabilities within 30 days, critical within 15 days per FedRAMP',
    status: 'compliant',
    evidence: ['Patch management SOP', 'Remediation tracking', 'Deviation requests'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'ISSO',
    priority: 'high',
    notes: 'Automated patching with deviation tracking',
    mappings: { 'NIST-800-53': ['SI-2'], 'NIST-800-171': ['3.14.1'] },
  },
  {
    id: 'FRP-SI-4',
    framework: 'FEDRAMP-HIGH',
    family: 'SI',
    name: 'Information System Monitoring',
    description: 'Monitor the system to detect attacks and indicators of potential attacks per FedRAMP',
    status: 'compliant',
    evidence: ['SIEM deployment', 'Alert correlation', 'SOC operations'],
    lastAudit: new Date().toISOString().split('T')[0],
    lastAuditBy: 'SOC',
    priority: 'high',
    notes: '24/7 security monitoring operational',
    mappings: { 'NIST-800-53': ['SI-4'], 'NIST-800-171': ['3.14.6'] },
  },
];

// ═══════════════════════════════════════════════════════════════
// DCSA/CDSE TRAINING REQUIREMENTS
// Center for Development of Security Excellence
// ═══════════════════════════════════════════════════════════════

export interface CDSETrainingRequirement {
  courseId: string;
  courseName: string;
  description: string;
  targetAudience: string[];
  frequency: 'initial' | 'annual' | 'biennial' | 'as_needed';
  requiredFor: string[];
  duration: string;
  deliveryMethod: 'online' | 'classroom' | 'hybrid';
}

export const CDSE_TRAINING_REQUIREMENTS: CDSETrainingRequirement[] = [
  {
    courseId: 'IF103.16',
    courseName: 'Derivative Classification',
    description: 'Training on derivative classification responsibilities',
    targetAudience: ['All cleared personnel', 'Derivative classifiers'],
    frequency: 'biennial',
    requiredFor: ['NISPOM-CLS-2', 'Derivative classification authority'],
    duration: '2 hours',
    deliveryMethod: 'online',
  },
  {
    courseId: 'GS101.16',
    courseName: 'Introduction to Industrial Security',
    description: 'Fundamentals of the NISP and contractor security',
    targetAudience: ['FSOs', 'New security personnel'],
    frequency: 'initial',
    requiredFor: ['FSO certification', 'Security staff'],
    duration: '4 hours',
    deliveryMethod: 'online',
  },
  {
    courseId: 'GS102.16',
    courseName: 'Insider Threat Awareness',
    description: 'Recognizing and reporting insider threat indicators',
    targetAudience: ['All cleared personnel'],
    frequency: 'annual',
    requiredFor: ['NISPOM-SEC-2', 'All cleared personnel'],
    duration: '1 hour',
    deliveryMethod: 'online',
  },
  {
    courseId: 'PS113.16',
    courseName: 'Personnel Security Adjudications',
    description: 'Personnel security processing and adjudication',
    targetAudience: ['FSOs', 'HR personnel'],
    frequency: 'initial',
    requiredFor: ['NISPOM-PCL-1', 'Personnel security duties'],
    duration: '3 hours',
    deliveryMethod: 'online',
  },
  {
    courseId: 'IS109.16',
    courseName: 'Cybersecurity Awareness',
    description: 'Protecting classified information in cyber environments',
    targetAudience: ['All cleared personnel with system access'],
    frequency: 'annual',
    requiredFor: ['NISPOM-SEC-2', 'System access'],
    duration: '1 hour',
    deliveryMethod: 'online',
  },
  {
    courseId: 'CI112.16',
    courseName: 'Counterintelligence Awareness',
    description: 'Recognizing and reporting foreign intelligence threats',
    targetAudience: ['All cleared personnel'],
    frequency: 'annual',
    requiredFor: ['NISPOM-SEC-2', 'All cleared personnel'],
    duration: '1 hour',
    deliveryMethod: 'online',
  },
  {
    courseId: 'SA001.16',
    courseName: 'FSO Orientation for Non-Possessing Facilities',
    description: 'FSO responsibilities for facilities without classified holdings',
    targetAudience: ['FSOs at non-possessing facilities'],
    frequency: 'initial',
    requiredFor: ['FSO designation'],
    duration: '8 hours',
    deliveryMethod: 'online',
  },
  {
    courseId: 'SA002.16',
    courseName: 'FSO Program Management for Possessing Facilities',
    description: 'FSO responsibilities for facilities with classified holdings',
    targetAudience: ['FSOs at possessing facilities'],
    frequency: 'initial',
    requiredFor: ['FSO designation', 'SCIF management'],
    duration: '40 hours',
    deliveryMethod: 'classroom',
  },
];

// ═══════════════════════════════════════════════════════════════
// EXOSTAR INTEGRATION
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_EXOSTAR_CONFIG: ExostarIntegration = {
  enabled: false,
  organizationId: '',
  apiEndpoint: 'https://api.exostar.com/v1',
  apiKeyConfigured: false,
  lastSync: null,
  syncStatus: 'disconnected',
  features: {
    riskManagement: true,
    supplierAssessment: true,
    credentialing: false,
    incidentReporting: true,
  },
};

export interface ExostarAssessmentResult {
  assessmentId: string;
  organizationName: string;
  assessmentType: 'CMMC' | 'NIST-171' | 'Cyber Risk';
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  score: number;
  maxScore: number;
  completedDate: string | null;
  expirationDate: string | null;
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getFrameworkColor(framework: ComplianceFramework): string {
  return FRAMEWORKS[framework]?.color || 'gray';
}

export function getFrameworkIcon(framework: ComplianceFramework): string {
  return FRAMEWORKS[framework]?.icon || '📋';
}

export function calculateComplianceScore(controls: ComplianceControl[]): number {
  if (controls.length === 0) return 0;
  const compliant = controls.filter(c => c.status === 'compliant').length;
  const partial = controls.filter(c => c.status === 'partial').length;
  return Math.round(((compliant + partial * 0.5) / controls.length) * 100);
}

export function getControlsByFramework(
  controls: ComplianceControl[],
  framework: ComplianceFramework
): ComplianceControl[] {
  return controls.filter(c => c.framework === framework);
}

export function getMappedControls(
  control: ComplianceControl,
  targetFramework: ComplianceFramework,
  allControls: ComplianceControl[]
): ComplianceControl[] {
  const mappingIds = control.mappings?.[targetFramework] || [];
  return allControls.filter(c => mappingIds.includes(c.id));
}

export function getCMMCLevel(controls: ComplianceControl[]): CMMCLevel {
  const cmmcControls = controls.filter(c => c.framework.startsWith('CMMC'));
  if (cmmcControls.length === 0) return 1;
  
  const l3Controls = cmmcControls.filter(c => c.cmmcLevel === 3);
  const l2Controls = cmmcControls.filter(c => c.cmmcLevel === 2);
  
  const l3Compliant = l3Controls.filter(c => c.status === 'compliant').length === l3Controls.length;
  const l2Compliant = l2Controls.filter(c => c.status === 'compliant').length === l2Controls.length;
  
  if (l3Compliant && l2Compliant) return 3;
  if (l2Compliant) return 2;
  return 1;
}

export function validateCMMCReadiness(controls: ComplianceControl[], targetLevel: CMMCLevel): {
  ready: boolean;
  gaps: ComplianceControl[];
  score: number;
} {
  const relevantControls = controls.filter(c => 
    c.framework.startsWith('CMMC') && (c.cmmcLevel || 1) <= targetLevel
  );
  
  const gaps = relevantControls.filter(c => c.status !== 'compliant');
  const score = calculateComplianceScore(relevantControls);
  
  return {
    ready: gaps.length === 0,
    gaps,
    score,
  };
}
