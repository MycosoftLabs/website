/**
 * FCL (Facility Clearance) API Route
 * February 12, 2026
 * 
 * Manages facility and personnel clearance applications.
 * Data stored in Supabase.
 * 
 * UPDATED: Replaces hardcoded mock data with real database calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const dynamic = 'force-dynamic';

// Types matching the FCL page
interface FCLApplication {
  id: string;
  type: 'facility' | 'personnel';
  level: 'Confidential' | 'Secret' | 'Top Secret' | 'Top Secret/SCI';
  status: 'submitted' | 'under_review' | 'in_progress' | 'approved' | 'denied';
  applicant: string;
  submittedDate: string;
  reviewDate?: string;
  sponsoringAgency: string;
  investigationType: string;
  notes?: string;
}

interface KeyPersonnel {
  id: string;
  name: string;
  title: string;
  role: 'FSO' | 'AFSO' | 'ISSM' | 'ISSO' | 'KMP' | 'SCI_CUST';
  clearanceLevel: string;
  clearanceStatus: 'active' | 'pending' | 'expired' | 'revoked';
  email: string;
  phone: string;
}

interface TrainingRecord {
  id: string;
  courseName: string;
  provider: string;
  completedDate?: string;
  expirationDate?: string;
  personnel: string;
  status?: 'complete' | 'in_progress' | 'expired' | 'pending';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'all';
  
  // If Supabase not configured, return empty data with message
  if (!supabase) {
    return NextResponse.json({
      error: 'Database not configured',
      message: 'FCL data requires Supabase configuration',
      applications: [],
      personnel: [],
      training: [],
    }, { status: 503 });
  }
  
  try {
    switch (action) {
      case 'applications': {
        const { data, error } = await supabase
          .from('fcl_applications')
          .select('*')
          .order('submitted_date', { ascending: false });
        
        if (error) throw error;
        
        // Transform to frontend format
        const applications: FCLApplication[] = (data || []).map(row => ({
          id: row.id,
          type: row.type,
          level: row.level,
          status: row.status,
          applicant: row.applicant,
          submittedDate: row.submitted_date,
          reviewDate: row.review_date,
          sponsoringAgency: row.sponsoring_agency,
          investigationType: row.investigation_type,
          notes: row.notes,
        }));
        
        return NextResponse.json({ applications });
      }
      
      case 'personnel': {
        const { data, error } = await supabase
          .from('key_personnel')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        const personnel: KeyPersonnel[] = (data || []).map(row => ({
          id: row.id,
          name: row.name,
          title: row.title,
          role: row.role,
          clearanceLevel: row.clearance_level,
          clearanceStatus: row.clearance_status,
          email: row.email,
          phone: row.phone,
        }));
        
        return NextResponse.json({ personnel });
      }
      
      case 'training': {
        const { data, error } = await supabase
          .from('training_records')
          .select('*')
          .order('expiration_date');
        
        if (error) throw error;
        
        const training: TrainingRecord[] = (data || []).map(row => ({
          id: row.id,
          courseName: row.course_name,
          provider: row.provider,
          completedDate: row.completed_date,
          expirationDate: row.expiration_date,
          personnel: row.personnel,
          status: row.status,
        }));
        
        return NextResponse.json({ training });
      }
      
      case 'all':
      default: {
        // Fetch all FCL data
        const [appsResult, personnelResult, trainingResult] = await Promise.all([
          supabase.from('fcl_applications').select('*').order('submitted_date', { ascending: false }),
          supabase.from('key_personnel').select('*').order('name'),
          supabase.from('training_records').select('*').order('expiration_date'),
        ]);
        
        const applications: FCLApplication[] = (appsResult.data || []).map(row => ({
          id: row.id,
          type: row.type,
          level: row.level,
          status: row.status,
          applicant: row.applicant,
          submittedDate: row.submitted_date,
          reviewDate: row.review_date,
          sponsoringAgency: row.sponsoring_agency,
          investigationType: row.investigation_type,
          notes: row.notes,
        }));
        
        const personnel: KeyPersonnel[] = (personnelResult.data || []).map(row => ({
          id: row.id,
          name: row.name,
          title: row.title,
          role: row.role,
          clearanceLevel: row.clearance_level,
          clearanceStatus: row.clearance_status,
          email: row.email,
          phone: row.phone,
        }));
        
        const training: TrainingRecord[] = (trainingResult.data || []).map(row => ({
          id: row.id,
          courseName: row.course_name,
          provider: row.provider,
          completedDate: row.completed_date,
          expirationDate: row.expiration_date,
          personnel: row.personnel,
          status: row.status,
        }));
        
        return NextResponse.json({
          applications,
          personnel,
          training,
          source: 'database',
        });
      }
    }
  } catch (error) {
    console.error('[FCL API] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch FCL data',
      applications: [],
      personnel: [],
      training: [],
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (!supabase) {
    return NextResponse.json({
      error: 'Database not configured',
    }, { status: 503 });
  }
  
  try {
    const body = await request.json();
    
    switch (action) {
      case 'create_application': {
        const { data, error } = await supabase
          .from('fcl_applications')
          .insert({
            type: body.type,
            level: body.level,
            status: 'submitted',
            applicant: body.applicant,
            submitted_date: new Date().toISOString(),
            sponsoring_agency: body.sponsoringAgency,
            investigation_type: body.investigationType,
            notes: body.notes,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, application: data });
      }
      
      case 'update_application': {
        const { data, error } = await supabase
          .from('fcl_applications')
          .update({
            status: body.status,
            review_date: body.reviewDate,
            notes: body.notes,
          })
          .eq('id', body.id)
          .select()
          .single();
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, application: data });
      }
      
      case 'add_personnel': {
        const { data, error } = await supabase
          .from('key_personnel')
          .insert({
            name: body.name,
            title: body.title,
            role: body.role,
            clearance_level: body.clearanceLevel || 'Pending',
            clearance_status: 'pending',
            email: body.email,
            phone: body.phone,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, personnel: data });
      }
      
      case 'add_training': {
        const { data, error } = await supabase
          .from('training_records')
          .insert({
            course_name: body.courseName,
            provider: body.provider,
            completed_date: body.completedDate,
            expiration_date: body.expirationDate,
            personnel: body.personnel,
            status: body.status || 'complete',
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, training: data });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[FCL API] POST Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to save FCL data',
    }, { status: 500 });
  }
}
