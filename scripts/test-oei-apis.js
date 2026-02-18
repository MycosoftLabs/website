/**
 * Test OEI APIs: planes (FlightRadar24), boats (AISStream), satellites (CelesTrak).
 * Run with dev server up: npm run dev:next-only then node scripts/test-oei-apis.js
 * Or: BASE_URL=https://sandbox.mycosoft.com node scripts/test-oei-apis.js
 *
 * Shows whether each source returns data or not (so we can confirm "they are not there" when 0).
 */

const BASE = process.env.BASE_URL || "http://localhost:3010";

async function test(name, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const ok = res.ok;
    const data = await res.json().catch(() => ({}));
    const count =
      data.aircraft?.length ??
      data.total ??
      data.vessels?.length ??
      data.satellites?.length ??
      0;
    const source = data.sample ? "sample" : data.source || "live";
    return { name, ok, status: res.status, count, source, error: null };
  } catch (err) {
    return {
      name,
      ok: false,
      status: null,
      count: 0,
      source: null,
      error: err.message || String(err),
    };
  }
}

async function main() {
  console.log("OEI API test – Planes, Boats, Satellites\n");
  console.log("Base URL:", BASE);
  console.log("");

  const [planes, boats, sats] = await Promise.all([
    test("Planes (FlightRadar24)", `${BASE}/api/oei/flightradar24?limit=50`),
    test("Boats (AISStream)", `${BASE}/api/oei/aisstream?limit=50`),
    test("Satellites (CelesTrak)", `${BASE}/api/oei/satellites?category=stations&limit=50`),
  ]);

  const rows = [
    { label: "Planes", r: planes },
    { label: "Boats", r: boats },
    { label: "Satellites", r: sats },
  ];

  for (const { label, r } of rows) {
    const status = r.ok ? "OK" : "FAIL";
    const count = r.count ?? 0;
    const detail = r.error
      ? ` Error: ${r.error}`
      : r.source
        ? ` (${r.source})`
        : "";
    console.log(`${label}: ${count} — ${status}${detail}`);
  }

  console.log("");
  const allZero = rows.every(({ r }) => (r.count ?? 0) === 0);
  if (allZero) {
    console.log("Result: Planes, boats, and satellites are NOT there (all counts 0).");
    console.log("Possible causes: missing API keys, AIS cache empty, satellite fetch timeout.");
  } else {
    console.log("Result: At least one source returned data.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
