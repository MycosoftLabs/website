/**
 * System Security Plan (SSP) Generator
 * 
 * Generates comprehensive SSP documentation per NIST SP 800-18 Rev. 1
 * Supports NIST 800-171, CMMC, ICD 503, CNSSI 1253, and FedRAMP High
 * 
 * 17 Required SSP Sections:
 * 1. System Identification
 * 2. System Categorization
 * 3. System Owner/Contacts
 * 4. Authorization Boundary
 * 5. System Environment
 * 6. System Interconnections
 * 7. Laws/Regulations
 * 8. Minimum Security Controls
 * 9. Control Implementation
 * 10. Planned Controls
 * 11. Continuous Monitoring
 * 12. System Lifecycle
 * 13. Hardware/Software Inventory
 * 14. Ports/Protocols/Services
 * 15. Data Flow Diagrams
 * 16. User Types & Privileges
 * 17. Signature/Approval Pages
 */

import { ComplianceControl, ComplianceFramework, ImpactLevel } from '../compliance-frameworks';

// ═══════════════════════════════════════════════════════════════
// SSP TYPES
// ═══════════════════════════════════════════════════════════════

export interface SystemSecurityPlan {
  metadata: SSPMetadata;
  sections: SSPSections;
  controls: ControlImplementation[];
  poams: POAMEntry[];
  approvals: SSPApproval[];
  generatedAt: string;
  version: string;
}

export interface SSPMetadata {
  sspId: string;
  systemName: string;
  systemAcronym: string;
  framework: ComplianceFramework;
  version: string;
  status: 'draft' | 'submitted' | 'approved' | 'expired';
  preparedBy: string;
  preparedDate: string;
  lastModified: string;
  classificationLevel: 'Unclassified' | 'CUI' | 'Confidential' | 'Secret' | 'Top Secret' | 'TS/SCI';
}

export interface SSPSections {
  systemIdentification: SystemIdentification;
  systemCategorization: SystemCategorization;
  systemOwnership: SystemOwnership;
  authorizationBoundary: AuthorizationBoundary;
  systemEnvironment: SystemEnvironment;
  systemInterconnections: SystemInterconnection[];
  applicableLaws: ApplicableLaw[];
  minimumSecurityControls: MinimumSecurityControls;
  controlImplementation: ControlImplementationSummary;
  plannedControls: PlannedControl[];
  continuousMonitoring: ContinuousMonitoring;
  systemLifecycle: SystemLifecycle;
  hardwareSoftwareInventory: InventoryItem[];
  portsProtocolsServices: NetworkService[];
  dataFlows: DataFlow[];
  userTypesPrivileges: UserType[];
}

// Section 1: System Identification
export interface SystemIdentification {
  systemName: string;
  systemAcronym: string;
  systemUniqueId: string;
  systemVersion: string;
  systemDescription: string;
  systemPurpose: string;
  systemType: 'Major Application' | 'General Support System' | 'Minor Application';
  operationalStatus: 'Operational' | 'Under Development' | 'Major Modification' | 'Undergoing Certification';
  systemLocation: {
    primary: string;
    alternate?: string[];
  };
}

// Section 2: System Categorization
export interface SystemCategorization {
  fipsCategory: {
    confidentiality: ImpactLevel;
    integrity: ImpactLevel;
    availability: ImpactLevel;
  };
  overallImpact: ImpactLevel;
  impactJustification: string;
  informationTypes: InformationType[];
  cuiCategories?: string[];
  classificationGuidance?: string;
}

export interface InformationType {
  name: string;
  description: string;
  confidentiality: ImpactLevel;
  integrity: ImpactLevel;
  availability: ImpactLevel;
  nistCategory?: string;
}

// Section 3: System Ownership
export interface SystemOwnership {
  systemOwner: ContactInfo;
  authorizingOfficial: ContactInfo;
  issm?: ContactInfo;
  isso?: ContactInfo;
  securityPOC: ContactInfo;
  technicalPOC: ContactInfo;
  contractingOfficerRep?: ContactInfo;
}

