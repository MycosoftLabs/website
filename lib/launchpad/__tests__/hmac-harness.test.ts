import { buildAgentSignature } from '../agent/hmac';
import { HARNESS_NEVER_FLIPS_CONTROL, MYCA_HARNESS_SYNC } from '../agent/harness-contract';

describe('local MYCA harness HMAC / contract', () => {
  test('HMAC vector matches Python launchpad-myca-harness', () => {
    expect(buildAgentSignature('test-hmac-key', 1700000000, '{"results":[]}')).toBe(
      'afa6157694d23e0a75f13dd4d71d3091e5c9e914f9fa270fcf8aec2b09e9fe1e',
    );
  });

  test('harness never flips a control and posts to existing results route', () => {
    expect(HARNESS_NEVER_FLIPS_CONTROL).toBe(true);
    expect(MYCA_HARNESS_SYNC.resultsPath).toBe('/api/fusarium/launchpad/local-agent/results');
    expect(MYCA_HARNESS_SYNC.tasksPath).toBe('/api/fusarium/launchpad/tasks');
  });
});
