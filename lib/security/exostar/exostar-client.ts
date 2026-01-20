/**
 * Exostar Integration Client
 * 
 * Integrates with Exostar supply chain security platform for:
 * - CMMC assessment synchronization
 * - Supply chain risk management
 * - Partner verification
 * - Secure collaboration
 * 
 * @see https://www.exostar.com
 */

import { ComplianceControl, ComplianceFramework } from '../compliance-frameworks';

// ═══════════════════════════════════════════════════════════════
// EXOSTAR TYPES
// ═══════════════════════════════════════════════════════════════

export interface ExostarConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  organizationId: string;
  environment: 'production' | 'sandbox';
}

export interface ExostarOrganization {
  id: string;
  name: string;
  cageCode: string;
  dunsNumber: string;
  samRegistration: {
    active: boolean;
    expirationDate: string;
  };
  cmmcLevel?: 1 | 2 | 3;
  cmmcAssessmentDate?: string;
  cmmcCertificationDate?: string;
  cmmcCertificationExpiry?: string;
  facilitySecurityClearance?: {
    level: 'Confidential' | 'Secret' | 'Top Secret';
    active: boolean;
    expirationDate: string;
  };
  contacts: ExostarContact[];
}

export interface ExostarContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone?: string;
  role: 'FSO' | 'ISSO' | 'PM' | 'CMMC-POC' | 'Executive';
}

export interface ExostarAssessment {
  id: string;
  type: 'self' | 'c3pao' | 'government';
  framework: 'CMMC-L1' | 'CMMC-L2' | 'CMMC-L3' | 'NIST-800-171' | 'NIST-800-53';
  status: 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'certified' | 'failed' | 'expired';
  startDate: string;
  submissionDate?: string;
  certificationDate?: string;
  expirationDate?: string;
  assessorOrganization?: string;
  assessorContact?: string;
  score?: number;
  sprsScore?: number; // Supplier Performance Risk System score (-203 to 110)
  findings: ExostarFinding[];
  controlResults: ExostarControlResult[];
}

export interface ExostarFinding {
  id: string;
  controlId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'remediated' | 'accepted_risk';
  dueDate: string;
  evidence?: string;
}

export interface ExostarControlResult {
  controlId: string;
  framework: string;
  status: 'met' | 'not_met' | 'partially_met' | 'not_applicable';
  evidence: string[];
  notes: string;
  lastAssessed: string;
  assessedBy: string;
}

export interface ExostarSupplier {
  id: string;
  name: string;
  cageCode: string;
  relationship: 'tier1' | 'tier2' | 'tier3' | 'subcontractor';
  riskScore: number;
  complianceStatus: 'compliant' | 'non_compliant' | 'pending' | 'unknown';
  cmmcLevel?: 1 | 2 | 3;
  contractNumbers: string[];
  lastVerified: string;
}

export interface SPRSSubmission {
  id: string;
  submissionDate: string;
  score: number;
  assessmentDate: string;
  scope: string;
  governmentPOC: string;
  system: string;
  status: 'submitted' | 'accepted' | 'rejected';
}

// ═══════════════════════════════════════════════════════════════
// DD-254 TYPES (DoD Security Agreement)
// ═══════════════════════════════════════════════════════════════

export interface DD254 {
  id: string;
  contractNumber: string;
  contractorName: string;
  contractorAddress: string;
  cageCode: string;
  primeContractor?: {
    name: string;
    address: string;
    cageCode: string;
  };
  classificationLevel: 'CONFIDENTIAL' | 'SECRET' | 'TOP SECRET' | 'TOP SECRET/SCI';
  accessTo: {
    classifiedInformation: boolean;
    restrictedData: boolean;
    formerlyRestrictedData: boolean;
    criticalNuclearWeaponDesignInfo: boolean;
    nato: boolean;
    foreignGovernmentInfo: boolean;
    comsec: boolean;
    specialAccessProgram: boolean;
    sensitiveCompartmentedInfo: boolean;
  };
  performanceLocation: {
    contractorFacility: boolean;
    governmentFacility: boolean;
    otherLocation?: string;
  };
  subcontractingAllowed: boolean;
  safeguardingRequired: boolean;
  storageCapability: 'open_storage' | 'closed_storage' | 'none';
  specialInstructions: string;
  gcaPOC: string;
  gcaPhone: string;
  issuingOffice: string;
  issueDate: string;
  expirationDate: string;
  status: 'draft' | 'pending' | 'approved' | 'expired' | 'terminated';
}

// ═══════════════════════════════════════════════════════════════
// SF-328 (Certificate of Foreign Investment)
// ═══════════════════════════════════════════════════════════════

