"use client";

/**
 * Rate-limit continuous-drag commands (joystick / sliders) so rapid dragging can't flood the
 * command ledger + session recorder and freeze the UI, AND guarantee a release/stop is authoritative.
 *
 * IN-FLIGHT COALESCING: at most ONE continuous command is ever in flight. While a command's POST is
 * pending, the newest value is held as `pending`; when the in-flight one resolves, the latest held
 * value is sent. On a slow link this self-adapts. A `MIN_GAP_MS` floor keeps a fast link from hammering.
 *
 * AUTHORITATIVE STOP (`stop(finalCmd)`): the release all-stop must win even though a prior drag vector
 * may still be in flight (they can arrive out of order once the transport pools connections). `stop()`
 * sends the final command immediately AND, if something is in flight, re-sends it the moment that
 * in-flight command resolves — so the LAST thing the agent sees is always the stop, regardless of
 * middle ordering. It also drops any pending/queued drag value. `send()` after a stop resumes normally
 * (a fresh drag), so no manual reset is needed.
 */

import { useCallback, useEffect, useRef } from "react";
import type { BuoyCommand } from "./contract";

const MIN_GAP_MS = 60; // floor so a fast link still can't exceed ~16 cmd/s

export function useThrottledSend(sendCommand: (cmd: BuoyCommand) => void | Promise<unknown>) {
  const inFlight = useRef(false);
  const pending = useRef<BuoyCommand | null>(null);
  const finalOnResolve = useRef<BuoyCommand | null>(null); // re-sent after the in-flight one resolves
  const lastSentAt = useRef(0);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; if (gapTimer.current) clearTimeout(gapTimer.current); }, []);

  const fire = useCallback((cmd: BuoyCommand) => {
    inFlight.current = true;
    lastSentAt.current = Date.now();
    Promise.resolve(sendCommand(cmd)).finally(() => {
      inFlight.current = false;
      if (!aliveRef.current) return;
      // A stop happened while this was in flight → re-assert it LAST so it can't be beaten by a
      // stale drag vector that landed out of order.
      if (finalOnResolve.current != null) {
        const f = finalOnResolve.current;
        finalOnResolve.current = null;
        pending.current = null;
        sendCommand(f);
        return;
      }
      const next = pending.current;
      if (next != null) {
        pending.current = null;
        const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastSentAt.current));
        if (wait === 0) fire(next);
        else {
          if (gapTimer.current) clearTimeout(gapTimer.current);
          gapTimer.current = setTimeout(() => { if (aliveRef.current && pending.current == null) fire(next); }, wait);
        }
      }
    });
  }, [sendCommand]);

  const send = useCallback((cmd: BuoyCommand) => {
    // A fresh drag command supersedes a prior stop's re-assert.
    finalOnResolve.current = null;
    if (inFlight.current || gapTimer.current) {
      pending.current = cmd; // newest value wins; sent when the in-flight one resolves
      return;
    }
    const gap = Date.now() - lastSentAt.current;
    if (gap >= MIN_GAP_MS) {
      fire(cmd);
    } else {
      pending.current = cmd;
      gapTimer.current = setTimeout(() => {
        gapTimer.current = null;
        const next = pending.current;
        if (aliveRef.current && next != null && !inFlight.current) { pending.current = null; fire(next); }
      }, MIN_GAP_MS - gap);
    }
  }, [fire]);

  // Authoritative stop: drop pending drag values, send the stop NOW, and re-send it after any
  // in-flight command resolves so the agent's final state is guaranteed to be the stop.
  const stop = useCallback((finalCmd: BuoyCommand) => {
    pending.current = null;
    if (gapTimer.current) { clearTimeout(gapTimer.current); gapTimer.current = null; }
    if (inFlight.current) finalOnResolve.current = finalCmd; // re-assert on resolve
    sendCommand(finalCmd); // immediate
  }, [sendCommand]);

  // Back-compat: drop any pending trailing command without sending a stop.
  const cancel = useCallback(() => {
    pending.current = null;
    finalOnResolve.current = null;
    if (gapTimer.current) { clearTimeout(gapTimer.current); gapTimer.current = null; }
  }, []);

  return { send, stop, cancel };
}
