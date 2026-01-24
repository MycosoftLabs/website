/**
 * Mycorrhizal Network Module for MINDEX
 * 
 * Models the underground fungal-plant symbiotic networks ("Wood Wide Web")
 * Based on concepts from:
 * - MINDEX fungal database architecture
 * - M-Wave mycelium network research for distributed sensing
 * - Global Fungi Symbiosis Theory
 * 
 * @see https://www.researchhub.com/paper/9306882/the-m-wave-harnessing-mycelium-networks-for-earthquake-prediction
 */

/**
 * Node types in the mycorrhizal network
 */
export type MycorrhizalNodeType = 
  | 'fungus'      // Fungal species (hub)
  | 'plant'       // Plant species (connected)
  | 'sensor'      // MycoBrain/MycoNode device
  | 'observation' // Field observation point
  | 'sample'      // Physical sample location;

/**
 * Edge types representing different connection types
 */
export type MycorrhizalEdgeType =
  | 'ectomycorrhizal'     // Fungus wraps around roots (ECM)
  | 'arbuscular'          // Fungus penetrates root cells (AM)
  | 'ericoid'             // Ericaceae family associations
  | 'orchid'              // Orchidaceae associations
  | 'monotropoid'         // Non-photosynthetic plant associations
  | 'signal'              // Data transmission (device-to-device)
  | 'nutrient'            // Nutrient transfer pathway
  | 'carbon'              // Carbon transfer pathway;

/**
 * A node in the mycorrhizal network graph
 */
export interface MycorrhizalNode {
  id: string;
  type: MycorrhizalNodeType;
  
  // Identity
  taxon_id?: string;          // MINDEX taxon ID
  device_id?: string;         // MycoBrain device ID
  canonical_name?: string;
  common_name?: string;
  
  // Location
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    elevation?: number;
    depth?: number;             // Soil depth in cm
  };
  
  // Network properties
  degree: number;               // Number of connections
  betweenness?: number;         // Betweenness centrality
  clustering?: number;          // Local clustering coefficient
  
  // Metadata
  first_observed?: string;
  last_active?: string;
  data_quality?: number;        // 0-1 confidence score
  
  // Visual properties
  color?: string;
  size?: number;
  label?: string;
}

/**
 * An edge/connection in the mycorrhizal network
 */
export interface MycorrhizalEdge {
  id: string;
  source: string;               // Node ID
  target: string;               // Node ID
  type: MycorrhizalEdgeType;
  
  // Relationship properties
  weight: number;               // Connection strength (0-1)
  bidirectional: boolean;       // Two-way relationship
  
  // Transfer data (for nutrient/carbon edges)
  transfer_rate?: {
    nitrogen?: number;          // μg/day
    phosphorus?: number;        // μg/day
    carbon?: number;            // mg/day
    water?: number;             // mL/day
  };
  
  // Signal data (for device edges)
  signal_strength?: number;     // dB
  latency?: number;             // ms
  bandwidth?: number;           // bytes/sec
  
  // Metadata
  first_observed?: string;
  last_active?: string;
  observations_count?: number;
  
  // Visual properties
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Complete mycorrhizal network graph
 */
export interface MycorrhizalNetwork {
  id: string;
  name: string;
  description?: string;
  
  // Graph data
  nodes: MycorrhizalNode[];
  edges: MycorrhizalEdge[];
  
  // Network statistics
  stats: {
    node_count: number;
    edge_count: number;
    avg_degree: number;
    diameter: number;           // Longest shortest path
    density: number;            // Actual edges / possible edges
    clustering_coefficient: number;
    connected_components: number;
  };
  
  // Bounding box
  bounds?: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
    area_km2: number;
  };
  
  // Metadata
  created_at: string;
  updated_at: string;
  source: string;               // Data source (field survey, sensors, etc.)
}

/**
 * Calculate network statistics for a mycorrhizal network
 */
