"use client";

/**
 * GCS display modes for real sailor environments — persisted, applied as CSS classes on the
 * console root (see globals.css `.psa-night` / `.psa-day` / `.psa-field`):
 *   theme: standard  — the default cyan tactical glass
 *          night     — red-shifted + dimmed bridge-watch palette (preserves night vision)
 *          day       — brightness/contrast boost + dim-text lift for direct sunlight on deck
 *   field: glove mode — enlarges primary touch targets (buttons, slider thumbs). Never shrinks
 *          or hides anything; text sizes are untouched in every mode.
 */

import { useCallback, useState } from "react";

export type GcsTheme = "standard" | "night" | "day";
const THEME_KEY = "psathyrella.display.theme";
const FIELD_KEY = "psathyrella.display.field";
const THEME_ORDER: GcsTheme[] = ["standard", "night", "day"];

export function useDisplayMode() {
  const [theme, setTheme] = useState<GcsTheme>(() => {
    try {
      const v = typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
      return v === "night" || v === "day" ? v : "standard";
    } catch { return "standard"; }
  });
  const [field, setField] = useState<boolean>(() => {
    try { return typeof window !== "undefined" && localStorage.getItem(FIELD_KEY) === "1"; } catch { return false; }
  });

  const cycleTheme = useCallback(() => {
    setTheme((t) => {
      const next = THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length];
      try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
      return next;
    });
  }, []);

  const toggleField = useCallback(() => {
    setField((f) => {
      try { localStorage.setItem(FIELD_KEY, f ? "0" : "1"); } catch { /* private mode */ }
      return !f;
    });
  }, []);

  const rootClass = `${theme === "night" ? "psa-night" : theme === "day" ? "psa-day" : ""}${field ? " psa-field" : ""}`.trim();

  return { theme, field, cycleTheme, toggleField, rootClass };
}
