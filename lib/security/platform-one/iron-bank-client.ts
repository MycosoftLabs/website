/**
 * Platform One / Iron Bank Integration Client
 * 
 * Integrates with DoD Platform One services:
 * - Iron Bank: Hardened container registry
 * - Big Bang: DevSecOps baseline
 * - Party Bus: Platform-as-a-Service
 * 
 * @see https://p1.dso.mil
 */

// ═══════════════════════════════════════════════════════════════
// IRON BANK TYPES
// ═══════════════════════════════════════════════════════════════

export interface IronBankContainer {
  imageName: string;
  imageTag: string;
  digest: string;
  repository: string;
  vendor: string;
  oraScore: number; // Overall Risk Assessment (0-100)
  oraRating: 'A' | 'B' | 'C' | 'D' | 'F';
  vulnerabilities: VulnerabilityReport;
  sbom: SBOM;
  lastScanned: string;
  approvalStatus: 'approved' | 'pending' | 'rejected' | 'deprecated';
  accreditationLevel: 'IL2' | 'IL4' | 'IL5' | 'IL6';
  nutritionLabel: NutritionLabel;
}

export interface VulnerabilityReport {
  critical: number;
  high: number;
  medium: number;
  low: number;
  negligible: number;
  total: number;
  fixed: number;
  unfixed: number;
  scanDate: string;
  scanTool: string;
  cveList: CVEEntry[];
}

export interface CVEEntry {
  cveId: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  package: string;
  version: string;
  fixedVersion?: string;
  description: string;
  exploitAvailable: boolean;
  epssScore?: number; // Exploit Prediction Scoring System
}

export interface SBOM {
  format: 'spdx' | 'cyclonedx';
  version: string;
  generatedAt: string;
  packages: SBOMPackage[];
  totalDependencies: number;
  licenses: string[];
}

export interface SBOMPackage {
  name: string;
  version: string;
  type: 'application' | 'library' | 'framework' | 'container' | 'os';
  supplier: string;
  license: string;
  purl?: string; // Package URL
  cpe?: string; // Common Platform Enumeration
}

