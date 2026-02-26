/**
 * WebSocket URL helper for HTTPS / mixed content
 *
 * Browsers block ws:// connections from pages loaded over https://.
 * Use this to derive the correct protocol (ws vs wss) from the current page.
 */
export function getSecureWebSocketUrl(base: string): string {
  if (typeof window === "undefined") return base;
  const useWss = window.location.protocol === "https:";
  return base.replace(/^(wss?|https?):\/\//, useWss ? "wss://" : "ws://");
}
