/**
 * Curated executive portraits for Viewport Intelligence leadership cards.
 * Used when civic providers omit image_url (mayors, governors).
 * May 25, 2026
 */

export interface ExecutivePortraitInput {
  id?: string
  name?: string
  office?: string
  jurisdiction_name?: string
  image_url?: string | null
}

export interface ExecutiveMediaEntry {
  entity_type?: string
  entity_id?: string
  image_url?: string | null
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/** Wikimedia / Bioguide portrait URLs keyed by normalized full name. */
const PORTRAIT_BY_NAME: Record<string, string> = {
  "gavin newsom":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Gavin_Newsom_by_Gage_Skidmore.jpg/440px-Gavin_Newsom_by_Gage_Skidmore.jpg",
  "todd gloria":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Todd_Gloria_%28cropped%29.jpg/440px-Todd_Gloria_%28cropped%29.jpg",
  "karen bass":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Karen_Bass_118th_Congress.jpg/440px-Karen_Bass_118th_Congress.jpg",
  "eric adams":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Eric_Adams_2022_%28cropped%29.jpg/440px-Eric_Adams_2022_%28cropped%29.jpg",
  "muriel bowser":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Muriel_Bowser_2015.jpg/440px-Muriel_Bowser_2015.jpg",
  "ron desantis":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Ron_DeSantis_%28cropped%29.jpg/440px-Ron_DeSantis_%28cropped%29.jpg",
  "greg abbott":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Greg_Abbott_2015.jpg/440px-Greg_Abbott_2015.jpg",
  "kathy hochul":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Kathy_Hochul_2021.jpg/440px-Kathy_Hochul_2021.jpg",
  "katie hobbs":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Katie_Hobbs_by_Gage_Skidmore.jpg/440px-Katie_Hobbs_by_Gage_Skidmore.jpg",
  "joe biden":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Joe_Biden_presidential_portrait.jpg/440px-Joe_Biden_presidential_portrait.jpg",
  "donald trump":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/440px-Donald_Trump_official_portrait.jpg",
  "donald j. trump":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/440px-Donald_Trump_official_portrait.jpg",
  // Below use Wikimedia's Special:FilePath resolver (filename → current file,
  // hash-independent). A wrong filename 404s and the card falls back to an icon.
  "jd vance": commonsPortrait("JD Vance Vice Presidential Portrait.jpg"),
  "claudia sheinbaum": commonsPortrait("Claudia Sheinbaum Pardo (cropped).jpg"),
  "mark carney": commonsPortrait("Mark Carney 2020 (cropped).jpg"),
  "jb pritzker": commonsPortrait("JB Pritzker (cropped).jpg"),
  "gretchen whitmer": commonsPortrait("Gretchen Whitmer (cropped).jpg"),
  "josh shapiro": commonsPortrait("Josh Shapiro (cropped).jpg"),
  "glenn youngkin": commonsPortrait("Glenn Youngkin (cropped).jpg"),
  "wes moore": commonsPortrait("Wes Moore (cropped).jpg"),
  "brian kemp": commonsPortrait("Brian Kemp (cropped).jpg"),
  "maura healey": commonsPortrait("Maura Healey (cropped).jpg"),
  "andy beshear": commonsPortrait("Andy Beshear (cropped).jpg"),
  "jared polis": commonsPortrait("Jared Polis (cropped).jpg"),
  "doug ford": commonsPortrait("Doug Ford (cropped).jpg"),
}

/** Wikimedia Commons file → stable resolver URL (no hash path required). */
function commonsPortrait(filename: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=440`
}

function bioguidePhotoUrl(id?: string): string | null {
  const bioguide = id?.match(/bioguide:([A-Z]\d+)/i)?.[1]
  if (!bioguide) return null
  return `https://bioguide.congress.gov/bioguide/photo/${bioguide[0]}/${bioguide}.jpg`
}

function portraitFromMediaGallery(
  official: ExecutivePortraitInput,
  mediaGallery?: ExecutiveMediaEntry[] | null,
): string | null {
  if (!mediaGallery?.length || !official.id) return null
  const id = official.id.trim()
  const match = mediaGallery.find(
    (entry) =>
      entry.image_url &&
      (entry.entity_id === id ||
        entry.entity_id === id.replace(/^bioguide:/i, "") ||
        (entry.entity_type === "official" && entry.entity_id?.toLowerCase() === id.toLowerCase())),
  )
  return match?.image_url ?? null
}

/** Resolve the best available portrait URL for an official. */
export function resolveExecutivePortraitUrl(
  official: ExecutivePortraitInput,
  mediaGallery?: ExecutiveMediaEntry[] | null,
): string | null {
  const direct = official.image_url?.trim()
  if (direct) return direct

  const fromGallery = portraitFromMediaGallery(official, mediaGallery)
  if (fromGallery) return fromGallery

  const fromBioguide = bioguidePhotoUrl(official.id)
  if (fromBioguide) return fromBioguide

  const name = official.name?.trim()
  if (name) {
    const byName = PORTRAIT_BY_NAME[normalizeName(name)]
    if (byName) return byName
  }

  return null
}
