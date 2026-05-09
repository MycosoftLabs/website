const LOCAL_MAS_URLS = new Set([
  "http://localhost:8001",
  "http://127.0.0.1:8001",
  "http://host.docker.internal:8001",
]);

function normalizeUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function resolveMasApiUrl() {
  const explicitMas = process.env.MAS_API_URL?.trim();
  const publicMas = process.env.NEXT_PUBLIC_MAS_API_URL?.trim();

  if (
    process.env.NODE_ENV === "production" &&
    explicitMas &&
    LOCAL_MAS_URLS.has(normalizeUrl(explicitMas)) &&
    publicMas
  ) {
    return normalizeUrl(publicMas);
  }

  return normalizeUrl(explicitMas || publicMas || "http://localhost:8001");
}