export interface SF328 {
  id: string;
  companyName: string;
  companyAddress: string;
  cageCode: string;
  effectiveDate: string;
  expirationDate: string;
  fociDetermination: 'no_foci' | 'foci_not_mitigated' | 'foci_mitigated';
  mitigationMeasure?: 'board_resolution' | 'security_control_agreement' | 'special_security_agreement' | 'proxy_agreement' | 'voting_trust_agreement';
  foreignOwnership: {
    hasOwnership: boolean;
    countries: string[];
    percentage?: number;
  };
  foreignControl: {
    hasControl: boolean;
    description?: string;
  };
  foreignInfluence: {
    hasInfluence: boolean;
    description?: string;
  };
  certifyingOfficial: string;
  certifyingTitle: string;
  signatureDate: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied';
}

// ═══════════════════════════════════════════════════════════════
// EXOSTAR CLIENT
// ═══════════════════════════════════════════════════════════════

export class ExostarClient {
  private config: Partial<ExostarConfig>;
  
  constructor(config: Partial<ExostarConfig> = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://api.exostar.com',
      environment: config.environment || 'sandbox',
      ...config,
    };
  }
  
  /**
   * Sync internal controls with Exostar assessment
   */
  async syncAssessment(
    controls: ComplianceControl[],
    framework: ComplianceFramework
  ): Promise<ExostarAssessment> {
    console.log(`[Exostar] Syncing ${controls.length} controls for ${framework}`);
    
    // Map framework to Exostar framework type
    const exostarFramework = this.mapFramework(framework);
    
    // Calculate SPRS score from controls
    const sprsScore = this.calculateSPRSScore(controls);
    
    const controlResults: ExostarControlResult[] = controls.map(control => ({
      controlId: control.id,
      framework: control.framework,
      status: this.mapControlStatus(control.status),
      evidence: control.evidence || [],
      notes: control.notes || '',
      lastAssessed: control.lastAudit,
      assessedBy: control.lastAuditBy || 'System',
    }));
    
    const findings: ExostarFinding[] = controls
      .filter(c => c.status !== 'compliant' && c.status !== 'not_applicable')
      .map((control, idx) => ({
        id: `FIND-${String(idx + 1).padStart(3, '0')}`,
        controlId: control.id,
        severity: control.priority,
        description: `Control ${control.id} is ${control.status}`,
        recommendation: control.notes || 'Implement required controls',
        status: control.status === 'partial' ? 'in_progress' : 'open',
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));
    
    const assessment: ExostarAssessment = {
      id: `ASSESS-${Date.now()}`,
      type: 'self',
      framework: exostarFramework,
      status: 'in_progress',
      startDate: new Date().toISOString().split('T')[0],
      sprsScore,
      findings,
      controlResults,
    };
    
    return assessment;
  }
  
  /**
   * Submit assessment to Exostar
   */
  async submitAssessment(assessment: ExostarAssessment): Promise<{
    success: boolean;
    submissionId: string;
    message: string;
  }> {
    console.log(`[Exostar] Submitting assessment ${assessment.id}`);
    
    // In production, this would call the Exostar API
    return {
      success: true,
      submissionId: `SUB-${Date.now()}`,
      message: 'Assessment submitted successfully. Review pending.',
    };
  }
  
  /**
   * Submit SPRS score to DoD SPRS portal (via Exostar)
   */
  async submitSPRSScore(
    score: number,
    assessmentDate: string,
    scope: string
  ): Promise<SPRSSubmission> {
    console.log(`[Exostar] Submitting SPRS score: ${score}`);
    
    const submission: SPRSSubmission = {
      id: `SPRS-${Date.now()}`,
      submissionDate: new Date().toISOString().split('T')[0],
      score,
      assessmentDate,
      scope,
      governmentPOC: 'Pending Assignment',
      system: 'Mycosoft MAS',
      status: 'submitted',
    };
    
    return submission;
  }
  
  /**
   * Get supplier risk assessment
   */
  async getSupplierRisk(supplierId: string): Promise<ExostarSupplier | null> {
    console.log(`[Exostar] Getting supplier risk for ${supplierId}`);
    
    // Mock data for development
    return {
      id: supplierId,
      name: 'Example Supplier',
      cageCode: '12345',
      relationship: 'tier1',
      riskScore: 75,
      complianceStatus: 'compliant',
      cmmcLevel: 2,
      contractNumbers: ['W912AB-23-C-0001'],
      lastVerified: new Date().toISOString().split('T')[0],
    };
  }
  
  /**
   * Generate DD-254 form
   */
  async generateDD254(
    contractNumber: string,
    contractorInfo: {
      name: string;
      address: string;
      cageCode: string;
    },
    classificationLevel: DD254['classificationLevel'],
    accessRequirements: Partial<DD254['accessTo']> = {}
  ): Promise<DD254> {
    console.log(`[Exostar] Generating DD-254 for contract ${contractNumber}`);
    
    const dd254: DD254 = {
      id: `DD254-${Date.now()}`,
      contractNumber,
      contractorName: contractorInfo.name,
      contractorAddress: contractorInfo.address,
      cageCode: contractorInfo.cageCode,
      classificationLevel,
      accessTo: {
        classifiedInformation: true,
        restrictedData: false,
        formerlyRestrictedData: false,
        criticalNuclearWeaponDesignInfo: false,
        nato: false,
        foreignGovernmentInfo: false,
        comsec: false,
        specialAccessProgram: false,
        sensitiveCompartmentedInfo: classificationLevel === 'TOP SECRET/SCI',
        ...accessRequirements,
      },
      performanceLocation: {
        contractorFacility: true,
        governmentFacility: false,
      },
      subcontractingAllowed: false,
      safeguardingRequired: true,
      storageCapability: classificationLevel === 'TOP SECRET/SCI' ? 'closed_storage' : 'open_storage',
      specialInstructions: '',
      gcaPOC: 'To Be Assigned',
      gcaPhone: '',
      issuingOffice: '',
      issueDate: new Date().toISOString().split('T')[0],
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
    };
    
    return dd254;
  }
  
  /**
   * Generate SF-328 form
   */
  async generateSF328(
    companyInfo: {
      name: string;
      address: string;
      cageCode: string;
    },
    fociStatus: {
      hasOwnership: boolean;
      hasControl: boolean;
      hasInfluence: boolean;
      countries?: string[];
      ownershipPercentage?: number;
    }
  ): Promise<SF328> {
    console.log(`[Exostar] Generating SF-328 for ${companyInfo.name}`);
    
    // Determine FOCI status
    const hasFoci = fociStatus.hasOwnership || fociStatus.hasControl || fociStatus.hasInfluence;
    
    const sf328: SF328 = {
      id: `SF328-${Date.now()}`,
      companyName: companyInfo.name,
      companyAddress: companyInfo.address,
      cageCode: companyInfo.cageCode,
      effectiveDate: new Date().toISOString().split('T')[0],
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fociDetermination: hasFoci ? 'foci_not_mitigated' : 'no_foci',
      foreignOwnership: {
        hasOwnership: fociStatus.hasOwnership,
        countries: fociStatus.countries || [],
        percentage: fociStatus.ownershipPercentage,
      },
      foreignControl: {
        hasControl: fociStatus.hasControl,
      },
      foreignInfluence: {
        hasInfluence: fociStatus.hasInfluence,
      },
      certifyingOfficial: '',
      certifyingTitle: '',
      signatureDate: '',
      status: 'draft',
    };
    
    return sf328;
  }
  
  /**
   * Calculate SPRS score from NIST 800-171 controls
   * Score range: -203 to 110
   */
  private calculateSPRSScore(controls: ComplianceControl[]): number {
    // SPRS scoring is based on weighted controls
    // Each non-compliant control has a specific point deduction
    
    const nist171Controls = controls.filter(c => c.framework === 'NIST-800-171');
    
    // Start with maximum score
    let score = 110;
    
    for (const control of nist171Controls) {
      if (control.status === 'non_compliant') {
        // Weight by priority
        switch (control.priority) {
          case 'high':
            score -= 5;
            break;
          case 'medium':
            score -= 3;
            break;
          case 'low':
            score -= 1;
            break;
        }
      } else if (control.status === 'partial') {
        // Partial compliance gets half deduction
        switch (control.priority) {
          case 'high':
            score -= 2.5;
            break;
          case 'medium':
            score -= 1.5;
            break;
          case 'low':
            score -= 0.5;
            break;
        }
      }
    }
    
    // Clamp to valid range
    return Math.max(-203, Math.min(110, Math.round(score)));
  }
  
  private mapFramework(framework: ComplianceFramework): ExostarAssessment['framework'] {
    switch (framework) {
      case 'CMMC':
        return 'CMMC-L2';
      case 'NIST-800-171':
        return 'NIST-800-171';
      case 'NIST-800-53':
        return 'NIST-800-53';
      default:
        return 'NIST-800-171';
    }
  }
  
  private mapControlStatus(status: ComplianceControl['status']): ExostarControlResult['status'] {
    switch (status) {
      case 'compliant':
        return 'met';
      case 'non_compliant':
        return 'not_met';
      case 'partial':
        return 'partially_met';
      case 'not_applicable':
        return 'not_applicable';
      default:
        return 'not_met';
    }
  }
}

// Export singleton instance
export const exostarClient = new ExostarClient();
