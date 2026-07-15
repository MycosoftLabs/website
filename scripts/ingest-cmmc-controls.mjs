#!/usr/bin/env node
/**
 * Ingest + verify the hydrated CMMC L2 110-control reference JSON.
 *
 * The hydrated file (Perplexity delivery) must be:
 *   461,988 bytes · MD5 abca7ab11c0cd1f5d1cd340760a634f0
 *   SHA-256 586bb9c2aba495af96445234acf7164c6a62bca14527cc711e8111e7dceb47d2
 *   110/110 controls with implementation_guidance + assessment_objectives +
 *   example_assessment_objects + guidance_verified:true
 *
 * It must ALSO preserve the DoD scoring fields already integrated here
 * (weight / weight_category / poam_eligible) so the SPRS engine does not regress.
 *
 * Usage:
 *   node scripts/ingest-cmmc-controls.mjs [sourcePath]
 * Default sourcePath: C:\Users\Owner1\Downloads\cmmc-l2-controls.json
 *
 * The script is fail-closed: it only overwrites the repo reference if EVERY
 * check passes. On any failure it writes nothing and exits non-zero.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_REF = resolve(__dirname, '..', 'lib', 'security', 'reference', 'cmmc-l2-controls.json');

const EXPECT = {
  bytes: 461988,
  md5: 'abca7ab11c0cd1f5d1cd340760a634f0',
  sha256: '586bb9c2aba495af96445234acf7164c6a62bca14527cc711e8111e7dceb47d2',
  controls: 110,
};
// The six 32 CFR §170.21 exclusions — must remain poam_eligible=false.
const POAM_EXCLUSIONS = ['AC.L2-3.1.20', 'AC.L2-3.1.22', 'CA.L2-3.12.4', 'PE.L2-3.10.3', 'PE.L2-3.10.4', 'PE.L2-3.10.5'];

const src = process.argv[2] || 'C:\\Users\\Owner1\\Downloads\\cmmc-l2-controls.json';
const fails = [];
const warns = [];
const ok = (m) => console.log(`  ✓ ${m}`);

console.log(`\nIngest source: ${src}`);
if (!existsSync(src)) {
  console.error(`\n✗ Source file does not exist. Download the hydrated JSON from the Perplexity thread first.`);
  process.exit(2);
}

const raw = readFileSync(src);
const md5 = createHash('md5').update(raw).digest('hex');
const sha256 = createHash('sha256').update(raw).digest('hex');

// --- fingerprint ---
if (raw.length === EXPECT.bytes) ok(`byte count ${raw.length}`);
else fails.push(`byte count ${raw.length}, expected ${EXPECT.bytes}`);
if (md5 === EXPECT.md5) ok(`MD5 ${md5}`);
else fails.push(`MD5 ${md5}\n      expected ${EXPECT.md5}  (this is the stale-file signature if f2aef012...)`);
if (sha256 === EXPECT.sha256) ok(`SHA-256 matches`);
else warns.push(`SHA-256 ${sha256} != expected (non-fatal if MD5+bytes pass)`);

// --- structure + hydration ---
let json;
try { json = JSON.parse(raw.toString('utf8')); }
catch (e) { fails.push(`not valid JSON: ${e.message}`); }

if (json) {
  const cs = json.controls;
  if (Array.isArray(cs) && cs.length === EXPECT.controls) ok(`${cs.length} controls`);
  else fails.push(`controls length ${cs?.length}, expected ${EXPECT.controls}`);

  if (Array.isArray(cs)) {
    const unhydrated = cs.filter((c) => !(
      c.implementation_guidance &&
      Array.isArray(c.assessment_objectives) && c.assessment_objectives.length > 0 &&
      Array.isArray(c.example_assessment_objects) && c.example_assessment_objects.length > 0 &&
      c.guidance_verified === true
    ));
    if (unhydrated.length === 0) ok(`all 110 controls fully hydrated (4 fields + guidance_verified)`);
    else fails.push(`${unhydrated.length} controls NOT hydrated, e.g. ${unhydrated.slice(0, 5).map((c) => c.control_id).join(', ')}`);

    // SPRS weights must survive — do not regress the scoring engine.
    const noWeight = cs.filter((c) => typeof c.weight !== 'number' || !c.weight_category);
    if (noWeight.length === 0) ok(`all controls retain weight + weight_category`);
    else fails.push(`${noWeight.length} controls lost weight fields (SPRS would regress), e.g. ${noWeight.slice(0, 5).map((c) => c.control_id).join(', ')}`);

    const poamEligible = cs.filter((c) => c.poam_eligible).length;
    if (poamEligible >= 40) ok(`${poamEligible} POA&M-eligible controls (>=40 expected)`);
    else warns.push(`only ${poamEligible} POA&M-eligible (expected >=40)`);

    const badExcl = POAM_EXCLUSIONS.filter((id) => cs.find((c) => c.control_id === id)?.poam_eligible !== false);
    if (badExcl.length === 0) ok(`all six §170.21 exclusions are poam_eligible=false`);
    else fails.push(`these §170.21 exclusions are not poam_eligible=false: ${badExcl.join(', ')}`);
  }
}

if (fails.length) {
  console.error(`\n✗ INGEST ABORTED — ${fails.length} check(s) failed. Repo file NOT modified.\n`);
  for (const f of fails) console.error(`   - ${f}`);
  if (warns.length) { console.error(`\n  warnings:`); for (const w of warns) console.error(`   - ${w}`); }
  console.error('');
  process.exit(1);
}

writeFileSync(REPO_REF, raw);
console.log(`\n✓ INGESTED — wrote hydrated reference to:\n   ${REPO_REF}`);
if (warns.length) { console.log(`\n  warnings (non-fatal):`); for (const w of warns) console.log(`   - ${w}`); }
console.log(`\nNext: cd website && npx tsc --noEmit  &&  git add lib/security/reference/cmmc-l2-controls.json  &&  git commit -m "chore(cmmc): hydrated 110-control reference (MD5 abca7ab1)"\n`);
