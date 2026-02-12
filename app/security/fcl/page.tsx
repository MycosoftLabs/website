'use client';

import React, { useState, useEffect } from 'react';
import { useSupabaseUser } from '@/hooks/use-supabase-user';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Building2, 
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  ChevronRight,
  Lock,
  Globe,
  Award,
  GraduationCap,
  Briefcase,
  FileCheck,
  AlertCircle,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type FCLLevel = 'Pending' | 'Confidential' | 'Secret' | 'Top Secret' | 'TS/SCI';
type ApplicationStatus = 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'suspended';

interface FCLApplication {
  id: string;
  type: 'facility' | 'personnel' | 'visitor';
  level: FCLLevel;
  status: ApplicationStatus;
  applicant: string;
  submittedDate?: string;
  reviewDate?: string;
  approvedDate?: string;
  expirationDate?: string;
  sponsoringAgency?: string;
  investigationType?: string;
  notes?: string;
}

interface KeyPersonnel {
  id: string;
  name: string;
  title: string;
  role: 'FSO' | 'AFSO' | 'ISSM' | 'ISSO' | 'KMP' | 'Officer' | 'Director';
  clearanceLevel: FCLLevel;
  clearanceStatus: 'active' | 'pending' | 'expired' | 'suspended';
  clearanceExpiry?: string;
  email: string;
  phone?: string;
}

interface TrainingRecord {
  id: string;
  courseName: string;
  provider: 'CDSE' | 'Internal' | 'External';
  completedDate: string;
  expirationDate?: string;
  personnel: string;
  certificateUrl?: string;
  status?: 'complete' | 'in_progress' | 'expired' | 'pending';
}

// ═══════════════════════════════════════════════════════════════
// DATA FETCHED FROM API - No hardcoded mock data
// ═══════════════════════════════════════════════════════════════
// UPDATED: Feb 12, 2026 - Removed all mock data. Data now comes from
// /api/security/fcl endpoint which reads from Supabase.
// If no data exists, empty states are shown with instructions.

// Placeholder removed: FCL_APPLICATIONS, KEY_PERSONNEL, REQUIRED_TRAINING
// were previously hardcoded here. Now fetched via useEffect.

