import { envelopeDecrypt, envelopeEncrypt, redactSecrets } from '../crypto/envelope';
import { scanTextForBoundary, filenameLooksDangerous } from '../boundary/dlp';
import { screenBomPart } from '../origin/screen';
import { catalogInvariants, PLAN_ENTITLEMENTS } from '../catalog';

describe('launchpad envelope', () => {
  const prev = process.env.LAUNCHPAD_KMS_KEY;

  beforeAll(() => {
    process.env.LAUNCHPAD_KMS_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  afterAll(() => {
    if (prev === undefined) delete process.env.LAUNCHPAD_KMS_KEY;
    else process.env.LAUNCHPAD_KMS_KEY = prev;
  });

  test('round-trips a provider key and never embeds plaintext in the blob', () => {
    const secret = 'sk-ant-test-not-a-real-key-aaaaaaaa';
    const blob = envelopeEncrypt(secret);
    expect(JSON.stringify(blob)).not.toContain(secret);
    expect(blob.kmsBackend).toBe('env_master');
    expect(envelopeDecrypt(blob)).toBe(secret);
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
});

describe('catalog BYO', () => {
  test('every plan allows BYO AI keys and catalog invariants hold', () => {
    expect(catalogInvariants()).toEqual([]);
    for (const ent of Object.values(PLAN_ENTITLEMENTS)) {
      expect(ent.byoAiKey).toBe(true);
    }
  });
});
