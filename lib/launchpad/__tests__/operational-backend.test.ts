import {
  envelopeDecrypt,
  envelopeEncrypt,
  envelopeToByteaHex,
  kmsBackendStatus,
  redactSecrets,
} from '../crypto/envelope';
import { scanTextForBoundary, filenameLooksDangerous, interceptUpload } from '../boundary/dlp';
import { screenBomPart } from '../origin/screen';
import { catalogInvariants, PLAN_ENTITLEMENTS } from '../catalog';
import { fourIndependentMeasurements } from '../scoring/indicators';
import { rankOpportunities } from '../radar/rank';
import { maxPromptChars } from '../ai/governance';
import { looksLikeSecret } from '../validate';

describe('launchpad envelope', () => {
  const prevHex = process.env.LAUNCHPAD_KMS_MASTER_KEY;
  const prevId = process.env.LAUNCHPAD_KMS_MASTER_KEY_ID;
  const prevLegacy = process.env.LAUNCHPAD_KMS_KEY;
  const prevArn = process.env.LAUNCHPAD_KMS_ARN;

  beforeAll(() => {
    process.env.LAUNCHPAD_KMS_MASTER_KEY = '11'.repeat(32);
    process.env.LAUNCHPAD_KMS_MASTER_KEY_ID = 'env-master-v1';
    delete process.env.LAUNCHPAD_KMS_KEY;
    delete process.env.LAUNCHPAD_KMS_ARN;
  });

  afterAll(() => {
    if (prevHex === undefined) delete process.env.LAUNCHPAD_KMS_MASTER_KEY;
    else process.env.LAUNCHPAD_KMS_MASTER_KEY = prevHex;
    if (prevId === undefined) delete process.env.LAUNCHPAD_KMS_MASTER_KEY_ID;
    else process.env.LAUNCHPAD_KMS_MASTER_KEY_ID = prevId;
    if (prevLegacy === undefined) delete process.env.LAUNCHPAD_KMS_KEY;
    else process.env.LAUNCHPAD_KMS_KEY = prevLegacy;
    if (prevArn === undefined) delete process.env.LAUNCHPAD_KMS_ARN;
    else process.env.LAUNCHPAD_KMS_ARN = prevArn;
  });

  test('round-trips a provider key with hex master key and never embeds plaintext', () => {
    const secret = 'sk-ant-test-not-a-real-key-aaaaaaaa';
    const blob = envelopeEncrypt(secret);
    expect(JSON.stringify(blob)).not.toContain(secret);
    expect(blob.kmsBackend).toBe('env_master');
    expect(blob.masterKeyId).toBe('env-master-v1');
    expect(envelopeDecrypt(blob)).toBe(secret);
    const bytea = envelopeToByteaHex(blob);
    expect(bytea.ciphertextHex.startsWith('\\x')).toBe(true);
    expect(bytea.ciphertextHex).not.toContain(Buffer.from(secret, 'utf8').toString('hex'));
  });

  test('kmsBackendStatus names env envelope as honest fallback', () => {
    const status = kmsBackendStatus();
    expect(status.backend).toBe('env_master');
    expect(status.note).toMatch(/Not AWS KMS/i);
  });

  test('redactSecrets strips sk- prefixes', () => {
    expect(redactSecrets('err sk-ant-abcdefghijklmnop done')).toContain('[REDACTED-SECRET]');
  });
});

describe('launchpad DLP', () => {
  test('blocks CUI banners and API-key shapes', () => {
    const cui = scanTextForBoundary('Header\nCUI//SP-CTI\nbody');
    expect(cui.blocked).toBe(true);
    expect(cui.hits.some((h) => h.kind === 'cui_marker')).toBe(true);
    const key = scanTextForBoundary('token sk-abcdefghijklmnopqrstuvwxyz');
    expect(key.blocked).toBe(true);
  });

  test('blocks SF-86 filenames', () => {
    expect(filenameLooksDangerous('employee-sf-86.pdf')).toBe(true);
    expect(filenameLooksDangerous('policy.pdf')).toBe(false);
  });
});

describe('origin screen', () => {
  test('flags Section 889 names without inventing origin', () => {
    const flags = screenBomPart({ manufacturer: 'Huawei Technologies', partNumber: 'X' });
    expect(flags.some((f) => f.code === 'section_889')).toBe(true);
  });

  test('flags customer-supplied PRC origin without auto-excluding', () => {
    const flags = screenBomPart({ manufacturer: 'Acme', partNumber: 'Y', countryOfOrigin: 'CN' });
    expect(flags.some((f) => f.code === 'prc_origin')).toBe(true);
    expect(flags.some((f) => f.code === 'unknown_origin')).toBe(false);
  });
});

describe('catalog BYO', () => {
  test('every plan allows BYO AI keys and catalog invariants hold', () => {
    expect(catalogInvariants()).toEqual([]);
    for (const ent of Object.values(PLAN_ENTITLEMENTS)) {
      expect(ent.byoAiKey).toBe(true);
    }
  });
});

describe('four independent measurements', () => {
  test('does not blend implemented count into POA&M eligibility', () => {
    const m = fourIndependentMeasurements({}, []);
    expect(m.implementedCount.value).toBe(0);
    expect(m.poamEligibility.value).toBeDefined();
    expect(m.independenceNote).toMatch(/independent/i);
  });
});

describe('radar rank', () => {
  test('empty capabilities keep fit at 0', () => {
    const ranked = rankOpportunities(
      [
        {
          id: '00000000-0000-4000-8000-000000000001',
          title: 'Public SAM notice',
          agency: 'Navy',
          naics: ['541715'],
          psc: ['AC11'],
          set_asides: [],
          due_at: null,
          official_url: 'https://sam.gov/opp/example',
        },
      ],
      {},
    );
    expect(ranked[0]?.fitScore).toBe(0);
    expect(ranked[0]?.note).toMatch(/fit stays 0/i);
  });
});

describe('launchpad prompt and registration guards', () => {
  test('maxPromptChars is finite and rejects multi-MB math', () => {
    const cap = maxPromptChars('general');
    expect(cap).toBeGreaterThan(1000);
    expect(cap).toBeLessThan(100_000);
    expect(5_000_000).toBeGreaterThan(cap);
  });

  test('looksLikeSecret blocks key-shaped values and allows emails', () => {
    expect(looksLikeSecret('owner@example.com')).toBe(false);
    expect(looksLikeSecret('sk-ant-abcdefghijklmnopqrstuvwxyz')).toBe(true);
  });

  test('interceptUpload blocks SF-86 filenames', () => {
    expect(interceptUpload({ filename: 'sf-86-packet.pdf' }).blocked).toBe(true);
    expect(interceptUpload({ filename: 'policy.pdf' }).blocked).toBe(false);
  });
});
