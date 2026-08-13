import { createHmac } from 'crypto';
import { verifyConnectHmac, docusignConfigStatus } from '../signatures/docusign';
import { verifyCalcomWebhook, calcomStatus, bookingUrlForCredit } from '../advisory/calcom';
import {
  RESOURCE_CATALOG,
  INDEPENDENCE_DISCLOSURE,
} from '../resource-catalog';
import { LINKS_BY_SURFACE } from '../official-links';

describe('DocuSign Connect HMAC', () => {
  const prev = process.env.DOCUSIGN_CONNECT_HMAC_KEY;
  beforeAll(() => {
    process.env.DOCUSIGN_CONNECT_HMAC_KEY = 'test-connect-hmac';
  });
  afterAll(() => {
    if (prev === undefined) delete process.env.DOCUSIGN_CONNECT_HMAC_KEY;
    else process.env.DOCUSIGN_CONNECT_HMAC_KEY = prev;
  });

  test('accepts a valid X-DocuSign-Signature-1 and rejects a mismatch', () => {
    const body = '{"event":"envelope-completed"}';
    const sig = createHmac('sha256', 'test-connect-hmac').update(body, 'utf8').digest('base64');
    expect(verifyConnectHmac(body, sig)).toBe(true);
    expect(verifyConnectHmac(body, 'AAAA')).toBe(false);
    expect(verifyConnectHmac(body, null)).toBe(false);
  });

  test('docusignConfigStatus does not claim ready without env', () => {
    const status = docusignConfigStatus();
    expect(status.platformSendEnabled).toBe(false);
    if (!status.oauthClientConfigured) {
      expect(status.blockingReason).toMatch(/DOCUSIGN_/);
    }
  });
});

describe('Cal.com webhook + booking URL', () => {
  const prevSecret = process.env.CALCOM_WEBHOOK_SECRET;
  const prevBase = process.env.CALCOM_BOOKING_BASE_URL;
  const prev15 = process.env.CALCOM_EVENT_TYPE_ADVISORY_15;

  beforeAll(() => {
    process.env.CALCOM_WEBHOOK_SECRET = 'cal-test-secret';
    process.env.CALCOM_BOOKING_BASE_URL = 'https://cal.com/mycosoft';
    process.env.CALCOM_EVENT_TYPE_ADVISORY_15 = 'advisory-15';
  });
  afterAll(() => {
    if (prevSecret === undefined) delete process.env.CALCOM_WEBHOOK_SECRET;
    else process.env.CALCOM_WEBHOOK_SECRET = prevSecret;
    if (prevBase === undefined) delete process.env.CALCOM_BOOKING_BASE_URL;
    else process.env.CALCOM_BOOKING_BASE_URL = prevBase;
    if (prev15 === undefined) delete process.env.CALCOM_EVENT_TYPE_ADVISORY_15;
    else process.env.CALCOM_EVENT_TYPE_ADVISORY_15 = prev15;
  });

  test('verifies X-Cal-Signature-256 hex HMAC', () => {
    const body = '{"triggerEvent":"BOOKING_CREATED"}';
    const sig = createHmac('sha256', 'cal-test-secret').update(body, 'utf8').digest('hex');
    expect(verifyCalcomWebhook(body, sig)).toBe(true);
    expect(verifyCalcomWebhook(body, `sha256=${sig}`)).toBe(true);
    expect(verifyCalcomWebhook(body, '00'.repeat(32))).toBe(false);
  });

  test('booking URL uses real event type and does not invent slots', () => {
    const ok = bookingUrlForCredit({
      minutes: 15,
      tenantId: '00000000-0000-4000-8000-000000000001',
      creditId: '00000000-0000-4000-8000-000000000002',
    });
    expect('url' in ok).toBe(true);
    if ('url' in ok) {
      expect(ok.url).toContain('https://cal.com/mycosoft/advisory-15');
      expect(ok.url).toContain('metadata%5Blp_credit_id%5D');
    }
    expect(calcomStatus().configured).toBe(true);
  });
});

describe('resource catalog + official links', () => {
  test('every catalog card is disclosed, https-or-null, and has no unlicensed logo', () => {
    expect(RESOURCE_CATALOG.length).toBeGreaterThanOrEqual(30);
    for (const card of RESOURCE_CATALOG) {
      expect(card.disclosure).toBe(INDEPENDENCE_DISCLOSURE);
      expect(card.relationship_type).toBe('none');
      if (card.external_url) {
        expect(card.external_url.startsWith('https://')).toBe(true);
      }
      if (card.logo_src) {
        expect(card.logo_license).toBeTruthy();
      } else {
        expect(card.logo_src == null).toBe(true);
      }
      expect(card.vendor.toLowerCase()).not.toMatch(/acme|fake vendor|placeholder/);
    }
  });

  test('required surfaces have official https links', () => {
    const surfaces = ['training', 'tier1', 'requirements', 'advisory', 'resources'] as const;
    for (const surface of surfaces) {
      const links = LINKS_BY_SURFACE[surface];
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.url.startsWith('https://')).toBe(true);
      }
    }
  });
});
