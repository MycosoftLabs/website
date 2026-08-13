#!/usr/bin/env node
/**
 * Ensure LAUNCHPAD_KMS_MASTER_KEY exists in gitignored .env.local.
 * Never prints the key. Never writes to git-tracked files.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
if (/^LAUNCHPAD_KMS_MASTER_KEY=/m.test(existing)) {
  process.stdout.write('kms_status=already_present\n');
  process.exit(0);
}
const hex = crypto.randomBytes(32).toString('hex');
const block =
  '\n# Launchpad BYO envelope master (do not commit)\n' +
  `LAUNCHPAD_KMS_MASTER_KEY=${hex}\n` +
  'LAUNCHPAD_KMS_MASTER_KEY_ID=env-master-v1\n';
fs.appendFileSync(envPath, block);
process.stdout.write('kms_status=generated_in_env_local\nkms_id=env-master-v1\n');
