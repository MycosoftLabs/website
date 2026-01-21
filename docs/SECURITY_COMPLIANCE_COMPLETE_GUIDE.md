# Security Operations Center - Complete Documentation

## Version: 2.0.0 | Last Updated: January 20, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Security Operations Center (SOC) Dashboard](#soc-dashboard)
3. [Network Monitor](#network-monitor)
4. [Incidents Management](#incidents-management)
5. [Red Team Operations](#red-team-operations)
6. [Compliance & Audit](#compliance-audit)
7. [Forms & Documents](#forms-documents)
8. [FCL Tracking](#fcl-tracking)
9. [Exostar Integration](#exostar-integration)
10. [Security Admin Role](#security-admin-role)
11. [API Reference](#api-reference)
12. [Database Schema](#database-schema)
13. [Deployment Guide](#deployment-guide)

---

## Overview

The Mycosoft Security Operations Center (SOC) is a comprehensive security management platform designed for defense contractors, government agencies, and organizations requiring compliance with federal security frameworks.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **SOC Dashboard** | Real-time security monitoring with threat visualization |
| **Network Monitor** | UniFi-integrated network topology and traffic analysis |
| **Incidents** | Security incident tracking with database persistence |
| **Red Team** | Attack surface visualization and vulnerability scanning |
| **Compliance** | Multi-framework compliance management (NIST, CMMC, NISPOM, etc.) |
| **Forms** | Automated SSP and POA&M document generation |
| **FCL Tracking** | Facility Clearance Level management and personnel tracking |
| **Exostar Integration** | DoD supply chain risk management connectivity |

### Access Requirements

- **Authentication**: Supabase Auth (Google OAuth or email/password)
- **Authorization**: Role-based access control with SECURITY_ADMIN role
- **Clearance**: Appropriate clearance level for classified system access

---

## SOC Dashboard

**Route**: `/security`

### Features

1. **Threat Level Indicator**
   - Real-time threat assessment (CRITICAL/HIGH/MODERATE/LOW)
   - Color-coded status display
   - Automatic updates based on active incidents

2. **Security Metrics**
   - Active threats count
   - Network health status
   - Compliance score percentage
   - Recent alerts summary

3. **Navigation Hub**
   - Quick access to all security modules
   - Status badges for each section
   - Role-based visibility

### UI Components

```
┌─────────────────────────────────────────────────────────────┐
│  🛡️ Security Operations Center                              │
├─────────────────────────────────────────────────────────────┤
│  [Incidents] [Red Team] [Network Monitor] [Compliance]      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Threats │  │ Network │  │ Comply  │  │ Alerts  │        │
│  │   12    │  │  98.5%  │  │   95%   │  │    3    │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
├─────────────────────────────────────────────────────────────┤
│  Recent Activity Feed                                       │
│  • [10:45] Network scan completed                           │
│  • [10:30] New vulnerability detected                       │
│  • [10:15] Compliance report generated                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Network Monitor

**Route**: `/security/network`

### Features

1. **Network Topology Visualization**
   - Interactive node-based topology
   - UniFi device integration
   - Traffic flow visualization

2. **Device Management**
   - Real-time device status
   - Client information
   - Traffic statistics

3. **Alerts & Alarms**
   - UniFi alarm integration
   - Severity classification
   - Historical alarm data

### UniFi Integration

The Network Monitor connects to your UniFi Dream Machine Pro Max via the `/api/unifi` endpoint:

```typescript
// API endpoint structure
GET /api/unifi?action=devices  // Get all devices
GET /api/unifi?action=clients  // Get connected clients
GET /api/unifi?action=alarms   // Get active alarms
```

---

## Incidents Management

**Route**: `/security/incidents`

### Features

1. **Incident Tracking**
   - Create, update, and resolve incidents
   - Severity classification (Critical/High/Medium/Low)
   - Status workflow (Open → Investigating → Resolved → Closed)

2. **Database Persistence**
   - Supabase-backed storage
   - Full audit trail
   - Timeline tracking

3. **Notifications**
   - Email alerts on status changes
   - Slack integration (optional)
   - In-app notifications

### Incident Schema

```typescript
interface Incident {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  assignee?: string
  created_at: string
  updated_at: string
  timeline: TimelineEntry[]
}
```

---

## Red Team Operations

**Route**: `/security/redteam`

### Features

1. **Attack Surface Visualization**
   - Layered network view (External → Gateway → Internal → Endpoints)
   - Risk level indicators
   - Asset classification

2. **Vulnerability Scanning**
   - Port scanning
   - Service enumeration
   - CVE lookup

3. **Scan Scheduling**
   - Recurring scan configuration
   - Multiple scan types
   - Target selection

### Network Layers

| Layer | Description | Risk Assessment |
|-------|-------------|-----------------|
| External | Internet-facing assets | Highest exposure |
| Gateway | Firewalls, VPN endpoints | Perimeter security |
| Internal | Core infrastructure | Network segmentation |
| Endpoints | Workstations, servers | User-accessible |

---

## Compliance & Audit

**Route**: `/security/compliance`

### Supported Frameworks

| Framework | Description | Control Count |
|-----------|-------------|---------------|
| **NIST 800-53** | Federal security controls | 1,000+ |
| **NIST 800-171** | CUI protection | 110 |
| **CMMC** | DoD cybersecurity maturity | 171 (Level 2) |
| **NISPOM** | Industrial Security Program | N/A |
| **FOCI** | Foreign Ownership/Control | N/A |
| **SBIR/STTR** | Small Business Innovation | N/A |
| **ITAR** | Arms trafficking regulations | N/A |
| **EAR** | Export Administration | N/A |
| **ICD 503** | Intelligence Community RMF | 300+ |
| **CNSSI 1253** | National Security Systems | 800+ |
| **FedRAMP High** | Cloud authorization | 421 |

### Tabs

1. **Frameworks**: Select and view compliance framework controls
2. **Audit Logs**: View security action history
3. **Reports**: Generate compliance reports and exports
4. **Exostar**: Configure DoD supply chain integration

### Reports

- **Compliance Report**: Full framework assessment PDF
- **Export Data**: CSV export of all controls
- **Screening Report**: Personnel clearance status
- **Incident History**: Security event timeline

---

## Forms & Documents

**Route**: `/security/forms`

### Document Types

| Category | Documents |
|----------|-----------|
| **System Security Plans** | NIST 800-53 SSP, NIST 800-171 SSP, CMMC SSP, ICD 503 SSP, FedRAMP SSP |
| **POA&M** | Master POA&M, CMMC POA&M |
| **FCL/Clearance** | DD Form 254, SF-86, SF-312 |
| **FOCI** | SF-328, FOCI Mitigation Plan |
| **Assessments** | SPRS Self-Assessment, CMMC Self-Assessment |
| **Contracts** | SBIR/STTR Proposal Template |

### Actions

1. **Generate**: Create new document from template with real data
2. **View**: Open document in modal viewer
3. **Download**: Download document (PDF/DOCX)
4. **Quick Actions**:
   - Generate All SSPs
   - Export All Documents
   - Submit to Exostar

### Document Generation API

```typescript
// Generate SSP
POST /api/security/documents/generate
{
  "type": "ssp",
  "framework": "NIST-800-53",
  "formId": "ssp-nist-800-53"
}

// Response includes HTML content for viewing/download
```

---

## FCL Tracking

**Route**: `/security/fcl`

### Features

1. **Overview Tab**
   - Facility Clearance Level status (TS/SCI, TS, Secret, etc.)
   - Organization information
   - CAGE/DUNS codes
   - Sponsor information

2. **Key Personnel Tab**
   - FSO, ITPSO, AFSO tracking
   - Clearance status per individual
   - Add/Edit personnel functionality
   - Database persistence

3. **Training Tab**
   - Annual training requirements
   - Completion tracking
   - Due date monitoring
   - CDSE portal integration

4. **Documents Tab**
   - FCL-related document management
   - Upload/download functionality

### Regulatory Compliance

- **NISPOM**: 32 CFR Part 117
- **E.O. 12829**: National Industrial Security Program
- **DCSA**: Defense Counterintelligence and Security Agency requirements

---

## Exostar Integration

### Purpose

Exostar is a DoD-approved supply chain risk management platform used for:
- CMMC assessment coordination
- Supply chain visibility
- Contractor verification

### Configuration

1. Navigate to `/security/compliance`
2. Click "Exostar" tab
3. Enter Organization ID and API Key
4. Click "Save Credentials"
5. Credentials are encrypted at rest using AES-256-GCM

### API Endpoints

```typescript
// Get configuration status
GET /api/security/exostar/config

// Save credentials (encrypted)
POST /api/security/exostar/config
{
  "orgId": "MYCOSOFT-ORG-001",
  "apiKey": "your-api-key"
}

// Sync data with Exostar
POST /api/security/exostar/sync
```

### Security

- API keys encrypted using AES-256-GCM
- Encryption key derived from environment variable
- Keys stored in `exostar_integrations` Supabase table
- Only decrypted server-side during API calls

---

## Security Admin Role

### Overview

The `SECURITY_ADMIN` role provides access to all security and compliance features without super admin capabilities.

### Permissions

| Capability | SECURITY_ADMIN | SUPER_ADMIN |
|------------|----------------|-------------|
| SOC Dashboard | ✅ | ✅ |
| Network Monitor | ✅ | ✅ |
| Incidents | ✅ | ✅ |
| Red Team | ✅ | ✅ |
| Compliance | ✅ | ✅ |
| Forms | ✅ | ✅ |
| FCL Tracking | ✅ | ✅ |
| Exostar Config | ✅ | ✅ |
| System Kill Switch | ❌ | ✅ |
| User Management | ❌ | ✅ |
| System Override | ❌ | ✅ |

### Assigned Users

- `garret@mycosoft.org` - CTO

### Implementation

```typescript
// lib/access/types.ts
export enum UserRole {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SECURITY_ADMIN = 'security_admin'  // NEW
}
```

---

## API Reference

### Security API (`/api/security`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `?action=fcl-personnel` | GET | Get key personnel list |
| `?action=fcl-training` | GET | Get training records |
| `?action=compliance-controls` | GET | Get compliance controls |
| `?action=compliance-stats` | GET | Get compliance statistics |
| `?action=compliance-audit-logs` | GET | Get audit log entries |

### Exostar API (`/api/security/exostar`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/config` | GET | Get Exostar configuration status |
| `/config` | POST | Save encrypted credentials |
| `/sync` | POST | Trigger data synchronization |

### Documents API (`/api/security/documents`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate` | POST | Generate SSP or POA&M document |
| `/download` | GET | Get document download URL |
| `/view` | GET | Get document content for viewing |

---

## Database Schema

### Tables

#### `exostar_integrations`
```sql
CREATE TABLE exostar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  is_connected BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `compliance_documents`
```sql
CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  form_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  framework TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `fcl_key_personnel`
```sql
CREATE TABLE fcl_key_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  clearance TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `fcl_training_records`
```sql
CREATE TABLE fcl_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_name TEXT NOT NULL,
  category TEXT NOT NULL,
  due_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'pending',
  personnel_id UUID REFERENCES fcl_key_personnel(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Deployment Guide

### Local Development

```bash
# Start development server on port 3010
npm run dev

# Access at
http://localhost:3010/security
```

### Production Deployment

1. **Build**
   ```bash
   docker build -t website-website:latest --no-cache .
   ```

2. **Deploy**
   ```bash
   docker compose -p mycosoft-production up -d mycosoft-website
   ```

3. **Verify**
   - Navigate to `https://sandbox.mycosoft.com/security`
   - Login with authorized account
   - Verify all sections load correctly

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
EXOSTAR_ENCRYPTION_KEY=your-32-char-encryption-key
```

---

## Changelog

### v2.0.0 (January 20, 2026)
- Added Exostar integration with encrypted credential storage
- Implemented SSP/POA&M document generation
- Added SECURITY_ADMIN role for garret@mycosoft.org
- Created comprehensive Forms page with all actions working
- Added Quick Actions (Generate All SSPs, Export All, Submit to Exostar)
- Implemented first-time user walkthrough wizard

### v1.0.0 (January 19, 2026)
- Initial SOC Dashboard implementation
- Network Monitor with UniFi integration
- Incidents management with database persistence
- Red Team attack surface visualization
- Multi-framework compliance support

---

*Document maintained by: Mycosoft Security Team*
*Classification: CUI // UNCLASSIFIED*
