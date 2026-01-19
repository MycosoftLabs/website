import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// API Key configurations - mapping env var names to their values
// In production, these should be stored securely and retrieved from a vault
const API_KEYS_CONFIG = [
  { key: 'OPENAI_API_KEY', name: 'OpenAI' },
  { key: 'OPENAI_PERSONAL_API_KEY', name: 'OpenAI Personal' },
  { key: 'ANTHROPIC_API_KEY', name: 'Anthropic Claude' },
  { key: 'GROQ_API_KEY', name: 'Groq' },
  { key: 'XAI_API_KEY', name: 'xAI Grok' },
  { key: 'GOOGLE_AI_API_KEY', name: 'Google AI' },
  { key: 'AZURE_OPENAI_API_KEY', name: 'Azure OpenAI' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', name: 'Supabase Service Role' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', name: 'Supabase Anon' },
  { key: 'MINDEX_API_KEY', name: 'MINDEX' },
  { key: 'GOOGLE_MAPS_API_KEY', name: 'Google Maps' },
  { key: 'INFURA_API_KEY', name: 'Infura' },
  { key: 'NIH_API_KEY', name: 'NIH' },
  { key: 'ELSEVIER_API_KEY', name: 'Elsevier' },
  { key: 'ELEVENLABS_API_KEY', name: 'ElevenLabs' },
  { key: 'SENDGRID_API_KEY', name: 'SendGrid' },
  { key: 'N8N_API_KEY', name: 'N8N' },
  { key: 'NOTION_API_KEY', name: 'Notion' },
  { key: 'UNIFI_API_KEY', name: 'UniFi' },
  { key: 'PROXMOX_API_TOKEN', name: 'Proxmox' },
  { key: 'CURSOR_API_KEY', name: 'Cursor Primary' },
  { key: 'CURSOR_SHELL_API_KEY', name: 'Cursor Shell' },
  { key: 'FLIGHTRADAR24_API_KEY', name: 'FlightRadar24' },
  { key: 'CLOUDFLARE_API_TOKEN', name: 'Cloudflare' },
];

function maskApiKey(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 8) return '****';
  return value.substring(0, 4) + '...' + value.substring(value.length - 4);
}

export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated and is a super admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is super admin (morgan@mycosoft.org)
    if (user.email !== 'morgan@mycosoft.org') {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const reveal = searchParams.get('reveal'); // The specific key to reveal
    
    const keyData: Record<string, { masked: string; configured: boolean; revealed?: string }> = {};
    
    for (const config of API_KEYS_CONFIG) {
      const value = process.env[config.key];
      keyData[config.key] = {
        masked: maskApiKey(value),
        configured: !!value && value.length > 0,
        // Only include revealed value if specifically requested for this key
        ...(reveal === config.key && value ? { revealed: value } : {}),
      };
    }
    
    return NextResponse.json({ keys: keyData });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
