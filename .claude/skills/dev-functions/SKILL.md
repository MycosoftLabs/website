---
description: Navigate Functions at mycosoft.com — serverless function deployment and management including creation, testing, and deployment of cloud functions on NatureOS.
---

# Functions

## Identity
- **Category**: dev
- **Access Tier**: AUTHENTICATED access
- **Depends On**: platform-authentication, platform-navigation
- **Route**: /natureos/functions
- **Key Components**: Function list, code editor, test runner, deployment pipeline, logs viewer

## Success Criteria (Eval)
- [ ] Functions page loads at /natureos/functions
- [ ] Existing functions are listed with status (deployed, draft, error)
- [ ] New function can be created via the interface
- [ ] Function code editor allows writing and editing
- [ ] Test runner executes functions and shows output
- [ ] Deployment workflow promotes functions to production

## Navigation Path (Computer Use)
1. Log in with any authenticated account
2. Navigate to NatureOS section
3. Click "Functions" or go directly to /natureos/functions
4. View the function list dashboard

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Functions heading | Top of page | Confirms correct page |
| Function list | Center — table/grid of functions | Browse existing functions |
| "Create Function" button | Top-right or action bar | Click to create a new function |
| Function status badges | In each function row — Deployed/Draft/Error | Check function health |
| Code editor | Opens on function selection — syntax-highlighted editor | Write or edit function code |
| Test panel | Right side or below editor | Configure test input and run tests |
| Deploy button | Top of editor or action bar | Deploy function to production |
| Logs viewer | Tab or panel within function detail | View execution logs |
| Runtime selector | In function settings — language/runtime dropdown | Choose execution environment |

## Core Actions
### Action 1: Create a New Function
**Goal:** Write and deploy a new serverless function
1. Click "Create Function" button
2. Enter function name and description
3. Select runtime/language (e.g., Python, JavaScript, Go)
4. Write function code in the editor
5. Configure trigger (HTTP, schedule, event)
6. Save as draft

### Action 2: Test a Function
**Goal:** Execute a function with test input and verify output
1. Select a function from the list
2. Open the test panel
3. Configure test input (JSON payload, query parameters, headers)
4. Click "Run Test" or "Execute"
5. Review the output: return value, execution time, logs
6. Iterate on code and re-test as needed

### Action 3: Deploy a Function
**Goal:** Promote a tested function to production
1. Select a function showing "Draft" or "Ready" status
2. Review the code one final time
3. Click "Deploy" button
4. Confirm the deployment
5. Wait for deployment to complete
6. Verify status changes to "Deployed"
7. Test the live endpoint

### Action 4: View Function Logs
**Goal:** Debug or monitor function execution
1. Select a deployed function
2. Click the "Logs" tab
3. Review execution logs with timestamps
4. Filter by log level (info, warn, error)
5. Search logs for specific terms
6. Check for error patterns or performance issues

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Access denied / login redirect | Not authenticated | Log in with any valid account |
| Function list empty | No functions created yet | Click "Create Function" to start |
| Deployment fails with error | Code error, dependency issue, or quota exceeded | Check error message; fix code; verify quotas |
| Test returns unexpected output | Logic error in function code | Debug using logs; check input format |
| "Runtime not available" | Selected runtime not supported | Choose a supported runtime from the dropdown |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation
- **Next skills**: dev-api-gateway, dev-cloud-shell, dev-containers

## Computer Use Notes
- The code editor supports syntax highlighting — look for the language mode in the status bar
- Test input is typically JSON — format it properly before running
- Deployment may take 10-30 seconds — wait for the status badge to update
- Function logs are near-real-time but may have a slight delay
- The "Create Function" button is typically a prominent primary action button
- Tab between code editor, test panel, and logs using tabs within the function detail view
- Auto-save may be enabled — check for save indicators

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
