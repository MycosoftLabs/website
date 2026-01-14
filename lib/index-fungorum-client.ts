/**
 * Index Fungorum API Client
 * 
 * Implements LSID (Life Science Identifier) resolution for fungal names.
 * Index Fungorum is the global fungal nomenclator coordinated by RBG Kew.
 * 
 * LSID Format: urn:lsid:indexfungorum.org:names:<number>
 * 
 * API Endpoints:
 * - Name search: http://www.indexfungorum.org/IXFWebService/Fungus.asmx
 * - LSID resolution: http://www.indexfungorum.org/names/lsid/lsid.asp
 * 
 * @see https://www.indexfungorum.org/
 */

export interface IndexFungorumName {
  recordNumber: string;
  currentName: string;
  nameOfFungus: string;
  authors: string;
  yearOfPublication: string;
  infraspecificRank?: string;
  infraspecificEpithet?: string;
  genusName: string;
  specificEpithet?: string;
  typeSpecies?: string;
  basionym?: string;
  sanctionedBy?: string;
  nomenclaturalStatus?: string;
  kingdom: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  lsid: string;
}

export interface IndexFungorumSearchResult {
  names: IndexFungorumName[];
  totalCount: number;
  query: string;
  source: "api" | "cache";
}

const INDEX_FUNGORUM_BASE_URL = "https://www.indexfungorum.org";
const LSID_PREFIX = "urn:lsid:indexfungorum.org:names:";

// Simple in-memory cache with TTL
const cache = new Map<string, { data: IndexFungorumName[]; expires: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Parse an LSID to extract the record number
 */
export function parseLSID(lsid: string): string | null {
  if (!lsid.startsWith(LSID_PREFIX)) return null;
  const recordNumber = lsid.substring(LSID_PREFIX.length);
  return recordNumber.match(/^\d+$/) ? recordNumber : null;
}

/**
 * Build an LSID from a record number
 */
export function buildLSID(recordNumber: string | number): string {
  return `${LSID_PREFIX}${recordNumber}`;
}

/**
 * Resolve an LSID to get full name record
 * 
 * @param lsid The LSID to resolve (e.g., urn:lsid:indexfungorum.org:names:17703)
 * @returns The resolved name record or null if not found
 */
export async function resolveLSID(lsid: string): Promise<IndexFungorumName | null> {
  const recordNumber = parseLSID(lsid);
  if (!recordNumber) {
    throw new Error(`Invalid LSID format: ${lsid}`);
  }

  // Check cache
  const cacheKey = `lsid:${recordNumber}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data[0] || null;
  }

  try {
    // Use the SOAP web service
    const url = `${INDEX_FUNGORUM_BASE_URL}/IXFWebService/Fungus.asmx/NameByKey?NameKey=${recordNumber}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mycosoft/1.0 (https://mycosoft.com)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    const data = parseXMLResponse(text);
    
    if (data && data.length > 0) {
      cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });
      return data[0];
    }

    return null;
  } catch (error) {
    console.error(`Failed to resolve LSID ${lsid}:`, error);
    throw error;
  }
}

/**
 * Search for names by epithet (genus, species, etc.)
 * 
 * @param searchTerm The name or partial name to search for
 * @param maxResults Maximum number of results to return
 * @returns Array of matching name records
 */
export async function searchByName(
  searchTerm: string,
  maxResults: number = 50
): Promise<IndexFungorumSearchResult> {
  const cacheKey = `search:${searchTerm.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return {
      names: cached.data.slice(0, maxResults),
      totalCount: cached.data.length,
      query: searchTerm,
      source: "cache",
    };
  }

  try {
    // Use NameSearch endpoint
    const url = `${INDEX_FUNGORUM_BASE_URL}/IXFWebService/Fungus.asmx/NameSearch?SearchText=${encodeURIComponent(searchTerm)}&AnywhereInText=true&MaxNumber=${maxResults}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mycosoft/1.0 (https://mycosoft.com)",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    const names = parseXMLResponse(text);

    cache.set(cacheKey, { data: names, expires: Date.now() + CACHE_TTL });

    return {
      names: names.slice(0, maxResults),
      totalCount: names.length,
      query: searchTerm,
      source: "api",
    };
  } catch (error) {
    console.error(`Failed to search Index Fungorum for "${searchTerm}":`, error);
    throw error;
  }
}

/**
 * Search for names by genus name
 * 
 * @param genus The genus name to search
 * @returns Array of matching species in that genus
 */
