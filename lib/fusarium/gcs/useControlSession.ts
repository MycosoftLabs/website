"use client";

/**
 * The general Fusarium GCS deliberately inherits no Psathyrella authority.
 * A vehicle-specific adapter and authorization contract must be verified
 * before Agaric or Mushroom 1 commands can leave this application.
 */

export interface ControlSession {
  authed: boolean;
  checking: boolean;
  method: "login" | "local-dev" | null;
  error: string | null;
}

export function useControlSession(): ControlSession {
  return {
    authed: false,
    checking: false,
    method: null,
    error: "Global command adapters are unbound. Controls are locked.",
  };
}
