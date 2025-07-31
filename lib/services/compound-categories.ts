// Define compound categories and their characteristics
export const COMPOUND_CATEGORIES = {
  alkaloids: {
    name: "Alkaloids",
    description: "Nitrogen-containing organic compounds",
    examples: ["Psilocybin", "Muscimol"],
    searchTerms: ["alkaloid", "nitrogen", "basic", "amine"],
  },
  terpenoids: {
    name: "Terpenoids",
    description: "Derivatives of terpene compounds",
    examples: ["Ganoderic Acid", "Betulinic Acid"],
    searchTerms: ["terpene", "terpenoid", "isoprenoid"],
  },
  polysaccharides: {
    name: "Polysaccharides",
    description: "Complex carbohydrate compounds",
    examples: ["PSK", "Lentinan", "Grifolan"],
    searchTerms: ["polysaccharide", "beta-glucan", "complex carbohydrate"],
  },
  steroids: {
    name: "Steroids",
    description: "Steroid compounds and derivatives",
    examples: ["Blazein", "Ergosterol"],
    searchTerms: ["steroid", "sterol", "hormone"],
  },
  peptides: {
    name: "Peptides",
    description: "Small proteins and peptide compounds",
    examples: ["Cordycepin", "PSP"],
    searchTerms: ["peptide", "protein", "amino acid"],
  },
}

export type CompoundCategory = keyof typeof COMPOUND_CATEGORIES

export function getCategoryForCompound(compoundName: string): CompoundCategory | null {
  for (const [category, data] of Object.entries(COMPOUND_CATEGORIES)) {
    if (data.examples.includes(compoundName)) {
      return category as CompoundCategory
    }
  }
  return null
}

export function getCompoundsByCategory(category: CompoundCategory) {
  const categoryData = COMPOUND_CATEGORIES[category]
  return categoryData.examples
}

export function searchCompoundCategories(query: string): CompoundCategory[] {
  const normalizedQuery = query.toLowerCase()
  return Object.entries(COMPOUND_CATEGORIES)
    .filter(
      ([_, data]) =>
        data.searchTerms.some((term) => term.toLowerCase().includes(normalizedQuery)) ||
        data.examples.some((example) => example.toLowerCase().includes(normalizedQuery)),
    )
    .map(([category]) => category as CompoundCategory)
}
