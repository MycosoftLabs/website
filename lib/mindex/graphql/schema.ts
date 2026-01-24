export const mindexSchemaSDL = /* GraphQL */ `
  scalar JSON

  type Taxon {
    id: ID!
    canonical_name: String!
    common_name: String
    rank: String!
    source: String
    created_at: String
    updated_at: String
  }

  type ObservationLocation {
    type: String!
    coordinates: [Float!]!
  }

  type Observation {
    id: ID!
    taxon_id: ID
    observed_at: String
    source: String
    location: ObservationLocation
  }

  type TaxaResponse {
    data: [Taxon!]!
    meta: JSON
  }

  type ObservationsResponse {
    data: [Observation!]!
    meta: JSON
  }

  type Query {
    taxa(q: String, page: Int, page_size: Int): TaxaResponse!
    taxon(id: ID!): Taxon
    observations(q: String, page: Int, page_size: Int): ObservationsResponse!
    health: JSON!
  }
`

