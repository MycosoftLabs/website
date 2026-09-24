/**
 * Firebase SDK deliberately disabled on NLM product path.
 * Plan P0: Supabase + MINDEX + MAS only.
 * Importing this module throws at runtime if any leftover code calls it.
 */

function banned(): never {
  throw new Error(
    'Firebase is disabled on the NLM product path. Use Supabase + /api/natureos/nlm-training/* instead.'
  )
}

export const db = new Proxy(
  {},
  {
    get() {
      return banned()
    },
  }
) as never

export const auth = new Proxy(
  {},
  {
    get() {
      return banned()
    },
  }
) as never
