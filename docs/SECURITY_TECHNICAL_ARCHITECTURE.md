# Mycosoft Security Operations Center - Technical Architecture

## Version: 2.0.0 | Document Date: January 20, 2026
## Classification: INTERNAL // TECHNICAL

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Authentication & Authorization](#authentication--authorization)
8. [Tour System Implementation](#tour-system-implementation)
9. [Document Generation](#document-generation)
10. [Exostar Integration](#exostar-integration)
11. [UniFi Integration](#unifi-integration)
12. [Deployment Architecture](#deployment-architecture)
13. [Security Considerations](#security-considerations)
14. [Development Guide](#development-guide)

---

## System Overview

The Mycosoft Security Operations Center (SOC) is a comprehensive security management platform built on Next.js 14+ with Supabase as the backend.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MYCOSOFT SOC                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ SOC         │  │ Network     │  │ Incidents   │  │ Red Team   │  │
│  │ Dashboard   │  │ Monitor     │  │ Management  │  │ Operations │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │
│         │                │                │                │        │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌─────┴──────┐  │
│  │ Compliance  │  │ Forms &     │  │ FCL         │  │ Tour       │  │
│  │ & Audit     │  │ Documents   │  │ Tracking    │  │ System     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │
├─────────┴────────────────┴────────────────┴───────────────┴─────────┤
│                         NEXT.JS API ROUTES                           │
│  /api/security  /api/unifi  /api/security/documents  /api/exostar   │
├─────────────────────────────────────────────────────────────────────┤
│                         SUPABASE                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ Auth        │  │ Database    │  │ Storage     │                  │
│  │ (OAuth)     │  │ (Postgres)  │  │ (Files)     │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
├─────────────────────────────────────────────────────────────────────┤
│                    EXTERNAL INTEGRATIONS                             │
│  ┌─────────────┐  ┌─────────────┐                                   │
│  │ UniFi API   │  │ Exostar API │                                   │
│  │ (Network)   │  │ (DoD SCRM)  │                                   │
│  └─────────────┘  └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.x | React framework with App Router |
| **React** | 18.x | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **Framer Motion** | 10.x | Animation library |
| **Lucide React** | Latest | Icon library |
| **Shadcn/ui** | Latest | Component library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 14.x | Serverless API endpoints |
| **Supabase** | Latest | Backend-as-a-Service |
| **PostgreSQL** | 15.x | Database (via Supabase) |

### Integrations

| Service | Purpose |
|---------|---------|
| **UniFi Controller** | Network device monitoring |
| **Exostar** | DoD supply chain risk management |
| **CDSE Portal** | Security training resources |

---

## Frontend Architecture

### Directory Structure

```
app/
├── security/
│   ├── page.tsx              # SOC Dashboard
│   ├── layout.tsx            # Security layout with tour provider
│   ├── network/
│   │   └── page.tsx          # Network Monitor
│   ├── incidents/
│   │   └── page.tsx          # Incident Management
│   ├── redteam/
│   │   └── page.tsx          # Red Team Operations
│   ├── compliance/
│   │   └── page.tsx          # Compliance & Audit
│   ├── forms/
│   │   └── page.tsx          # Forms & Documents
│   └── fcl/
│       └── page.tsx          # FCL Tracking

components/
├── security/
│   ├── tour/
│   │   ├── index.ts          # Barrel exports
│   │   ├── tour-provider.tsx # Tour context provider
│   │   ├── security-tour.tsx # Tour overlay component
│   │   ├── welcome-modal.tsx # First-time welcome modal
│   │   └── tour-configs.tsx  # Tour step definitions
│   └── ...                   # Other security components

lib/
├── security/
│   ├── database.ts           # Database operations
│   ├── exostar-client.ts     # Exostar API client
│   ├── encryption.ts         # AES-256-GCM encryption
│   ├── document-storage.ts   # Document storage utilities
│   └── ssp-generator/
│       └── index.ts          # SSP generation logic
└── access/
    ├── types.ts              # Role types (UserRole enum)
    ├── routes.ts             # Route access definitions
    └── middleware.ts         # Access control middleware
```

### Component Architecture

#### Security Layout (`app/security/layout.tsx`)

Wraps all security pages with:
- `SecurityTourProvider` - Tour state management
- `SecurityTour` - Tour overlay component
- Common header and navigation

```typescript
export default function SecurityLayout({ children }) {
  return (
    <SecurityTourProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <SecurityHeader />
        <main>
          <SecurityTour>{children}</SecurityTour>
        </main>
        <SecurityFooter />
      </div>
    </SecurityTourProvider>
  )
}
```

#### Page Component Pattern

Each security page follows this pattern:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { SecurityTour, TourTriggerButton, tourConfig } from '@/components/security/tour'
import { useSupabaseUser } from '@/hooks/use-supabase-user'

export default function SecurityPage() {
  const { user } = useSupabaseUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch data from API
    fetchData()
  }, [user])

  return (
    <div className="...">
      <header data-tour="page-header">
        <h1>Page Title</h1>
        <TourTriggerButton tourId="page-tour" />
      </header>
      
      <SecurityTour 
        tourId="page-tour" 
        steps={tourConfig.pageSteps} 
      />
      
      <main data-tour="main-content">
        {/* Page content with data-tour attributes */}
      </main>
    </div>
  )
}
```

---

## Backend Architecture

### API Routes Structure

```
app/api/
├── security/
│   ├── route.ts              # Main security API (GET/POST)
│   ├── exostar/
│   │   └── route.ts          # Exostar integration API
│   └── documents/
│       └── route.ts          # Document generation API
└── unifi/
    └── route.ts              # UniFi network API
```

### API Route Pattern

```typescript
// app/api/security/route.ts
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  switch (action) {
    case 'fcl-personnel':
      return handleGetPersonnel(supabase)
    case 'fcl-training':
      return handleGetTraining(supabase)
    case 'compliance-controls':
      return handleGetControls(supabase, searchParams)
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const { action, ...data } = body
  
  // Handle mutations...
}
```

---

## Database Schema

### Supabase Tables

#### `exostar_integrations`

Stores encrypted Exostar credentials per organization.

```sql
CREATE TABLE exostar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  org_id TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  is_connected BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS Policy
ALTER TABLE exostar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own integrations"
ON exostar_integrations
FOR ALL
USING (auth.uid() = user_id);
```

#### `compliance_documents`

Stores generated compliance documents.

```sql
CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  form_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  framework TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT DEFAULT 'application/pdf',
  content TEXT,  -- HTML content for viewing
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `fcl_key_personnel`

Stores key management personnel for FCL tracking.

```sql
CREATE TABLE fcl_key_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  role TEXT NOT NULL,  -- FSO, ITPSO, AFSO, etc.
  clearance TEXT NOT NULL,  -- TS/SCI, TS, Secret, etc.
  email TEXT,
  phone TEXT,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `fcl_training_records`

Stores security training records.

```sql
CREATE TABLE fcl_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_name TEXT NOT NULL,
  category TEXT NOT NULL,
  due_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'pending',  -- pending, in_progress, completed, overdue
  personnel_id UUID REFERENCES fcl_key_personnel(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `security_incidents`

Stores security incidents.

```sql
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,  -- critical, high, medium, low
  status TEXT DEFAULT 'open',  -- open, investigating, resolved, closed
  category TEXT,
  assignee_id UUID REFERENCES auth.users(id),
  timeline JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
```

#### `compliance_audit_logs`

Stores compliance action audit trail.

```sql
CREATE TABLE compliance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API Reference

### Security API (`/api/security`)

#### GET Endpoints

| Action | Description | Response |
|--------|-------------|----------|
| `fcl-personnel` | Get key personnel list | `{ personnel: [] }` |
| `fcl-training` | Get training records | `{ training: [] }` |
| `compliance-controls` | Get compliance controls | `{ controls: [], stats: {} }` |
| `compliance-stats` | Get compliance statistics | `{ implemented: n, total: n }` |
| `compliance-audit-logs` | Get audit logs | `{ logs: [] }` |

#### POST Endpoints

| Action | Payload | Description |
|--------|---------|-------------|
| `create-personnel` | `{ name, title, role, clearance, email, phone }` | Add new personnel |
| `update-personnel` | `{ id, ...fields }` | Update personnel record |
| `delete-personnel` | `{ id }` | Delete personnel record |
| `create-training` | `{ training_name, category, due_date }` | Add training record |
| `update_compliance_control` | `{ controlId, status, evidence }` | Update control status |
| `log_compliance_action` | `{ action, details }` | Log audit action |

### Documents API (`/api/security/documents`)

#### POST `/generate`

```typescript
// Request
{
  "action": "generate",
  "type": "ssp",  // or "poam"
  "framework": "NIST-800-53",
  "formId": "ssp-nist-800-53"
}

// Response
{
  "success": true,
  "documentId": "uuid",
  "content": "<html>...</html>",
  "fileName": "NIST-800-53-SSP-2026-01-20.pdf"
}
```

#### GET `/download`

```typescript
// Request
GET /api/security/documents?action=download&formId=ssp-nist-800-53

// Response: File stream or HTML content
```

### Exostar API (`/api/security/exostar`)

#### GET `/config`

```typescript
// Response
{
  "orgId": "MYCOSOFT-ORG-001",
  "isConnected": true,
  "lastSync": "2026-01-20T10:30:00Z"
}
```

#### POST `/config`

```typescript
// Request
{
  "orgId": "MYCOSOFT-ORG-001",
  "apiKey": "your-api-key"
}

// Response
{
  "success": true,
  "message": "Credentials saved successfully"
}
```

#### POST `/sync`

```typescript
// Response
{
  "success": true,
  "syncedAt": "2026-01-20T10:30:00Z",
  "message": "Sync completed successfully"
}
```

---

## Authentication & Authorization

### Role-Based Access Control

```typescript
// lib/access/types.ts
export enum UserRole {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SECURITY_ADMIN = 'security_admin'  // Security-specific access
}
```

### Route Protection

```typescript
// lib/access/routes.ts
export const accessControlledRoutes: Record<string, UserRole[]> = {
  '/security': [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECURITY_ADMIN],
  '/security/compliance': [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECURITY_ADMIN],
  '/security/fcl': [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECURITY_ADMIN],
  '/security/forms': [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECURITY_ADMIN],
  '/security/network': [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECURITY_ADMIN],
  '/security/incidents': [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECURITY_ADMIN],
  '/security/redteam': [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECURITY_ADMIN],
}
```

### SECURITY_ADMIN vs SUPER_ADMIN

| Capability | SECURITY_ADMIN | SUPER_ADMIN |
|------------|----------------|-------------|
| All security features | ✅ | ✅ |
| Compliance management | ✅ | ✅ |
| Document generation | ✅ | ✅ |
| Exostar configuration | ✅ | ✅ |
| System kill switch | ❌ | ✅ |
| User role management | ❌ | ✅ |
| System override | ❌ | ✅ |

---

## Tour System Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SecurityTourProvider                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Tour State (Context)                    │    │
│  │  - hasSeenWelcome: boolean                               │    │
│  │  - completedTours: string[]                              │    │
│  │  - currentTour: string | null                            │    │
│  │  - currentStep: number                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ WelcomeModal│  │SecurityTour │  │ TourTriggerButton       │  │
│  │ (First-time)│  │ (Overlay)   │  │ (Replay button)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### TourStep Interface

```typescript
// components/security/tour/security-tour.tsx
export interface TourStep {
  target: string           // CSS selector: '[data-tour="element-id"]'
  title: string            // Step title
  content: string          // Description text
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  spotlightPadding?: number
  icon?: React.ReactNode
  
  // Navigation options (NEW in v2.0)
  route?: string           // Navigate to this route before showing step
  tabSelector?: string     // CSS selector for tab to click
  waitForElement?: boolean // Wait for element to appear
}
```

### Automatic Tab Switching

The tour system automatically switches tabs and navigates pages:

```typescript
// In security-tour.tsx
useEffect(() => {
  if (!isActive || !step) return
  
  const navigateToStep = async () => {
    // Navigate to different page if needed
    if (step.route && pathname !== step.route) {
      setIsNavigating(true)
      router.push(step.route)
      await new Promise(resolve => setTimeout(resolve, 500))
      setIsNavigating(false)
      return
    }
    
    // Click tab if needed
    if (step.tabSelector) {
      const tabButton = document.querySelector(step.tabSelector) as HTMLButtonElement
      if (tabButton) {
        const isActive = tabButton.getAttribute('data-state') === 'active'
        if (!isActive) {
          tabButton.click()
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
    }
  }
  
  navigateToStep()
}, [isActive, step, pathname, router, currentStep])
```

### State Persistence

Tour state is stored in `localStorage`:

```typescript
const STORAGE_KEY = 'mycosoft-security-tour-state'

interface TourState {
  hasSeenWelcome: boolean
  completedTours: string[]
  currentTour: string | null
  currentStep: number
}
```

### Adding data-tour Attributes

Mark elements for the tour:

```tsx
// Tab buttons
<button data-tour="network-tab-devices">Devices</button>

// Content sections
<div data-tour="device-list">
  <DevicesView devices={data.devices} />
</div>
```

---

## Document Generation

### SSP Generator

```typescript
// lib/security/ssp-generator/index.ts
export async function generateSSP(
  framework: string,
  controls: Control[],
  organizationData: OrganizationData
): Promise<string> {
  const template = getSSPTemplate(framework)
  
  const html = renderSSPTemplate(template, {
    framework,
    controls,
    organization: organizationData,
    generatedAt: new Date().toISOString()
  })
  
  return html
}
```

### PDF Generation (Client-Side)

```typescript
// Using browser print API
export function generatePDFReport(type: string) {
  const content = getReportContent(type)
  const printWindow = window.open('', '_blank')
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${type} Report</title>
        <style>${getPrintStyles()}</style>
      </head>
      <body>${content}</body>
    </html>
  `)
  
  printWindow.document.close()
  printWindow.print()
}
```

---

## Exostar Integration

### Credential Encryption

```typescript
// lib/security/encryption.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = process.env.EXOSTAR_ENCRYPTION_KEY! // 32 bytes

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  }
}

export function decrypt(data: EncryptedData): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(KEY, 'hex'),
    Buffer.from(data.iv, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'))
  
  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
```

### Sync Flow

```
1. User clicks "Sync with Exostar"
2. Frontend calls POST /api/security/exostar/sync
3. Backend decrypts stored API key
4. Backend calls Exostar API with credentials
5. Response data is stored/updated in database
6. Frontend receives sync confirmation
```

---

## UniFi Integration

### API Client

```typescript
// lib/unifi-client.ts
export class UniFiClient {
  private baseUrl: string
  private sessionCookie: string | null = null
  
  constructor(config: UniFiConfig) {
    this.baseUrl = `https://${config.host}:${config.port}`
  }
  
  async login(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        username: process.env.UNIFI_USERNAME,
        password: process.env.UNIFI_PASSWORD
      })
    })
    
    this.sessionCookie = response.headers.get('set-cookie')
  }
  
  async getDevices(): Promise<Device[]> {
    return this.request('/api/s/default/stat/device')
  }
  
  async getClients(): Promise<Client[]> {
    return this.request('/api/s/default/stat/sta')
  }
  
  async getAlarms(): Promise<Alarm[]> {
    return this.request('/api/s/default/stat/alarm')
  }
}
```

---

## Deployment Architecture

### Docker Configuration

```yaml
# docker-compose.always-on.yml
services:
  mycosoft-website:
    build:
      context: ../WEBSITE/website
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
      - EXOSTAR_ENCRYPTION_KEY=${EXOSTAR_KEY}
    restart: unless-stopped
```

### Deployment Steps

```bash
# 1. Build Docker image
docker build -t website-website:latest --no-cache .

# 2. Start container
docker compose -p mycosoft-production up -d mycosoft-website

# 3. Clear Cloudflare cache
# (via Cloudflare dashboard: Purge Everything)

# 4. Verify deployment
curl https://sandbox.mycosoft.com/security
```

---

## Security Considerations

### Data Protection

1. **Encryption at Rest**: Exostar API keys encrypted with AES-256-GCM
2. **Row Level Security**: Supabase RLS policies on all tables
3. **Authentication**: Supabase Auth with OAuth2

### API Security

1. **Authentication Required**: All security endpoints require valid session
2. **Role Verification**: SECURITY_ADMIN role required for access
3. **Input Validation**: All inputs validated before processing

### Environment Variables

```env
# Required for security features
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
EXOSTAR_ENCRYPTION_KEY=your-32-byte-hex-key

# UniFi integration
UNIFI_HOST=192.168.1.1
UNIFI_PORT=443
UNIFI_USERNAME=admin
UNIFI_PASSWORD=your-password
```

---

## Development Guide

### Local Development

```bash
# Start development server
npm run dev

# Access security section
open http://localhost:3010/security
```

### Adding a New Security Feature

1. **Create page**: `app/security/newfeature/page.tsx`
2. **Add tour steps**: Update `tour-configs.tsx`
3. **Add data-tour attributes**: Mark elements for tour
4. **Create API endpoint**: `app/api/security/newfeature/route.ts`
5. **Update navigation**: Add link to layout/header
6. **Update access control**: Add route to `routes.ts`

### Testing Checklist

- [ ] Page loads without errors
- [ ] Tour highlights correct elements
- [ ] Tab switching works in tour
- [ ] API endpoints return correct data
- [ ] Forms save to database
- [ ] Authentication required for access
- [ ] No console errors

---

## Changelog

### v2.0.0 (January 20, 2026)

#### New Features
- Exostar integration with encrypted credential storage
- SSP/POA&M document generation
- SECURITY_ADMIN role
- First-time user walkthrough tour
- Automatic tab switching in tours
- Page navigation in tours
- Quick actions (Generate All, Export All, Submit to Exostar)

#### Technical Improvements
- Tour system with tab/page navigation
- Lighter overlay (35% opacity)
- Enhanced spotlight with glow effect
- Arrow indicators pointing to elements
- Resilient context provider

### v1.0.0 (January 19, 2026)

- Initial SOC Dashboard
- Network Monitor with UniFi integration
- Incidents management
- Red Team operations
- Multi-framework compliance
- FCL tracking

---

*Document maintained by: Mycosoft Engineering Team*
*Last Updated: January 20, 2026*
