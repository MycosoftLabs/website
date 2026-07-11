"use client";

/**
 * DOM guard — fixes the controls-freeze caused by the MapLibre↔React DOM-teardown race.
 *
 * SYMPTOM (same as Earth Simulator): the map keeps working, but every control freezes.
 * CAUSE: MapLibre mutates/detaches DOM nodes that React also tracks. When React later
 * commits a deletion for a node MapLibre already removed, `removeChild()` / `insertBefore()`
 * throw `Cannot read properties of null (reading 'removeChild')` DURING React's commit phase.
 * That uncaught commit-phase error leaves React's fiber tree half-committed, so it stops
 * flushing updates and the whole UI (controls) goes unresponsive while the map — owned by
 * MapLibre, not React — keeps rendering.
 *
 * FIX: make `removeChild` null-safe. It no-ops ONLY in the exact case that would otherwise
 * throw (the child is already detached, so its end-state — not under `this` — already matches
 * what React's commit wants). That keeps React's fiber↔DOM mapping intact.
 *
 * IMPORTANT — do NOT also patch `insertBefore` to "append on stale reference": appending puts
 * the node at the WRONG position, which desynchronises React's reconciler from the real DOM.
 * That manifested as a *worse* freeze — the header/panels stopped responding to clicks (their
 * onClick never fired) because React was resolving events against orphaned nodes. The keep-alive
 * in CenterViewport already prevents the view-switch unmount that caused the original
 * `removeChild` crash, so the narrow `removeChild` guard below is all that's needed.
 * Idempotent, client-only. Imported for its side effect at the top of the GCS entry.
 */

if (typeof window !== "undefined" && typeof Node !== "undefined" && !(window as { __psaDomGuard?: boolean }).__psaDomGuard) {
  (window as { __psaDomGuard?: boolean }).__psaDomGuard = true;
  const proto = Node.prototype as unknown as {
    removeChild: <T extends Node>(child: T) => T;
  };
  const origRemoveChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child && (child as Node).parentNode !== this) {
      // already detached (e.g. by MapLibre) — calling removeChild would throw, and the node is
      // already gone from `this`, which is the state React's commit is trying to reach.
      return child;
    }
    return origRemoveChild.call(this, child) as T;
  };
}

export {};
