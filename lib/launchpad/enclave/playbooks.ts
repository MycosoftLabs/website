/**
 * Level-2 enclave / supply-chain TEMPLATES for the product.
 * Commercial non-CUI. Not telemetry. Not Mycosoft MAS evidence.
 */

export interface EnclavePlaybook {
  id: string;
  category: 'preveil' | 'hardware' | 'software' | 'logging' | 'wazuh' | 'prompts';
  title: string;
  summary: string;
  steps: string[];
  localOnly: boolean;
}

export const ENCLAVE_PLAYBOOKS: EnclavePlaybook[] = [
  {
    id: 'preveil-metadata',
    category: 'preveil',
    title: 'PreVeil — metadata-only bridge',
    summary: 'Record folder/item references the customer selects. Do not import drive content.',
    localOnly: false,
    steps: [
      'Customer enrolls PreVeil on their own devices.',
      'In Launchpad, add an enclave reference: title, external id, owner, date, content hash.',
      'Never paste CUI or search the PreVeil drive from this app.',
      'OAuth, if later wired, still stores metadata only.',
    ],
  },
  {
    id: 'hw-checklist',
    category: 'hardware',
    title: 'Hardware boundary checklist (customer-owned)',
    summary: 'Presence/absence facts the customer records. Not a shopping cart.',
    localOnly: true,
    steps: [
      'Inventory in-scope endpoints (hostname only).',
      'Record firewall / VLAN / AP class (architecture class, not a brand endorsement).',
      'Record NAS + immutable backup presence as yes/no.',
      'Record UPS presence as yes/no.',
      'Do not upload packet captures or controller admin exports into Launchpad.',
    ],
  },
  {
    id: 'sw-checklist',
    category: 'software',
    title: 'Software allow-list checklist',
    summary: 'Customer names authorized software. Launchpad does not enforce AppLocker.',
    localOnly: true,
    steps: [
      'List authorized software in the customer’s authoritative system.',
      'Index a hash of that list in Evidence Index.',
      'Local Agent may later report sanitized allow-list check results (pass/fail + one sentence).',
    ],
  },
  {
    id: 'logging-local',
    category: 'logging',
    title: 'Logging stays local',
    summary: 'Full SIEM/Wazuh logs never enter the Launchpad cloud.',
    localOnly: true,
    steps: [
      'Operate Wazuh or another SIEM on customer premises.',
      'Cloud may receive sanitized health: manager up, agent connected, alert count band.',
      'Raw alerts, PCAPs, and full archives stay on-prem.',
    ],
  },
  {
    id: 'wazuh-local',
    category: 'wazuh',
    title: 'Wazuh — local manager template',
    summary: 'Install and enroll on the customer network. Launchpad does not host Wazuh.',
    localOnly: true,
    steps: [
      'Install a Wazuh manager on a customer-controlled host.',
      'Enroll in-scope agents; confirm status=connected locally.',
      'Point Local Assurance Agent (when installed) at sanitized summaries only.',
      'Do not ship ossec.log or archives.json to Launchpad.',
    ],
  },
  {
    id: 'local-prompts',
    category: 'prompts',
    title: 'Exact local prompts / scripts (run on-prem)',
    summary: 'Copy these onto the customer device. Output stays local unless a sanitized summary is posted.',
    localOnly: true,
    steps: [
      'Windows (read-only): Get-BitLockerVolume | Select MountPoint, ProtectionStatus, VolumeStatus',
      'Windows (read-only): Get-WinEvent -FilterHashtable @{LogName="System"; StartTime=(Get-Date).AddDays(-1)} | Measure-Object',
      'Linux (read-only): timedatectl status; systemctl is-active wazuh-agent || true',
      'Hash a local evidence file with SHA-256 and paste only the hex digest into Evidence Index.',
      'Never paste command output that includes secrets, CUI banners, or full logs into AI prompts.',
    ],
  },
];