// Legacy comment for training requirements reference:
// Required Training for FCL includes:
// - FSO Program Management for Possessing Facilities (CDSE)
// - Insider Threat Awareness (CDSE, Annual)
// - Counterintelligence Awareness (CDSE)
// - Derivative Classification Training (CDSE)

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function FCLTrackingPage() {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'personnel' | 'training' | 'forms'>('overview');
  
  // Real data state - fetched from /api/security/fcl
  const [applications, setApplications] = useState<FCLApplication[]>([]);
  const [personnel, setPersonnel] = useState<KeyPersonnel[]>([]);
  const [training, setTraining] = useState<TrainingRecord[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [personnelLoading, setPersonnelLoading] = useState(true);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Add Personnel Dialog state
  const [addPersonnelOpen, setAddPersonnelOpen] = useState(false);
  const [isSubmittingPersonnel, setIsSubmittingPersonnel] = useState(false);
  const [newPersonnel, setNewPersonnel] = useState({
    name: '',
    title: '',
    role: 'KMP' as KeyPersonnel['role'],
    clearanceLevel: 'Pending' as FCLLevel,
    clearanceStatus: 'pending' as KeyPersonnel['clearanceStatus'],
    email: '',
    phone: '',
  });
  
  // Fetch real data from /api/security/fcl
  // UPDATED: Feb 12, 2026 - Uses new FCL API endpoint
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        setApplicationsLoading(true);
        setPersonnelLoading(true);
        setTrainingLoading(true);
        setDataError(null);
        
        // Fetch all FCL data in one request
        const response = await fetch('/api/security/fcl?action=all');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch FCL data: ${response.status}`);
        }
        
        const data = await response.json();
        
        setApplications(data.applications || []);
        setPersonnel(data.personnel || []);
        setTraining(data.training || []);
        
        if (data.error) {
          setDataError(data.message || data.error);
        }
      } catch (error) {
        console.error('Failed to fetch FCL data:', error);
        setDataError(error instanceof Error ? error.message : 'Failed to load FCL data');
      } finally {
        setApplicationsLoading(false);
        setPersonnelLoading(false);
        setTrainingLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Helper functions
  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'approved': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'submitted': 
      case 'under_review': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'in_progress': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'denied':
      case 'suspended': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };
  
  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'submitted':
      case 'under_review': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <AlertTriangle className="w-4 h-4" />;
      case 'denied':
      case 'suspended': return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };
  
  const getClearanceColor = (level: FCLLevel) => {
    switch (level) {
      case 'TS/SCI': return 'text-purple-400 bg-purple-500/10';
      case 'Top Secret': return 'text-red-400 bg-red-500/10';
      case 'Secret': return 'text-amber-400 bg-amber-500/10';
      case 'Confidential': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };
  
  const getTabIcon = (iconName: string) => {
    switch (iconName) {
      case 'shield': return <Shield className="w-4 h-4" />;
      case 'filetext': return <FileText className="w-4 h-4" />;
      case 'users': return <Users className="w-4 h-4" />;
      case 'graduationcap': return <GraduationCap className="w-4 h-4" />;
      case 'filecheck': return <FileCheck className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };
  
  // Handle Add Personnel
  const handleAddPersonnel = async () => {
    if (!newPersonnel.name || !newPersonnel.email || !newPersonnel.title) {
      alert('Please fill in all required fields (Name, Title, Email)');
      return;
    }
    
    setIsSubmittingPersonnel(true);
    try {
      const res = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-personnel',
          ...newPersonnel,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setPersonnel([data.personnel, ...personnel]);
        setAddPersonnelOpen(false);
        setNewPersonnel({
          name: '',
          title: '',
          role: 'KMP',
          clearanceLevel: 'Pending',
          clearanceStatus: 'pending',
          email: '',
          phone: '',
        });
      } else {
        const error = await res.json();
        alert(`Failed to add personnel: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to add personnel:', error);
      alert('Failed to add personnel. Please try again.');
    } finally {
      setIsSubmittingPersonnel(false);
    }
  };
  
  const tabs = [
    { id: 'overview', label: 'Overview', iconName: 'shield', tourId: 'fcl-tab-overview' },
    { id: 'applications', label: 'Applications', iconName: 'filetext', tourId: 'fcl-tab-applications' },
    { id: 'personnel', label: 'Key Personnel', iconName: 'users', tourId: 'fcl-tab-personnel' },
    { id: 'training', label: 'Training', iconName: 'graduationcap', tourId: 'fcl-tab-training' },
    { id: 'forms', label: 'Required Forms', iconName: 'filecheck', tourId: 'fcl-tab-forms' },
  ];
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/security/fcl');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Lock className="w-7 h-7 text-amber-400" />
                Facility Clearance Level (FCL) Tracking
              </h1>
              <p className="text-slate-400 mt-1">
                NISPOM / E.O. 12829 / 32 CFR Part 117 Compliance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${getClearanceColor('Secret')}`}>
                <Shield className="w-4 h-4" />
                Target: SECRET
              </span>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1" data-tour="fcl-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                data-tour={tab.tourId}
                className={`px-4 py-2 rounded-t-lg flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-cyan-400 border-t border-l border-r border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {getTabIcon(tab.iconName)}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6" data-tour="fcl-overview">
            {/* Status Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-amber-500/10 rounded-lg">
                    <Building2 className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">FCL Status</div>
                    <div className="text-lg font-semibold text-white">In Progress</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">Target: SECRET</div>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Key Personnel</div>
                    <div className="text-lg font-semibold text-white">{personnel.length}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {personnel.filter(p => p.clearanceStatus === 'active').length} Cleared
                </div>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <GraduationCap className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Training</div>
                    <div className="text-lg font-semibold text-white">{training.length}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">CDSE Courses Complete</div>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <Globe className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">FOCI Status</div>
                    <div className="text-lg font-semibold text-white">No FOCI</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">SF-328 Submitted</div>
              </div>
            </div>
            
            {/* Sponsor & Agency Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-cyan-400" />
                  Cognizant Security Agency
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Agency</span>
                    <span className="text-white">Defense Counterintelligence and Security Agency (DCSA)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Region</span>
                    <span className="text-white">Western Region</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Industrial Security Representative</span>
                    <span className="text-white">Pending Assignment</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-cyan-400" />
                  Sponsoring Contract
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Prime Contractor</span>
                    <span className="text-white">TBD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contract Number</span>
                    <span className="text-white">Pending</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Classification Level</span>
                    <span className={`px-2 py-0.5 rounded text-sm ${getClearanceColor('Secret')}`}>SECRET</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Timeline */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                FCL Application Timeline
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />
                <div className="space-y-6">
                  {[
                    { date: '2025-10-01', event: 'Initial consultation with DCSA', status: 'complete' },
                    { date: '2025-11-01', event: 'SF-328 (FOCI) submitted', status: 'complete' },
                    { date: '2025-11-15', event: 'FCL application package submitted', status: 'complete' },
                    { date: '2025-12-01', event: 'Key Personnel clearance submissions', status: 'in_progress' },
                    { date: '2026-Q1', event: 'DCSA facility survey', status: 'pending' },
                    { date: '2026-Q2', event: 'FCL determination (estimated)', status: 'pending' },
                  ].map((item, idx) => (
                    <div key={idx} className="relative pl-10">
                      <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                        item.status === 'complete' ? 'bg-emerald-500 border-emerald-400' :
                        item.status === 'in_progress' ? 'bg-amber-500 border-amber-400' :
                        'bg-slate-700 border-slate-600'
                      }`} />
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500 w-24">{item.date}</span>
                        <span className={item.status === 'pending' ? 'text-slate-400' : 'text-white'}>
                          {item.event}
                        </span>
                        {item.status === 'in_progress' && (
                          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Current</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Clearance Applications</h2>
              <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm transition-colors">
                + New Application
              </button>
            </div>
            
            {/* Loading state */}
            {applicationsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="ml-3 text-slate-400">Loading applications...</span>
              </div>
            )}
            
            {/* Empty state */}
            {!applicationsLoading && applications.length === 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Applications Found</h3>
                <p className="text-slate-400 mb-4">
                  {dataError || 'No FCL applications have been submitted yet. Click "+ New Application" to begin.'}
                </p>
              </div>
            )}
            
            {/* Applications list */}
            {!applicationsLoading && applications.map(app => (
              <div
                key={app.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      app.type === 'facility' ? 'bg-amber-500/10' :
                      app.type === 'personnel' ? 'bg-blue-500/10' : 'bg-purple-500/10'
                    }`}>
                      {app.type === 'facility' ? <Building2 className="w-6 h-6 text-amber-400" /> :
                       app.type === 'personnel' ? <User className="w-6 h-6 text-blue-400" /> :
                       <Users className="w-6 h-6 text-purple-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm text-slate-500">{app.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getClearanceColor(app.level)}`}>
                          {app.level}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white">{app.applicant}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {app.type.charAt(0).toUpperCase() + app.type.slice(1)} Clearance • {app.investigationType}
                      </p>
                      {app.notes && (
                        <p className="text-sm text-slate-500 mt-2">{app.notes}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                        {app.submittedDate && <span>Submitted: {app.submittedDate}</span>}
                        {app.sponsoringAgency && <span>• {app.sponsoringAgency}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${getStatusColor(app.status)}`}>
                      {getStatusIcon(app.status)}
                      {app.status.replace('_', ' ')}
                    </span>
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Personnel Tab */}
        {activeTab === 'personnel' && (
          <div className="space-y-4" data-tour="fcl-personnel">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Key Management Personnel (KMP)</h2>
              <Dialog open={addPersonnelOpen} onOpenChange={setAddPersonnelOpen}>
                <DialogTrigger asChild>
                  <Button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Personnel
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Add Key Personnel</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Add a new key management personnel member to the FCL tracking system.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={newPersonnel.name}
                        onChange={(e) => setNewPersonnel({ ...newPersonnel, name: e.target.value })}
                        className="bg-slate-800 border-slate-600 text-white"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title *</Label>
                      <Input
                        id="title"
                        value={newPersonnel.title}
                        onChange={(e) => setNewPersonnel({ ...newPersonnel, title: e.target.value })}
                        className="bg-slate-800 border-slate-600 text-white"
                        placeholder="Facility Security Officer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={newPersonnel.role}
                        onValueChange={(value) => setNewPersonnel({ ...newPersonnel, role: value as KeyPersonnel['role'] })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 text-white">
                          <SelectItem value="FSO">Facility Security Officer (FSO)</SelectItem>
                          <SelectItem value="AFSO">Assistant FSO (AFSO)</SelectItem>
                          <SelectItem value="ISSM">Information System Security Manager (ISSM)</SelectItem>
                          <SelectItem value="ISSO">Information System Security Officer (ISSO)</SelectItem>
                          <SelectItem value="KMP">Key Management Personnel (KMP)</SelectItem>
                          <SelectItem value="Officer">Security Officer</SelectItem>
                          <SelectItem value="Director">Director</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clearanceLevel">Clearance Level</Label>
                      <Select
                        value={newPersonnel.clearanceLevel}
                        onValueChange={(value) => setNewPersonnel({ ...newPersonnel, clearanceLevel: value as FCLLevel })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 text-white">
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Confidential">Confidential</SelectItem>
                          <SelectItem value="Secret">Secret</SelectItem>
                          <SelectItem value="Top Secret">Top Secret</SelectItem>
                          <SelectItem value="TS/SCI">TS/SCI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newPersonnel.email}
                        onChange={(e) => setNewPersonnel({ ...newPersonnel, email: e.target.value })}
                        className="bg-slate-800 border-slate-600 text-white"
                        placeholder="john.doe@mycosoft.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={newPersonnel.phone}
                        onChange={(e) => setNewPersonnel({ ...newPersonnel, phone: e.target.value })}
                        className="bg-slate-800 border-slate-600 text-white"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddPersonnelOpen(false)}
                      className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddPersonnel}
                      disabled={isSubmittingPersonnel}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      {isSubmittingPersonnel ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Personnel
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {personnelLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personnel.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-400">
                    No personnel added yet. Click "Add Personnel" to get started.
                  </div>
                ) : (
                  personnel.map(person => (
                    <div
                      key={person.id}
                      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-lg font-semibold text-white">
                          {person.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{person.name}</h3>
                            <span className="px-2 py-0.5 text-xs rounded bg-cyan-500/10 text-cyan-400">
                              {person.role}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">{person.title}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getClearanceColor(person.clearanceLevel)}`}>
                              <Shield className="w-3 h-3" />
                              {person.clearanceLevel}
                            </span>
                            <span className={`text-xs ${
                              person.clearanceStatus === 'active' ? 'text-emerald-400' :
                              person.clearanceStatus === 'pending' ? 'text-amber-400' :
                              'text-red-400'
                            }`}>
                              {person.clearanceStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {person.email}
                            </span>
                            {person.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {person.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Training Tab */}
        {activeTab === 'training' && (
          <div className="space-y-4" data-tour="fcl-training">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Security Training Records (CDSE)</h2>
              <a
                href="https://www.cdse.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Open CDSE Portal →
              </a>
            </div>
            
            {trainingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Course</th>
                      <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Provider</th>
                      <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Personnel</th>
                      <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Completed</th>
                      <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Expires</th>
                      <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {training.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          No training records yet.
                        </td>
                      </tr>
                    ) : (
                      training.map(trainingRecord => (
                        <tr key={trainingRecord.id} className="hover:bg-slate-800/50">
                          <td className="px-6 py-4">
                            <span className="text-white">{trainingRecord.courseName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-400">
                              {trainingRecord.provider}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{trainingRecord.personnel}</td>
                          <td className="px-6 py-4 text-slate-400">{trainingRecord.completedDate}</td>
                          <td className="px-6 py-4 text-slate-400">{trainingRecord.expirationDate || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-1 ${
                              (trainingRecord.status || 'complete') === 'complete' ? 'text-emerald-400' :
                              trainingRecord.status === 'expired' ? 'text-red-400' :
                              trainingRecord.status === 'in_progress' ? 'text-amber-400' :
                              'text-slate-400'
                            }`}>
                              {(trainingRecord.status || 'complete') === 'complete' ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Complete
                                </>
                              ) : trainingRecord.status === 'expired' ? (
                                <>
                                  <XCircle className="w-4 h-4" />
                                  Expired
                                </>
                              ) : trainingRecord.status === 'in_progress' ? (
                                <>
                                  <Clock className="w-4 h-4" />
                                  In Progress
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4" />
                                  Pending
                                </>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Required Courses Alert */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-400">Required Annual Training</h4>
                  <p className="text-sm text-slate-400 mt-1">
                    Per NISPOM, all cleared personnel must complete annual refresher training including:
                    Insider Threat Awareness, Counterintelligence Awareness, and Derivative Classification.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Forms Tab */}
        {activeTab === 'forms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Required FCL Forms</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'SF-86', name: 'Questionnaire for National Security Positions', desc: 'Personal security clearance application', required: true, status: 'pending' },
                { id: 'SF-312', name: 'Classified Information NDA', desc: 'Nondisclosure agreement for classified access', required: true, status: 'pending' },
                { id: 'SF-328', name: 'Certificate Pertaining to Foreign Interests', desc: 'Foreign Ownership, Control, or Influence declaration', required: true, status: 'submitted' },
                { id: 'DD-254', name: 'Contract Security Classification Specification', desc: 'Classification requirements for contracts', required: true, status: 'pending' },
                { id: 'SF-700', name: 'Security Container Information', desc: 'Safe/container combination records', required: false, status: 'not_required' },
                { id: 'SF-701', name: 'Activity Security Checklist', desc: 'Daily security check documentation', required: false, status: 'pending' },
                { id: 'SF-702', name: 'Security Container Check Sheet', desc: 'Container opening/closing log', required: false, status: 'pending' },
                { id: 'SF-703', name: 'TOP SECRET Cover Sheet', desc: 'Cover sheet for TS documents', required: false, status: 'not_applicable' },
              ].map(form => (
                <div
                  key={form.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-cyan-400">{form.id}</span>
                        {form.required && (
                          <span className="text-xs text-red-400">Required</span>
                        )}
                      </div>
                      <h3 className="font-medium text-white">{form.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">{form.desc}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      form.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400' :
                      form.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      form.status === 'not_applicable' ? 'bg-slate-500/10 text-slate-400' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {form.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors">
                      View Form
                    </button>
                    <button className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors">
                      Generate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