export interface NutritionLabel {
  // Iron Bank "Nutrition Label" format
  imageId: string;
  baseImage: string;
  size: string;
  layers: number;
  createdAt: string;
  maintainer: string;
  documentation: string;
  healthScore: number;
  lastUpdated: string;
  endOfLife?: string;
  approvalDate: string;
  sponsors: string[];
  hardening: {
    stig: boolean;
    cis: boolean;
    disa: boolean;
    customHardening: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
// BIG BANG TYPES
// ═══════════════════════════════════════════════════════════════

export interface BigBangConfiguration {
  version: string;
  impactLevel: 'IL2' | 'IL4' | 'IL5' | 'IL6';
  cluster: {
    name: string;
    domain: string;
    provider: 'aws' | 'azure' | 'gcp' | 'on-prem' | 'classified';
  };
  core: BigBangCoreComponents;
  addons: BigBangAddon[];
  networkPolicies: boolean;
  kyverno: boolean;
  istio: boolean;
  monitoring: boolean;
  logging: boolean;
  fluxVersion: string;
}

export interface BigBangCoreComponents {
  istio: ComponentConfig;
  kiali: ComponentConfig;
  jaeger: ComponentConfig;
  kyverno: ComponentConfig;
  loki: ComponentConfig;
  promtail: ComponentConfig;
  prometheus: ComponentConfig;
  grafana: ComponentConfig;
  alertmanager: ComponentConfig;
  vault?: ComponentConfig;
  keycloak?: ComponentConfig;
  anchore?: ComponentConfig;
  twistlock?: ComponentConfig;
  argocd?: ComponentConfig;
  gitlab?: ComponentConfig;
  sonarqube?: ComponentConfig;
  mattermost?: ComponentConfig;
}

export interface ComponentConfig {
  enabled: boolean;
  version?: string;
  values?: Record<string, unknown>;
  resources?: {
    requests: { cpu: string; memory: string };
    limits: { cpu: string; memory: string };
  };
}

export interface BigBangAddon {
  name: string;
  repository: string;
  version: string;
  enabled: boolean;
  namespace: string;
  values?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM ONE CLIENT
// ═══════════════════════════════════════════════════════════════

export interface PlatformOneConfig {
  registryUrl: string;
  apiUrl: string;
  username?: string;
  token?: string;
  ssoEnabled: boolean;
  impactLevel: 'IL2' | 'IL4' | 'IL5' | 'IL6';
}

export class IronBankClient {
  private config: PlatformOneConfig;
  
  constructor(config: Partial<PlatformOneConfig> = {}) {
    this.config = {
      registryUrl: config.registryUrl || 'registry1.dso.mil',
      apiUrl: config.apiUrl || 'https://ironbank.dso.mil/api',
      ssoEnabled: config.ssoEnabled ?? true,
      impactLevel: config.impactLevel || 'IL4',
      ...config,
    };
  }
  
  /**
   * Search for containers in Iron Bank registry
   */
  async searchContainers(query: string): Promise<IronBankContainer[]> {
    // TODO: Implement actual API call when credentials available
    console.log(`[IronBank] Searching for containers: ${query}`);
    
    // Return mock data for development
    return this.getMockContainers().filter(c => 
      c.imageName.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  /**
   * Get container details including vulnerabilities and SBOM
   */
  async getContainerDetails(imageName: string, tag: string = 'latest'): Promise<IronBankContainer | null> {
    console.log(`[IronBank] Getting details for ${imageName}:${tag}`);
    
    const containers = this.getMockContainers();
    return containers.find(c => c.imageName === imageName && c.imageTag === tag) || null;
  }
  
  /**
   * Generate SBOM for a container
   */
  async generateSBOM(imageName: string, format: 'spdx' | 'cyclonedx' = 'cyclonedx'): Promise<SBOM> {
    console.log(`[IronBank] Generating ${format} SBOM for ${imageName}`);
    
    return {
      format,
      version: format === 'cyclonedx' ? '1.4' : '2.3',
      generatedAt: new Date().toISOString(),
      packages: [
        { name: 'node', version: '20.x', type: 'application', supplier: 'Node.js Foundation', license: 'MIT' },
        { name: 'alpine', version: '3.18', type: 'os', supplier: 'Alpine Linux', license: 'MIT' },
      ],
      totalDependencies: 0,
      licenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause'],
    };
  }
  
  /**
   * Check if container is approved for a given impact level
   */
  async checkApproval(imageName: string, impactLevel: 'IL2' | 'IL4' | 'IL5' | 'IL6'): Promise<{
    approved: boolean;
    reason?: string;
    expires?: string;
  }> {
    console.log(`[IronBank] Checking approval for ${imageName} at ${impactLevel}`);
    
    const container = await this.getContainerDetails(imageName);
    if (!container) {
      return { approved: false, reason: 'Container not found in Iron Bank' };
    }
    
    if (container.approvalStatus !== 'approved') {
      return { approved: false, reason: `Container status: ${container.approvalStatus}` };
    }
    
    const levelOrder = ['IL2', 'IL4', 'IL5', 'IL6'];
    const containerLevel = levelOrder.indexOf(container.accreditationLevel);
    const requestedLevel = levelOrder.indexOf(impactLevel);
    
    if (containerLevel < requestedLevel) {
      return { approved: false, reason: `Container only approved for ${container.accreditationLevel}, not ${impactLevel}` };
    }
    
    return { 
      approved: true,
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  
  /**
   * Get Overall Risk Assessment score
   */
  async getORAScore(imageName: string): Promise<{ score: number; rating: string; details: VulnerabilityReport }> {
    const container = await this.getContainerDetails(imageName);
    if (!container) {
      throw new Error('Container not found');
    }
    
    return {
      score: container.oraScore,
      rating: container.oraRating,
      details: container.vulnerabilities,
    };
  }
  
  /**
   * Mock containers for development
   */
  private getMockContainers(): IronBankContainer[] {
    const now = new Date();
    
    return [
      {
        imageName: 'ironbank/opensource/nodejs/nodejs20',
        imageTag: 'latest',
        digest: 'sha256:abc123...',
        repository: 'registry1.dso.mil',
        vendor: 'Node.js Foundation',
        oraScore: 92,
        oraRating: 'A',
        vulnerabilities: {
          critical: 0,
          high: 0,
          medium: 2,
          low: 5,
          negligible: 12,
          total: 19,
          fixed: 17,
          unfixed: 2,
          scanDate: now.toISOString(),
          scanTool: 'Anchore',
          cveList: [],
        },
        sbom: {
          format: 'cyclonedx',
          version: '1.4',
          generatedAt: now.toISOString(),
          packages: [],
          totalDependencies: 156,
          licenses: ['MIT', 'Apache-2.0'],
        },
        lastScanned: now.toISOString(),
        approvalStatus: 'approved',
        accreditationLevel: 'IL5',
        nutritionLabel: {
          imageId: 'nodejs20',
          baseImage: 'ubi8-minimal',
          size: '245MB',
          layers: 12,
          createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          maintainer: 'Platform One',
          documentation: 'https://repo1.dso.mil/docs/nodejs',
          healthScore: 95,
          lastUpdated: now.toISOString(),
          approvalDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          sponsors: ['Platform One', 'DoD CIO'],
          hardening: {
            stig: true,
            cis: true,
            disa: true,
            customHardening: ['Node.js security baseline'],
          },
        },
      },
      {
        imageName: 'ironbank/opensource/postgres/postgresql15',
        imageTag: 'latest',
        digest: 'sha256:def456...',
        repository: 'registry1.dso.mil',
        vendor: 'PostgreSQL',
        oraScore: 88,
        oraRating: 'B',
        vulnerabilities: {
          critical: 0,
          high: 1,
          medium: 3,
          low: 8,
          negligible: 15,
          total: 27,
          fixed: 22,
          unfixed: 5,
          scanDate: now.toISOString(),
          scanTool: 'Anchore',
          cveList: [],
        },
        sbom: {
          format: 'cyclonedx',
          version: '1.4',
          generatedAt: now.toISOString(),
          packages: [],
          totalDependencies: 89,
          licenses: ['PostgreSQL'],
        },
        lastScanned: now.toISOString(),
        approvalStatus: 'approved',
        accreditationLevel: 'IL5',
        nutritionLabel: {
          imageId: 'postgresql15',
          baseImage: 'ubi8',
          size: '312MB',
          layers: 15,
          createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          maintainer: 'Platform One',
          documentation: 'https://repo1.dso.mil/docs/postgresql',
          healthScore: 90,
          lastUpdated: now.toISOString(),
          approvalDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          sponsors: ['Platform One'],
          hardening: {
            stig: true,
            cis: true,
            disa: true,
            customHardening: ['PostgreSQL STIG'],
          },
        },
      },
    ];
  }
}

// ═══════════════════════════════════════════════════════════════
// BIG BANG CONFIGURATION GENERATOR
// ═══════════════════════════════════════════════════════════════

export function generateBigBangValues(
  impactLevel: 'IL2' | 'IL4' | 'IL5' | 'IL6',
  options: Partial<BigBangConfiguration> = {}
): BigBangConfiguration {
  const baseConfig: BigBangConfiguration = {
    version: '2.0.0',
    impactLevel,
    cluster: {
      name: options.cluster?.name || 'mycosoft-cluster',
      domain: options.cluster?.domain || 'mycosoft.mil',
      provider: options.cluster?.provider || (impactLevel === 'IL5' || impactLevel === 'IL6' ? 'classified' : 'aws'),
    },
    core: {
      istio: { enabled: true },
      kiali: { enabled: true },
      jaeger: { enabled: true },
      kyverno: { enabled: true },
      loki: { enabled: true },
      promtail: { enabled: true },
      prometheus: { enabled: true },
      grafana: { enabled: true },
      alertmanager: { enabled: true },
      vault: { enabled: impactLevel !== 'IL2' },
      keycloak: { enabled: impactLevel !== 'IL2' },
      anchore: { enabled: true },
      twistlock: { enabled: impactLevel === 'IL5' || impactLevel === 'IL6' },
      argocd: { enabled: true },
    },
    addons: [],
    networkPolicies: true,
    kyverno: true,
    istio: true,
    monitoring: true,
    logging: true,
    fluxVersion: '2.x',
    ...options,
  };
  
  return baseConfig;
}

// Export singleton instance
export const ironBankClient = new IronBankClient();