export function calculateNetworkStats(
  nodes: MycorrhizalNode[],
  edges: MycorrhizalEdge[]
): MycorrhizalNetwork['stats'] {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  
  // Calculate degree for each node
  const degreeMap = new Map<string, number>();
  nodes.forEach(n => degreeMap.set(n.id, 0));
  
  edges.forEach(e => {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  });
  
  const degrees = Array.from(degreeMap.values());
  const avgDegree = degrees.length > 0 
    ? degrees.reduce((a, b) => a + b, 0) / degrees.length 
    : 0;
  
  // Network density
  const possibleEdges = (nodeCount * (nodeCount - 1)) / 2;
  const density = possibleEdges > 0 ? edgeCount / possibleEdges : 0;
  
  // Simple connected components (BFS)
  const visited = new Set<string>();
  let components = 0;
  
  const adjacency = new Map<string, string[]>();
  nodes.forEach(n => adjacency.set(n.id, []));
  edges.forEach(e => {
    adjacency.get(e.source)?.push(e.target);
    adjacency.get(e.target)?.push(e.source);
  });
  
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      components++;
      const queue = [node.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (!visited.has(current)) {
          visited.add(current);
          adjacency.get(current)?.forEach(neighbor => {
            if (!visited.has(neighbor)) queue.push(neighbor);
          });
        }
      }
    }
  });
  
  return {
    node_count: nodeCount,
    edge_count: edgeCount,
    avg_degree: avgDegree,
    diameter: 0,  // Would require full shortest-path calculation
    density,
    clustering_coefficient: 0,  // Would require triangle counting
    connected_components: components,
  };
}

/**
 * Build a mycorrhizal network from MINDEX taxa and observations
 */
export function buildNetworkFromData(
  taxa: Array<{
    id: string;
    canonical_name: string;
    common_name?: string;
    kingdom: string;
    associated_species?: string[];
  }>,
  observations: Array<{
    id: string;
    taxon_id: string;
    location?: { type: 'Point'; coordinates: [number, number] };
    observed_at: string;
  }>,
  devices?: Array<{
    id: string;
    name: string;
    location?: { type: 'Point'; coordinates: [number, number] };
    last_seen?: string;
  }>
): MycorrhizalNetwork {
  const nodes: MycorrhizalNode[] = [];
  const edges: MycorrhizalEdge[] = [];
  const nodeIdSet = new Set<string>();
  
  // Add fungal taxa as nodes
  taxa.filter(t => t.kingdom === 'Fungi').forEach(taxon => {
    nodes.push({
      id: `taxon:${taxon.id}`,
      type: 'fungus',
      taxon_id: taxon.id,
      canonical_name: taxon.canonical_name,
      common_name: taxon.common_name,
      degree: 0,
      label: taxon.canonical_name,
    });
    nodeIdSet.add(`taxon:${taxon.id}`);
  });
  
  // Add plant taxa as nodes
  taxa.filter(t => t.kingdom === 'Plantae').forEach(taxon => {
    nodes.push({
      id: `taxon:${taxon.id}`,
      type: 'plant',
      taxon_id: taxon.id,
      canonical_name: taxon.canonical_name,
      common_name: taxon.common_name,
      degree: 0,
      label: taxon.canonical_name,
    });
    nodeIdSet.add(`taxon:${taxon.id}`);
  });
  
  // Add observations as nodes with location
  observations.forEach(obs => {
    if (obs.location) {
      nodes.push({
        id: `obs:${obs.id}`,
        type: 'observation',
        taxon_id: obs.taxon_id,
        location: obs.location,
        degree: 0,
        first_observed: obs.observed_at,
        last_active: obs.observed_at,
      });
      nodeIdSet.add(`obs:${obs.id}`);
      
      // Connect observation to its taxon
      if (nodeIdSet.has(`taxon:${obs.taxon_id}`)) {
        edges.push({
          id: `edge:obs:${obs.id}:taxon:${obs.taxon_id}`,
          source: `obs:${obs.id}`,
          target: `taxon:${obs.taxon_id}`,
          type: 'signal',
          weight: 1,
          bidirectional: false,
        });
      }
    }
  });
  
  // Add devices as nodes
  devices?.forEach(device => {
    nodes.push({
      id: `device:${device.id}`,
      type: 'sensor',
      device_id: device.id,
      location: device.location,
      degree: 0,
      last_active: device.last_seen,
      label: device.name,
    });
    nodeIdSet.add(`device:${device.id}`);
  });
  
  // Create edges from associated_species
  taxa.filter(t => t.kingdom === 'Fungi' && t.associated_species).forEach(fungus => {
    fungus.associated_species?.forEach(plantName => {
      // Find plant node by name
      const plantNode = nodes.find(
        n => n.type === 'plant' && 
        (n.canonical_name === plantName || n.common_name === plantName)
      );
      
      if (plantNode) {
        edges.push({
          id: `edge:${fungus.id}:${plantNode.id}`,
          source: `taxon:${fungus.id}`,
          target: plantNode.id,
          type: 'ectomycorrhizal', // Default, would need more data for specific type
          weight: 0.5,
          bidirectional: true,
        });
      }
    });
  });
  
  // Calculate degrees
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (sourceNode) sourceNode.degree++;
    if (targetNode) targetNode.degree++;
  });
  
  const stats = calculateNetworkStats(nodes, edges);
  
  // Calculate bounding box
  const locations = nodes
    .filter(n => n.location)
    .map(n => n.location!.coordinates);
  
  let bounds: MycorrhizalNetwork['bounds'];
  if (locations.length > 0) {
    const lngs = locations.map(l => l[0]);
    const lats = locations.map(l => l[1]);
    bounds = {
      min_lng: Math.min(...lngs),
      max_lng: Math.max(...lngs),
      min_lat: Math.min(...lats),
      max_lat: Math.max(...lats),
      area_km2: 0, // Would need proper geodesic calculation
    };
  }
  
  return {
    id: `network:${Date.now()}`,
    name: 'Mycorrhizal Network',
    nodes,
    edges,
    stats,
    bounds,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source: 'mindex',
  };
}

