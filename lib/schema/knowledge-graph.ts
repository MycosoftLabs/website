/**
 * Knowledge Graph Schema Definition
 *
 * This schema defines the structure of the Mycosoft knowledge graph for external systems.
 * It describes the node types, their properties, and relationships between nodes.
 */

export const knowledgeGraphSchema = {
  version: "1.0",
  description: "Mycosoft Knowledge Graph Schema",
  nodes: {
    species: {
      description: "Fungal species",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        scientificName: { type: "string", description: "Scientific name (Latin)" },
        commonName: { type: "string", description: "Common name" },
        family: { type: "string", description: "Taxonomic family" },
        genus: { type: "string", description: "Taxonomic genus" },
        description: { type: "string", description: "Description of the species" },
        edibility: { type: "string", description: "Edibility classification" },
        ecology: { type: "string", description: "Ecological characteristics" },
        habitat: { type: "string", description: "Natural habitat" },
        distribution: { type: "string", description: "Geographic distribution" },
        imageUrl: { type: "string", description: "URL to species image" },
      },
      relationships: [
        { name: "produces", target: "compounds", description: "Compounds produced by this species" },
        { name: "growsIn", target: "habitat", description: "Habitats where this species grows" },
        { name: "citedIn", target: "reference", description: "Scientific references citing this species" },
        { name: "relatedTo", target: "species", description: "Related species" },
      ],
    },
    compounds: {
      description: "Chemical compounds found in fungi",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Compound name" },
        formula: { type: "string", description: "Chemical formula" },
        molecularWeight: { type: "number", description: "Molecular weight" },
        description: { type: "string", description: "Description of the compound" },
        chemicalClass: { type: "string", description: "Chemical classification" },
        biologicalActivity: { type: "string", description: "Biological activity" },
        structure: { type: "string", description: "Chemical structure (SMILES or InChI)" },
      },
      relationships: [
        { name: "producedBy", target: "species", description: "Species that produce this compound" },
        { name: "interactsWith", target: "compounds", description: "Other compounds this interacts with" },
        { name: "citedIn", target: "reference", description: "Scientific references citing this compound" },
        { name: "hasEffect", target: "biologicalEffect", description: "Biological effects of this compound" },
      ],
    },
    habitat: {
      description: "Natural habitats for fungi",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Habitat name" },
        description: { type: "string", description: "Description of the habitat" },
        climate: { type: "string", description: "Climate type" },
        soilType: { type: "string", description: "Soil characteristics" },
        vegetation: { type: "string", description: "Vegetation type" },
        region: { type: "string", description: "Geographic region" },
      },
      relationships: [
        { name: "hosts", target: "species", description: "Species found in this habitat" },
        { name: "adjacentTo", target: "habitat", description: "Adjacent habitats" },
      ],
    },
    reference: {
      description: "Scientific references and publications",
      properties: {
        id: { type: "string", description: "Unique identifier (DOI)" },
        title: { type: "string", description: "Publication title" },
        authors: { type: "array", description: "List of authors" },
        journal: { type: "string", description: "Journal name" },
        year: { type: "number", description: "Publication year" },
        abstract: { type: "string", description: "Publication abstract" },
        url: { type: "string", description: "URL to the publication" },
      },
      relationships: [
        { name: "mentions", target: "species", description: "Species mentioned in this reference" },
        { name: "discusses", target: "compounds", description: "Compounds discussed in this reference" },
        { name: "cites", target: "reference", description: "Other references cited by this reference" },
      ],
    },
    biologicalEffect: {
      description: "Biological effects of compounds",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Effect name" },
        description: { type: "string", description: "Description of the effect" },
        mechanism: { type: "string", description: "Mechanism of action" },
        targetOrganism: { type: "string", description: "Target organism" },
      },
      relationships: [
        { name: "causedBy", target: "compounds", description: "Compounds causing this effect" },
        { name: "documentedIn", target: "reference", description: "References documenting this effect" },
      ],
    },
  },
  queryExamples: [
    {
      name: "Get species by scientific name",
      query: `
        {
          species(scientificName: "Amanita muscaria") {
            id
            commonName
            description
            compounds {
              name
              biologicalActivity
            }
          }
        }
      `,
    },
    {
      name: "Get compounds with specific biological activity",
      query: `
        {
          compounds(biologicalActivity: "antioxidant") {
            name
            formula
            producedBy {
              scientificName
              commonName
            }
          }
        }
      `,
    },
  ],
}

/**
 * Get a simplified version of the schema for external systems
 * @returns Simplified schema with essential information
 */
export function getSimplifiedSchema() {
  const simplified = {
    version: knowledgeGraphSchema.version,
    description: knowledgeGraphSchema.description,
    nodeTypes: Object.keys(knowledgeGraphSchema.nodes),
    relationships: {} as Record<string, string[]>,
  }

  // Extract relationships
  Object.entries(knowledgeGraphSchema.nodes).forEach(([nodeType, definition]) => {
    simplified.relationships[nodeType] = (definition.relationships || []).map((rel) => `${rel.name} -> ${rel.target}`)
  })

  return simplified
}

/**
 * Validate data against the knowledge graph schema
 * @param nodeType The type of node to validate
 * @param data The data to validate
 * @returns Validation result with errors if any
 */
export function validateAgainstSchema(nodeType: string, data: any) {
  const schema = knowledgeGraphSchema.nodes[nodeType as keyof typeof knowledgeGraphSchema.nodes]

  if (!schema) {
    return { valid: false, errors: [`Unknown node type: ${nodeType}`] }
  }

  const errors: string[] = []

  // Validate properties
  Object.entries(schema.properties).forEach(([propName, propDef]) => {
    const value = data[propName]

    // Check required properties (assuming all are required for now)
    if (value === undefined || value === null) {
      errors.push(`Missing required property: ${propName}`)
    }

    // Type validation could be added here
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}
