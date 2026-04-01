---
description: Navigate mycosoft.com â€” header dropdowns, NatureOS sidebar, mobile hamburger nav, footer links, and Ctrl+K search trigger
---

# Platform Navigation

## Identity
- **Category**: platform
- **Access Tier**: PUBLIC (navigation chrome visible to all; some dropdown items filtered by COMPANY gate)
- **Depends On**: (none — foundation skill; platform-authentication enhances visibility of Security link and companyOnly items)
- **Route**: all routes (header/footer render on every page); sidebar at `/natureos/*`
- **Key Components**: `components/header.tsx`, `components/dashboard/nav.tsx`, `components/mobile-nav.tsx`, `components/footer.tsx`, `components/command-search.tsx`

## Success Criteria (Eval)
- [ ] Agent can reach any top-level section (Defense, NatureOS, Devices, Apps, AI) from any page
- [ ] Agent can open and traverse NatureOS sidebar sections (Apps, AI, Tools, Development, Infrastructure, Platform)
- [ ] Agent can trigger search via Ctrl+K or clicking the Search link in the header
- [ ] Agent can use mobile hamburger menu to reach all sections on small viewports
- [ ] Agent can locate footer links (Company, AI, Legal, Connect)

## Navigation Path (Computer Use)
1. **Header** is sticky at top (`sticky top-0 z-50`), height 48px mobile / 56px desktop.
2. Look for the Mycosoft logo at top-left; brand name "Mycosoft" is hidden on small mobile (`hidden sm:inline`).
3. Desktop nav items appear in a horizontal row: Search, About Us, Agent Access, AI, Defense, NatureOS, Devices, Apps, Security (auth-only).
4. Hover over a dropdown label (e.g., "Defense") to open its flyout; the flyout has a 200ms close delay and an invisible bridge element to prevent accidental close.
5. On mobile (< md breakpoint), tap the hamburger icon (Menu) at top-right to open a right-side drawer (w-80, z-99999).
6. NatureOS sidebar appears inside `/natureos/*` routes as a collapsible left sidebar with 6 section groups.

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Mycosoft logo (mushroom icon) | Top-left corner | Click to go to homepage `/` |
| "Search" with magnifying glass icon | Header nav, first item after logo | Click to navigate to `/search` |
| "About Us" link | Header nav, after Search | Click to go to `/about` |
| "Agent Access" link | Header nav, after About Us | Click to go to `/agent` |
| "AI" dropdown (Bot icon + chevron) | Header nav | Hover to open; shows Overview, MYCA, AVANI, NLM items |
| "Defense" dropdown (Bug icon + chevron) | Header nav | Hover to open; shows Fusarium, OEI Capabilities, Technical Documentation |
| "NatureOS" dropdown (Cloud icon + chevron) | Header nav | Hover to open; shows CREP Dashboard, Device Network*, MINDEX*, Species Explorer, Earth Simulator |
| "Devices" dropdown (Cpu icon + chevron) | Header nav | Hover to open; shows Mushroom 1, SporeBase, Hyphae 1, MycoNode, ALARM |
| "Apps" dropdown (Apps icon + chevron) | Header nav | Hover to open; shows Petri Dish, Mushroom Sim*, Compound Analyzer, Spore Tracker*, Ancestry, Genomics Tools, Growth Analytics* |
| "Security" link (Lock icon) | Header nav, rightmost (auth-only) | Click to go to `/security`; only visible when logged in |
| User avatar / "Sign In" button | Top-right | Click avatar for Profile/Settings/Security/Sign Out dropdown; or Sign In to go to `/login` |
| Dark/Light mode toggle | Top-right, before user avatar | Click to toggle theme |
| Hamburger menu icon (three lines) | Top-right, mobile only (`md:hidden`) | Tap to open right-side drawer |
| Mobile drawer close (X) | Top-right of drawer | Tap to close drawer |
| Mobile expandable sections | Inside drawer | Tap section title to navigate to section page; tap chevron to expand/collapse sub-items |
| "Myca AI Assistant" button | Bottom of mobile drawer | Opens MYCA chat dialog |
| NatureOS sidebar (6 sections) | Left side within `/natureos/*` pages | Click section headers to expand/collapse; click items to navigate |
| Footer columns (Company, AI, Legal, Connect) | Bottom of every page | Click links; social icons link to Twitter, YouTube, GitHub |

