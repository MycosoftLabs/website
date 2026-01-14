/**
 * Provenance Library for MINDEX Data
 * 
 * Implements JSON-LD schema for data provenance tracking.
 * Follows PROV-O (Provenance Ontology) and Schema.org standards.
 * 
 * Used to track:
 * - Where data came from (sources: GBIF, iNaturalist, Index Fungorum, etc.)
 * - When it was fetched/created
 * - How it was transformed
 * - Attribution and licensing
 * 
 * @see https://www.w3.org/TR/prov-o/
 * @see https://schema.org/
 */

export interface ProvenanceRecord {
  "@context": ProvenanceContext;
  "@type": "prov:Entity";
  "@id": string;
  generatedAtTime: string;
  wasGeneratedBy?: Activity;
  wasAttributedTo?: Agent | Agent[];
  wasDerivedFrom?: Entity | Entity[];
  hadPrimarySource?: Entity | Entity[];
  wasRevisionOf?: string;
  license?: string;
  copyrightHolder?: Agent;
  citation?: string;
  checksum?: Checksum;
}

interface ProvenanceContext {
  "@vocab": string;
  prov: string;
  schema: string;
  dcterms: string;
  xsd: string;
  [key: string]: string | object;
}

interface Entity {
  "@type": "prov:Entity";
  "@id": string;
  label?: string;
  value?: unknown;
  wasGeneratedBy?: string;
  accessedAt?: string;
  sourceUrl?: string;
}

interface Activity {
  "@type": "prov:Activity";
  "@id": string;
  label?: string;
  startedAtTime?: string;
  endedAtTime?: string;
  wasAssociatedWith?: Agent;
  used?: Entity | Entity[];
  description?: string;
}

interface Agent {
  "@type": "prov:Agent" | "prov:Organization" | "prov:SoftwareAgent";
  "@id": string;
  label?: string;
  name?: string;
  url?: string;
  email?: string;
}

interface Checksum {
  "@type": "spdx:Checksum";
  algorithm: "sha256" | "sha1" | "md5";
  checksumValue: string;
}

// Standard context for MINDEX provenance records
const MINDEX_CONTEXT: ProvenanceContext = {
  "@vocab": "https://mycosoft.com/vocab/",
  prov: "http://www.w3.org/ns/prov#",
  schema: "https://schema.org/",
  dcterms: "http://purl.org/dc/terms/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  spdx: "http://spdx.org/rdf/terms#",
  gbif: "https://www.gbif.org/species/",
  inaturalist: "https://www.inaturalist.org/taxa/",
  indexfungorum: "http://www.indexfungorum.org/names/NamesRecord.asp?RecordID=",
  mindex: "https://mindex.mycosoft.com/",
};

// Known data sources
export const DATA_SOURCES = {
  GBIF: {
    "@type": "prov:Organization" as const,
    "@id": "https://www.gbif.org",
    name: "Global Biodiversity Information Facility",
    url: "https://www.gbif.org",
  },
  INATURALIST: {
    "@type": "prov:Organization" as const,
    "@id": "https://www.inaturalist.org",
    name: "iNaturalist",
    url: "https://www.inaturalist.org",
  },
  INDEX_FUNGORUM: {
    "@type": "prov:Organization" as const,
    "@id": "http://www.indexfungorum.org",
    name: "Index Fungorum",
    url: "http://www.indexfungorum.org",
  },
  MYCOBANK: {
    "@type": "prov:Organization" as const,
    "@id": "https://www.mycobank.org",
    name: "MycoBank",
    url: "https://www.mycobank.org",
  },
  MINDEX: {
    "@type": "prov:SoftwareAgent" as const,
    "@id": "https://mindex.mycosoft.com",
    name: "MINDEX Taxonomic Reconciliation Service",
    url: "https://mycosoft.com/mindex",
  },
};

// Supported licenses
export const LICENSES = {
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
  CC_BY: "https://creativecommons.org/licenses/by/4.0/",
  CC_BY_SA: "https://creativecommons.org/licenses/by-sa/4.0/",
  CC_BY_NC: "https://creativecommons.org/licenses/by-nc/4.0/",
};