export interface ContactInfo {
  name: string;
  title: string;
  organization: string;
  email: string;
  phone: string;
  address?: string;
}

// Section 4: Authorization Boundary
export interface AuthorizationBoundary {
  description: string;
  includesHardware: string[];
  includesSoftware: string[];
  includesData: string[];
  includesPersonnel: string[];
  networkDiagramRef: string;
  exclusions: string[];
  inheritedControls?: string[];
}

// Section 5: System Environment
export interface SystemEnvironment {
  physicalLocation: string;
  facilityType: string;
  facilitySecurityLevel: string;
  physicalAccessControls: string[];
  environmentalControls: string[];
  networkArchitecture: string;
  cloudProvider?: {
    name: string;
    type: 'IaaS' | 'PaaS' | 'SaaS';
    region: string;
    certifications: string[];
  };
}

// Section 6: System Interconnections
export interface SystemInterconnection {
  systemName: string;
  organizationName: string;
  connectionType: 'Dedicated' | 'VPN' | 'Internet' | 'Direct Connect';
  direction: 'Inbound' | 'Outbound' | 'Bidirectional';
  dataTransferred: string;
  securityLevel: string;
  authorizationStatus: 'Active MOU/ISA' | 'Pending' | 'None';
  documentRef?: string;
}

// Section 7: Applicable Laws/Regulations
export interface ApplicableLaw {
  name: string;
  citation: string;
  description: string;
  applicability: string;
  complianceStatus: 'Compliant' | 'Partial' | 'Non-Compliant' | 'Not Applicable';
}

// Section 8: Minimum Security Controls
export interface MinimumSecurityControls {
  baseline: string;
  totalControls: number;
  controlFamilies: {
    family: string;
    name: string;
    controlCount: number;
  }[];
  overlaysApplied: string[];
  tailoringDecisions: string[];
}

// Section 9: Control Implementation Summary
export interface ControlImplementationSummary {
  totalControls: number;
  implemented: number;
  partiallyImplemented: number;
  planned: number;
  notApplicable: number;
  complianceScore: number;
  byFamily: {
    family: string;
    implemented: number;
    total: number;
  }[];
}

// Section 10: Planned Controls
export interface PlannedControl {
  controlId: string;
  controlName: string;
  currentStatus: 'Not Implemented' | 'Partially Implemented';
  plannedImplementation: string;
  targetDate: string;
  resourcesRequired: string;
  responsibleParty: string;
  milestones: string[];
}

// Section 11: Continuous Monitoring
export interface ContinuousMonitoring {
  strategy: string;
  frequency: {
    vulnerabilityScanning: string;
    configurationAssessment: string;
    logReview: string;
    incidentReview: string;
    poamReview: string;
  };
  tools: string[];
  metrics: string[];
  reportingSchedule: string;
}

// Section 12: System Lifecycle
export interface SystemLifecycle {
  currentPhase: 'Initiation' | 'Development' | 'Implementation' | 'Operations' | 'Disposition';
  developmentModel: string;
  securityIntegration: string;
  changeManagement: string;
  configurationManagement: string;
  dispositionPlan?: string;
}

// Section 13: Hardware/Software Inventory
export interface InventoryItem {
  id: string;
  name: string;
  type: 'Hardware' | 'Software' | 'Firmware';
  version: string;
  vendor: string;
  location: string;
  purpose: string;
  patchLevel?: string;
  endOfLife?: string;
  criticality: 'High' | 'Medium' | 'Low';
}

// Section 14: Ports/Protocols/Services
export interface NetworkService {
  port: string;
  protocol: 'TCP' | 'UDP' | 'Both';
  service: string;
  purpose: string;
  direction: 'Inbound' | 'Outbound' | 'Both';
  authorized: boolean;
  encryptionRequired: boolean;
}

// Section 15: Data Flows
export interface DataFlow {
  id: string;
  name: string;
  source: string;
  destination: string;
  dataType: string;
  classification: string;
  encryptionMethod: string;
  protocol: string;
  frequency: string;
}

