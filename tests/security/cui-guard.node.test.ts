import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNonCui, CuiBoundaryError, inspectNonCui } from '../../lib/security/cui/cui-guard.ts';

test('allows compliance metadata', () => {
  assert.equal(
    inspectNonCui({ text: 'CUI handling is governed by CMMC', control: 'AC.L2-3.1.1' }).allowed,
    true,
  );
});

test('allows policy terminology without markings', () => {
  assert.equal(
    inspectNonCui({
      text: 'Controlled technical information and covered defense information are defined by DFARS.',
      content_kind: 'compliance_metadata',
    }).allowed,
    true,
  );
});

test('blocks marked CUI and secrets', () => {
  assert.equal(inspectNonCui({ text: 'CUI//CTI' }).allowed, false);
  assert.equal(inspectNonCui({ classification: 'CUI' }).allowed, false);
  assert.equal(inspectNonCui({ text: '-----BEGIN PRIVATE KEY-----' }).allowed, false);
});

test('exception is content-minimizing', () => {
  const payload = 'CUI//CTI highly-sensitive-body';
  assert.throws(
    () => assertNonCui(payload, 'test'),
    (error: unknown) => {
      assert.ok(error instanceof CuiBoundaryError);
      assert.equal(String(error).includes(payload), false);
      return true;
    },
  );
});
