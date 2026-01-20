/**
 * Big Bang Helm Chart Value Templates
 * 
 * Pre-configured templates for deploying Platform One's Big Bang
 * at various Impact Levels (IL-2, IL-4, IL-5, IL-6)
 * 
 * @see https://repo1.dso.mil/platform-one/big-bang/bigbang
 */

import { BigBangConfiguration, ComponentConfig } from './iron-bank-client';

// ═══════════════════════════════════════════════════════════════
// IMPACT LEVEL CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export interface BigBangHelmValues {
  hostname: string;
  bigbang: {
    domain: string;
    openshift: boolean;
    networkPolicies: { enabled: boolean };
    imagePullPolicy: 'Always' | 'IfNotPresent' | 'Never';
  };
  registryCredentials: {
    registry: string;
    username: string;
    password: string;
  };
  istio: IstioConfig;
  kiali: ComponentValues;
  jaeger: ComponentValues;
  kyverno: KyvernoConfig;
  loki: LokiConfig;
  promtail: ComponentValues;
  prometheus: ComponentValues;
  grafana: GrafanaConfig;
  vault?: VaultConfig;
  keycloak?: KeycloakConfig;
  anchore?: AnchorConfig;
  twistlock?: TwistlockConfig;
  argocd?: ArgoCDConfig;
  monitoring: MonitoringConfig;
  fluxConfig: FluxConfig;
}

interface ComponentValues {
  enabled: boolean;
  values?: Record<string, unknown>;
}

interface IstioConfig {
  enabled: boolean;
  ingressGateways: {
    public: boolean;
    admin: boolean;
  };
  values?: Record<string, unknown>;
}

interface KyvernoConfig {
  enabled: boolean;
  policies: {
    disallowPrivileged: boolean;
    requireLabels: boolean;
    requireNonRoot: boolean;
    restrictHostPath: boolean;
    restrictRegistries: boolean;
  };
}

interface LokiConfig {
  enabled: boolean;
  strategy: 'monolithic' | 'simple-scalable' | 'distributed';
  persistence: {
    enabled: boolean;
    size: string;
  };
}

interface GrafanaConfig {
  enabled: boolean;
  adminPassword?: string;
  persistence: {
    enabled: boolean;
    size: string;
  };
}

interface VaultConfig {
  enabled: boolean;
  autoUnseal: boolean;
  ha: {
    enabled: boolean;
    replicas: number;
  };
}

interface KeycloakConfig {
  enabled: boolean;
  realm: string;
  adminUsername: string;
  adminPassword?: string;
  persistence: {
    enabled: boolean;
  };
}

interface AnchorConfig {
  enabled: boolean;
  adminPassword?: string;
  engine: {
    replicaCount: number;
  };
}

interface TwistlockConfig {
  enabled: boolean;
  console: {
    enabled: boolean;
  };
  defender: {
    enabled: boolean;
  };
}

interface ArgoCDConfig {
  enabled: boolean;
  sso: {
    enabled: boolean;
    provider: 'keycloak' | 'okta' | 'azure';
  };
  ha: {
    enabled: boolean;
  };
}

interface MonitoringConfig {
  enabled: boolean;
  alertmanager: {
    enabled: boolean;
  };
  prometheus: {
    enabled: boolean;
    retention: string;
    resources: {
      requests: { cpu: string; memory: string };
      limits: { cpu: string; memory: string };
    };
  };
}

interface FluxConfig {
  version: string;
  interval: string;
  timeout: string;
}

// ═══════════════════════════════════════════════════════════════
// IL-2 TEMPLATE (Public Cloud - Low)
// ═══════════════════════════════════════════════════════════════

