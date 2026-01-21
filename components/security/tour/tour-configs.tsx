'use client'

import { 
  Shield, 
  Activity, 
  Network, 
  AlertTriangle, 
  Target, 
  FileCheck, 
  FileText,
  Settings,
  Download,
  Eye,
  Zap,
  BarChart3,
  Users,
  BookOpen,
  ExternalLink,
  RefreshCw,
  Upload,
  Layers,
  Lock,
  Bell,
  Search,
  Filter
} from 'lucide-react'
import type { TourStep } from './security-tour'

// SOC Dashboard Tour
export const socDashboardTour: TourStep[] = [
  {
    target: '[data-tour="soc-header"]',
    title: 'Security Operations Center',
    content: 'Welcome to the SOC Dashboard - your central hub for security monitoring, compliance tracking, and incident management.',
    placement: 'bottom',
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    route: '/security'
  },
  {
    target: '[data-tour="threat-status"]',
    title: 'Threat Level Status',
    content: 'This indicator shows the current threat level based on active incidents and security alerts. It updates in real-time.',
    placement: 'bottom',
    icon: <Activity className="w-5 h-5 text-red-400" />
  },
  {
    target: '[data-tour="metrics-panel"]',
    title: 'Security Metrics',
    content: 'Quick overview of active threats, network health, compliance score, and recent alerts. Click any metric for details.',
    placement: 'top',
    icon: <BarChart3 className="w-5 h-5 text-blue-400" />
  },
  {
    target: '[data-tour="nav-network"]',
    title: 'Network Monitor',
    content: 'View your network topology, connected devices, and traffic statistics. Integrates with UniFi for real-time data.',
    placement: 'bottom',
    icon: <Network className="w-5 h-5 text-cyan-400" />
  },
  {
    target: '[data-tour="nav-incidents"]',
    title: 'Incidents',
    content: 'Click here to view and manage security incidents. Track, investigate, and resolve security events with full audit trails.',
    placement: 'bottom',
    icon: <AlertTriangle className="w-5 h-5 text-orange-400" />
  },
  {
    target: '[data-tour="nav-redteam"]',
    title: 'Red Team Operations',
    content: 'Access attack surface visualization, vulnerability scanning, and penetration testing tools.',
    placement: 'bottom',
    icon: <Target className="w-5 h-5 text-red-400" />
  },
  {
    target: '[data-tour="nav-compliance"]',
    title: 'Compliance & Audit',
    content: 'Manage compliance across 11 frameworks including NIST 800-53, CMMC, NISPOM, and more. Generate reports and track controls.',
    placement: 'bottom',
    icon: <FileCheck className="w-5 h-5 text-purple-400" />
  }
]

// Network Monitor Tour
export const networkMonitorTour: TourStep[] = [
  {
    target: '[data-tour="network-header"]',
    title: 'Network Monitor',
    content: 'Monitor your entire network infrastructure in real-time. View devices, traffic, and security status.',
    placement: 'bottom',
    icon: <Network className="w-5 h-5 text-cyan-400" />,
    route: '/security/network'
  },
  {
    target: '[data-tour="network-tabs"]',
    title: 'Navigation Tabs',
    content: 'Switch between different views: Overview, Devices, Clients, Traffic, and Topology.',
    placement: 'bottom',
    icon: <Layers className="w-5 h-5 text-slate-400" />
  },
  {
    target: '[data-tour="device-list"]',
    title: 'Connected Devices',
    content: 'List of all network devices with real-time status, IP addresses, and traffic statistics.',
    placement: 'top',
    icon: <Settings className="w-5 h-5 text-slate-400" />,
    tabSelector: '[data-tour="network-tab-devices"]'
  },
  {
    target: '[data-tour="clients-list"]',
    title: 'Network Clients',
    content: 'View all connected clients with their connection type, signal strength, and data usage.',
    placement: 'top',
    icon: <Users className="w-5 h-5 text-purple-400" />,
    tabSelector: '[data-tour="network-tab-clients"]'
  },
  {
    target: '[data-tour="topology-view"]',
    title: 'Network Topology',
    content: 'Interactive visualization of your network. Click on nodes to see device details, traffic, and status.',
    placement: 'top',
    icon: <Layers className="w-5 h-5 text-blue-400" />,
    tabSelector: '[data-tour="network-tab-topology"]'
  }
]

