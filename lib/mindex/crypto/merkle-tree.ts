import { sha256Prefixed, stripHashPrefix, stableStringify } from "./encoding"

export interface MerkleProofStep {
  sibling: string // sha256:...
  position: "left" | "right"
}

function hashPair(left: string, right: string): string {
  const leftHex = stripHashPrefix(left)
  const rightHex = stripHashPrefix(right)
  const bytes = Buffer.concat([Buffer.from(leftHex, "hex"), Buffer.from(rightHex, "hex")])
  return sha256Prefixed(bytes)
}

export function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return sha256Prefixed(stableStringify({ empty: true }))

  let level = leaves.slice()
  while (level.length > 1) {
    const next: string[] = []
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]
      const right = level[i + 1] ?? level[i] // duplicate last if odd
      next.push(hashPair(left, right))
    }
    level = next
  }
  return level[0]
}

export function merkleProof(leaves: string[], index: number): MerkleProofStep[] {
  if (index < 0 || index >= leaves.length) throw new Error("merkleProof: index out of range")
  if (leaves.length <= 1) return []

  let idx = index
  let level = leaves.slice()
  const proof: MerkleProofStep[] = []

  while (level.length > 1) {
    const isRightNode = idx % 2 === 1
    const siblingIndex = isRightNode ? idx - 1 : idx + 1
    const sibling = level[siblingIndex] ?? level[idx]
    proof.push({ sibling, position: isRightNode ? "left" : "right" })

    const next: string[] = []
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]
      const right = level[i + 1] ?? level[i]
      next.push(hashPair(left, right))
    }

    level = next
    idx = Math.floor(idx / 2)
  }

  return proof
}

export function verifyMerkleProof(leaf: string, proof: MerkleProofStep[], expectedRoot: string): boolean {
  let acc = leaf
  for (const step of proof) {
    acc = step.position === "left" ? hashPair(step.sibling, acc) : hashPair(acc, step.sibling)
  }
  return acc === expectedRoot
}

