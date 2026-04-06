---
description: Navigate the Cloud Shell at mycosoft.com — browser-based terminal for NatureOS operations including command execution, file management, and service interaction.
---

# Cloud Shell

## Identity
- **Category**: dev
- **Access Tier**: AUTHENTICATED access
- **Depends On**: platform-authentication, platform-navigation
- **Route**: /natureos/shell
- **Key Components**: Browser-based terminal emulator, command execution engine, file browser, service interaction layer

## Success Criteria (Eval)
- [ ] Cloud Shell page loads at /natureos/shell
- [ ] Terminal emulator renders with a command prompt
- [ ] Commands can be typed and executed
- [ ] Command output displays correctly in the terminal
- [ ] File management operations work (ls, cat, etc.)
- [ ] Service interaction commands connect to NatureOS services

## Navigation Path (Computer Use)
1. Log in with any authenticated account
2. Navigate to NatureOS section
3. Click "Shell" or go directly to /natureos/shell
4. Wait for the terminal session to initialize

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Cloud Shell heading | Top of page or terminal title bar | Confirms correct page |
| Terminal emulator | Center — dark background with command prompt | Type commands here |
| Command prompt | Left side of terminal — $ or > character | Indicates ready for input |
| Command output | Below executed commands in terminal | Read results of executed commands |
| File browser panel | Left sidebar (if present) | Browse files visually |
| Toolbar | Above terminal — buttons for common actions | Copy, paste, clear, resize |
| Session info | Top-right or status bar | Shows session ID, connection status |
| Font size controls | Toolbar or settings | Adjust terminal text size |

## Core Actions
### Action 1: Execute Commands
**Goal:** Run commands in the NatureOS environment
1. Navigate to /natureos/shell
2. Wait for the terminal prompt to appear
3. Type a command at the prompt
4. Press Enter to execute
5. Read the output displayed in the terminal
6. Continue with additional commands as needed

### Action 2: Manage Files
**Goal:** Browse and manage files in the NatureOS filesystem
1. Use terminal commands: ls, cd, cat, cp, mv, rm
2. Or use the file browser panel if available
3. Navigate directory structure
4. View file contents with cat or less
5. Create or edit files as needed

### Action 3: Interact with Services
**Goal:** Query or control NatureOS services from the shell
1. Use service-specific CLI commands
2. Query API endpoints with curl
3. Check service status with systemctl or similar
4. View service logs
5. Restart services if needed (permission-dependent)

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Terminal shows "Connecting..." indefinitely | Session backend not responding | Refresh the page; check service health |
| Access denied / login redirect | Not authenticated | Log in with any valid account |
| "Permission denied" on commands | Insufficient privileges for the operation | Check your access tier; some commands require elevated access |
| Terminal frozen / no response | Session timed out or WebSocket dropped | Refresh the page to start a new session |
| Output garbled or misaligned | Terminal size mismatch | Resize the terminal or refresh; adjust font size |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation
- **Next skills**: dev-api-gateway, dev-functions, dev-containers

## Computer Use Notes
- The terminal is a browser-based emulator — standard terminal keyboard shortcuts may work (Ctrl+C, Ctrl+L, etc.)
- Click inside the terminal area to focus it before typing
- Copy/paste may require Ctrl+Shift+C / Ctrl+Shift+V in the terminal (not Ctrl+C/V)
- The terminal session has a timeout — inactive sessions will disconnect
- Font size may be small by default — look for zoom controls in the toolbar
- The terminal background is typically dark (black/dark grey) with light text
- File paths in the shell are relative to the NatureOS environment, not the local machine

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
