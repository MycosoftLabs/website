/**
 * Plan of Action and Milestones (POA&M) Generator
 * 
 * Generates POA&M documents per NIST SP 800-53, NIST 800-171, CMMC 2.0,
 * and FedRAMP requirements for tracking security control deficiencies.
 */

import { ComplianceControl, ComplianceFramework } from '../compliance-frameworks';

// ═══════════════════════════════════════════════════════════════
// POA&M TYPES
// ═══════════════════════════════════════════════════════════════

export type RiskLevel = 'Critical' | 'High' | 'Moderate' | 'Low';

export interface POAMDocument {
  metadata: POAMMetadata;
  entries: POAMEntry[];
  summary: POAMSummary;
  generatedAt: string;
}

export interface POAMMetadata {
  poamId: string;
  systemName: string;
  systemOwner: string;
  preparedBy: string;
  preparedDate: string;
  framework: ComplianceFramework;
  reviewFrequency: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
  lastReview: string;
  nextReview: string;
}

export interface POAMEntry {
  id: string;
  poamNumber: string;
  controlId: string;
  controlFamily: string;
  controlName: string;
  weakness: string;
  weaknessDescription: string;
  riskLevel: RiskLevel;
  sourceIdentified: 'Assessment' | 'Audit' | 'Continuous Monitoring' | 'Penetration Test' | 'Self-Assessment';
  dateIdentified: string;
  scheduledCompletionDate: string;
  actualCompletionDate?: string;
  milestones: Milestone[];
  responsiblePOC: ResponsibleParty;
  resourcesRequired: ResourceRequirement;
  status: POAMStatus;
  remediationPlan: string;
  delayJustification?: string;
  riskAcceptance?: RiskAcceptance;
  comments: string;
  lastUpdated: string;
}

export interface Milestone {
  id: string;
  sequence: number;
  description: string;
  targetDate: string;
  completedDate?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delayed';
  owner: string;
  deliverables: string[];
}

export interface ResponsibleParty {
  name: string;
  role: string;
  organization: string;
  email: string;
  phone?: string;
}

export interface ResourceRequirement {
  estimatedCost: number;
  fundingStatus: 'Funded' | 'Partially Funded' | 'Unfunded' | 'TBD';
  laborHours: number;
  contractorSupport: boolean;
  toolsRequired: string[];
}

export type POAMStatus = 'Open' | 'In Progress' | 'Completed' | 'Delayed' | 'Risk Accepted' | 'Pending Verification';

export interface RiskAcceptance {
  accepted: boolean;
  acceptedBy: string;
  acceptedDate: string;
  expirationDate: string;
  justification: string;
  residualRisk: string;
}

export interface POAMSummary {
  totalEntries: number;
  open: number;
  inProgress: number;
  completed: number;
  delayed: number;
  riskAccepted: number;
  bySeverity: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  overdueCount: number;
  averageDaysOpen: number;
  estimatedTotalCost: number;
}