*Items marked with asterisk are only visible to COMPANY-tier users.

## Core Actions

### 1. Navigate via Header Dropdown (Desktop)
1. Hover over the dropdown label (e.g., "NatureOS") in the header nav bar.
2. Wait for the animated flyout to appear (opacity fade + y-slide, ~200ms).
3. Move mouse into the flyout panel (invisible bridge prevents gap from closing it).
4. Click the desired item link.
5. The dropdown closes on click (`onClose` fires).

### 2. Navigate via Mobile Hamburger Menu
1. On a viewport < 768px (md breakpoint), locate the hamburger `Menu` icon at top-right.
2. Tap it to open a right-side drawer (280px wide, slides from right).
3. Tap a section title (e.g., "NatureOS") to navigate directly, or tap the chevron to expand sub-items.
4. Tap a sub-item to navigate and auto-close the drawer.
5. To close without navigating, tap the X button or tap the backdrop overlay.

### 3. Use NatureOS Sidebar
1. Navigate to any `/natureos/*` route.
2. The sidebar renders 6 collapsible sections: Apps (10 items), AI (3 items), Tools (9 items), Development (4 items), Infrastructure (10 items), Platform (3 items) = 39 items total.
3. Click a section header to expand/collapse it. "Apps" and "AI" default to open.
4. Active route is highlighted via `isActive` check.
5. Items with `companyOnly: true` are hidden for non-company users.

### 4. Trigger Search
1. Click the "Search" link in the header nav (desktop) or mobile drawer to navigate to `/search`.
2. Alternatively, use Ctrl+K (Cmd+K on Mac) to open the command search dialog (`components/command-search.tsx`).
3. The command search supports traditional search (fungi, compounds, research) and MYCA AI natural language queries.

### 5. Access Footer Links
1. Scroll to the bottom of any page.
2. Four columns: Company (About Us, Research, Devices, Applications), AI (AI Overview, MYCA, AVANI, Documentation, NatureOS), Legal (Privacy Policy, Terms of Service), Connect (Twitter, YouTube, GitHub icons).
3. Copyright line: "Building The Earth Intelligence."

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Dropdown closes before reaching items | Mouse left the trigger area before entering the flyout | Move mouse smoothly from trigger to flyout; the 200ms delay + invisible bridge should help |
| "Security" link missing from header | User is not authenticated | Sign in first; the link only renders when `user` is truthy |
| Fewer items in NatureOS/Apps dropdowns | User is not a COMPANY-tier user | Items with `companyOnly: true` are filtered; sign in with a @mycosoft.org or @mycosoft.com email |
| Hamburger menu not visible | Viewport is >= 768px (md breakpoint) | Use the desktop header nav instead; hamburger is `md:hidden` |
| NatureOS sidebar not visible | Not on a `/natureos/*` route | Navigate to `/natureos` first; sidebar is only in the NatureOS layout |
| Dropdown opens behind other content | Z-index conflict | Dropdowns use `z-[60]`; header is `z-50`; check for competing z-index layers |

## Composability
- **platform-authentication**: Determines whether "Security" link and `companyOnly` items are visible.
- **platform-access-tiers**: COMPANY gate filters dropdown and sidebar items.
- **platform-search**: Search link in header navigates to `/search`; Ctrl+K opens command palette.
- **platform-natureos-dashboard**: NatureOS sidebar provides navigation within the dashboard.
- **ai-myca-chat**: Mobile drawer includes a "Myca AI Assistant" button that opens the chat dialog.

## Computer Use Notes
- Header is `sticky top-0` so it is always visible during scrolling.
- Dropdown flyouts animate in with `framer-motion` (opacity, y-translate, scale). Wait ~300ms after hover for full render.
- Mobile drawer uses `createPortal` to render at `document.body` level with `z-[99999]`.
- Sidebar collapsed state uses `max-h-0` with CSS transition, not unmounting -- elements are still in DOM but hidden.
- All dropdown items have icon + title + description layout in a 320px wide panel.
- Footer social links have `min-h-[44px] min-w-[44px]` touch targets.

## Iteration Log
### Attempt Log
- Initial creation: documented header dropdowns (AI, Defense, NatureOS, Devices, Apps), NatureOS sidebar (6 sections, 39 items), mobile hamburger nav, footer, and Ctrl+K search trigger based on source file analysis.
