# Mycosoft Security Operations Center - Staff User Guide

## Version: 2.0.0 | Document Date: January 20, 2026
## Classification: CUI // UNCLASSIFIED

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [SOC Dashboard](#soc-dashboard)
4. [Network Monitor](#network-monitor)
5. [Incident Management](#incident-management)
6. [Red Team Operations](#red-team-operations)
7. [Compliance & Audit](#compliance--audit)
8. [Forms & Documents](#forms--documents)
9. [FCL Tracking](#fcl-tracking)
10. [First-Time User Tour](#first-time-user-tour)
11. [Troubleshooting](#troubleshooting)
12. [Contact & Support](#contact--support)

---

## Introduction

Welcome to the Mycosoft Security Operations Center (SOC). This guide provides instructions for all staff members on how to use the security and compliance features of the Mycosoft platform.

### Who Should Use This Guide

- **Facility Security Officers (FSO)**
- **IT Security Personnel (ITPSO)**
- **Compliance Officers**
- **CTOs and Technical Leadership**
- **Any staff with SECURITY_ADMIN role**

### Access Requirements

To access the Security Operations Center, you need:

1. **A Mycosoft account** (login via Google OAuth or email/password)
2. **Appropriate role assignment** (SECURITY_ADMIN or higher)
3. **VPN connection** (if accessing from outside the network)

---

## Getting Started

### Step 1: Login

1. Navigate to **https://mycosoft.com** (or https://sandbox.mycosoft.com for testing)
2. Click **Sign In** in the top right corner
3. Login with your Google account or email/password

### Step 2: Access Security Center

1. Click **Security** in the main navigation bar
2. You will be directed to the SOC Dashboard

### Step 3: First-Time User Tour

If this is your first time accessing the Security section, you'll see a **Welcome Modal** offering a guided tour. We recommend taking the tour to familiarize yourself with all features.

---

## SOC Dashboard

**URL**: `/security`

The SOC Dashboard is your central hub for security monitoring.

### What You'll See

| Section | Description |
|---------|-------------|
| **Threat Level** | Current threat status (LOW/MODERATE/HIGH/CRITICAL) |
| **Active Threats** | Number of unresolved security incidents |
| **Network Health** | Overall network status percentage |
| **Compliance Score** | Your organization's compliance percentage |
| **Recent Alerts** | Latest security events |

### Quick Actions

- **Click on metric cards** to navigate to detailed views
- **Use navigation links** to access specific modules
- **"Replay Tour" button** to re-watch the guided walkthrough

---

## Network Monitor

**URL**: `/security/network`

Monitor your entire network infrastructure in real-time with UniFi integration.

### Tabs

| Tab | Purpose |
|-----|---------|
| **Overview** | WAN status, throughput, clients summary, alarms |
| **Devices** | All network devices (routers, switches, access points) |
| **Clients** | Connected client devices (computers, phones, IoT) |
| **Traffic** | Bandwidth usage and traffic categories |
| **Topology** | Interactive network map visualization |

### How to Use

1. **Check WAN Status**: Verify your internet connection is active
2. **Review Devices**: Ensure all network devices show "online" status
3. **Monitor Clients**: See who/what is connected to your network
4. **View Topology**: Understand your network layout visually

### Actions

- **Refresh**: Click the refresh button to get latest data
- **View Device Details**: Click any device card for more information
- **Filter Clients**: Use All/Wired/Wireless buttons to filter

---

## Incident Management

**URL**: `/security/incidents`

Track and manage all security incidents from detection to resolution.

### Creating an Incident

1. Click the **"+ Create Incident"** button
2. Fill in the required fields:
   - **Title**: Brief description of the incident
   - **Description**: Detailed information
   - **Severity**: Critical / High / Medium / Low
   - **Category**: Data Breach / Malware / Phishing / etc.
3. Click **Create**

### Managing Incidents

| Status | Meaning |
|--------|---------|
| **Open** | New incident, not yet investigated |
| **Investigating** | Currently being worked on |
| **Resolved** | Issue fixed, pending verification |
| **Closed** | Incident fully resolved and documented |

### Filtering & Search

- Use the **search bar** to find specific incidents
- Use **filter dropdowns** to filter by status or severity
- Click any incident to view details and timeline

---

## Red Team Operations

**URL**: `/security/redteam`

Offensive security tools for vulnerability assessment.

### Features

1. **Attack Surface Map**
   - Visual representation of your network layers
   - Identifies high-risk assets
   - Shows potential attack vectors

2. **Vulnerability Scanning**
   - **Port Scan**: Discover open ports
   - **Service Enumeration**: Identify running services
   - **Full Assessment**: Comprehensive vulnerability scan

3. **Scan Scheduler**
   - Schedule recurring security scans
   - Configure scan frequency (daily/weekly/monthly)
   - Select target networks or hosts

### Running a Scan

1. Select **Scan Type** (Port Scan, Service Enum, Full Assessment)
2. Choose **Target** (network range or specific hosts)
3. Set **Schedule** (one-time or recurring)
4. Click **Start Scan**

> **Note**: Scans may take several minutes to complete depending on scope.

---

## Compliance & Audit

**URL**: `/security/compliance`

Manage compliance across 11 security frameworks.

### Supported Frameworks

| Framework | Description |
|-----------|-------------|
| **NIST 800-53** | Federal information security controls |
| **NIST 800-171** | Controlled Unclassified Information (CUI) protection |
| **CMMC** | Cybersecurity Maturity Model Certification |
| **NISPOM** | National Industrial Security Program |
| **FOCI** | Foreign Ownership, Control, or Influence |
| **SBIR/STTR** | Small Business Innovation Research |
| **ITAR** | International Traffic in Arms Regulations |
| **EAR** | Export Administration Regulations |
| **ICD 503** | Intelligence Community Risk Management Framework |
| **CNSSI 1253** | National Security Systems categorization |
| **FedRAMP High** | Federal Risk and Authorization Management |

### Tabs

#### 1. Controls Tab
- Select a framework to view its controls
- Browse controls by family (Access Control, Audit, etc.)
- Click any control to see details and update status

#### 2. Audit Logs Tab
- View all compliance-related actions
- Track who made changes and when
- Export logs for auditing purposes

#### 3. Reports Tab
Generate and export compliance documentation:

| Report | Description | Format |
|--------|-------------|--------|
| **Compliance Report** | Full framework assessment | PDF |
| **Export Data** | All controls with status | CSV |
| **Screening Report** | Personnel clearance status | PDF |
| **Incident History** | Security events timeline | PDF |

#### 4. Exostar Tab
Configure DoD supply chain integration:

1. Enter your **Organization ID**
2. Enter your **API Key** (provided by Exostar)
3. Click **Save Credentials**
4. Click **Sync with Exostar** to pull/push data

> **Security Note**: Credentials are encrypted at rest using AES-256-GCM.

---

## Forms & Documents

**URL**: `/security/forms`

Generate, manage, and submit compliance documentation.

### Document Categories

| Category | Documents Included |
|----------|--------------------|
| **System Security Plans** | SSPs for NIST, CMMC, ICD 503, FedRAMP |
| **POA&M** | Plan of Action & Milestones documents |
| **FCL/Clearance** | DD Form 254, SF-86, SF-312 |
| **FOCI** | SF-328, FOCI Mitigation Plan |
| **Assessments** | SPRS, CMMC Self-Assessments |
| **Contracts** | SBIR/STTR Templates |

### Document Actions

| Button | Action |
|--------|--------|
| **View** | Open document in modal viewer |
| **Download** | Download as PDF/DOCX |
| **Generate** | Create new version with current data |

### Quick Actions

- **Generate All SSPs**: Creates SSPs for all frameworks at once
- **Export All Documents**: Downloads all documents as ZIP
- **Submit to Exostar**: Sends documents to Exostar portal

### Generating a Document

1. Find the document in the list
2. Click the **Generate** button
3. Wait for generation to complete
4. Use **View** to preview or **Download** to save

---

## FCL Tracking

**URL**: `/security/fcl`

Manage Facility Clearance Level, personnel, and training.

### Tabs

#### 1. Overview Tab
- Current FCL status and level
- CAGE/DUNS codes
- Sponsor information
- Clearance expiration dates

#### 2. Key Personnel Tab
Manage security personnel:

| Role | Responsibilities |
|------|------------------|
| **FSO** | Facility Security Officer |
| **ITPSO** | Information Technology Security Officer |
| **AFSO** | Alternate Facility Security Officer |

**Adding Personnel**:
1. Click **"+ Add Personnel"**
2. Fill in name, title, role, and clearance level
3. Click **Save**

#### 3. Training Tab
Track annual security training:

- View required trainings and due dates
- See completion status (Completed/In Progress/Due/Overdue)
- Click **"Open CDSE Portal"** for official training

#### 4. Required Forms Tab
Access FCL-related forms and templates.

---

## First-Time User Tour

The walkthrough tour system helps new staff learn the platform.

### Starting the Tour

The tour automatically starts on your first visit. You can also:

1. Look for the **"Take Tour"** button (green pulsing button)
2. Click it to start or replay the tour

### During the Tour

- **Spotlight**: Highlights the current element
- **Tooltip**: Explains what the element does
- **Navigation**: Use Back/Next to move through steps
- **Skip**: Click "Skip tour" to exit early

### Available Tours

| Page | Steps | What You'll Learn |
|------|-------|-------------------|
| SOC Dashboard | 7 | Navigation and metrics overview |
| Network Monitor | 5 | Device monitoring and topology |
| Incidents | 4 | Creating and managing incidents |
| Red Team | 4 | Vulnerability scanning |
| Compliance | 7 | Framework management and reports |
| Forms | 8 | Document generation and submission |
| FCL Tracking | 4 | Personnel and training management |

### Tour Features

- **Automatic Tab Switching**: The tour automatically switches tabs when needed
- **Page Navigation**: Tour navigates to the correct page for each step
- **Visual Highlighting**: Elements are highlighted with a glowing border
- **Lighter Overlay**: Background is still visible during the tour

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Can't access Security section | Verify you have SECURITY_ADMIN role assigned |
| Network Monitor shows no data | Check UniFi API connection in settings |
| Documents won't generate | Ensure all required fields are populated |
| Exostar sync fails | Verify credentials are correct |
| Tour not starting | Clear browser localStorage and refresh |

### Getting Help

1. **In-App Tour**: Click "Replay Tour" on any page
2. **Documentation**: Check `/docs` folder for detailed guides
3. **IT Support**: Contact it@mycosoft.org
4. **Security Team**: Contact security@mycosoft.org

---

## Contact & Support

| Role | Contact |
|------|---------|
| **IT Support** | it@mycosoft.org |
| **Security Team** | security@mycosoft.org |
| **Compliance Questions** | compliance@mycosoft.org |
| **FSO** | fso@mycosoft.org |

### Emergency Contacts

For **critical security incidents**:
1. Call the Security Hotline: (XXX) XXX-XXXX
2. Create a CRITICAL incident in the system
3. Notify the FSO immediately

---

## Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Show keyboard shortcuts |
| `Esc` | Close modal/dialog |
| `Enter` | Confirm action |

### URLs

| Page | URL |
|------|-----|
| SOC Dashboard | `/security` |
| Network Monitor | `/security/network` |
| Incidents | `/security/incidents` |
| Red Team | `/security/redteam` |
| Compliance | `/security/compliance` |
| Forms | `/security/forms` |
| FCL Tracking | `/security/fcl` |

---

*This document is maintained by the Mycosoft Security Team.*
*Last Updated: January 20, 2026*
*Version: 2.0.0*