// Incidents Tour
export const incidentsTour: TourStep[] = [
  {
    target: '[data-tour="incidents-header"]',
    title: 'Security Incidents',
    content: 'Track and manage all security incidents from detection to resolution. Full audit trail included.',
    placement: 'bottom',
    icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
    route: '/security/incidents'
  },
  {
    target: '[data-tour="create-incident"]',
    title: 'Create New Incident',
    content: 'Report a new security incident. Fill in details, assign severity, and start the investigation workflow.',
    placement: 'bottom',
    icon: <Zap className="w-5 h-5 text-yellow-400" />
  },
  {
    target: '[data-tour="incident-filters"]',
    title: 'Filter Incidents',
    content: 'Filter incidents by status, severity, date, or assignee to focus on what matters most.',
    placement: 'bottom',
    icon: <Filter className="w-5 h-5 text-slate-400" />
  },
  {
    target: '[data-tour="incident-list"]',
    title: 'Incident List',
    content: 'All tracked incidents with status indicators. Click any incident to view details, timeline, and take action.',
    placement: 'top',
    icon: <FileText className="w-5 h-5 text-slate-400" />
  }
]

// Red Team Tour
export const redTeamTour: TourStep[] = [
  {
    target: '[data-tour="redteam-header"]',
    title: 'Red Team Operations',
    content: 'Offensive security tools for vulnerability assessment and attack surface analysis.',
    placement: 'bottom',
    icon: <Target className="w-5 h-5 text-red-400" />,
    route: '/security/redteam'
  },
  {
    target: '[data-tour="attack-surface"]',
    title: 'Attack Surface Map',
    content: 'Visual representation of your attack surface organized by network layer. Identify high-risk assets quickly.',
    placement: 'right',
    icon: <Layers className="w-5 h-5 text-red-400" />
  },
  {
    target: '[data-tour="scan-controls"]',
    title: 'Vulnerability Scanning',
    content: 'Launch port scans, service enumeration, or full vulnerability assessments against selected targets.',
    placement: 'left',
    icon: <Search className="w-5 h-5 text-yellow-400" />
  },
  {
    target: '[data-tour="scan-scheduler"]',
    title: 'Scan Scheduler',
    content: 'Schedule recurring security scans. Configure frequency, targets, and scan types for continuous monitoring.',
    placement: 'top',
    icon: <RefreshCw className="w-5 h-5 text-blue-400" />
  }
]

// Compliance Tour
export const complianceTour: TourStep[] = [
  {
    target: '[data-tour="compliance-header"]',
    title: 'Compliance & Audit Dashboard',
    content: 'Manage your compliance posture across multiple security frameworks. Track controls, generate reports, and maintain audit trails.',
    placement: 'bottom',
    icon: <FileCheck className="w-5 h-5 text-purple-400" />,
    route: '/security/compliance'
  },
  {
    target: '[data-tour="framework-selector"]',
    title: 'Framework Selection',
    content: 'Choose from 11 compliance frameworks: NIST 800-53, NIST 800-171, CMMC, NISPOM, FOCI, ITAR, EAR, and more.',
    placement: 'bottom',
    icon: <Shield className="w-5 h-5 text-blue-400" />,
    tabSelector: '[data-tour="controls-tab"]'
  },
  {
    target: '[data-tour="control-families"]',
    title: 'Control Families',
    content: 'Browse controls organized by family. Click a family to view all controls and their implementation status.',
    placement: 'right',
    icon: <Layers className="w-5 h-5 text-slate-400" />,
    tabSelector: '[data-tour="controls-tab"]'
  },
  {
    target: '[data-tour="control-list"]',
    title: 'Controls List',
    content: 'View all controls with their compliance status. Click any control to see details and update its status.',
    placement: 'left',
    icon: <FileCheck className="w-5 h-5 text-emerald-400" />,
    tabSelector: '[data-tour="controls-tab"]'
  },
  {
    target: '[data-tour="audit-logs"]',
    title: 'Audit Logs',
    content: 'Track all compliance-related actions with timestamps, users, and details. Essential for audit trails.',
    placement: 'top',
    icon: <FileText className="w-5 h-5 text-slate-400" />,
    tabSelector: '[data-tour="audit-tab"]'
  },
  {
    target: '[data-tour="reports-section"]',
    title: 'Reports',
    content: 'Generate compliance reports, export data to CSV/PDF, view screening reports, and access incident history.',
    placement: 'top',
    icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
    tabSelector: '[data-tour="reports-tab"]'
  },
  {
    target: '[data-tour="exostar-section"]',
    title: 'Exostar Integration',
    content: 'Connect to Exostar for DoD supply chain risk management. Enter your Organization ID and API key to sync compliance data.',
    placement: 'top',
    icon: <ExternalLink className="w-5 h-5 text-blue-400" />,
    tabSelector: '[data-tour="exostar-tab"]'
  }
]

