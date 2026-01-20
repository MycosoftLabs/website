'use client';

import { useState } from 'react';
import { useSupabaseUser } from '@/hooks/use-supabase-user';
import { redirect } from 'next/navigation';
import { 
  FileText, 
  Shield, 
  Download, 
  Eye, 
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  ChevronRight,
  FileCheck,
  ClipboardList,
  Building2,
  Users,
  Globe,
  Lock,
  FileWarning,
  Sparkles,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// FORM TYPES
// ═══════════════════════════════════════════════════════════════

type FormCategory = 'all' | 'ssp' | 'poam' | 'fcl' | 'foci' | 'assessment' | 'contract';

interface ComplianceForm {
  id: string;
  name: string;
  description: string;
  category: FormCategory;
  framework: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'expired';
  lastModified: string;
  dueDate?: string;
  icon: React.ReactNode;
  actions: ('view' | 'edit' | 'download' | 'generate')[];
}

// ═══════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════

const COMPLIANCE_FORMS: ComplianceForm[] = [
  // System Security Plans
  {
    id: 'ssp-nist-800-53',
    name: 'System Security Plan (NIST 800-53)',
    description: 'Comprehensive SSP following NIST SP 800-18 guidelines for NIST 800-53 controls',
    category: 'ssp',
    framework: 'NIST-800-53',
    status: 'in_progress',
    lastModified: '2026-01-19',
    icon: <FileText className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  {
    id: 'ssp-nist-800-171',
    name: 'System Security Plan (NIST 800-171)',
    description: 'SSP for CUI protection per NIST SP 800-171 requirements',
    category: 'ssp',
    framework: 'NIST-800-171',
    status: 'draft',
    lastModified: '2026-01-18',
    icon: <FileText className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  {
    id: 'ssp-cmmc',
    name: 'System Security Plan (CMMC)',
    description: 'SSP aligned with CMMC 2.0 Level 2 requirements',
    category: 'ssp',
    framework: 'CMMC',
    status: 'draft',
    lastModified: '2026-01-17',
    icon: <FileText className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  {
    id: 'ssp-icd-503',
    name: 'System Security Plan (ICD 503)',
    description: 'SSP for Intelligence Community systems following ICD 503 RMF',
    category: 'ssp',
    framework: 'ICD-503',
    status: 'draft',
    lastModified: '2026-01-19',
    icon: <FileText className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  {
    id: 'ssp-fedramp',
    name: 'System Security Plan (FedRAMP High)',
    description: 'FedRAMP High baseline SSP for cloud service authorization',
    category: 'ssp',
    framework: 'FedRAMP-High',
    status: 'draft',
    lastModified: '2026-01-19',
    icon: <FileText className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  
  // Plan of Action & Milestones
  {
    id: 'poam-master',
    name: 'Master POA&M',
    description: 'Consolidated Plan of Action & Milestones across all frameworks',
    category: 'poam',
    framework: 'All',
    status: 'in_progress',
    lastModified: '2026-01-19',
    dueDate: '2026-04-19',
    icon: <ClipboardList className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  {
    id: 'poam-cmmc',
    name: 'CMMC POA&M',
    description: 'POA&M tracking CMMC Level 2 remediation activities',
    category: 'poam',
    framework: 'CMMC',
    status: 'in_progress',
    lastModified: '2026-01-18',
    dueDate: '2026-03-15',
    icon: <ClipboardList className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  
  // FCL Forms
  {
    id: 'dd-254',
    name: 'DD Form 254',
    description: 'DoD Contract Security Classification Specification',
    category: 'fcl',
    framework: 'NISPOM',
    status: 'draft',
    lastModified: '2026-01-15',
    icon: <Lock className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  {
    id: 'sf-86',
    name: 'SF-86',
    description: 'Questionnaire for National Security Positions',
    category: 'fcl',
    framework: 'NISPOM',
    status: 'draft',
    lastModified: '2026-01-10',
    icon: <Users className="w-5 h-5" />,
    actions: ['view', 'download'],
  },
  {
    id: 'sf-312',
    name: 'SF-312',
    description: 'Classified Information Nondisclosure Agreement',
    category: 'fcl',
    framework: 'NISPOM',
    status: 'draft',
    lastModified: '2026-01-10',
    icon: <FileCheck className="w-5 h-5" />,
    actions: ['view', 'download'],
  },
  
  // FOCI Forms
  {
    id: 'sf-328',
    name: 'SF-328',
    description: 'Certificate Pertaining to Foreign Interests',
    category: 'foci',
    framework: 'FOCI',
    status: 'draft',
    lastModified: '2026-01-12',
    icon: <Globe className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  {
    id: 'foci-mitigation',
    name: 'FOCI Mitigation Plan',
    description: 'Foreign Ownership, Control, or Influence mitigation documentation',
    category: 'foci',
    framework: 'FOCI',
    status: 'draft',
    lastModified: '2026-01-11',
    icon: <Shield className="w-5 h-5" />,
    actions: ['view', 'edit', 'download'],
  },
  
  // Assessment Forms
  {
    id: 'sprs-assessment',
    name: 'SPRS Self-Assessment',
    description: 'Supplier Performance Risk System score submission',
    category: 'assessment',
    framework: 'NIST-800-171',
    status: 'in_progress',
    lastModified: '2026-01-19',
    icon: <FileWarning className="w-5 h-5" />,
    actions: ['view', 'edit', 'generate'],
  },
  {
    id: 'cmmc-self-assessment',
    name: 'CMMC Self-Assessment',
    description: 'CMMC Level 1 annual self-assessment documentation',
    category: 'assessment',
    framework: 'CMMC',
    status: 'draft',
    lastModified: '2026-01-17',
    icon: <ClipboardList className="w-5 h-5" />,
    actions: ['view', 'edit', 'download', 'generate'],
  },
  
  // Contract Forms
  {
    id: 'sbir-proposal',
    name: 'SBIR/STTR Proposal Template',
    description: 'Small Business Innovation Research proposal documentation',
    category: 'contract',
    framework: 'SBIR/STTR',
    status: 'draft',
    lastModified: '2026-01-14',
    icon: <Building2 className="w-5 h-5" />,
    actions: ['view', 'edit', 'download'],
  },
];

const CATEGORIES: { id: FormCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Forms', icon: <FileText className="w-4 h-4" /> },
  { id: 'ssp', label: 'System Security Plans', icon: <Shield className="w-4 h-4" /> },
  { id: 'poam', label: 'POA&M', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'fcl', label: 'FCL / Clearance', icon: <Lock className="w-4 h-4" /> },
  { id: 'foci', label: 'FOCI', icon: <Globe className="w-4 h-4" /> },
  { id: 'assessment', label: 'Assessments', icon: <FileWarning className="w-4 h-4" /> },
  { id: 'contract', label: 'Contracts', icon: <Building2 className="w-4 h-4" /> },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ComplianceFormsPage() {
  const { user, loading } = useSupabaseUser();
  const [selectedCategory, setSelectedCategory] = useState<FormCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingForm, setGeneratingForm] = useState<string | null>(null);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
      </div>
    );
  }
  
  if (!user) {
    redirect('/login?redirect=/security/forms');
  }
  
  const filteredForms = COMPLIANCE_FORMS.filter(form => {
    const matchesCategory = selectedCategory === 'all' || form.category === selectedCategory;
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          form.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          form.framework.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  const getStatusColor = (status: ComplianceForm['status']) => {
    switch (status) {
      case 'approved': return 'text-emerald-400 bg-emerald-500/10';
      case 'submitted': return 'text-blue-400 bg-blue-500/10';
      case 'in_progress': return 'text-amber-400 bg-amber-500/10';
      case 'expired': return 'text-red-400 bg-red-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };
  
  const getStatusIcon = (status: ComplianceForm['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <AlertTriangle className="w-4 h-4" />;
      case 'expired': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };
  
  const handleGenerate = async (formId: string) => {
    setGeneratingForm(formId);
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setGeneratingForm(null);
    // In production, this would call the SSP/POA&M generators
  };
  
  const stats = {
    total: COMPLIANCE_FORMS.length,
    approved: COMPLIANCE_FORMS.filter(f => f.status === 'approved').length,
    inProgress: COMPLIANCE_FORMS.filter(f => f.status === 'in_progress').length,
    draft: COMPLIANCE_FORMS.filter(f => f.status === 'draft').length,
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <FileText className="w-7 h-7 text-cyan-400" />
                Compliance Forms & Documents
              </h1>
              <p className="text-slate-400 mt-1">
                Generate, manage, and submit compliance documentation
              </p>
            </div>
            <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" />
              New Document
            </button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-3xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-slate-400">Total Forms</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/30">
              <div className="text-3xl font-bold text-emerald-400">{stats.approved}</div>
              <div className="text-sm text-slate-400">Approved</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/30">
              <div className="text-3xl font-bold text-amber-400">{stats.inProgress}</div>
              <div className="text-sm text-slate-400">In Progress</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
              <div className="text-3xl font-bold text-slate-300">{stats.draft}</div>
              <div className="text-sm text-slate-400">Draft</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-32">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Categories
              </h3>
              <nav className="space-y-1">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    {category.icon}
                    <span>{category.label}</span>
                    <span className="ml-auto text-xs text-slate-500">
                      {category.id === 'all'
                        ? COMPLIANCE_FORMS.length
                        : COMPLIANCE_FORMS.filter(f => f.category === category.id).length}
                    </span>
                  </button>
                ))}
              </nav>
              
              {/* Quick Actions */}
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Generate All SSPs
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors">
                    <Download className="w-4 h-4 text-blue-400" />
                    Export All Documents
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    Submit to Exostar
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search forms by name, description, or framework..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Forms List */}
            <div className="space-y-4">
              {filteredForms.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No forms found matching your criteria</p>
                </div>
              ) : (
                filteredForms.map(form => (
                  <div
                    key={form.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="p-3 bg-slate-700/50 rounded-lg text-cyan-400">
                        {form.icon}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-white truncate">
                            {form.name}
                          </h3>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300">
                            {form.framework}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mb-3">
                          {form.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${getStatusColor(form.status)}`}>
                            {getStatusIcon(form.status)}
                            {form.status.replace('_', ' ')}
                          </span>
                          <span className="text-slate-500">
                            Modified: {form.lastModified}
                          </span>
                          {form.dueDate && (
                            <span className="text-amber-400 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Due: {form.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {form.actions.includes('view') && (
                          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="View">
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                        {form.actions.includes('download') && (
                          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Download">
                            <Download className="w-5 h-5" />
                          </button>
                        )}
                        {form.actions.includes('generate') && (
                          <button 
                            onClick={() => handleGenerate(form.id)}
                            disabled={generatingForm === form.id}
                            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                          >
                            {generatingForm === form.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate
                              </>
                            )}
                          </button>
                        )}
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
