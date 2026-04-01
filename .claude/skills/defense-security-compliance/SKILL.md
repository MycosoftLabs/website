---
description: Navigate Security Compliance at mycosoft.com — SSP and POA&M document generation, compliance document management, and Exostar integration for DoD SCRM.
---

# Security Compliance

## Identity
- **Category**: defense
- **Access Tier**: ADMIN-only
- **Depends On**: platform-authentication, platform-navigation, defense-soc-dashboard
- **Route**: /security (Compliance & Audit section)
- **Key Components**: SSP document generator, POA&M tracker, compliance document library, Exostar DoD SCRM integration

## Success Criteria (Eval)
- [ ] Compliance & Audit section accessible from /security
- [ ] SSP (System Security Plan) documents can be viewed and generated
- [ ] POA&M (Plan of Action & Milestones) documents can be viewed and managed
- [ ] Compliance document library lists all current documents with status
- [ ] Exostar integration for DoD SCRM is functional
- [ ] Document generation workflow produces valid compliance artifacts

## Navigation Path (Computer Use)
1. Log in with ADMIN-tier credentials
2. Navigate to /security
3. Click "Compliance & Audit" tab in the SOC Dashboard navigation
4. Browse the compliance document library

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Compliance & Audit heading | Top of section | Confirms correct sub-section |
| Document Library table | Center — list of compliance documents | Browse, filter, and select documents |
| SSP Documents section | Grouped in library or separate tab | System Security Plan documents |
| POA&M Documents section | Grouped in library or separate tab | Plan of Action & Milestones tracking |
| Document status badges | In each document row — Draft/Approved/Expired | Check document currency |
| "Generate SSP" button | Top-right or action bar | Create new SSP document |
| "Generate POA&M" button | Top-right or action bar | Create new POA&M document |
| Exostar SCRM panel | Sidebar or dedicated section | DoD supply chain risk data |
| Document viewer | Opens on document selection | Read/review document content |

## Core Actions
### Action 1: Review Compliance Document Library
**Goal:** See all compliance documents and their current status
1. Navigate to /security > Compliance & Audit
2. Review the document library table
3. Check status column: Draft, Approved, Expired, Under Review
4. Note any expired documents needing renewal
5. Filter by document type (SSP, POA&M, other)

### Action 2: Generate SSP Document
**Goal:** Create a new System Security Plan
1. Click "Generate SSP" button
2. Select the system/scope for the SSP
3. Review auto-populated security controls and settings
4. Edit sections as needed (system description, boundaries, controls)
5. Save as draft or submit for approval
6. Download generated document (PDF/DOCX)

### Action 3: Manage POA&M Items
**Goal:** Track and update Plan of Action & Milestones
1. Navigate to POA&M section
2. Review open action items with due dates and status
3. Click an item to see details (finding, remediation plan, responsible party)
4. Update status (Open, In Progress, Completed, Accepted Risk)
5. Add evidence or notes to completed items
6. Track milestone progress against deadlines

### Action 4: Review Exostar DoD SCRM Data
**Goal:** Check DoD supply chain risk management compliance
1. Navigate to Exostar integration panel
2. Verify connection status and encryption (AES-256-GCM)
3. Review supply chain risk scores and assessments
4. Check compliance status with DoD requirements
5. Export SCRM reports as needed

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Access denied / 403 | Not ADMIN-tier | Request ADMIN access from system administrator |
| SSP generation fails | Template not configured or data incomplete | Check system configuration; fill required fields |
| POA&M items missing | Database sync issue or filter applied | Clear filters; check data source connectivity |
| Exostar "Disconnected" | API credentials expired or network issue | Update Exostar credentials; verify network access |
| Document shows "Expired" status | Compliance document past review date | Initiate renewal process; generate updated version |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation, defense-soc-dashboard
- **Next skills**: defense-fusarium, defense-crep-dashboard

## Computer Use Notes
- This is a sub-section of the SOC Dashboard at /security — navigate there first
- Compliance documents follow federal standards (NIST, CMMC, etc.)
- SSP generation may take several seconds as it pulls system configuration data
- POA&M is a living document — items are continuously tracked and updated
- Exostar integration requires active DoD supply chain enrollment
- Document generation produces downloadable artifacts (PDF, DOCX)
- All Exostar communications use AES-256-GCM encryption

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
