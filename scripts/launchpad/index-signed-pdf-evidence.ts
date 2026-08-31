/**
 * Hash local PDFs for the Launchpad evidence index (metadata only).
 *
 * Usage:
 *   npx tsx scripts/launchpad/index-signed-pdf-evidence.ts --dir "D:\path\to\pdfs"
 *   npx tsx scripts/launchpad/index-signed-pdf-evidence.ts --dir "...\docs\cmmc_evidence" --out .\tmp\lp-evidence.json
 *
 * Never uploads file bytes. Mycosoft CMMC signed artifacts stay on disk
 * (MAS docs/cmmc_evidence or PreVeil if CUI). Launchpad stores sha256 + path.
 */

import { createHash } from 'crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, extname, join, resolve } from 'path';

interface EvidenceMeta {
  title: string;
  path: string;
  sha256: string;
  sizeBytes: number;
  evidenceType: 'other';
  cui_indicator: 'no';
  note: string;
}

function parseArgs(argv: string[]): { dir: string; out: string | null } {
  let dir = '';
  let out: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dir') dir = argv[i + 1] ?? '';
    if (argv[i] === '--out') out = argv[i + 1] ?? null;
  }
  if (!dir) {
    console.error('Usage: npx tsx scripts/launchpad/index-signed-pdf-evidence.ts --dir <folder> [--out file.json]');
    process.exit(2);
  }
  return { dir: resolve(dir), out: out ? resolve(out) : null };
}

function listPdfs(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...listPdfs(p));
    else if (e.isFile() && extname(e.name).toLowerCase() === '.pdf') files.push(p);
  }
  return files;
}

function main() {
  const { dir, out } = parseArgs(process.argv.slice(2));
  const st = statSync(dir);
  if (!st.isDirectory()) {
    console.error(`Not a directory: ${dir}`);
    process.exit(2);
  }
  const rows: EvidenceMeta[] = listPdfs(dir).map((path) => {
    const buf = readFileSync(path);
    return {
      title: basename(path),
      path,
      sha256: createHash('sha256').update(buf).digest('hex'),
      sizeBytes: buf.length,
      evidenceType: 'other',
      cui_indicator: 'no',
      note: 'Hash + path only. PDF bytes were not transmitted. Do not index CUI here.',
    };
  });
  const payload = {
    generatedAt: new Date().toISOString(),
    directory: dir,
    count: rows.length,
    records: rows,
  };
  const json = JSON.stringify(payload, null, 2);
  if (out) {
    writeFileSync(out, json, 'utf8');
    console.log(`Wrote ${rows.length} hashes to ${out}`);
  } else {
    console.log(json);
  }
}

main();