// ═══════════════════════════════════════════════════════════════
// POA&M GENERATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function generatePOAMFromControls(
  controls: ComplianceControl[],
  systemName: string,
  framework: ComplianceFramework
): POAMDocument {
  const now = new Date();
  const poamId = `POAM-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  // Filter for non-compliant controls
  const nonCompliantControls = controls.filter(
    c => c.status === 'partial' || c.status === 'non_compliant'
  );
  
  // Generate POA&M entries
  const entries: POAMEntry[] = nonCompliantControls.map((control, index) => {
    const riskLevel = getRiskLevel(control);
    const targetDays = getTargetDaysFromRisk(riskLevel);
    const targetDate = new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000);
    
    return {
      id: `entry-${index + 1}`,
      poamNumber: `${poamId}-${String(index + 1).padStart(3, '0')}`,
      controlId: control.id,
      controlFamily: control.family,
      controlName: control.name,
      weakness: `${control.name} - ${control.status === 'partial' ? 'Partially Implemented' : 'Not Implemented'}`,
      weaknessDescription: control.description,
      riskLevel,
      sourceIdentified: 'Self-Assessment',
      dateIdentified: control.lastAudit || now.toISOString().split('T')[0],
      scheduledCompletionDate: targetDate.toISOString().split('T')[0],
      milestones: generateMilestones(control, now, targetDate),
      responsiblePOC: {
        name: 'ISSO',
        role: 'Information System Security Officer',
        organization: 'Mycosoft',
        email: 'isso@mycosoft.com',
      },
      resourcesRequired: {
        estimatedCost: estimateCost(riskLevel),
        fundingStatus: 'TBD',
        laborHours: estimateLaborHours(riskLevel),
        contractorSupport: riskLevel === 'Critical' || riskLevel === 'High',
        toolsRequired: [],
      },
      status: 'Open',
      remediationPlan: control.notes || `Implement ${control.name} to achieve full compliance with ${control.framework} requirements.`,
      comments: `Generated from ${control.framework} assessment. Last audited by ${control.lastAuditBy || 'System'} on ${control.lastAudit || 'N/A'}.`,
      lastUpdated: now.toISOString(),
    };
  });
  
  // Calculate summary
  const summary = calculatePOAMSummary(entries);
  
  return {
    metadata: {
      poamId,
      systemName,
      systemOwner: 'Mycosoft',
      preparedBy: 'Security Operations Center',
      preparedDate: now.toISOString().split('T')[0],
      framework,
      reviewFrequency: 'Monthly',
      lastReview: now.toISOString().split('T')[0],
      nextReview: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    entries,
    summary,
    generatedAt: now.toISOString(),
  };
}

function getRiskLevel(control: ComplianceControl): RiskLevel {
  if (control.status === 'non_compliant') {
    return control.priority === 'high' ? 'Critical' : control.priority === 'medium' ? 'High' : 'Moderate';
  }
  return control.priority === 'high' ? 'High' : control.priority === 'medium' ? 'Moderate' : 'Low';
}

function getTargetDaysFromRisk(riskLevel: RiskLevel): number {
  switch (riskLevel) {
    case 'Critical': return 15;
    case 'High': return 30;
    case 'Moderate': return 90;
    case 'Low': return 180;
  }
}

function generateMilestones(control: ComplianceControl, now: Date, targetDate: Date): Milestone[] {
  const totalDays = Math.floor((targetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  const phaseLength = Math.floor(totalDays / 4);
  
  return [
    {
      id: 'M1',
      sequence: 1,
      description: 'Assess current implementation state and identify gaps',
      targetDate: new Date(now.getTime() + phaseLength * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Pending',
      owner: 'ISSO',
      deliverables: ['Gap analysis document', 'Current state assessment'],
    },
    {
      id: 'M2',
      sequence: 2,
      description: 'Develop remediation implementation plan',
      targetDate: new Date(now.getTime() + phaseLength * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Pending',
      owner: 'ISSO',
      deliverables: ['Implementation plan', 'Resource allocation', 'Timeline'],
    },
    {
      id: 'M3',
      sequence: 3,
      description: 'Execute remediation activities',
      targetDate: new Date(now.getTime() + phaseLength * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Pending',
      owner: 'System Administrator',
      deliverables: ['Configuration changes', 'Policy updates', 'Technical implementation'],
    },
    {
      id: 'M4',
      sequence: 4,
      description: 'Verify and validate control implementation',
      targetDate: targetDate.toISOString().split('T')[0],
      status: 'Pending',
      owner: 'ISSO',
      deliverables: ['Test results', 'Evidence artifacts', 'Closure recommendation'],
    },
  ];
}

function estimateCost(riskLevel: RiskLevel): number {
  switch (riskLevel) {
    case 'Critical': return 50000;
    case 'High': return 25000;
    case 'Moderate': return 10000;
    case 'Low': return 5000;
  }
}

function estimateLaborHours(riskLevel: RiskLevel): number {
  switch (riskLevel) {
    case 'Critical': return 160;
    case 'High': return 80;
    case 'Moderate': return 40;
    case 'Low': return 20;
  }
}

function calculatePOAMSummary(entries: POAMEntry[]): POAMSummary {
  const now = new Date();
  
  return {
    totalEntries: entries.length,
    open: entries.filter(e => e.status === 'Open').length,
    inProgress: entries.filter(e => e.status === 'In Progress').length,
    completed: entries.filter(e => e.status === 'Completed').length,
    delayed: entries.filter(e => e.status === 'Delayed').length,
    riskAccepted: entries.filter(e => e.status === 'Risk Accepted').length,
    bySeverity: {
      critical: entries.filter(e => e.riskLevel === 'Critical').length,
      high: entries.filter(e => e.riskLevel === 'High').length,
      moderate: entries.filter(e => e.riskLevel === 'Moderate').length,
      low: entries.filter(e => e.riskLevel === 'Low').length,
    },
    overdueCount: entries.filter(e => new Date(e.scheduledCompletionDate) < now && e.status !== 'Completed').length,
    averageDaysOpen: entries.length > 0 
      ? Math.round(entries.reduce((sum, e) => {
          const identified = new Date(e.dateIdentified);
          return sum + Math.floor((now.getTime() - identified.getTime()) / (24 * 60 * 60 * 1000));
        }, 0) / entries.length)
      : 0,
    estimatedTotalCost: entries.reduce((sum, e) => sum + e.resourcesRequired.estimatedCost, 0),
  };
}

// ═══════════════════════════════════════════════════════════════
// POA&M EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function exportPOAMToJSON(poam: POAMDocument): string {
  return JSON.stringify(poam, null, 2);
}

export function exportPOAMToCSV(poam: POAMDocument): string {
  const headers = [
    'POA&M Number',
    'Control ID',
    'Control Family',
    'Weakness',
    'Risk Level',
    'Source Identified',
    'Date Identified',
    'Scheduled Completion',
    'Responsible POC',
    'Status',
    'Estimated Cost',
    'Labor Hours',
  ];
  
  const rows = poam.entries.map(e => [
    e.poamNumber,
    e.controlId,
    e.controlFamily,
    e.weakness.replace(/,/g, ';'),
    e.riskLevel,
    e.sourceIdentified,
    e.dateIdentified,
    e.scheduledCompletionDate,
    e.responsiblePOC.name,
    e.status,
    e.resourcesRequired.estimatedCost.toString(),
    e.resourcesRequired.laborHours.toString(),
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function generatePOAMHTML(poam: POAMDocument): string {
  const { metadata, entries, summary } = poam;
  
  const severityColors: Record<RiskLevel, string> = {
    'Critical': '#c53030',
    'High': '#dd6b20',
    'Moderate': '#d69e2e',
    'Low': '#38a169',
  };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>POA&M - ${metadata.systemName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
    h1 { color: #2d3748; border-bottom: 3px solid #e53e3e; padding-bottom: 10px; }
    h2 { color: #4a5568; margin-top: 30px; }
    .header { background: #2d3748; color: white; padding: 20px; margin: -40px -40px 30px -40px; }
    .header h1 { color: white; border-bottom: none; }
    .stats { display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap; }
    .stat { background: #f7fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; min-width: 120px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #718096; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    th { background: #edf2f7; padding: 10px; text-align: left; border: 1px solid #cbd5e0; }
    td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: top; }
    .risk-critical { background: #fed7d7; color: #c53030; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
    .risk-high { background: #feebc8; color: #dd6b20; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
    .risk-moderate { background: #fefcbf; color: #d69e2e; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
    .risk-low { background: #c6f6d5; color: #38a169; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
    .status-open { color: #e53e3e; }
    .status-progress { color: #d69e2e; }
    .status-completed { color: #38a169; }
    .footer { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; color: #718096; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Plan of Action and Milestones (POA&M)</h1>
    <p><strong>${metadata.systemName}</strong> | ${metadata.framework} | POA&M ID: ${metadata.poamId}</p>
    <p>Prepared by: ${metadata.preparedBy} | Date: ${metadata.preparedDate}</p>
  </div>
  
  <h2>Summary</h2>
  <div class="stats">
    <div class="stat">
      <div class="stat-value">${summary.totalEntries}</div>
      <div class="stat-label">Total Entries</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #e53e3e;">${summary.open}</div>
      <div class="stat-label">Open</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #d69e2e;">${summary.inProgress}</div>
      <div class="stat-label">In Progress</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #38a169;">${summary.completed}</div>
      <div class="stat-label">Completed</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #e53e3e;">${summary.overdueCount}</div>
      <div class="stat-label">Overdue</div>
    </div>
    <div class="stat">
      <div class="stat-value">$${(summary.estimatedTotalCost / 1000).toFixed(0)}K</div>
      <div class="stat-label">Est. Cost</div>
    </div>
  </div>
  
  <h3>By Risk Level</h3>
  <div class="stats">
    <div class="stat">
      <div class="stat-value" style="color: ${severityColors.Critical};">${summary.bySeverity.critical}</div>
      <div class="stat-label">Critical</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: ${severityColors.High};">${summary.bySeverity.high}</div>
      <div class="stat-label">High</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: ${severityColors.Moderate};">${summary.bySeverity.moderate}</div>
      <div class="stat-label">Moderate</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: ${severityColors.Low};">${summary.bySeverity.low}</div>
      <div class="stat-label">Low</div>
    </div>
  </div>
  
  <h2>POA&M Entries</h2>
  <table>
    <thead>
      <tr>
        <th>POA&M #</th>
        <th>Control</th>
        <th>Weakness</th>
        <th>Risk</th>
        <th>Identified</th>
        <th>Target Date</th>
        <th>POC</th>
        <th>Status</th>
        <th>Est. Cost</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map(e => `
        <tr>
          <td><strong>${e.poamNumber}</strong></td>
          <td>${e.controlId}</td>
          <td>${e.weakness}</td>
          <td><span class="risk-${e.riskLevel.toLowerCase()}">${e.riskLevel}</span></td>
          <td>${e.dateIdentified}</td>
          <td>${e.scheduledCompletionDate}</td>
          <td>${e.responsiblePOC.name}</td>
          <td class="status-${e.status === 'Open' ? 'open' : e.status === 'In Progress' ? 'progress' : 'completed'}">${e.status}</td>
          <td>$${(e.resourcesRequired.estimatedCost / 1000).toFixed(0)}K</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2>Milestones Detail</h2>
  ${entries.slice(0, 5).map(e => `
    <h3>${e.poamNumber}: ${e.controlId} - ${e.controlName}</h3>
    <p><strong>Remediation Plan:</strong> ${e.remediationPlan}</p>
    <table>
      <thead>
        <tr><th>#</th><th>Milestone</th><th>Target Date</th><th>Owner</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${e.milestones.map(m => `
          <tr>
            <td>${m.sequence}</td>
            <td>${m.description}</td>
            <td>${m.targetDate}</td>
            <td>${m.owner}</td>
            <td>${m.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')}
  ${entries.length > 5 ? `<p><em>... and ${entries.length - 5} more entries. See full report for details.</em></p>` : ''}
  
  <div class="footer">
    <p>Generated by Mycosoft Security Operations Center</p>
    <p>Generated: ${poam.generatedAt} | Review Frequency: ${metadata.reviewFrequency}</p>
    <p>Next Review: ${metadata.nextReview}</p>
  </div>
</body>
</html>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SPRS SCORE CALCULATION (for CMMC/NIST 800-171)
// ═══════════════════════════════════════════════════════════════

export interface SPRSScore {
  score: number;
  maxScore: number;
  controlsAssessed: number;
  implemented: number;
  partial: number;
  notImplemented: number;
  notApplicable: number;
  breakdown: {
    family: string;
    implemented: number;
    total: number;
    points: number;
  }[];
}

export function calculateSPRSScore(controls: ComplianceControl[]): SPRSScore {
  // SPRS scoring: Start with 110, subtract points for non-compliant controls
  // Critical: -5, High: -3, Medium: -1
  const nist171Controls = controls.filter(c => c.framework === 'NIST-800-171' || c.framework === 'CMMC-L2');
  
  let score = 110;
  const breakdown: Map<string, { implemented: number; total: number; points: number }> = new Map();
  
  nist171Controls.forEach(c => {
    const family = c.family;
    const current = breakdown.get(family) || { implemented: 0, total: 0, points: 0 };
    current.total++;
    
    if (c.status === 'compliant') {
      current.implemented++;
    } else if (c.status === 'partial') {
      const deduction = c.priority === 'high' ? 3 : c.priority === 'medium' ? 1 : 0.5;
      score -= deduction;
      current.points -= deduction;
    } else if (c.status === 'non_compliant') {
      const deduction = c.priority === 'high' ? 5 : c.priority === 'medium' ? 3 : 1;
      score -= deduction;
      current.points -= deduction;
    }
    
    breakdown.set(family, current);
  });
  
  return {
    score: Math.max(Math.round(score), -203), // SPRS can go as low as -203
    maxScore: 110,
    controlsAssessed: nist171Controls.length,
    implemented: nist171Controls.filter(c => c.status === 'compliant').length,
    partial: nist171Controls.filter(c => c.status === 'partial').length,
    notImplemented: nist171Controls.filter(c => c.status === 'non_compliant').length,
    notApplicable: nist171Controls.filter(c => c.status === 'not_applicable').length,
    breakdown: Array.from(breakdown.entries()).map(([family, data]) => ({
      family,
      ...data,
    })),
  };
}