// Section 16: User Types & Privileges
export interface UserType {
  role: string;
  description: string;
  privilegeLevel: 'Administrator' | 'Privileged User' | 'User' | 'Guest';
  accessType: 'Local' | 'Remote' | 'Both';
  authMethod: string;
  sensitiveData: boolean;
  backgroundCheck: string;
  trainingRequired: string[];
}

// Control Implementation (for Section 9 details)
export interface ControlImplementation {
  controlId: string;
  framework: ComplianceFramework;
  family: string;
  name: string;
  baselineControl: boolean;
  implementationStatus: 'Implemented' | 'Partially Implemented' | 'Planned' | 'Not Applicable' | 'Inherited';
  responsibleRole: string;
  implementationDescription: string;
  evidenceArtifacts: string[];
  assessmentMethod: 'Examine' | 'Interview' | 'Test';
  assessmentDate?: string;
  assessor?: string;
}

// POA&M Entry
export interface POAMEntry {
  id: string;
  controlId: string;
  weakness: string;
  riskLevel: 'Critical' | 'High' | 'Moderate' | 'Low';
  cost: string;
  scheduledCompletionDate: string;
  milestones: {
    description: string;
    targetDate: string;
    status: 'Pending' | 'In Progress' | 'Completed';
  }[];
  responsiblePOC: string;
  resources: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  comments: string;
}