/**
 * Create a provenance record for a MINDEX entity
 */
export function createProvenanceRecord(options: {
  entityId: string;
  entityType?: string;
  sources?: Array<{ id: string; url?: string; label?: string; accessedAt?: string }>;
  attributedTo?: Agent | Agent[];
  license?: keyof typeof LICENSES | string;
  activity?: { id: string; label: string; description?: string };
  checksum?: { algorithm: "sha256" | "sha1" | "md5"; value: string };
  citation?: string;
}): ProvenanceRecord {
  const now = new Date().toISOString();

  const record: ProvenanceRecord = {
    "@context": MINDEX_CONTEXT,
    "@type": "prov:Entity",
    "@id": `mindex:${options.entityId}`,
    generatedAtTime: now,
  };

  // Add primary sources
  if (options.sources && options.sources.length > 0) {
    const sources: Entity[] = options.sources.map((s) => ({
      "@type": "prov:Entity",
      "@id": s.id,
      label: s.label,
      sourceUrl: s.url,
      accessedAt: s.accessedAt || now,
    }));
    record.hadPrimarySource = sources.length === 1 ? sources[0] : sources;
  }

  // Add attribution
  if (options.attributedTo) {
    record.wasAttributedTo = options.attributedTo;
  }

  // Add license
  if (options.license) {
    record.license = LICENSES[options.license as keyof typeof LICENSES] || options.license;
  }

  // Add generating activity
  if (options.activity) {
    record.wasGeneratedBy = {
      "@type": "prov:Activity",
      "@id": `mindex:activity:${options.activity.id}`,
      label: options.activity.label,
      description: options.activity.description,
      startedAtTime: now,
      endedAtTime: now,
      wasAssociatedWith: DATA_SOURCES.MINDEX,
    };
  }

  // Add checksum
  if (options.checksum) {
    record.checksum = {
      "@type": "spdx:Checksum",
      algorithm: options.checksum.algorithm,
      checksumValue: options.checksum.value,
    };
  }

  // Add citation
  if (options.citation) {
    record.citation = options.citation;
  }

  return record;
}

/**
 * Create a derivation record when data is transformed
 */
export function createDerivation(options: {
  newEntityId: string;
  derivedFromId: string | string[];
  activity: { id: string; label: string; description?: string };
  agent?: Agent;
}): ProvenanceRecord {
  const now = new Date().toISOString();
  const derivedFrom = Array.isArray(options.derivedFromId)
    ? options.derivedFromId.map((id) => ({
        "@type": "prov:Entity" as const,
        "@id": id,
      }))
    : {
        "@type": "prov:Entity" as const,
        "@id": options.derivedFromId,
      };

  return {
    "@context": MINDEX_CONTEXT,
    "@type": "prov:Entity",
    "@id": `mindex:${options.newEntityId}`,
    generatedAtTime: now,
    wasDerivedFrom: derivedFrom,
    wasGeneratedBy: {
      "@type": "prov:Activity",
      "@id": `mindex:activity:${options.activity.id}`,
      label: options.activity.label,
      description: options.activity.description,
      startedAtTime: now,
      endedAtTime: now,
      wasAssociatedWith: options.agent || DATA_SOURCES.MINDEX,
    },
  };
}

/**
 * Create a revision record when data is updated
 */
export function createRevision(options: {
  newEntityId: string;
  previousEntityId: string;
  changes?: string;
}): ProvenanceRecord {
  const now = new Date().toISOString();

  return {
    "@context": MINDEX_CONTEXT,
    "@type": "prov:Entity",
    "@id": `mindex:${options.newEntityId}`,
    generatedAtTime: now,
    wasRevisionOf: `mindex:${options.previousEntityId}`,
    wasGeneratedBy: {
      "@type": "prov:Activity",
      "@id": `mindex:activity:revision:${Date.now()}`,
      label: "Data Revision",
      description: options.changes || "Updated record",
      startedAtTime: now,
      endedAtTime: now,
      wasAssociatedWith: DATA_SOURCES.MINDEX,
    },
  };
}