/**
 * Find hub nodes (high-connectivity species) in the network
 */
export function findHubSpecies(network: MycorrhizalNetwork, topN: number = 10): MycorrhizalNode[] {
  return [...network.nodes]
    .filter(n => n.type === 'fungus' || n.type === 'plant')
    .sort((a, b) => b.degree - a.degree)
    .slice(0, topN);
}

/**
 * Find shortest path between two nodes (for nutrient/signal routing)
 */
export function findShortestPath(
  network: MycorrhizalNetwork,
  sourceId: string,
  targetId: string
): string[] | null {
  const adjacency = new Map<string, string[]>();
  network.nodes.forEach(n => adjacency.set(n.id, []));
  network.edges.forEach(e => {
    adjacency.get(e.source)?.push(e.target);
    if (e.bidirectional) {
      adjacency.get(e.target)?.push(e.source);
    }
  });
  
  // BFS for shortest path
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue = [sourceId];
  visited.add(sourceId);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current === targetId) {
      // Reconstruct path
      const path: string[] = [];
      let node: string | undefined = targetId;
      while (node) {
        path.unshift(node);
        node = parent.get(node);
      }
      return path;
    }
    
    adjacency.get(current)?.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    });
  }
  
  return null; // No path found
}

/**
 * Simulate signal propagation through the network (M-Wave concept)
 * Used for modeling how environmental changes propagate through mycelium
 */
export function simulateSignalPropagation(
  network: MycorrhizalNetwork,
  sourceId: string,
  signalStrength: number = 1.0,
  decayRate: number = 0.1
): Map<string, number> {
  const signalMap = new Map<string, number>();
  const visited = new Set<string>();
  
  // Priority queue would be better, but using simple array for simplicity
  const queue: Array<{ nodeId: string; signal: number }> = [
    { nodeId: sourceId, signal: signalStrength }
  ];
  
  while (queue.length > 0) {
    // Sort by signal strength (highest first)
    queue.sort((a, b) => b.signal - a.signal);
    const { nodeId, signal } = queue.shift()!;
    
    if (visited.has(nodeId) || signal < 0.01) continue;
    visited.add(nodeId);
    signalMap.set(nodeId, signal);
    
    // Find connected nodes
    network.edges
      .filter(e => e.source === nodeId || (e.bidirectional && e.target === nodeId))
      .forEach(edge => {
        const neighborId = edge.source === nodeId ? edge.target : edge.source;
        const propagatedSignal = signal * edge.weight * (1 - decayRate);
        
        if (!visited.has(neighborId) && propagatedSignal > 0.01) {
          queue.push({ nodeId: neighborId, signal: propagatedSignal });
        }
      });
  }
  
  return signalMap;
}
