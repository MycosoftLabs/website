# Public AI Information Architecture

**Date:** March 9, 2026  
**Status:** Approved  
**Related:** CURSOR_BRIEF_PUBLIC_AI_PAGE_MYCA_AVANI_MAR09_2026.md, AI public rollout plan

## Summary

The public site uses a new `/ai` entry point with three public AI product surfaces: MYCA, AVANI, and NLM.

## Public AI Routes

| Route | Purpose | Role |
|-------|---------|------|
| `/ai` | AI overview | Paired system intro: MYCA + AVANI; where NLM fits |
| `/myca` | MYCA deep-dive | Active operating intelligence layer |
| `/ai/avani` | AVANI public page | Stewardship and governance layer |
| `/myca/nlm` | NLM page | Nature Learning Model, ecological intelligence foundation |

## Hierarchy

```
/ai (overview)
├── /ai/avani
├── /myca (deep-dive, linked from overview)
└── /myca/nlm (foundation, linked from overview)
```

## Public vs Protected

- **Public:** AI overview, MYCA, AVANI, NLM product positioning; request-access CTAs.
- **Protected/operator:** AI Studio (`/natureos/ai-studio`), guardian controls, identity write flows, internal dashboards.

## Navigation

- Top-level nav label: **AI** (replaces MYCA as primary nav)
- AI dropdown: AI Overview, MYCA, AVANI, NLM
- Footer: Replace `/myca-ai` with `/ai`; add AI section linking to overview, MYCA, AVANI, NLM

## Messaging Boundaries

- **Flagship entities:** MYCA and AVANI
- **Foundation:** NLM
- Other capabilities (apps, APIs, devices, skills, constitution) → supporting sections under those pages or existing site areas, not separate public AI brands.
