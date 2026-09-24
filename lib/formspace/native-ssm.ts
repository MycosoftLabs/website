/**
 * FormSpace native tied-A rank-1 SSM — port of
 * `mycosoft_mas/nlm/formspace/native_ssm.py`.
 * Scientific FormSpace family, not Mamba-1 / not Ollama / not an LLM.
 */

export function nativeScan(
  inputs: number[],
  dt: number,
  a: number,
  b: number,
  h0 = 0,
): { trajectory: number[]; finalState: number } {
  const trajectory: number[] = []
  let state = h0
  for (const x of inputs) {
    state = Math.exp(dt * a) * state + dt * b * x
    trajectory.push(state)
  }
  return { trajectory, finalState: state }
}

export function inverseVarianceFusion(
  means: number[],
  variances: number[],
): { fusedMean: number; fusedVariance: number } {
  if (!means.length || means.length !== variances.length) {
    throw new Error("means and variances must be nonempty and aligned")
  }
  const weights = variances.map((v) => 1 / v)
  const denom = weights.reduce((s, w) => s + w, 0)
  const fusedMean = means.reduce((s, m, i) => s + m * weights[i], 0) / denom
  return { fusedMean, fusedVariance: 1 / denom }
}
