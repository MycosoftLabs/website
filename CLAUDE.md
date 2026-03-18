# CLAUDE.md — Mycosoft Development Rules

> Powered by the [Superpowers Framework](https://github.com/nodefather/superpowers)
> Philosophy: Systematic over ad-hoc. Evidence over claims. Complexity reduction. Verify before declaring success.

---

## Project Overview

- **Stack:** Next.js 15 / React 19 / TypeScript / Tailwind CSS 4 / Drizzle ORM / PostgreSQL (Neon)
- **Services:** Python microservices (MycoBrain, CREP, geocoding, etc.)
- **Testing:** Jest (unit), Playwright (E2E)
- **Deploy:** Docker → GHCR → Cloudflare-fronted VM
- **Dev server:** `npm run dev` (port 3010)
- **Path alias:** `@/*` maps to project root

---

## Superpowers Framework Rules

### 1. Brainstorm Before Building

**HARD GATE: Do NOT write any code, scaffold any project, or take any implementation action until a design has been presented and the user has approved it.**

Before implementation:
- Explore project context (files, docs, recent commits)
- Ask clarifying questions — one per message, multiple-choice when feasible
- Propose 2–3 approaches with trade-offs
- Present the design in short, reviewable sections with approval gates
- Write design doc to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Get explicit user approval before proceeding
- Apply ruthless YAGNI — remove anything not strictly needed

### 2. Write Detailed Plans

After design approval, create an implementation plan so detailed that a junior engineer could follow it.

- Map file structure and responsibilities upfront
- Each task should take 2–5 minutes
- Each task follows: write failing test → verify failure → implement → verify pass → commit
- Files should have one clear responsibility; files that change together live together
- Follow existing codebase patterns — no unilateral restructures
- Save plan to `docs/superpowers/plans/YYYY-MM-DD-<topic>-plan.md`
- Review the plan before execution; fix issues iteratively

### 3. Test-Driven Development

**Core mandate: If you didn't watch the test fail, you don't know if it tests the right thing.**

RED-GREEN-REFACTOR cycle:
- **RED:** Write a minimal failing test. Run it. Verify it actually fails.
- **GREEN:** Write the simplest code to make the test pass. Nothing more.
- **REFACTOR:** Clean up while keeping tests green.

Rules:
- Always use TDD for new features, bug fixes, refactoring, and behavior changes
- Delete code written before tests — don't keep as reference
- Write real tests of actual code, not mocks of mocks
- One behavior per test with clear names
- Production code without a failing test first violates TDD. No exceptions without explicit user permission.

### 4. Subagent-Driven Development

For multi-task implementations, use fresh subagents per task:
- Extract all tasks from the plan upfront
- Dispatch one implementer subagent per task with complete context
- After each task, run two-stage review:
  1. **Spec compliance review** — does it match requirements?
  2. **Code quality review** — is the implementation sound?
- Fix and re-review flagged issues
- Never skip reviews or proceed before both gates pass

### 5. Systematic Debugging

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Four mandatory phases before any fix:
1. **Root cause investigation:** Read errors thoroughly, reproduce consistently, check recent changes
2. **Pattern analysis:** Find working examples, study references completely, identify differences
3. **Hypothesis and testing:** Formulate theory, test with minimal changes
4. **Implementation:** Create failing test first, apply single targeted fix, verify no regressions

When 3+ fix attempts fail → stop and question architectural fundamentals. Do not continue symptom-fixing.

### 6. Verification Before Completion

**Evidence before claims, always.**

Before declaring any work complete:
1. **Identify** the command that proves your claim
2. **Execute** it fully (not partially, not from memory)
3. **Read** complete output including exit codes
4. **Verify** output actually supports your claim
5. **Then** make the claim with evidence

What doesn't count as verification:
- "Should work now" (untested assumption)
- "I'm confident" (feelings ≠ evidence)
- Partial checks or related-but-different success
- Trusting agent reports without verification

### 7. Code Review Protocol

**Requesting review:**
- After each task in subagent-driven development
- Upon completing major features
- Before merging to main

**Receiving review:**
- Read completely without reacting
- Restate requirements in your own words
- Verify against actual codebase conditions
- Implement one item at a time with testing
- Challenge feedback when it breaks functionality, lacks context, violates YAGNI, or conflicts with architecture

### 8. Finishing Work

When tasks are complete:
1. Run full test suite — confirm all pass
2. Determine base branch
3. Present options: merge locally, push and create PR, keep branch for later, or discard
4. Execute chosen action
5. Clean up worktrees if applicable

Never merge without verifying tests on the merged result.

---

## Project-Specific Rules

### Commands
```bash
npm run dev          # Dev server (port 3010)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Jest unit tests
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
```

### Code Conventions
- TypeScript strict mode — no `any` without justification
- Use path alias `@/` for imports (e.g., `@/components/ui/button`)
- Components in `components/`, pages in `app/`, utilities in `lib/`
- Database schemas in `schema/`, types in `types/`
- API routes in `app/api/`
- Python services in `services/`

### Architecture Patterns
- Next.js App Router with server components by default
- Drizzle ORM for all database operations
- Radix UI + Tailwind for UI components
- Socket.io for real-time features
- Docker multi-stage builds for deployment

### CI/CD
- CI runs ESLint + TypeScript checks + Jest tests in parallel
- Use `[fast]` tag in commit messages for instant deploy (builds on VM)
- Staging deploys from `develop`, production from `main`
- Database migrations run automatically after deploy

### Git Workflow
- Feature branches off `develop` or `main`
- Descriptive commit messages explaining the "why"
- Run `npm run lint` and `npm run test` before committing
- Never force-push to `main` or `develop`

---

## Priority Order

1. **User instructions** — always override everything else
2. **Superpowers framework rules** — the systematic approach defined above
3. **Project conventions** — patterns established in this codebase
4. **Default agent behavior** — only when nothing else applies
