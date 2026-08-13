/**
 * FUSARIUM Launchpad — walkthrough (workbook wizard) data types.
 *
 * A walkthrough is a fixed, education-first sequence of steps a founder works
 * through one screen at a time. The content is static product education —
 * definitions, official links, and pointers into app pages. It never contains
 * tenant data, never asserts a compliance outcome, and never marks anything
 * implemented: the customer does the work and the marking themselves.
 */

export interface WalkthroughLink {
  label: string;
  href: string;
  /** True for official government / reference sites that open in a new tab. */
  external?: boolean;
}

export interface WalkthroughAction {
  /** One imperative instruction ("Open Company and record your UEI"). */
  text: string;
  /** Optional destination the instruction points at (app page or official site). */
  link?: WalkthroughLink;
}

/** Jargon defined inline the first time it appears. Terms link to the glossary. */
export interface WalkthroughTerm {
  term: string;
  definition: string;
}

export interface WalkthroughStep {
  id: string;
  title: string;
  /** "What you're doing" — plain-language description of the step. */
  what: string;
  /** "Why it matters" — the consequence of doing (or skipping) it. */
  why: string;
  /** "Exactly what to click" — ordered actions, with links into the app. */
  actions: WalkthroughAction[];
  /** Optional official external reference (gov site, NIST publication…). */
  official?: WalkthroughLink;
  /** Jargon decoded for this step. */
  terms?: WalkthroughTerm[];
}

export interface WalkthroughDef {
  /** URL slug and localStorage key suffix. */
  id: string;
  title: string;
  /** One-line description shown on the index card. */
  tagline: string;
  /** Who this walkthrough is for. */
  audience: string;
  /** Education-first intro card content (What is this / Why it matters / Your next step). */
  intro: { what: string; why: string; next: string };
  steps: WalkthroughStep[];
}
