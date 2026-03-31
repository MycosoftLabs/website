---
description: Navigate the API Gateway at mycosoft.com — 84+ API routes with documentation, endpoint testing, and key management across CREP, MINDEX, MAS, security, search, species, and devices domains.
---

# API Gateway

## Identity
- **Category**: dev
- **Access Tier**: AUTHENTICATED access
- **Depends On**: platform-authentication, platform-navigation
- **Route**: /natureos/api
- **Key Components**: API route catalog, endpoint tester, API key management, domain-organized documentation (CREP, MINDEX, MAS, security, search, species, devices)

## Success Criteria (Eval)
- [ ] API Gateway page loads at /natureos/api
- [ ] 84+ API routes are listed and browsable
- [ ] Routes are organized by domain (CREP, MINDEX, MAS, security, search, species, devices)
- [ ] Endpoint testing interface allows sending requests and viewing responses
- [ ] API key management is accessible (create, revoke, view keys)
- [ ] API documentation renders for each endpoint

## Navigation Path (Computer Use)
1. Log in with any authenticated account
2. Navigate to NatureOS section
3. Click "API" or go directly to /natureos/api
4. Browse the API route catalog by domain

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| API Gateway heading | Top of page | Confirms correct page |
| Domain filter / category tabs | Top or sidebar — CREP, MINDEX, MAS, etc. | Click to filter routes by domain |
| Route list | Center — scrollable list of 84+ endpoints | Browse and click to expand endpoint details |
| Endpoint detail panel | Expands on route click — method, URL, parameters | Review docs and test the endpoint |
| Request builder | Within endpoint detail — method, headers, body fields | Configure and send test requests |
| Response viewer | Below request builder — shows response body, status, headers | Review API response |
| API Key Management | Separate tab or section | Create, view, and revoke API keys |
| Search bar | Top of route list | Search across all 84+ endpoints |

## Core Actions
### Action 1: Browse API Routes
**Goal:** Explore available API endpoints by domain
1. Navigate to /natureos/api
2. Use domain filter tabs to select a category:
   - CREP — environmental data endpoints
   - MINDEX — mushroom index database
   - MAS — multi-agent system
   - Security — authentication and authorization
   - Search — search and query endpoints
   - Species — species data and taxonomy
   - Devices — device management endpoints
3. Scroll through the route list
4. Click a route to expand its documentation

### Action 2: Test an API Endpoint
**Goal:** Send a test request to an endpoint and view the response
1. Click on an endpoint in the route list
2. Review the endpoint documentation (method, URL, parameters, body schema)
3. Fill in required parameters in the request builder
4. Add authentication headers if needed (API key or bearer token)
5. Click "Send" or "Test" button
6. Review the response: status code, headers, body

### Action 3: Manage API Keys
**Goal:** Create or revoke API keys for programmatic access
1. Navigate to API Key Management section
2. View existing keys (name, creation date, last used, permissions)
3. Click "Create Key" to generate a new API key
4. Set key name, permissions, and expiration
5. Copy the generated key (shown only once)
6. To revoke, click the revoke button on an existing key

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Access denied / login redirect | Not authenticated | Log in with any valid account |
| Route list empty or loading forever | API catalog service down | Refresh; check backend service health |
| Test request returns 401 | Missing or invalid authentication | Add API key or bearer token to request headers |
| Test request returns 404 | Incorrect endpoint URL or parameters | Double-check the route path and required parameters |
| API key creation fails | Rate limit or permission issue | Check if you have key creation permissions; wait and retry |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation
- **Next skills**: dev-sdk, dev-functions, dev-cloud-shell

## Computer Use Notes
- The 84+ routes are organized by domain — use the category filter to narrow down
- Endpoint documentation typically shows: HTTP method (GET/POST/PUT/DELETE), URL pattern, request parameters, request body schema, response schema
- The request builder is similar to Postman/Swagger UI — fill fields and click send
- API keys are shown only once at creation — copy immediately
- Some endpoints require specific access tiers beyond basic authentication
- The search bar searches across endpoint names, descriptions, and URL patterns

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
