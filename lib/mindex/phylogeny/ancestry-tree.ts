/**
 * DNA Ancestry Leaf Tree Module for MINDEX
 * 
 * Implements the hierarchical taxonomy visualization described in the MINDEX article:
 * - DNA ancestry-based leaf tree organization
 * - Evolutionary relationship display
 * - Compound and usage information per species
 * 
 * @see https://medium.com/@mycosoft.inc/mindex-84ec7ed68621
 */

/**
 * Taxonomic ranks in the fungal kingdom
 */
export type TaxonomicRank = 
  | 'domain'
  | 'kingdom'
  | 'phylum'
  | 'subphylum'
  | 'class'
  | 'subclass'
  | 'order'
  | 'suborder'
  | 'family'
  | 'subfamily'
  | 'genus'
  | 'species'
  | 'subspecies'
  | 'variety'
  | 'form';

/**
 * A node in the phylogenetic tree
 */
export interface PhylogeneticNode {
  id: string;
  
  // Taxonomy
  rank: TaxonomicRank;
  canonical_name: string;
  common_name?: string;
  authorship?: string;          // Taxonomic author
  
  // Tree structure
  parent_id?: string;
  children: PhylogeneticNode[];
  depth: number;                 // Distance from root
  
  // DNA/Genomic data
  dna_sequence_id?: string;
  barcode_region?: 'ITS' | 'LSU' | 'SSU' | 'TEF1' | 'RPB2' | 'CO1';
  sequence_length?: number;
  genetic_distance?: number;     // From parent
  
  // MINDEX metadata
  mindex_taxon_id?: string;
  observation_count: number;
  sample_count: number;
  last_observation?: string;
  
  // Biological properties
  properties?: {
    edible?: boolean;
    poisonous?: boolean;
    psychoactive?: boolean;
    medicinal?: boolean;
    bioluminescent?: boolean;
    parasitic?: boolean;
    mycorrhizal?: boolean;
  };
  
  // Compounds (from MINDEX compound database)
  known_compounds?: Array<{
    name: string;
    cas_number?: string;
    bioactivity?: string[];
  }>;
  
  // Industrial/Commercial uses
  uses?: Array<{
    category: 'food' | 'medicine' | 'industry' | 'bioremediation' | 'agriculture' | 'research';
    description: string;
  }>;
  
  // Visual properties for rendering
  color?: string;
  icon?: string;
  expanded?: boolean;
}

/**
 * Complete phylogenetic tree
 */
export interface PhylogeneticTree {
  id: string;
  name: string;
  description?: string;
  
  // Tree data
  root: PhylogeneticNode;
  total_nodes: number;
  max_depth: number;
  
  // Statistics
  stats: {
    species_count: number;
    genera_count: number;
    families_count: number;
    orders_count: number;
    phyla_count: number;
    with_sequences: number;
    with_compounds: number;
    with_observations: number;
  };
  
  // Metadata
  source: string;               // Data source (MINDEX, NCBI, etc.)
  created_at: string;
  updated_at: string;
  version: string;
}

/**
 * Build a phylogenetic tree from flat MINDEX taxa data
 */
