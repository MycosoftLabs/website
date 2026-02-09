/**
 * Internal keys store for dev/test/sandbox.
 * Persists to a JSON file (gitignored). Used by /api/internal/keys.
 * NO MOCK DATA – file must exist or we generate and persist real keys.
 */

import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"

export type EnvironmentName = "dev" | "test" | "sandbox"

export interface EnvKeys {
  MINDEX_API_KEY: string
  MYCORRHIZAE_PUBLISH_KEY: string
  MYCORRHIZAE_ADMIN_KEY: string
  updatedAt: string
}

export interface StoredKeys {
  dev?: EnvKeys
  test?: EnvKeys
  sandbox?: EnvKeys
}

const DEFAULT_FILENAME = ".internal-keys.json"

function getStorePath(): string {
  const dir = process.env.INTERNAL_KEYS_STORE_DIR || process.cwd()
  return path.join(dir, DEFAULT_FILENAME)
}

function generateSecureKey(prefix = "mc", bytes = 24): string {
  const raw = crypto.randomBytes(bytes).toString("base64url")
  return `${prefix}_${raw}`
}

export function generateKeysForEnv(): EnvKeys {
  return {
    MINDEX_API_KEY: generateSecureKey("mindex"),
    MYCORRHIZAE_PUBLISH_KEY: generateSecureKey("myco_pub"),
    MYCORRHIZAE_ADMIN_KEY: generateSecureKey("myco_admin"),
    updatedAt: new Date().toISOString(),
  }
}

export async function readStoredKeys(): Promise<StoredKeys> {
  const filePath = getStorePath()
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    const data = JSON.parse(raw) as StoredKeys
    return data
  } catch {
    return {}
  }
}

export async function writeStoredKeys(data: StoredKeys): Promise<void> {
  const filePath = getStorePath()
  const dir = path.dirname(filePath)
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {
    // dir may already exist
  }
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}

export async function getOrCreateKeysForEnv(env: EnvironmentName): Promise<EnvKeys> {
  const stored = await readStoredKeys()
  const existing = stored[env]
  if (existing) return existing
  const generated = generateKeysForEnv()
  await writeStoredKeys({ ...stored, [env]: generated })
  return generated
}

export async function generateAndSaveKeysForEnv(env: EnvironmentName): Promise<EnvKeys> {
  const stored = await readStoredKeys()
  const generated = generateKeysForEnv()
  await writeStoredKeys({ ...stored, [env]: generated })
  return generated
}