/**
 * Create provenance for GBIF-sourced data
 */
export function createGBIFProvenance(gbifKey: string | number, options?: {
  accessedAt?: string;
  license?: keyof typeof LICENSES;
  citation?: string;
}): ProvenanceRecord {
  return createProvenanceRecord({
    entityId: `gbif:${gbifKey}`,
    sources: [
      {
        id: `gbif:${gbifKey}`,
        url: `https://www.gbif.org/species/${gbifKey}`,
        label: `GBIF Species ${gbifKey}`,
        accessedAt: options?.accessedAt,
      },
    ],
    attributedTo: DATA_SOURCES.GBIF,
    license: options?.license || "CC0",
    activity: {
      id: `gbif-fetch-${gbifKey}`,
      label: "GBIF API Fetch",
      description: `Retrieved species data from GBIF backbone taxonomy`,
    },
    citation: options?.citation || `GBIF Secretariat (${new Date().getFullYear()}). GBIF Backbone Taxonomy. https://doi.org/10.15468/39omei`,
  });
}

/**
 * Create provenance for iNaturalist-sourced data
 */
export function createINaturalistProvenance(taxonId: string | number, options?: {
  accessedAt?: string;
  license?: keyof typeof LICENSES;
}): ProvenanceRecord {
  return createProvenanceRecord({
    entityId: `inaturalist:${taxonId}`,
    sources: [
      {
        id: `inaturalist:${taxonId}`,
        url: `https://www.inaturalist.org/taxa/${taxonId}`,
        label: `iNaturalist Taxon ${taxonId}`,
        accessedAt: options?.accessedAt,
      },
    ],
    attributedTo: DATA_SOURCES.INATURALIST,
    license: options?.license || "CC_BY",
    activity: {
      id: `inaturalist-fetch-${taxonId}`,
      label: "iNaturalist API Fetch",
      description: "Retrieved taxon data from iNaturalist",
    },
  });
}

/**
 * Create provenance for Index Fungorum-sourced data
 */
export function createIndexFungorumProvenance(recordNumber: string | number, options?: {
  accessedAt?: string;
  nameOfFungus?: string;
}): ProvenanceRecord {
  return createProvenanceRecord({
    entityId: `indexfungorum:${recordNumber}`,
    sources: [
      {
        id: `urn:lsid:indexfungorum.org:names:${recordNumber}`,
        url: `http://www.indexfungorum.org/names/NamesRecord.asp?RecordID=${recordNumber}`,
        label: options?.nameOfFungus || `Index Fungorum ${recordNumber}`,
        accessedAt: options?.accessedAt,
      },
    ],
    attributedTo: DATA_SOURCES.INDEX_FUNGORUM,
    activity: {
      id: `indexfungorum-fetch-${recordNumber}`,
      label: "Index Fungorum API Fetch",
      description: "Retrieved nomenclatural data from Index Fungorum",
    },
  });
}

/**
 * Generate a SHA-256 checksum for data integrity verification
 */
export async function generateChecksum(data: string | object): Promise<string> {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(text);
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  
  return hashHex;
}

/**
 * Serialize provenance record to JSON-LD string
 */
export function serializeProvenance(record: ProvenanceRecord): string {
  return JSON.stringify(record, null, 2);
}

/**
 * Validate a provenance record structure
 */
export function validateProvenance(record: unknown): record is ProvenanceRecord {
  if (typeof record !== "object" || record === null) return false;
  
  const r = record as Record<string, unknown>;
  
  return (
    typeof r["@context"] === "object" &&
    r["@type"] === "prov:Entity" &&
    typeof r["@id"] === "string" &&
    typeof r.generatedAtTime === "string"
  );
}

export default {
  createProvenanceRecord,
  createDerivation,
  createRevision,
  createGBIFProvenance,
  createINaturalistProvenance,
  createIndexFungorumProvenance,
  generateChecksum,
  serializeProvenance,
  validateProvenance,
  DATA_SOURCES,
  LICENSES,
};
