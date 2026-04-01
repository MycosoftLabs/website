---
description: Specification for adding aria-label attributes across all interactive UI elements to support Computer Use navigation and accessibility.
---

# UI Semantic Labels

## Identity
- **Category**: ui
- **Access Tier**: N/A (development specification)
- **Depends On**: None (applies to all UI components)
- **Route**: N/A (cross-cutting concern)
- **Key Components**: All interactive component files across the application

## Success Criteria (Eval)
- [ ] Every interactive element (button, link, input, dropdown) has a descriptive aria-label
- [ ] Header dropdowns have aria-labels identifying their section (e.g., `aria-label="Defense menu dropdown"`)
- [ ] Sidebar navigation items have aria-labels matching their visible text plus context
- [ ] Form fields have aria-labels describing their purpose
- [ ] Map controls and tool viewport actions have aria-labels
- [ ] Computer Use agents can reliably find and interact with all labeled elements

## Navigation Path (Computer Use)
1. This is a development specification -- no runtime navigation needed
2. Apply labels during component development or as a batch update
3. Verify labels using browser accessibility inspector or automated tests

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Header navigation dropdowns | Top header bar | Add `aria-label="[Section] menu dropdown"` to each trigger |
| Header dropdown items | Within header dropdown menus | Add `aria-label="Navigate to [Tool Name]"` |
| Sidebar navigation items | Left sidebar | Add `aria-label="[Tool Name] navigation link"` |
| Sidebar section expanders | Left sidebar section headers | Add `aria-label="Expand [Section] section"` |
| Action buttons (Save, Submit, Delete, etc.) | Various locations | Add `aria-label="[Action] [context]"` e.g., `"Save device configuration"` |
| Icon-only buttons | Toolbars, panels | Add `aria-label="[Action]"` -- critical since there is no visible text |
| Form input fields | Forms throughout app | Add `aria-label="[Field purpose]"` or associate with visible label via `htmlFor` |
| Search input fields | Header, sidebars, panels | Add `aria-label="Search [context]"` e.g., `"Search agents"` |
| Map zoom/pan controls | Map-based tools | Add `aria-label="Zoom in/out/Pan [direction]"` |
| Layer toggle switches | Map control panels | Add `aria-label="Toggle [layer name] layer"` |
| Tool viewport action buttons | Tool title bars | Add `aria-label="[Action] [tool name]"` e.g., `"Maximize Earth Simulator"` |
| Modal close buttons | Modal dialogs | Add `aria-label="Close [dialog name] dialog"` |
| Tab controls | Tabbed interfaces | Add `aria-label="[Tab name] tab"` |
| Gauge/meter displays | Dashboard panels | Add `aria-label="[Metric name]: [value]"` with `aria-live="polite"` |

## Core Actions
### Action 1: Label header dropdowns
**Goal:** Make header navigation dropdowns identifiable by Computer Use
1. Locate all header dropdown trigger elements
2. Add aria-labels following the pattern: `aria-label="[Section] menu dropdown"`
3. Examples:
   - Defense dropdown trigger: `aria-label="Defense menu dropdown"`
   - Science dropdown trigger: `aria-label="Science menu dropdown"`
   - Lab dropdown trigger: `aria-label="Lab tools menu dropdown"`
   - Devices dropdown trigger: `aria-label="Devices menu dropdown"`
4. Label dropdown menu items: `aria-label="Navigate to [Tool Name]"`

### Action 2: Label sidebar navigation
**Goal:** Make all sidebar links identifiable
1. Locate sidebar navigation component(s)
2. For each nav item, add: `aria-label="[Tool Name] navigation link"`
3. For section expanders: `aria-label="Expand [Section Name] section"` / `"Collapse [Section Name] section"`
4. Ensure the aria-label is more descriptive than just the visible text when the text alone is ambiguous

### Action 3: Label buttons and form controls
**Goal:** Make all interactive controls identifiable
1. Audit all button elements -- especially icon-only buttons that lack visible text
2. Add descriptive aria-labels: `aria-label="Save configuration"`, `"Delete device"`, `"Refresh data"`
3. For form inputs, either:
   - Associate with a visible `<label>` via `htmlFor`/`id` pair, OR
   - Add `aria-label="[Field description]"`
4. For toggle switches: `aria-label="Toggle [feature name]"` with `aria-checked` state

### Action 4: Label map and tool viewport controls
**Goal:** Make spatial UI controls identifiable
1. Map zoom buttons: `aria-label="Zoom in"`, `aria-label="Zoom out"`
2. Map layer toggles: `aria-label="Toggle [layer] layer"`
3. Tool viewport title bar actions: `aria-label="Maximize [tool]"`, `aria-label="Minimize [tool]"`, `aria-label="Close [tool]"`
4. Fullscreen buttons: `aria-label="Enter fullscreen"` / `"Exit fullscreen"`

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Computer Use cannot find a button | Missing aria-label on icon-only button | Add descriptive aria-label |
| Multiple elements match same label | Labels are not unique enough | Add context to differentiate: include parent section or tool name |
| Label does not match visible text | aria-label conflicts with visible text | Use aria-label only when visible text is insufficient; prefer `aria-labelledby` when text exists |
| Dynamic content not announced | Missing aria-live region | Add `aria-live="polite"` to containers that update dynamically |

## Composability
- **Prerequisite skills**: None
- **Next skills**: ui-data-testid-map (add testids alongside labels), ui-agent-optimized-components (add loading/state attributes)

## Computer Use Notes
- aria-labels are the primary mechanism Computer Use agents use to identify interactive elements
- Every clickable, focusable, or interactive element MUST have either visible text or an aria-label
- Labels should be unique within their visible context -- avoid duplicate labels on the same screen
- Use present-tense action verbs: "Save", "Delete", "Toggle", "Navigate to"
- For stateful elements (toggles, expandable sections), include state in the label or use aria-expanded/aria-checked
- Test with screen reader or accessibility inspector to verify labels are announced correctly

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