// Forms Page Tour
export const formsTour: TourStep[] = [
  {
    target: '[data-tour="forms-header"]',
    title: 'Compliance Forms & Documents',
    content: 'Generate, manage, and submit all your compliance documentation from one central location.',
    placement: 'bottom',
    icon: <FileText className="w-5 h-5 text-emerald-400" />,
    route: '/security/forms'
  },
  {
    target: '[data-tour="form-stats"]',
    title: 'Document Statistics',
    content: 'Quick overview of your forms: total count, approved, in progress, and draft documents.',
    placement: 'bottom',
    icon: <BarChart3 className="w-5 h-5 text-blue-400" />
  },
  {
    target: '[data-tour="category-filter"]',
    title: 'Category Filter',
    content: 'Filter forms by category: SSPs, POA&Ms, FCL/Clearance, FOCI, Assessments, and Contracts.',
    placement: 'right',
    icon: <Filter className="w-5 h-5 text-slate-400" />
  },
  {
    target: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    content: 'Batch operations: Generate all SSPs at once, export all documents, or submit directly to Exostar.',
    placement: 'right',
    icon: <Zap className="w-5 h-5 text-yellow-400" />
  },
  {
    target: '[data-tour="form-card"]',
    title: 'Document Cards',
    content: 'Each card shows a compliance document with status, last modified date, and action buttons.',
    placement: 'top',
    icon: <FileText className="w-5 h-5 text-slate-400" />
  },
  {
    target: '[data-tour="view-button"]',
    title: 'View Document',
    content: 'Opens the document in a modal viewer for quick review without downloading.',
    placement: 'left',
    icon: <Eye className="w-5 h-5 text-slate-400" />
  },
  {
    target: '[data-tour="download-button"]',
    title: 'Download Document',
    content: 'Download the document in PDF or DOCX format for offline use or submission.',
    placement: 'left',
    icon: <Download className="w-5 h-5 text-blue-400" />
  },
  {
    target: '[data-tour="generate-button"]',
    title: 'Generate Document',
    content: 'Create a new version of this document populated with your current compliance data.',
    placement: 'left',
    icon: <Zap className="w-5 h-5 text-emerald-400" />
  }
]

// FCL Tracking Tour  
export const fclTrackingTour: TourStep[] = [
  {
    target: '[data-tour="fcl-tabs"]',
    title: 'FCL Tracking',
    content: 'Manage your Facility Clearance Level, key personnel, and security training compliance. Switch tabs to view different sections.',
    placement: 'bottom',
    icon: <Lock className="w-5 h-5 text-emerald-400" />,
    route: '/security/fcl'
  },
  {
    target: '[data-tour="fcl-overview"]',
    title: 'Overview Tab',
    content: 'View your facility clearance status, CAGE/DUNS codes, sponsor information, and clearance expiration.',
    placement: 'top',
    icon: <Shield className="w-5 h-5 text-blue-400" />,
    tabSelector: '[data-tour="fcl-tab-overview"]'
  },
  {
    target: '[data-tour="fcl-personnel"]',
    title: 'Key Personnel',
    content: 'Manage security personnel including FSO, ITPSO, and AFSO. Track clearance levels and contact information.',
    placement: 'top',
    icon: <Users className="w-5 h-5 text-purple-400" />,
    tabSelector: '[data-tour="fcl-tab-personnel"]'
  },
  {
    target: '[data-tour="fcl-training"]',
    title: 'Training Records',
    content: 'Track annual security training requirements from CDSE. View completion status and upcoming due dates.',
    placement: 'top',
    icon: <BookOpen className="w-5 h-5 text-yellow-400" />,
    tabSelector: '[data-tour="fcl-tab-training"]'
  }
]

// Export all tour configurations
export const tourConfigs = {
  'soc-dashboard': socDashboardTour,
  'network-monitor': networkMonitorTour,
  'incidents': incidentsTour,
  'red-team': redTeamTour,
  'compliance': complianceTour,
  'forms': formsTour,
  'fcl-tracking': fclTrackingTour
}

export type TourId = keyof typeof tourConfigs