// SSP Approval
export interface SSPApproval {
  role: string;
  name: string;
  organization: string;
  signature?: string;
  date?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT SSP TEMPLATE
// ═══════════════════════════════════════════════════════════════

export function generateDefaultSSP(
  systemName: string,
  framework: ComplianceFramework,
  controls: ComplianceControl[]
): SystemSecurityPlan {
  const now = new Date();
  const sspId = `SSP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  // Calculate control statistics
  const frameworkControls = controls.filter(c => c.framework === framework || framework === 'NIST-800-53');
  const implemented = frameworkControls.filter(c => c.status === 'compliant').length;
  const partial = frameworkControls.filter(c => c.status === 'partial').length;
  const nonCompliant = frameworkControls.filter(c => c.status === 'non_compliant').length;
  const notApplicable = frameworkControls.filter(c => c.status === 'not_applicable').length;
  
  // Generate POAMs for non-compliant controls
  const poams: POAMEntry[] = frameworkControls
    .filter(c => c.status === 'partial' || c.status === 'non_compliant')
    .map((c, i) => ({
      id: `POAM-${String(i + 1).padStart(3, '0')}`,
      controlId: c.id,
      weakness: `${c.name}: ${c.notes || 'Control not fully implemented'}`,
      riskLevel: c.priority === 'high' ? 'High' : c.priority === 'medium' ? 'Moderate' : 'Low',
      cost: 'TBD',
      scheduledCompletionDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      milestones: [
        { description: 'Assessment of current state', targetDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'Pending' },
        { description: 'Implementation plan development', targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'Pending' },
        { description: 'Control implementation', targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'Pending' },
        { description: 'Verification and validation', targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'Pending' },
      ],
      responsiblePOC: 'ISSO',
      resources: 'TBD',
      status: 'Open',
      comments: c.notes || '',
    }));
  
  // Generate control implementations
  const controlImplementations: ControlImplementation[] = frameworkControls.map(c => ({
    controlId: c.id,
    framework: c.framework,
    family: c.family,
    name: c.name,
    baselineControl: true,
    implementationStatus: c.status === 'compliant' ? 'Implemented' :
                         c.status === 'partial' ? 'Partially Implemented' :
                         c.status === 'not_applicable' ? 'Not Applicable' : 'Planned',
    responsibleRole: 'ISSO',
    implementationDescription: c.description,
    evidenceArtifacts: c.evidence,
    assessmentMethod: c.assessmentMethod || 'Examine',
    assessmentDate: c.lastAudit,
    assessor: c.lastAuditBy,
  }));
  
  return {
    metadata: {
      sspId,
      systemName,
      systemAcronym: systemName.split(' ').map(w => w[0]).join('').toUpperCase(),
      framework,
      version: '1.0',
      status: 'draft',
      preparedBy: 'Mycosoft Security Team',
      preparedDate: now.toISOString().split('T')[0],
      lastModified: now.toISOString(),
      classificationLevel: 'CUI',
    },
    sections: {
      systemIdentification: {
        systemName,
        systemAcronym: systemName.split(' ').map(w => w[0]).join('').toUpperCase(),
        systemUniqueId: sspId,
        systemVersion: '1.0',
        systemDescription: `${systemName} is an information system designed to support organizational mission requirements while maintaining appropriate security controls.`,
        systemPurpose: 'Support organizational mission and business operations',
        systemType: 'Major Application',
        operationalStatus: 'Operational',
        systemLocation: {
          primary: 'Mycosoft Data Center - San Diego, CA',
        },
      },
      systemCategorization: {
        fipsCategory: {
          confidentiality: 'MODERATE',
          integrity: 'MODERATE',
          availability: 'MODERATE',
        },
        overallImpact: 'MODERATE',
        impactJustification: 'System processes Controlled Unclassified Information (CUI) requiring moderate protection levels per NIST 800-171.',
        informationTypes: [
          {
            name: 'Controlled Unclassified Information (CUI)',
            description: 'Sensitive but unclassified information requiring safeguarding',
            confidentiality: 'MODERATE',
            integrity: 'MODERATE',
            availability: 'MODERATE',
            nistCategory: 'D.1.3',
          },
        ],
        cuiCategories: ['CTI - Controlled Technical Information', 'PRVCY - Privacy Information'],
      },
      systemOwnership: {
        systemOwner: {
          name: 'System Owner',
          title: 'Director of Information Technology',
          organization: 'Mycosoft',
          email: 'systemowner@mycosoft.com',
          phone: '(555) 123-4567',
        },
        authorizingOfficial: {
          name: 'Authorizing Official',
          title: 'Chief Information Security Officer',
          organization: 'Mycosoft',
          email: 'ao@mycosoft.com',
          phone: '(555) 123-4568',
        },
        issm: {
          name: 'ISSM',
          title: 'Information System Security Manager',
          organization: 'Mycosoft',
          email: 'issm@mycosoft.com',
          phone: '(555) 123-4569',
        },
        isso: {
          name: 'ISSO',
          title: 'Information System Security Officer',
          organization: 'Mycosoft',
          email: 'isso@mycosoft.com',
          phone: '(555) 123-4570',
        },
        securityPOC: {
          name: 'Security POC',
          title: 'Security Analyst',
          organization: 'Mycosoft',
          email: 'security@mycosoft.com',
          phone: '(555) 123-4571',
        },
        technicalPOC: {
          name: 'Technical POC',
          title: 'System Administrator',
          organization: 'Mycosoft',
          email: 'admin@mycosoft.com',
          phone: '(555) 123-4572',
        },
      },
      authorizationBoundary: {
        description: 'The authorization boundary encompasses all hardware, software, and data components necessary for system operation.',
        includesHardware: ['Application Servers', 'Database Servers', 'Network Devices', 'Storage Systems'],
        includesSoftware: ['Operating Systems', 'Application Software', 'Database Management Systems', 'Security Tools'],
        includesData: ['System Data', 'User Data', 'Configuration Data', 'Log Data'],
        includesPersonnel: ['System Administrators', 'Database Administrators', 'Security Personnel', 'End Users'],
        networkDiagramRef: 'See Attachment A - Network Architecture Diagram',
        exclusions: ['Third-party cloud services (covered under separate authorization)', 'End-user workstations (covered under GSS)'],
      },
      systemEnvironment: {
        physicalLocation: 'Mycosoft Secure Data Center',
        facilityType: 'Commercial Data Center',
        facilitySecurityLevel: 'Controlled Access',
        physicalAccessControls: ['Badge Access', 'Biometric Authentication', '24/7 Security Guard', 'CCTV Monitoring'],
        environmentalControls: ['HVAC', 'Fire Suppression', 'UPS', 'Backup Generator'],
        networkArchitecture: 'Multi-tier architecture with DMZ, application tier, and database tier',
      },
      systemInterconnections: [
        {
          systemName: 'Corporate Network',
          organizationName: 'Mycosoft',
          connectionType: 'Dedicated',
          direction: 'Bidirectional',
          dataTransferred: 'Administrative and operational data',
          securityLevel: 'CUI',
          authorizationStatus: 'Active MOU/ISA',
          documentRef: 'ISA-001',
        },
      ],
      applicableLaws: [
        {
          name: 'NIST SP 800-171',
          citation: 'NIST SP 800-171 Rev. 2',
          description: 'Protecting Controlled Unclassified Information in Nonfederal Systems',
          applicability: 'Required for CUI protection',
          complianceStatus: 'Partial',
        },
        {
          name: 'DFARS 252.204-7012',
          citation: '48 CFR 252.204-7012',
          description: 'Safeguarding Covered Defense Information',
          applicability: 'Required for DoD contracts',
          complianceStatus: 'Partial',
        },
        {
          name: 'CMMC 2.0',
          citation: 'CMMC 2.0 Level 2',
          description: 'Cybersecurity Maturity Model Certification',
          applicability: 'Required for DoD contracts handling CUI',
          complianceStatus: 'Partial',
        },
      ],
      minimumSecurityControls: {
        baseline: `${framework} Controls`,
        totalControls: frameworkControls.length,
        controlFamilies: getControlFamilySummary(frameworkControls),
        overlaysApplied: ['Privacy Overlay', 'Cloud Overlay'],
        tailoringDecisions: ['Scoping guidance applied per system boundary'],
      },
      controlImplementation: {
        totalControls: frameworkControls.length,
        implemented,
        partiallyImplemented: partial,
        planned: nonCompliant,
        notApplicable,
        complianceScore: frameworkControls.length > 0 
          ? Math.round(((implemented + partial * 0.5) / (frameworkControls.length - notApplicable)) * 100) 
          : 0,
        byFamily: getControlFamilySummary(frameworkControls).map(f => ({
          family: f.family,
          implemented: frameworkControls.filter(c => c.family === f.family && c.status === 'compliant').length,
          total: f.controlCount,
        })),
      },
      plannedControls: frameworkControls
        .filter(c => c.status === 'partial' || c.status === 'non_compliant')
        .map(c => ({
          controlId: c.id,
          controlName: c.name,
          currentStatus: c.status === 'partial' ? 'Partially Implemented' : 'Not Implemented',
          plannedImplementation: c.notes || 'Implementation plan in development',
          targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          resourcesRequired: 'TBD',
          responsibleParty: 'ISSO',
          milestones: ['Assessment', 'Planning', 'Implementation', 'Verification'],
        })),
      continuousMonitoring: {
        strategy: 'Implement ongoing assessment of security controls through automated and manual means',
        frequency: {
          vulnerabilityScanning: 'Monthly (Critical: within 72 hours)',
          configurationAssessment: 'Quarterly',
          logReview: 'Daily (automated) / Weekly (manual)',
          incidentReview: 'As needed / Monthly summary',
          poamReview: 'Monthly',
        },
        tools: ['Vulnerability Scanner', 'SIEM', 'Configuration Management', 'Endpoint Detection'],
        metrics: ['Vulnerability remediation time', 'Incident response time', 'Control effectiveness'],
        reportingSchedule: 'Monthly security status report to AO',
      },
      systemLifecycle: {
        currentPhase: 'Operations',
        developmentModel: 'DevSecOps',
        securityIntegration: 'Security integrated throughout SDLC with automated testing',
        changeManagement: 'Formal change management process with security review',
        configurationManagement: 'Infrastructure as Code with version control',
      },
      hardwareSoftwareInventory: [
        { id: 'HW-001', name: 'Application Server', type: 'Hardware', version: 'Dell PowerEdge R750', vendor: 'Dell', location: 'Data Center', purpose: 'Application hosting', criticality: 'High' },
        { id: 'SW-001', name: 'Next.js', type: 'Software', version: '14.x', vendor: 'Vercel', location: 'Application Server', purpose: 'Web framework', criticality: 'High' },
        { id: 'SW-002', name: 'PostgreSQL', type: 'Software', version: '15.x', vendor: 'PostgreSQL', location: 'Database Server', purpose: 'Database', criticality: 'High' },
      ],
      portsProtocolsServices: [
        { port: '443', protocol: 'TCP', service: 'HTTPS', purpose: 'Web application access', direction: 'Inbound', authorized: true, encryptionRequired: true },
        { port: '22', protocol: 'TCP', service: 'SSH', purpose: 'Administrative access', direction: 'Inbound', authorized: true, encryptionRequired: true },
        { port: '5432', protocol: 'TCP', service: 'PostgreSQL', purpose: 'Database access', direction: 'Both', authorized: true, encryptionRequired: true },
      ],
      dataFlows: [
        { id: 'DF-001', name: 'User Authentication', source: 'End User', destination: 'Authentication Server', dataType: 'Credentials', classification: 'CUI', encryptionMethod: 'TLS 1.3', protocol: 'HTTPS', frequency: 'On-demand' },
        { id: 'DF-002', name: 'Data Storage', source: 'Application Server', destination: 'Database', dataType: 'Application Data', classification: 'CUI', encryptionMethod: 'TLS 1.3', protocol: 'PostgreSQL/SSL', frequency: 'Continuous' },
      ],
      userTypesPrivileges: [
        { role: 'System Administrator', description: 'Full system access for administration', privilegeLevel: 'Administrator', accessType: 'Both', authMethod: 'MFA', sensitiveData: true, backgroundCheck: 'Tier 3 / Secret', trainingRequired: ['Security Awareness', 'Privileged Access Training'] },
        { role: 'Application User', description: 'Standard application access', privilegeLevel: 'User', accessType: 'Remote', authMethod: 'MFA', sensitiveData: true, backgroundCheck: 'Basic', trainingRequired: ['Security Awareness'] },
      ],
    },
    controls: controlImplementations,
    poams,
    approvals: [
      { role: 'Information System Security Officer (ISSO)', name: '', organization: 'Mycosoft', status: 'Pending' },
      { role: 'Information System Security Manager (ISSM)', name: '', organization: 'Mycosoft', status: 'Pending' },
      { role: 'System Owner', name: '', organization: 'Mycosoft', status: 'Pending' },
      { role: 'Authorizing Official (AO)', name: '', organization: 'Mycosoft', status: 'Pending' },
    ],
    generatedAt: now.toISOString(),
    version: '1.0',
  };
}

// Helper function to summarize controls by family
function getControlFamilySummary(controls: ComplianceControl[]): { family: string; name: string; controlCount: number }[] {
  const familyMap = new Map<string, number>();
  
  controls.forEach(c => {
    familyMap.set(c.family, (familyMap.get(c.family) || 0) + 1);
  });
  
  const familyNames: Record<string, string> = {
    'AC': 'Access Control',
    'AU': 'Audit & Accountability',
    'AT': 'Awareness & Training',
    'CM': 'Configuration Management',
    'CP': 'Contingency Planning',
    'IA': 'Identification & Authentication',
    'IR': 'Incident Response',
    'MA': 'Maintenance',
    'MP': 'Media Protection',
    'PE': 'Physical Protection',
    'PL': 'Planning',
    'PS': 'Personnel Security',
    'RA': 'Risk Assessment',
    'CA': 'Security Assessment',
    'SC': 'System & Communications',
    'SI': 'System Integrity',
    'SA': 'System Acquisition',
    'PM': 'Program Management',
    '3.1': 'Access Control',
    '3.2': 'Awareness & Training',
    '3.3': 'Audit & Accountability',
    '3.4': 'Configuration Management',
    '3.5': 'Identification & Authentication',
    '3.6': 'Incident Response',
    '3.7': 'Maintenance',
    '3.8': 'Media Protection',
    '3.9': 'Personnel Security',
    '3.10': 'Physical Protection',
    '3.11': 'Risk Assessment',
    '3.12': 'Security Assessment',
    '3.13': 'System & Communications',
    '3.14': 'System Integrity',
  };
  
  return Array.from(familyMap.entries()).map(([family, count]) => ({
    family,
    name: familyNames[family] || family,
    controlCount: count,
  }));
}

// ═══════════════════════════════════════════════════════════════
// SSP EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function exportSSPToJSON(ssp: SystemSecurityPlan): string {
  return JSON.stringify(ssp, null, 2);
}

export function generateSSPHTML(ssp: SystemSecurityPlan): string {
  const { metadata, sections, poams, approvals } = ssp;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>System Security Plan - ${metadata.systemName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
    h1 { color: #1a365d; border-bottom: 3px solid #3182ce; padding-bottom: 10px; }
    h2 { color: #2c5282; border-bottom: 2px solid #63b3ed; padding-bottom: 8px; margin-top: 30px; }
    h3 { color: #2b6cb0; margin-top: 20px; }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; padding: 30px; margin: -40px -40px 30px -40px; }
    .header h1 { color: white; border-bottom: none; margin: 0; }
    .header .meta { opacity: 0.9; margin-top: 10px; }
    .classification { background: #fed7d7; color: #c53030; padding: 10px; text-align: center; font-weight: bold; border: 2px solid #c53030; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #edf2f7; padding: 12px; text-align: left; border: 1px solid #cbd5e0; }
    td { padding: 10px; border: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f7fafc; }
    .status-compliant { background: #c6f6d5; color: #22543d; padding: 4px 8px; border-radius: 4px; }
    .status-partial { background: #fefcbf; color: #744210; padding: 4px 8px; border-radius: 4px; }
    .status-non { background: #fed7d7; color: #c53030; padding: 4px 8px; border-radius: 4px; }
    .section { background: #f7fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { background: #ebf8ff; padding: 15px; border-radius: 8px; text-align: center; flex: 1; }
    .stat-value { font-size: 24px; font-weight: bold; color: #2b6cb0; }
    .stat-label { font-size: 12px; color: #4a5568; }
    .signature-line { border-bottom: 1px solid #000; width: 250px; margin: 20px 0 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #718096; }
    @media print { .header { background: #1a365d !important; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="classification">${metadata.classificationLevel} // CONTROLLED UNCLASSIFIED INFORMATION</div>
  
  <div class="header">
    <h1>System Security Plan (SSP)</h1>
    <div class="meta">
      <strong>${metadata.systemName}</strong> (${metadata.systemAcronym})<br>
      Version ${metadata.version} | ${metadata.framework} | ${metadata.status.toUpperCase()}<br>
      Prepared: ${metadata.preparedDate} | SSP ID: ${metadata.sspId}
    </div>
  </div>
  
  <h2>Section 1: System Identification</h2>
  <div class="section">
    <table>
      <tr><th>System Name</th><td>${sections.systemIdentification.systemName}</td></tr>
      <tr><th>System Acronym</th><td>${sections.systemIdentification.systemAcronym}</td></tr>
      <tr><th>Unique Identifier</th><td>${sections.systemIdentification.systemUniqueId}</td></tr>
      <tr><th>System Type</th><td>${sections.systemIdentification.systemType}</td></tr>
      <tr><th>Operational Status</th><td>${sections.systemIdentification.operationalStatus}</td></tr>
      <tr><th>Description</th><td>${sections.systemIdentification.systemDescription}</td></tr>
      <tr><th>Purpose</th><td>${sections.systemIdentification.systemPurpose}</td></tr>
      <tr><th>Primary Location</th><td>${sections.systemIdentification.systemLocation.primary}</td></tr>
    </table>
  </div>
  
  <h2>Section 2: System Categorization</h2>
  <div class="section">
    <table>
      <tr><th>Confidentiality</th><td>${sections.systemCategorization.fipsCategory.confidentiality}</td></tr>
      <tr><th>Integrity</th><td>${sections.systemCategorization.fipsCategory.integrity}</td></tr>
      <tr><th>Availability</th><td>${sections.systemCategorization.fipsCategory.availability}</td></tr>
      <tr><th>Overall Impact</th><td><strong>${sections.systemCategorization.overallImpact}</strong></td></tr>
      <tr><th>Justification</th><td>${sections.systemCategorization.impactJustification}</td></tr>
    </table>
  </div>
  
  <h2>Section 3: System Ownership</h2>
  <div class="section">
    <h3>Key Personnel</h3>
    <table>
      <tr><th>Role</th><th>Name</th><th>Organization</th><th>Email</th><th>Phone</th></tr>
      <tr><td>System Owner</td><td>${sections.systemOwnership.systemOwner.name}</td><td>${sections.systemOwnership.systemOwner.organization}</td><td>${sections.systemOwnership.systemOwner.email}</td><td>${sections.systemOwnership.systemOwner.phone}</td></tr>
      <tr><td>Authorizing Official</td><td>${sections.systemOwnership.authorizingOfficial.name}</td><td>${sections.systemOwnership.authorizingOfficial.organization}</td><td>${sections.systemOwnership.authorizingOfficial.email}</td><td>${sections.systemOwnership.authorizingOfficial.phone}</td></tr>
      ${sections.systemOwnership.issm ? `<tr><td>ISSM</td><td>${sections.systemOwnership.issm.name}</td><td>${sections.systemOwnership.issm.organization}</td><td>${sections.systemOwnership.issm.email}</td><td>${sections.systemOwnership.issm.phone}</td></tr>` : ''}
      ${sections.systemOwnership.isso ? `<tr><td>ISSO</td><td>${sections.systemOwnership.isso.name}</td><td>${sections.systemOwnership.isso.organization}</td><td>${sections.systemOwnership.isso.email}</td><td>${sections.systemOwnership.isso.phone}</td></tr>` : ''}
    </table>
  </div>
  
  <h2>Section 9: Control Implementation Summary</h2>
  <div class="section">
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${sections.controlImplementation.totalControls}</div>
        <div class="stat-label">Total Controls</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #22543d;">${sections.controlImplementation.implemented}</div>
        <div class="stat-label">Implemented</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #744210;">${sections.controlImplementation.partiallyImplemented}</div>
        <div class="stat-label">Partial</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #c53030;">${sections.controlImplementation.planned}</div>
        <div class="stat-label">Planned</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #2b6cb0;">${sections.controlImplementation.complianceScore}%</div>
        <div class="stat-label">Compliance Score</div>
      </div>
    </div>
  </div>
  
  <h2>Section 10: POA&M Summary</h2>
  <div class="section">
    <p><strong>${poams.length}</strong> items require remediation.</p>
    <table>
      <tr><th>ID</th><th>Control</th><th>Weakness</th><th>Risk</th><th>Target Date</th><th>Status</th></tr>
      ${poams.slice(0, 10).map(p => `
        <tr>
          <td>${p.id}</td>
          <td>${p.controlId}</td>
          <td>${p.weakness.substring(0, 50)}...</td>
          <td><span class="status-${p.riskLevel === 'High' || p.riskLevel === 'Critical' ? 'non' : p.riskLevel === 'Moderate' ? 'partial' : 'compliant'}">${p.riskLevel}</span></td>
          <td>${p.scheduledCompletionDate}</td>
          <td>${p.status}</td>
        </tr>
      `).join('')}
    </table>
    ${poams.length > 10 ? `<p><em>... and ${poams.length - 10} more items. See full POA&M for details.</em></p>` : ''}
  </div>
  
  <h2>Section 17: Signature and Approval</h2>
  <div class="section">
    ${approvals.map(a => `
      <div style="margin-bottom: 30px;">
        <p><strong>${a.role}</strong></p>
        <div class="signature-line"></div>
        <p>Name: ${a.name || '________________________'}</p>
        <p>Organization: ${a.organization}</p>
        <p>Date: ${a.date || '________________________'}</p>
      </div>
    `).join('')}
  </div>
  
  <div class="footer">
    <p>This System Security Plan was generated by Mycosoft Security Operations Center.</p>
    <p>Generated: ${ssp.generatedAt} | Version: ${ssp.version}</p>
    <p>${metadata.classificationLevel} // CONTROLLED UNCLASSIFIED INFORMATION</p>
  </div>
</body>
</html>
  `;
}
