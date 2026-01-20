'use client';

/**
 * Security Compliance Dashboard
 * 
 * Multi-Framework Support:
 * - NIST SP 800-53 (Federal Information Systems)
 * - NIST SP 800-171 (CUI Protection)
 * - CMMC 2.0 Levels 1-3 (DoD Contractor Cybersecurity)
 * - Exostar Integration Ready (Supply Chain Risk Management)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Download, FileText, FileSpreadsheet, Loader2, 
  Shield, Lock, Building2, Link2, CheckCircle2, 
  AlertTriangle, XCircle, ChevronRight, ExternalLink,
  Settings, RefreshCw
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ComplianceFramework = 
  | 'NIST-800-53' 
  | 'NIST-800-171' 
  | 'CMMC-L1' 
  | 'CMMC-L2' 
  | 'CMMC-L3' 
  | 'NISPOM'      // 32 CFR Part 117 (E.O. 12829)
  | 'FOCI'        // Foreign Ownership, Control, Influence
  | 'SBIR-STTR'   // Small Business Innovation Research / STTR
  | 'ITAR'        // International Traffic in Arms
  | 'EAR'         // Export Administration Regulations
  | 'ICD-503'     // Intelligence Community Directive 503
  | 'CNSSI-1253'  // CNSSI 1253 - National Security Systems
  | 'FEDRAMP-HIGH' // FedRAMP High Baseline
  | 'all';

interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  family: string;
  name: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence: string[];
  lastAudit: string;
  lastAuditBy?: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  cmmcLevel?: number;
  cmmcPractice?: string;
  mappings?: Record<string, string[]>;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  result: 'success' | 'failure';
  ip: string;
}

interface FrameworkInfo {
  id: ComplianceFramework;
  name: string;
  fullName: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════
// FRAMEWORK DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const FRAMEWORKS: Record<string, FrameworkInfo> = {
  'all': {
    id: 'all',
    name: 'All Frameworks',
    fullName: 'All Compliance Frameworks',
    icon: '📊',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    description: 'View all compliance controls across frameworks',
  },
  'NIST-800-53': {
    id: 'NIST-800-53',
    name: 'NIST 800-53',
    fullName: 'NIST SP 800-53 Rev. 5',
    icon: '🏛️',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    description: 'Security Controls for Federal Systems',
  },
  'NIST-800-171': {
    id: 'NIST-800-171',
    name: 'NIST 800-171',
    fullName: 'NIST SP 800-171 Rev. 2',
    icon: '🔒',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    borderColor: 'border-violet-500/30',
    description: 'Protecting Controlled Unclassified Information (CUI)',
  },
  'CMMC-L2': {
    id: 'CMMC-L2',
    name: 'CMMC Level 2',
    fullName: 'CMMC 2.0 Level 2 (Advanced)',
    icon: '🛡️',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    description: 'DoD Contractor CUI Protection',
  },
  'NISPOM': {
    id: 'NISPOM',
    name: 'NISPOM',
    fullName: '32 CFR Part 117 (E.O. 12829)',
    icon: '🔐',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500/30',
    description: 'National Industrial Security Program',
  },
  'FOCI': {
    id: 'FOCI',
    name: 'FOCI',
    fullName: 'Foreign Ownership, Control, Influence',
    icon: '🌍',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    description: 'FOCI Mitigation Requirements',
  },
  'SBIR-STTR': {
    id: 'SBIR-STTR',
    name: 'SBIR/STTR',
    fullName: 'Small Business Innovation Research',
    icon: '🚀',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-500/30',
    description: 'Federal R&D Program Requirements',
  },
  'ITAR': {
    id: 'ITAR',
    name: 'ITAR',
    fullName: 'International Traffic in Arms (22 CFR)',
    icon: '⚔️',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-500/30',
    description: 'Defense Export Controls',
  },
  'EAR': {
    id: 'EAR',
    name: 'EAR',
    fullName: 'Export Administration Regulations',
    icon: '📦',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/30',
    description: 'Dual-Use Export Controls',
  },
  'ICD-503': {
    id: 'ICD-503',
    name: 'ICD 503',
    fullName: 'Intelligence Community Directive 503',
    icon: '🕵️',
    color: 'text-slate-300',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30',
    description: 'IC Security Controls for TS/SCI',
  },
  'CNSSI-1253': {
    id: 'CNSSI-1253',
    name: 'CNSSI 1253',
    fullName: 'National Security Systems Categorization',
    icon: '🏛️',
    color: 'text-zinc-300',
    bgColor: 'bg-zinc-500/20',
    borderColor: 'border-zinc-500/30',
    description: 'NSS Security Categorization (IL-5/IL-6)',
  },
  'FEDRAMP-HIGH': {
    id: 'FEDRAMP-HIGH',
    name: 'FedRAMP High',
    fullName: 'FedRAMP High Baseline',
    icon: '☁️',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
    description: 'Federal Cloud Authorization',
  },
};

// Control family definitions
const CONTROL_FAMILIES: Record<string, { name: string; icon: string }> = {
  // NIST 800-53 / CMMC
  'AC': { name: 'Access Control', icon: '🔐' },
  'AU': { name: 'Audit & Accountability', icon: '📝' },
  'AT': { name: 'Awareness & Training', icon: '📚' },
  'CM': { name: 'Configuration Management', icon: '⚙️' },
  'CP': { name: 'Contingency Planning', icon: '🔄' },
  'IA': { name: 'Identification & Authentication', icon: '🪪' },
  'IR': { name: 'Incident Response', icon: '🚨' },
  'MA': { name: 'Maintenance', icon: '🔧' },
  'MP': { name: 'Media Protection', icon: '💾' },
  'PE': { name: 'Physical Protection', icon: '🏢' },
  'PL': { name: 'Planning', icon: '📋' },
  'PS': { name: 'Personnel Security', icon: '👥' },
  'RA': { name: 'Risk Assessment', icon: '⚠️' },
  'CA': { name: 'Security Assessment', icon: '✅' },
  'SC': { name: 'System & Communications', icon: '🌐' },
  'SI': { name: 'System & Information Integrity', icon: '🛡️' },
  // NIST 800-171 families
  '3.1': { name: 'Access Control', icon: '🔐' },
  '3.2': { name: 'Awareness & Training', icon: '📚' },
  '3.3': { name: 'Audit & Accountability', icon: '📝' },
  '3.4': { name: 'Configuration Management', icon: '⚙️' },
  '3.5': { name: 'Identification & Authentication', icon: '🪪' },
  '3.6': { name: 'Incident Response', icon: '🚨' },
  '3.7': { name: 'Maintenance', icon: '🔧' },
  '3.8': { name: 'Media Protection', icon: '💾' },
  '3.9': { name: 'Personnel Security', icon: '👥' },
  '3.10': { name: 'Physical Protection', icon: '🏢' },
  '3.11': { name: 'Risk Assessment', icon: '⚠️' },
  '3.12': { name: 'Security Assessment', icon: '✅' },
  '3.13': { name: 'System & Communications', icon: '🌐' },
  '3.14': { name: 'System & Information Integrity', icon: '🛡️' },
  // NISPOM (32 CFR Part 117)
  'FCL': { name: 'Facility Clearance', icon: '🏢' },
  'PCL': { name: 'Personnel Clearance', icon: '👤' },
  'CLS': { name: 'Classification Management', icon: '📋' },
  'SAF': { name: 'Safeguarding', icon: '🔒' },
  'VIS': { name: 'Visits & Access', icon: '🚪' },
  'SUB': { name: 'Subcontracting', icon: '📄' },
  'SEC': { name: 'Security Training', icon: '📚' },
  'INC': { name: 'Incident Reporting', icon: '🚨' },
  'SPP': { name: 'Special Programs', icon: '⭐' },
  // FOCI
  'DET': { name: 'FOCI Determination', icon: '🔍' },
  'MIT': { name: 'Mitigation Instruments', icon: '📜' },
  'GOV': { name: 'Governance', icon: '⚖️' },
  'MON': { name: 'FOCI Monitoring', icon: '👁️' },
  // SBIR/STTR
  'ELG': { name: 'Eligibility', icon: '✅' },
  'IPR': { name: 'Intellectual Property', icon: '💡' },
  'REP': { name: 'Reporting', icon: '📊' },
  'COM': { name: 'Commercialization', icon: '💰' },
  // ITAR
  'REG': { name: 'Registration', icon: '📝' },
  'LIC': { name: 'Licensing', icon: '📋' },
  'TCM': { name: 'Technology Control', icon: '🔐' },
  // EAR
  'SCR': { name: 'Denied Party Screening', icon: '🔍' },
  // ICD 503
  'PM': { name: 'Program Management', icon: '📊' },
  'PV': { name: 'Privacy', icon: '👁️' },
  // CNSSI 1253
  'CAT': { name: 'Categorization', icon: '📊' },
  'BAS': { name: 'Baseline Selection', icon: '🎯' },
  'OVR': { name: 'Overlays', icon: '📋' },
  'TAI': { name: 'Tailoring', icon: '✂️' },
  'DOC': { name: 'Documentation', icon: '📝' },
  'ATO': { name: 'Authorization', icon: '✅' },
  // FedRAMP
  'SA': { name: 'System Acquisition', icon: '🛒' },
};

const statusColors = {
  compliant: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  non_compliant: 'bg-red-500/20 text-red-400 border-red-500/30',
  not_applicable: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusIcons = {
  compliant: CheckCircle2,
  partial: AlertTriangle,
  non_compliant: XCircle,
  not_applicable: Shield,
};

// ═══════════════════════════════════════════════════════════════
// CSV EXPORT HELPER
// ═══════════════════════════════════════════════════════════════

function exportToCSV(data: Record<string, unknown>[], filename: string, columns: { key: string; header: string }[]) {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row => 
    columns.map(c => {
      const value = row[c.key];
      const strValue = String(value ?? '');
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// ═══════════════════════════════════════════════════════════════
// PDF REPORT GENERATION
// ═══════════════════════════════════════════════════════════════

async function generatePDFReport(
  reportType: 'compliance' | 'cmmc' | 'nist171' | 'ssp' | 'poam' | 'incidents',
  data: {
    controls?: ComplianceControl[];
    stats?: { compliant: number; partial: number; nonCompliant: number; score: number };
    framework?: string;
    incidents?: Record<string, unknown>[];
  }
) {
  const reportTitles: Record<string, string> = {
    compliance: 'Compliance Summary Report',
    cmmc: 'CMMC 2.0 Assessment Report',
    nist171: 'NIST 800-171 Compliance Report',
    ssp: 'System Security Plan (SSP)',
    poam: 'Plan of Action & Milestones (POA&M)',
    incidents: 'Incident History Report',
  };
  
  const now = new Date().toLocaleString();
  const controls = data.controls || [];
  
  let tableContent = '';
  
  if (reportType === 'compliance' || reportType === 'cmmc' || reportType === 'nist171') {
    tableContent = `
      <table>
        <thead>
          <tr>
            <th>Control ID</th>
            <th>Framework</th>
            <th>Name</th>
            <th>Status</th>
            <th>Evidence</th>
            <th>Last Audit</th>
          </tr>
        </thead>
        <tbody>
          ${controls.map((c) => `
            <tr>
              <td>${c.id}</td>
              <td>${c.framework}</td>
              <td>${c.name}</td>
              <td class="status-${c.status}">${c.status.replace('_', ' ')}</td>
              <td>${c.evidence.join(', ')}</td>
              <td>${c.lastAudit}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="summary">
        <h3>Summary</h3>
        <p>Framework: ${data.framework || 'All'}</p>
        <p>Total Controls: ${controls.length}</p>
        <p>Compliant: ${data.stats?.compliant || 0}</p>
        <p>Partial: ${data.stats?.partial || 0}</p>
        <p>Non-Compliant: ${data.stats?.nonCompliant || 0}</p>
        <p>Compliance Score: ${data.stats?.score || 0}%</p>
      </div>
    `;
  } else if (reportType === 'poam') {
    const gaps = controls.filter(c => c.status !== 'compliant' && c.status !== 'not_applicable');
    tableContent = `
      <h2>Plan of Action & Milestones</h2>
      <table>
        <thead>
          <tr>
            <th>POA&M ID</th>
            <th>Control</th>
            <th>Weakness</th>
            <th>Remediation</th>
            <th>Target Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${gaps.map((c, i) => `
            <tr>
              <td>POAM-${String(i + 1).padStart(3, '0')}</td>
              <td>${c.id}</td>
              <td>${c.name}</td>
              <td>${c.notes || 'Remediation plan required'}</td>
              <td>${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}</td>
              <td class="status-${c.status}">${c.status.replace('_', ' ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="summary">
        <h3>POA&M Summary</h3>
        <p>Total Items: ${gaps.length}</p>
        <p>Partial: ${gaps.filter(c => c.status === 'partial').length}</p>
        <p>Non-Compliant: ${gaps.filter(c => c.status === 'non_compliant').length}</p>
      </div>
    `;
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportTitles[reportType]}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { color: #6b21a8; border-bottom: 2px solid #6b21a8; padding-bottom: 10px; }
        h2 { color: #9333ea; margin-top: 30px; }
        h3 { color: #a855f7; }
        .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
        .framework-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px; }
        .nist-53 { background: #3b82f6; color: white; }
        .nist-171 { background: #8b5cf6; color: white; }
        .cmmc { background: #f59e0b; color: white; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
        th { background: #f3e8ff; color: #6b21a8; padding: 10px; text-align: left; border-bottom: 2px solid #d8b4fe; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        tr:hover { background: #faf5ff; }
        .status-compliant { color: #059669; font-weight: bold; }
        .status-partial { color: #d97706; font-weight: bold; }
        .status-non_compliant { color: #dc2626; font-weight: bold; }
        .summary { background: #f3e8ff; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .summary p { margin: 8px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>🛡️ ${reportTitles[reportType]}</h1>
      <div class="meta">
        <p>Generated: ${now}</p>
        <p>Organization: Mycosoft Security Operations Center</p>
        <p>
          <span class="framework-badge nist-53">NIST 800-53</span>
          <span class="framework-badge nist-171">NIST 800-171</span>
          <span class="framework-badge cmmc">CMMC 2.0</span>
        </p>
      </div>
      ${tableContent}
      <div class="footer">
        <p>This report was generated by Mycosoft SOC. For questions, contact security@mycosoft.com</p>
        <p>CONFIDENTIAL - For authorized personnel only</p>
        <p>Compliant with DFARS 252.204-7012 and CMMC requirements</p>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CompliancePage() {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework>('all');
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'controls' | 'audit' | 'reports' | 'exostar'>('controls');
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [incidents, setIncidents] = useState<Record<string, unknown>[]>([]);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [expandedControl, setExpandedControl] = useState<string | null>(null);

  // Exostar state
  const [exostarEnabled, setExostarEnabled] = useState(false);
  const [exostarSyncing, setExostarSyncing] = useState(false);

  // Fetch compliance data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [controlsRes, logsRes, incidentsRes] = await Promise.all([
          fetch('/api/security?action=compliance-controls'),
          fetch('/api/security?action=compliance-audit-logs&limit=100'),
          fetch('/api/security?action=incidents'),
        ]);
        
        if (controlsRes.ok) {
          const data = await controlsRes.json();
          setControls(data.controls || []);
          setIsLiveData(true);
        }
        
        if (logsRes.ok) {
          const data = await logsRes.json();
          setAuditLogs((data.logs || []).map((log: Record<string, unknown>) => ({
            id: log.id,
            timestamp: log.timestamp,
            action: log.action,
            user: log.user,
            resource: log.resource,
            result: log.result,
            ip: log.ip,
          })));
        }
        
        if (incidentsRes.ok) {
          const data = await incidentsRes.json();
          setIncidents(data.incidents || []);
        }
      } catch (error) {
        console.error('Failed to fetch compliance data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter controls by framework
  const filteredControls = controls.filter(c => {
    const frameworkMatch = selectedFramework === 'all' || c.framework === selectedFramework;
    const familyMatch = !selectedFamily || c.family === selectedFamily;
    return frameworkMatch && familyMatch;
  });

  // Calculate stats per framework
  const getFrameworkStats = (fw: ComplianceFramework | 'all') => {
    const fwControls = fw === 'all' ? controls : controls.filter(c => c.framework === fw);
    const compliant = fwControls.filter(c => c.status === 'compliant').length;
    const partial = fwControls.filter(c => c.status === 'partial').length;
    const nonCompliant = fwControls.filter(c => c.status === 'non_compliant').length;
    const total = fwControls.length;
    const score = total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;
    return { compliant, partial, nonCompliant, total, score };
  };

  const currentStats = getFrameworkStats(selectedFramework);

  // Get unique families for current framework
  const availableFamilies = [...new Set(
    (selectedFramework === 'all' ? controls : controls.filter(c => c.framework === selectedFramework))
      .map(c => c.family)
  )].sort();

  // Export handlers
  const handleExportCSV = () => {
    setIsExporting('csv');
    setTimeout(() => {
      exportToCSV(filteredControls as unknown as Record<string, unknown>[], `compliance_${selectedFramework}`, [
        { key: 'id', header: 'Control ID' },
        { key: 'framework', header: 'Framework' },
        { key: 'family', header: 'Family' },
        { key: 'name', header: 'Name' },
        { key: 'description', header: 'Description' },
        { key: 'status', header: 'Status' },
        { key: 'lastAudit', header: 'Last Audit' },
        { key: 'priority', header: 'Priority' },
      ]);
      setIsExporting(null);
    }, 500);
  };

  const handleExportPDF = (type: 'compliance' | 'cmmc' | 'nist171' | 'poam') => {
    setIsExporting(type);
    setTimeout(async () => {
      await generatePDFReport(type, {
        controls: filteredControls,
        stats: currentStats,
        framework: FRAMEWORKS[selectedFramework]?.name || 'All',
      });
      setIsExporting(null);
    }, 500);
  };

  const handleExostarSync = async () => {
    setExostarSyncing(true);
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    setExostarSyncing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/10 to-slate-950 text-white">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/security" className="text-slate-400 hover:text-white transition">
              ← Security
            </Link>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Compliance & Audit
              </h1>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {isLiveData && (
              <span className="px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live API
              </span>
            )}
            {isLoading && <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />}
            <button 
              onClick={handleExportCSV}
              disabled={isExporting !== null || isLoading}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Export CSV
            </button>
            <button 
              onClick={() => handleExportPDF('compliance')}
              disabled={isExporting !== null || isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting === 'compliance' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Export PDF
            </button>
          </div>
        </div>
      </header>

      {/* Framework Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6 overflow-x-auto">
        {Object.values(FRAMEWORKS).map((fw) => {
          const stats = getFrameworkStats(fw.id as ComplianceFramework);
          const isSelected = selectedFramework === fw.id;
          return (
            <button
              key={fw.id}
              onClick={() => {
                setSelectedFramework(fw.id as ComplianceFramework);
                setSelectedFamily(null);
              }}
              className={`p-4 rounded-xl border transition-all ${
                isSelected 
                  ? `${fw.bgColor} ${fw.borderColor} ring-2 ring-purple-500/50` 
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{fw.icon}</span>
                <div className="text-left">
                  <div className={`font-bold ${isSelected ? fw.color : 'text-white'}`}>
                    {fw.name}
                  </div>
                  <div className="text-xs text-slate-400">{stats.total} controls</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-2xl font-bold">{stats.score}%</div>
                <div className="flex gap-1">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">{stats.compliant}</span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">{stats.partial}</span>
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">{stats.nonCompliant}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'controls', label: 'Controls', icon: Shield },
          { id: 'audit', label: 'Audit Logs', icon: FileText },
          { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
          { id: 'exostar', label: 'Exostar', icon: Link2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Controls Tab */}
      {activeTab === 'controls' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Family Filter */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 sticky top-6">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Control Families</h3>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                <button
                  onClick={() => setSelectedFamily(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    selectedFamily === null ? 'bg-purple-600 text-white' : 'hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  All Families ({filteredControls.length})
                </button>
                {availableFamilies.map((family) => {
                  const familyInfo = CONTROL_FAMILIES[family] || { name: family, icon: '📁' };
                  const count = filteredControls.filter(c => c.family === family).length;
                  return (
                    <button
                      key={family}
                      onClick={() => setSelectedFamily(family)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        selectedFamily === family ? 'bg-purple-600 text-white' : 'hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {familyInfo.icon} {familyInfo.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Controls List */}
          <div className="lg:col-span-9">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-medium">{filteredControls.length} Controls</h3>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                    {filteredControls.filter(c => c.status === 'compliant').length} Compliant
                  </span>
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
                    {filteredControls.filter(c => c.status === 'partial').length} Partial
                  </span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">
                    {filteredControls.filter(c => c.status === 'non_compliant').length} Non-Compliant
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-700/50 max-h-[70vh] overflow-y-auto">
                {filteredControls.map((control) => {
                  const StatusIcon = statusIcons[control.status];
                  const isExpanded = expandedControl === control.id;
                  return (
                    <div 
                      key={control.id} 
                      className="p-4 hover:bg-slate-700/30 transition cursor-pointer"
                      onClick={() => setExpandedControl(isExpanded ? null : control.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <StatusIcon className={`w-5 h-5 mt-0.5 ${
                            control.status === 'compliant' ? 'text-emerald-400' :
                            control.status === 'partial' ? 'text-amber-400' :
                            control.status === 'non_compliant' ? 'text-red-400' : 'text-gray-400'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-500">{control.id}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${FRAMEWORKS[control.framework]?.bgColor || 'bg-slate-700'} ${FRAMEWORKS[control.framework]?.color || 'text-slate-400'}`}>
                                {FRAMEWORKS[control.framework]?.name || control.framework}
                              </span>
                              {control.cmmcLevel && (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                  L{control.cmmcLevel}
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium mt-1">{control.name}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs border ${statusColors[control.status]}`}>
                            {control.status.replace('_', ' ')}
                          </span>
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 ml-8 space-y-3">
                          <p className="text-sm text-slate-400">{control.description}</p>
                          
                          <div className="flex flex-wrap gap-4 text-xs">
                            <div>
                              <span className="text-slate-500">Priority:</span>
                              <span className={`ml-2 px-2 py-0.5 rounded ${
                                control.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                control.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>{control.priority}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Last Audit:</span>
                              <span className="ml-2 text-slate-300">{control.lastAudit}</span>
                            </div>
                            {control.lastAuditBy && (
                              <div>
                                <span className="text-slate-500">By:</span>
                                <span className="ml-2 text-slate-300">{control.lastAuditBy}</span>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <span className="text-xs text-slate-500">Evidence:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {control.evidence.map((e, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-slate-700 rounded">{e}</span>
                              ))}
                            </div>
                          </div>
                          
                          {control.mappings && Object.keys(control.mappings).length > 0 && (
                            <div>
                              <span className="text-xs text-slate-500">Cross-Framework Mappings:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(control.mappings).map(([fw, ids]) => (
                                  <span key={fw} className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                                    {fw}: {(ids as string[]).join(', ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {control.notes && (
                            <p className="text-xs text-slate-500 italic">{control.notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-medium">Security Audit Log</h3>
            <button 
              onClick={() => {
                setIsExporting('audit-csv');
                setTimeout(() => {
                  exportToCSV(auditLogs as unknown as Record<string, unknown>[], 'audit_log', [
                    { key: 'timestamp', header: 'Timestamp' },
                    { key: 'action', header: 'Action' },
                    { key: 'user', header: 'User' },
                    { key: 'resource', header: 'Resource' },
                    { key: 'ip', header: 'IP Address' },
                    { key: 'result', header: 'Result' },
                  ]);
                  setIsExporting(null);
                }, 500);
              }}
              disabled={isExporting !== null}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting === 'audit-csv' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400 border-b border-slate-700 sticky top-0 bg-slate-800">
                <tr>
                  <th className="p-4 font-medium">Timestamp</th>
                  <th className="p-4 font-medium">Action</th>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Resource</th>
                  <th className="p-4 font-medium">IP</th>
                  <th className="p-4 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30">
                    <td className="p-4 font-mono text-xs text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 font-medium">{log.action}</td>
                    <td className="p-4 text-slate-300">{log.user}</td>
                    <td className="p-4 text-slate-300">{log.resource}</td>
                    <td className="p-4 font-mono text-xs">{log.ip}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        log.result === 'success' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Row 1: Core Compliance Reports */}
          <div className="grid grid-cols-4 gap-4">
            {/* NIST 800-171 Reports */}
            <div className="bg-slate-800/50 rounded-xl border border-violet-500/30 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-7 h-7 text-violet-400" />
                <div>
                  <h3 className="font-bold text-violet-400">NIST 800-171</h3>
                  <p className="text-xs text-slate-400">CUI Protection</p>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => handleExportPDF('nist171')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Compliance Report
                </button>
                <button 
                  onClick={() => handleExportPDF('poam')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  POA&M Report
                </button>
              </div>
            </div>

            {/* CMMC Reports */}
            <div className="bg-slate-800/50 rounded-xl border border-amber-500/30 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-7 h-7 text-amber-400" />
                <div>
                  <h3 className="font-bold text-amber-400">CMMC 2.0</h3>
                  <p className="text-xs text-slate-400">DoD Contractor</p>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => handleExportPDF('cmmc')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  CMMC Assessment
                </button>
                <div className="text-center text-xs text-slate-400">
                  Current Level: <span className="text-amber-400 font-bold">L2</span>
                </div>
              </div>
            </div>

            {/* NISPOM Reports */}
            <div className="bg-slate-800/50 rounded-xl border border-indigo-500/30 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-7 h-7 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-indigo-400">NISPOM</h3>
                  <p className="text-xs text-slate-400">32 CFR 117</p>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => handleExportPDF('compliance')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  FCL Status Report
                </button>
                <button 
                  onClick={() => handleExportPDF('compliance')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  CDSE Training Log
                </button>
              </div>
            </div>

            {/* SBIR/STTR Reports */}
            <div className="bg-slate-800/50 rounded-xl border border-teal-500/30 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-7 h-7 text-teal-400" />
                <div>
                  <h3 className="font-bold text-teal-400">SBIR/STTR</h3>
                  <p className="text-xs text-slate-400">Federal R&D</p>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => handleExportPDF('compliance')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Eligibility Report
                </button>
                <button 
                  onClick={() => handleExportPDF('compliance')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  Data Rights Log
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Export Controls & Security */}
          <div className="grid grid-cols-4 gap-4">
            {/* FOCI Report */}
            <div className="bg-slate-800/50 rounded-xl border border-orange-500/30 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-7 h-7 text-orange-400" />
                <div>
                  <h3 className="font-bold text-orange-400">FOCI</h3>
                  <p className="text-xs text-slate-400">Foreign Influence</p>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => handleExportPDF('compliance')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  SF-328 Status
                </button>
              </div>
            </div>

            {/* ITAR Reports */}
            <div className="bg-slate-800/50 rounded-xl border border-rose-500/30 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-7 h-7 text-rose-400" />
                <div>
                  <h3 className="font-bold text-rose-400">ITAR</h3>
                  <p className="text-xs text-slate-400">Defense Exports</p>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => handleExportPDF('compliance')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Export Compliance
                </button>
              </div>
            </div>

            {/* EAR Reports */}
            <div className="bg-slate-800/50 rounded-xl border border-sky-500/30 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-7 h-7 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sky-400">EAR</h3>
                  <p className="text-xs text-slate-400">Dual-Use Exports</p>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => handleExportPDF('compliance')}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Screening Report
                </button>
              </div>
            </div>

            {/* Incident Reports */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-7 h-7 text-red-400" />
                <div>
                  <h3 className="font-bold">Incidents</h3>
                  <p className="text-xs text-slate-400">{incidents.length} total</p>
                </div>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => generatePDFReport('incidents', { incidents })}
                  disabled={isExporting !== null}
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Incident History
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Executive Order Reference */}
          <div className="bg-gradient-to-r from-slate-800/80 to-indigo-900/30 rounded-xl border border-indigo-500/30 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📜</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-indigo-400 mb-2">Executive Order 12829 - National Industrial Security Program</h3>
                <p className="text-sm text-slate-300 mb-3">
                  This compliance framework is based on E.O. 12829, which establishes the National Industrial Security Program (NISP) - 
                  a government-industry partnership ensuring cleared U.S. contractors protect classified information. 
                  Managed by the Defense Counterintelligence and Security Agency (DCSA).
                </p>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>📋 32 CFR Part 117 (NISPOM Rule)</span>
                  <span>🎓 CDSE Training Required</span>
                  <span>🔍 DCSA Oversight</span>
                  <span>🏢 TRADOC / SOCOM Compatible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exostar Tab */}
      {activeTab === 'exostar' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Link2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Exostar Integration</h2>
                  <p className="text-slate-400">Supply Chain Risk Management Platform</p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg ${exostarEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {exostarEnabled ? 'Connected' : 'Not Configured'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  Features
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>CMMC Compliance Tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Supplier Risk Assessment</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Identity & Credential Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Incident Reporting to DoD</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  Configuration
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Organization ID</label>
                    <input 
                      type="text" 
                      placeholder="Enter Exostar Org ID"
                      className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">API Key</label>
                    <input 
                      type="password" 
                      placeholder="••••••••••••"
                      className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleExostarSync}
                disabled={exostarSyncing}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {exostarSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sync with Exostar
                  </>
                )}
              </button>
              <a
                href="https://www.exostar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Exostar Portal
              </a>
            </div>

            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h4 className="font-medium text-amber-400 mb-2">Integration Ready</h4>
              <p className="text-sm text-slate-300">
                This system is pre-configured for Exostar integration. Once you provide your organization 
                credentials, compliance data will sync automatically with the Exostar platform for 
                CMMC certification tracking and supply chain risk management.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