export function buildPhylogeneticTree(
  taxa: Array<{
    id: string;
    rank: TaxonomicRank;
    canonical_name: string;
    common_name?: string;
    parent_taxon_id?: string;
    observation_count?: number;
    properties?: PhylogeneticNode['properties'];
    compounds?: PhylogeneticNode['known_compounds'];
  }>
): PhylogeneticTree {
  // Create node map
  const nodeMap = new Map<string, PhylogeneticNode>();
  
  // Initialize all nodes
  taxa.forEach(taxon => {
    nodeMap.set(taxon.id, {
      id: taxon.id,
      rank: taxon.rank,
      canonical_name: taxon.canonical_name,
      common_name: taxon.common_name,
      parent_id: taxon.parent_taxon_id,
      children: [],
      depth: 0,
      mindex_taxon_id: taxon.id,
      observation_count: taxon.observation_count || 0,
      sample_count: 0,
      properties: taxon.properties,
      known_compounds: taxon.compounds,
    });
  });
  
  // Build tree structure
  let root: PhylogeneticNode | undefined;
  
  nodeMap.forEach(node => {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      const parent = nodeMap.get(node.parent_id)!;
      parent.children.push(node);
    } else if (!node.parent_id) {
      root = node;
    }
  });
  
  // If no root found, create artificial root
  if (!root) {
    root = {
      id: 'root:fungi',
      rank: 'kingdom',
      canonical_name: 'Fungi',
      children: Array.from(nodeMap.values()).filter(n => !n.parent_id || !nodeMap.has(n.parent_id)),
      depth: 0,
      observation_count: 0,
      sample_count: 0,
    };
  }
  
  // Calculate depths
  function setDepths(node: PhylogeneticNode, depth: number): number {
    node.depth = depth;
    let maxChildDepth = depth;
    node.children.forEach(child => {
      const childMax = setDepths(child, depth + 1);
      maxChildDepth = Math.max(maxChildDepth, childMax);
    });
    return maxChildDepth;
  }
  
  const maxDepth = setDepths(root, 0);
  
  // Calculate statistics
  const stats = {
    species_count: 0,
    genera_count: 0,
    families_count: 0,
    orders_count: 0,
    phyla_count: 0,
    with_sequences: 0,
    with_compounds: 0,
    with_observations: 0,
  };
  
  function countNodes(node: PhylogeneticNode) {
    switch (node.rank) {
      case 'species': stats.species_count++; break;
      case 'genus': stats.genera_count++; break;
      case 'family': stats.families_count++; break;
      case 'order': stats.orders_count++; break;
      case 'phylum': stats.phyla_count++; break;
    }
    if (node.dna_sequence_id) stats.with_sequences++;
    if (node.known_compounds?.length) stats.with_compounds++;
    if (node.observation_count > 0) stats.with_observations++;
    
    node.children.forEach(countNodes);
  }
  
  countNodes(root);
  
  return {
    id: `tree:${Date.now()}`,
    name: 'Fungal Phylogenetic Tree',
    root,
    total_nodes: nodeMap.size,
    max_depth: maxDepth,
    stats,
    source: 'mindex',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: '1.0.0',
  };
}

/**
 * Find all ancestors of a node (path to root)
 */
export function getAncestors(
  tree: PhylogeneticTree,
  nodeId: string
): PhylogeneticNode[] {
  const ancestors: PhylogeneticNode[] = [];
  const nodeMap = new Map<string, PhylogeneticNode>();
  
  // Build node map
  function mapNodes(node: PhylogeneticNode) {
    nodeMap.set(node.id, node);
    node.children.forEach(mapNodes);
  }
  mapNodes(tree.root);
  
  // Find node
  const targetNode = nodeMap.get(nodeId);
  if (!targetNode) return ancestors;
  
  // Walk up tree
  let current: PhylogeneticNode | undefined = targetNode;
  while (current && current.parent_id && nodeMap.has(current.parent_id)) {
    current = nodeMap.get(current.parent_id);
    if (current) ancestors.unshift(current);
  }
  
  return ancestors;
}

/**
 * Find all descendants of a node
 */
export function getDescendants(
  node: PhylogeneticNode,
  filterRank?: TaxonomicRank
): PhylogeneticNode[] {
  const descendants: PhylogeneticNode[] = [];
  
  function collect(n: PhylogeneticNode) {
    if (!filterRank || n.rank === filterRank) {
      descendants.push(n);
    }
    n.children.forEach(collect);
  }
  
  node.children.forEach(collect);
  return descendants;
}

/**
 * Search tree by name (canonical or common)
 */
