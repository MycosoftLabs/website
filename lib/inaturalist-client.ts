/**
 * iNaturalist API Client
 * 
 * Client for fetching organism observations from iNaturalist.
 * Focuses on fungal/mushroom observations for mycelium mapping.
 */

export interface iNaturalistObservation {
  id: number;
  observed_on: string;
  latitude: number;
  longitude: number;
  species_guess?: string;
  taxon_id?: number;
  taxon?: {
    id: number;
    name: string;
    preferred_common_name?: string;
    rank: string;
    ancestry?: string;
  };
  photos?: Array<{
    id: number;
    attribution: string;
    license_code?: string;
    url: string;
    medium_url?: string;
  }>;
  quality_grade: string;
  user?: {
    login: string;
  };
}

export interface iNaturalistResponse {
  total_results: number;
  page: number;
  per_page: number;
  results: iNaturalistObservation[];
}

export class iNaturalistClient {
  private baseUrl = "https://api.inaturalist.org/v1";
  private rateLimitDelay = 100; // ms between requests

  /**
   * Search for observations
   */
  async searchObservations(params: {
    lat?: number;
    lng?: number;
    radius?: number; // meters
    taxon_id?: number;
    quality_grade?: "research" | "needs_id" | "casual";
    observed_on?: string;
    per_page?: number;
    page?: number;
  }): Promise<iNaturalistResponse> {
    const url = new URL(`${this.baseUrl}/observations`);
    
    if (params.lat !== undefined) url.searchParams.set("lat", params.lat.toString());
    if (params.lng !== undefined) url.searchParams.set("lng", params.lng.toString());
    if (params.radius !== undefined) url.searchParams.set("radius", params.radius.toString());
    if (params.taxon_id !== undefined) url.searchParams.set("taxon_id", params.taxon_id.toString());
    if (params.quality_grade) url.searchParams.set("quality_grade", params.quality_grade);
    if (params.observed_on) url.searchParams.set("observed_on", params.observed_on);
    url.searchParams.set("per_page", (params.per_page || 200).toString());
    url.searchParams.set("page", (params.page || 1).toString());
    url.searchParams.set("order", "desc");
    url.searchParams.set("order_by", "observed_on");

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("iNaturalist API error:", error);
      throw error;
    }
  }

  /**
   * Get fungal observations (Kingdom Fungi = taxon_id 47170)
   */
  async getFungalObservations(params: {
    lat: number;
    lng: number;
    radius: number;
    observed_on?: string;
    per_page?: number;
    page?: number;
  }): Promise<iNaturalistObservation[]> {
    const response = await this.searchObservations({
      ...params,
      taxon_id: 47170, // Kingdom Fungi
      quality_grade: "research", // Only research-grade observations
    });
    return response.results || [];
  }

  /**
   * Get observations in a bounding box
   */
  async getObservationsInBounds(params: {
    nelat: number;
    nelng: number;
    swlat: number;
    swlng: number;
    taxon_id?: number;
    observed_on?: string;
    per_page?: number;
  }): Promise<iNaturalistObservation[]> {
    const url = new URL(`${this.baseUrl}/observations`);
    url.searchParams.set("nelat", params.nelat.toString());
    url.searchParams.set("nelng", params.nelng.toString());
    url.searchParams.set("swlat", params.swlat.toString());
    url.searchParams.set("swlng", params.swlng.toString());
    if (params.taxon_id) url.searchParams.set("taxon_id", params.taxon_id.toString());
    if (params.observed_on) url.searchParams.set("observed_on", params.observed_on.toString());
    url.searchParams.set("per_page", (params.per_page || 200).toString());
    url.searchParams.set("order", "desc");
    url.searchParams.set("order_by", "observed_on");

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`iNaturalist API error: ${response.status}`);
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("iNaturalist API error:", error);
      throw error;
    }
  }

  /**
   * Get observation details
   */
  async getObservation(id: number): Promise<iNaturalistObservation | null> {
    try {
      const response = await fetch(`${this.baseUrl}/observations/${id}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.results?.[0] || null;
    } catch (error) {
      console.error("iNaturalist API error:", error);
      return null;
    }
  }
}

export const inaturalistClient = new iNaturalistClient();