export function generateIL2Values(domain: string): BigBangHelmValues {
  return {
    hostname: domain,
    bigbang: {
      domain,
      openshift: false,
      networkPolicies: { enabled: true },
      imagePullPolicy: 'IfNotPresent',
    },
    registryCredentials: {
      registry: 'registry1.dso.mil',
      username: '${REGISTRY_USERNAME}',
      password: '${REGISTRY_PASSWORD}',
    },
    istio: {
      enabled: true,
      ingressGateways: {
        public: true,
        admin: true,
      },
    },
    kiali: { enabled: true },
    jaeger: { enabled: true },
    kyverno: {
      enabled: true,
      policies: {
        disallowPrivileged: true,
        requireLabels: true,
        requireNonRoot: true,
        restrictHostPath: true,
        restrictRegistries: true,
      },
    },
    loki: {
      enabled: true,
      strategy: 'monolithic',
      persistence: {
        enabled: true,
        size: '50Gi',
      },
    },
    promtail: { enabled: true },
    prometheus: { enabled: true },
    grafana: {
      enabled: true,
      persistence: {
        enabled: true,
        size: '10Gi',
      },
    },
    monitoring: {
      enabled: true,
      alertmanager: { enabled: true },
      prometheus: {
        enabled: true,
        retention: '15d',
        resources: {
          requests: { cpu: '500m', memory: '2Gi' },
          limits: { cpu: '2', memory: '8Gi' },
        },
      },
    },
    fluxConfig: {
      version: '2.x',
      interval: '5m',
      timeout: '10m',
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// IL-4 TEMPLATE (DoD Cloud - CUI)
// ═══════════════════════════════════════════════════════════════

export function generateIL4Values(domain: string): BigBangHelmValues {
  const base = generateIL2Values(domain);
  
  return {
    ...base,
    bigbang: {
      ...base.bigbang,
      imagePullPolicy: 'Always',
    },
    vault: {
      enabled: true,
      autoUnseal: true,
      ha: {
        enabled: true,
        replicas: 3,
      },
    },
    keycloak: {
      enabled: true,
      realm: 'baby-yoda',
      adminUsername: 'admin',
      persistence: { enabled: true },
    },
    anchore: {
      enabled: true,
      engine: { replicaCount: 2 },
    },
    argocd: {
      enabled: true,
      sso: {
        enabled: true,
        provider: 'keycloak',
      },
      ha: { enabled: true },
    },
    loki: {
      enabled: true,
      strategy: 'simple-scalable',
      persistence: {
        enabled: true,
        size: '100Gi',
      },
    },
    monitoring: {
      enabled: true,
      alertmanager: { enabled: true },
      prometheus: {
        enabled: true,
        retention: '30d',
        resources: {
          requests: { cpu: '1', memory: '4Gi' },
          limits: { cpu: '4', memory: '16Gi' },
        },
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// IL-5 TEMPLATE (DoD Cloud - Secret)
// ═══════════════════════════════════════════════════════════════

export function generateIL5Values(domain: string): BigBangHelmValues {
  const base = generateIL4Values(domain);
  
  return {
    ...base,
    bigbang: {
      ...base.bigbang,
      imagePullPolicy: 'Always',
    },
    registryCredentials: {
      registry: 'registry1.sipr.dso.mil',
      username: '${REGISTRY_USERNAME}',
      password: '${REGISTRY_PASSWORD}',
    },
    twistlock: {
      enabled: true,
      console: { enabled: true },
      defender: { enabled: true },
    },
    vault: {
      enabled: true,
      autoUnseal: false, // Manual unseal required at IL-5
      ha: {
        enabled: true,
        replicas: 5,
      },
    },
    loki: {
      enabled: true,
      strategy: 'distributed',
      persistence: {
        enabled: true,
        size: '500Gi',
      },
    },
    monitoring: {
      enabled: true,
      alertmanager: { enabled: true },
      prometheus: {
        enabled: true,
        retention: '90d',
        resources: {
          requests: { cpu: '2', memory: '8Gi' },
          limits: { cpu: '8', memory: '32Gi' },
        },
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// IL-6 TEMPLATE (DoD Cloud - Top Secret)
// ═══════════════════════════════════════════════════════════════

export function generateIL6Values(domain: string): BigBangHelmValues {
  const base = generateIL5Values(domain);
  
  return {
    ...base,
    registryCredentials: {
      registry: 'registry1.jwics.dso.mil',
      username: '${REGISTRY_USERNAME}',
      password: '${REGISTRY_PASSWORD}',
    },
    istio: {
      ...base.istio,
      ingressGateways: {
        public: false, // No public gateway at IL-6
        admin: true,
      },
      values: {
        global: {
          proxy: {
            privileged: false,
            enableCoreDump: false,
          },
        },
      },
    },
    vault: {
      enabled: true,
      autoUnseal: false, // HSM-based unseal at IL-6
      ha: {
        enabled: true,
        replicas: 7,
      },
    },
    keycloak: {
      ...base.keycloak!,
      realm: 'ts-baby-yoda',
    },
    loki: {
      enabled: true,
      strategy: 'distributed',
      persistence: {
        enabled: true,
        size: '1Ti',
      },
    },
    monitoring: {
      enabled: true,
      alertmanager: { enabled: true },
      prometheus: {
        enabled: true,
        retention: '365d',
        resources: {
          requests: { cpu: '4', memory: '16Gi' },
          limits: { cpu: '16', memory: '64Gi' },
        },
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// MYCOSOFT OVERLAY
// ═══════════════════════════════════════════════════════════════

export interface MycosoftOverlay {
  applicationName: string;
  namespace: string;
  images: {
    name: string;
    repository: string;
    tag: string;
    digest?: string;
  }[];
  ingress: {
    host: string;
    paths: string[];
    tls: boolean;
  };
  secrets: {
    name: string;
    externalSecret?: boolean;
    vaultPath?: string;
  }[];
  resources: {
    requests: { cpu: string; memory: string };
    limits: { cpu: string; memory: string };
  };
  autoscaling: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
    targetCPUUtilization: number;
  };
  podSecurityContext: {
    runAsNonRoot: boolean;
    runAsUser?: number;
    runAsGroup?: number;
    fsGroup?: number;
  };
  containerSecurityContext: {
    allowPrivilegeEscalation: boolean;
    readOnlyRootFilesystem: boolean;
    capabilities: {
      drop: string[];
    };
  };
}

export function generateMycosoftOverlay(
  appName: string,
  impactLevel: 'IL2' | 'IL4' | 'IL5' | 'IL6',
  domain: string
): MycosoftOverlay {
  const baseOverlay: MycosoftOverlay = {
    applicationName: appName,
    namespace: `mycosoft-${appName}`,
    images: [
      {
        name: appName,
        repository: `registry1.dso.mil/mycosoft/${appName}`,
        tag: 'latest',
      },
    ],
    ingress: {
      host: `${appName}.${domain}`,
      paths: ['/'],
      tls: true,
    },
    secrets: [
      {
        name: `${appName}-secrets`,
        externalSecret: impactLevel !== 'IL2',
        vaultPath: impactLevel !== 'IL2' ? `secret/data/mycosoft/${appName}` : undefined,
      },
    ],
    resources: {
      requests: { cpu: '100m', memory: '256Mi' },
      limits: { cpu: '1', memory: '1Gi' },
    },
    autoscaling: {
      enabled: true,
      minReplicas: impactLevel === 'IL6' ? 3 : (impactLevel === 'IL5' ? 2 : 1),
      maxReplicas: impactLevel === 'IL6' ? 10 : (impactLevel === 'IL5' ? 5 : 3),
      targetCPUUtilization: 80,
    },
    podSecurityContext: {
      runAsNonRoot: true,
      runAsUser: 1000,
      runAsGroup: 1000,
      fsGroup: 1000,
    },
    containerSecurityContext: {
      allowPrivilegeEscalation: false,
      readOnlyRootFilesystem: true,
      capabilities: {
        drop: ['ALL'],
      },
    },
  };
  
  // Adjust registry for classified networks
  if (impactLevel === 'IL5') {
    baseOverlay.images[0].repository = `registry1.sipr.dso.mil/mycosoft/${appName}`;
  } else if (impactLevel === 'IL6') {
    baseOverlay.images[0].repository = `registry1.jwics.dso.mil/mycosoft/${appName}`;
  }
  
  return baseOverlay;
}

// ═══════════════════════════════════════════════════════════════
// YAML GENERATOR
// ═══════════════════════════════════════════════════════════════

export function generateBigBangValuesYAML(values: BigBangHelmValues): string {
  const yaml = `# Big Bang Helm Values
# Generated by Mycosoft Compliance System
# Date: ${new Date().toISOString()}

hostname: ${values.hostname}

bigbang:
  domain: ${values.bigbang.domain}
  openshift: ${values.bigbang.openshift}
  networkPolicies:
    enabled: ${values.bigbang.networkPolicies.enabled}
  imagePullPolicy: ${values.bigbang.imagePullPolicy}

registryCredentials:
  registry: ${values.registryCredentials.registry}
  username: ${values.registryCredentials.username}
  password: ${values.registryCredentials.password}

istio:
  enabled: ${values.istio.enabled}
  ingressGateways:
    public-ingressgateway:
      enabled: ${values.istio.ingressGateways.public}
    admin-ingressgateway:
      enabled: ${values.istio.ingressGateways.admin}

kiali:
  enabled: ${values.kiali.enabled}

jaeger:
  enabled: ${values.jaeger.enabled}

kyverno:
  enabled: ${values.kyverno.enabled}
  policies:
    disallow-privileged-containers: ${values.kyverno.policies.disallowPrivileged}
    require-labels: ${values.kyverno.policies.requireLabels}
    require-non-root-user: ${values.kyverno.policies.requireNonRoot}
    restrict-host-path: ${values.kyverno.policies.restrictHostPath}
    restrict-registries: ${values.kyverno.policies.restrictRegistries}

loki:
  enabled: ${values.loki.enabled}
  strategy: ${values.loki.strategy}
  persistence:
    enabled: ${values.loki.persistence.enabled}
    size: ${values.loki.persistence.size}

promtail:
  enabled: ${values.promtail.enabled}

prometheus:
  enabled: ${values.prometheus.enabled}

grafana:
  enabled: ${values.grafana.enabled}
  persistence:
    enabled: ${values.grafana.persistence.enabled}
    size: ${values.grafana.persistence.size}

monitoring:
  enabled: ${values.monitoring.enabled}
  alertmanager:
    enabled: ${values.monitoring.alertmanager.enabled}
  prometheus:
    enabled: ${values.monitoring.prometheus.enabled}
    prometheusSpec:
      retention: ${values.monitoring.prometheus.retention}
      resources:
        requests:
          cpu: ${values.monitoring.prometheus.resources.requests.cpu}
          memory: ${values.monitoring.prometheus.resources.requests.memory}
        limits:
          cpu: ${values.monitoring.prometheus.resources.limits.cpu}
          memory: ${values.monitoring.prometheus.resources.limits.memory}

${values.vault ? `vault:
  enabled: ${values.vault.enabled}
  autoUnseal: ${values.vault.autoUnseal}
  server:
    ha:
      enabled: ${values.vault.ha.enabled}
      replicas: ${values.vault.ha.replicas}
` : ''}

${values.keycloak ? `keycloak:
  enabled: ${values.keycloak.enabled}
  realm: ${values.keycloak.realm}
  auth:
    adminUser: ${values.keycloak.adminUsername}
` : ''}

${values.anchore ? `anchore:
  enabled: ${values.anchore.enabled}
  anchoreEngineCatalog:
    replicaCount: ${values.anchore.engine.replicaCount}
` : ''}

${values.twistlock ? `twistlock:
  enabled: ${values.twistlock.enabled}
  console:
    enabled: ${values.twistlock.console.enabled}
  defender:
    enabled: ${values.twistlock.defender.enabled}
` : ''}

${values.argocd ? `argocd:
  enabled: ${values.argocd.enabled}
  configs:
    cm:
      dex.config: |
        connectors:
        - type: oidc
          id: keycloak
          name: Keycloak
  controller:
    replicas: ${values.argocd.ha.enabled ? 2 : 1}
` : ''}

flux:
  interval: ${values.fluxConfig.interval}
  timeout: ${values.fluxConfig.timeout}
`;

  return yaml;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const BigBangTemplates = {
  IL2: generateIL2Values,
  IL4: generateIL4Values,
  IL5: generateIL5Values,
  IL6: generateIL6Values,
  generateOverlay: generateMycosoftOverlay,
  toYAML: generateBigBangValuesYAML,
};