export function searchTree(
  tree: PhylogeneticTree,
  query: string,
  options: {
    matchCanonical?: boolean;
    matchCommon?: boolean;
    limit?: number;
  } = {}
): PhylogeneticNode[] {
  const { matchCanonical = true, matchCommon = true, limit = 50 } = options;
  const results: PhylogeneticNode[] = [];
  const queryLower = query.toLowerCase();
  
  function search(node: PhylogeneticNode) {
    if (results.length >= limit) return;
    
    const matchesCanonical = matchCanonical && 
      node.canonical_name.toLowerCase().includes(queryLower);
    const matchesCommon = matchCommon && 
      node.common_name?.toLowerCase().includes(queryLower);
    
    if (matchesCanonical || matchesCommon) {
      results.push(node);
    }
    
    node.children.forEach(search);
  }
  
  search(tree.root);
  return results;
}

/**
 * Get tree subset for a specific rank (e.g., all genera)
 */
export function getNodesAtRank(
  tree: PhylogeneticTree,
  rank: TaxonomicRank
): PhylogeneticNode[] {
  const nodes: PhylogeneticNode[] = [];
  
  function collect(node: PhylogeneticNode) {
    if (node.rank === rank) {
      nodes.push(node);
    }
    node.children.forEach(collect);
  }
  
  collect(tree.root);
  return nodes;
}

/**
 * Calculate distance between two nodes (number of edges)
 */
export function calculateDistance(
  tree: PhylogeneticTree,
  nodeId1: string,
  nodeId2: string
): number | null {
  const nodeMap = new Map<string, PhylogeneticNode>();
  
  function mapNodes(node: PhylogeneticNode) {
    nodeMap.set(node.id, node);
    node.children.forEach(mapNodes);
  }
  mapNodes(tree.root);
  
  const node1 = nodeMap.get(nodeId1);
  const node2 = nodeMap.get(nodeId2);
  
  if (!node1 || !node2) return null;
  
  // Find common ancestor
  const ancestors1 = new Set([nodeId1]);
  let current: PhylogeneticNode | undefined = node1;
  while (current?.parent_id && nodeMap.has(current.parent_id)) {
    current = nodeMap.get(current.parent_id);
    if (current) ancestors1.add(current.id);
  }
  
  // Find distance from node2 to common ancestor
  let distFromNode2 = 0;
  current = node2;
  while (current && !ancestors1.has(current.id)) {
    distFromNode2++;
    if (current.parent_id && nodeMap.has(current.parent_id)) {
      current = nodeMap.get(current.parent_id);
    } else {
      return null; // No common ancestor found
    }
  }
  
  // Find distance from node1 to common ancestor
  let distFromNode1 = 0;
  current = node1;
  while (current && current.id !== nodeMap.get(nodeId2)?.id) {
    if (ancestors1.has(current.id) && current !== node1) {
      break;
    }
    distFromNode1++;
    if (current.parent_id && nodeMap.has(current.parent_id)) {
      current = nodeMap.get(current.parent_id);
    } else {
      break;
    }
  }
  
  return distFromNode1 + distFromNode2 - 1;
}

/**
 * Convert tree to Newick format (standard phylogenetic tree format)
 */
export function toNewickFormat(node: PhylogeneticNode): string {
  if (node.children.length === 0) {
    return node.canonical_name.replace(/\s+/g, '_');
  }
  
  const childrenNewick = node.children
    .map(child => toNewickFormat(child))
    .join(',');
  
  return `(${childrenNewick})${node.canonical_name.replace(/\s+/g, '_')}`;
}

/**
 * Generate D3-compatible tree data for visualization
 */
export function toD3Hierarchy(node: PhylogeneticNode): {
  name: string;
  value?: number;
  children?: Array<ReturnType<typeof toD3Hierarchy>>;
} {
  const result: ReturnType<typeof toD3Hierarchy> = {
    name: node.canonical_name,
    value: node.observation_count || 1,
  };
  
  if (node.children.length > 0) {
    result.children = node.children.map(toD3Hierarchy);
  }
  
  return result;
}