export async function searchByGenus(genus: string): Promise<IndexFungorumSearchResult> {
  const cacheKey = `genus:${genus.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return {
      names: cached.data,
      totalCount: cached.data.length,
      query: genus,
      source: "cache",
    };
  }

  try {
    const url = `${INDEX_FUNGORUM_BASE_URL}/IXFWebService/Fungus.asmx/NamesByGenus?Genus=${encodeURIComponent(genus)}&MaxNumber=100`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mycosoft/1.0 (https://mycosoft.com)",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    const names = parseXMLResponse(text);

    cache.set(cacheKey, { data: names, expires: Date.now() + CACHE_TTL });

    return {
      names,
      totalCount: names.length,
      query: genus,
      source: "api",
    };
  } catch (error) {
    console.error(`Failed to search Index Fungorum for genus "${genus}":`, error);
    throw error;
  }
}

/**
 * Get the complete taxonomic hierarchy for a name
 * 
 * @param recordNumber The IF record number
 * @returns The name record with populated taxonomy fields
 */
export async function getTaxonomicHierarchy(recordNumber: string): Promise<IndexFungorumName | null> {
  const lsid = buildLSID(recordNumber);
  return resolveLSID(lsid);
}

/**
 * Parse XML response from Index Fungorum API
 * The API returns XML, so we need to parse it
 */
function parseXMLResponse(xmlText: string): IndexFungorumName[] {
  const names: IndexFungorumName[] = [];

  try {
    // Simple regex-based XML parsing for the expected structure
    const recordMatches = xmlText.matchAll(/<IndexFungorum>([\s\S]*?)<\/IndexFungorum>/g);
    
    for (const match of recordMatches) {
      const record = match[1];
      const name = parseRecordXML(record);
      if (name) {
        names.push(name);
      }
    }

    // If no IndexFungorum tags, try single record format
    if (names.length === 0) {
      const name = parseRecordXML(xmlText);
      if (name) {
        names.push(name);
      }
    }
  } catch (error) {
    console.error("Failed to parse XML response:", error);
  }

  return names;
}

/**
 * Parse a single record from XML
 */
function parseRecordXML(xml: string): IndexFungorumName | null {
  const getValue = (tag: string): string | undefined => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
    return match ? match[1].trim() : undefined;
  };

  const recordNumber = getValue("RECORD_x0020_NUMBER") || getValue("RecordNumber");
  const nameOfFungus = getValue("NAME_x0020_OF_x0020_FUNGUS") || getValue("NameOfFungus");

  if (!recordNumber || !nameOfFungus) {
    return null;
  }

  return {
    recordNumber,
    nameOfFungus,
    currentName: getValue("CURRENT_x0020_NAME") || getValue("CurrentName") || nameOfFungus,
    authors: getValue("AUTHORS") || getValue("Authors") || "",
    yearOfPublication: getValue("YEAR_x0020_OF_x0020_PUBLICATION") || getValue("YearOfPublication") || "",
    infraspecificRank: getValue("INFRASPECIFIC_x0020_RANK") || getValue("InfraspecificRank"),
    infraspecificEpithet: getValue("INFRASPECIFIC_x0020_EPITHET") || getValue("InfraspecificEpithet"),
    genusName: getValue("Genus_x0020_name") || getValue("GenusName") || "",
    specificEpithet: getValue("Specific_x0020_epithet") || getValue("SpecificEpithet"),
    typeSpecies: getValue("TYPE_x0020_SPECIES") || getValue("TypeSpecies"),
    basionym: getValue("BASIONYM") || getValue("Basionym"),
    sanctionedBy: getValue("SANCTIONED_x0020_BY") || getValue("SanctionedBy"),
    nomenclaturalStatus: getValue("NOMENCLATURAL_x0020_STATUS") || getValue("NomenclaturalStatus"),
    kingdom: getValue("Kingdom") || "Fungi",
    phylum: getValue("Phylum"),
    class: getValue("Class"),
    order: getValue("Order"),
    family: getValue("Family"),
    genus: getValue("Genus"),
    species: getValue("Species"),
    lsid: buildLSID(recordNumber),
  };
}

/**
 * Clear the cache (for testing or manual refresh)
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
  };
}

export default {
  resolveLSID,
  searchByName,
  searchByGenus,
  getTaxonomicHierarchy,
  parseLSID,
  buildLSID,
  clearCache,
  getCacheStats,
};
