/**
 * Versioned hardware-portfolio planning contract.
 *
 * This file converts the May 2026 hardware portfolio into typed, reviewable
 * declarations for Device Manager, DIRTNet, MDP/MMP, and sensing work. It is
 * deliberately not an installed-device inventory: every physical presence
 * remains `not-observed` until a registry, BOM, photograph, or hardware probe
 * supplies device-specific evidence. See the September 2 acquisition handoff.
 */

export const HARDWARE_PORTFOLIO_SCHEMA = "fusarium-hardware-portfolio/v1" as const
export const HARDWARE_PORTFOLIO_VERSION = "3.0-source-contract.3" as const
export const HARDWARE_PORTFOLIO_CONSUMER_SCHEMA = "fusarium-hardware-portfolio-consumer/v1" as const
export const HARDWARE_PORTFOLIO_EFFECTIVE_DATE = "2026-05" as const
export const HARDWARE_PORTFOLIO_REVIEWED_DATE = "2026-09-02" as const
export const HARDWARE_PORTFOLIO_CLASSIFICATION = "UNCLASSIFIED" as const
export const HARDWARE_PORTFOLIO_COMMERCIAL_CONFIDENTIALITY = "MYCOSOFT_CONFIDENTIAL" as const
export const HARDWARE_PORTFOLIO_NATIONAL_SECURITY_CLASSIFICATION = "UNCLASSIFIED" as const

export const HARDWARE_PORTFOLIO_SOURCE = {
  title: "Mycosoft Hardware Portfolio v3 clean",
  sha256: "b18a1b66f9ddb4cf04605206e7e737d3af404e0ead41c4db5a1bc1f6c0ce5a06",
  sourceVersion: "3.0",
  sourceDate: "2026-05",
  handlingNote: "The source document is marked confidential. This contract contains capability declarations only, not pricing or financial projections.",
} as const

export type PortfolioClaimState =
  | "declared-baseline"
  | "declared-optional"
  | "variant-dependent"
  | "proposed"
  | "future"
  | "unknown"

export type PortfolioComponentCategory =
  | "controller"
  | "compute"
  | "sensor"
  | "storage"
  | "communications"
  | "interface"
  | "power"
  | "mechanical"
  | "environmental"

export interface PortfolioComponentClaimV1 {
  id: string
  category: PortfolioComponentCategory
  label: string
  model: string | null
  claimState: PortfolioClaimState
  /** A portfolio declaration never proves that a component is physically installed. */
  installationEvidence: "not-observed"
  sourceSections: readonly string[]
  note: string
}

export interface HardwarePortfolioDeviceV1 {
  id: string
  label: string
  deviceClass: string
  portfolioStatusClaim: string
  portfolioStatusEvidence: "source-document-claim"
  variants: readonly string[]
  components: readonly PortfolioComponentClaimV1[]
  protocolRefs: readonly string[]
  unresolved: readonly string[]
}

export interface ProtocolReferenceV1 {
  id: string
  label: string
  expandedName: string | null
  role: string
  claimState: "declared" | "naming-unresolved"
  authority: "portfolio-reference-only"
  note: string
}

export type PortfolioTopologyScope = "dirtnet" | "fleet"
export type PortfolioTopologyEndpointKind = "device-family" | "shared-sensing-stack" | "topology-domain"
export type PortfolioTopologyRelation =
  | "member-of"
  | "shared-compute-fabric-for"
  | "shared-sensing-fabric-for"
  | "deployment-supports"
  | "bridges-through"

export interface PortfolioTopologyEndpointV1 {
  kind: PortfolioTopologyEndpointKind
  id: string
}

export interface PortfolioTopologyEdgeV1 {
  id: string
  scope: PortfolioTopologyScope
  from: PortfolioTopologyEndpointV1
  to: PortfolioTopologyEndpointV1
  relation: PortfolioTopologyRelation
  claimEvidence: "source-document-claim"
  deploymentEvidence: "not-observed"
  authority: "portfolio-reference-only"
  sourceSections: readonly string[]
  note: string
}

export const PORTFOLIO_SENSOR_CAPABILITY_IDS = [
  "air-temperature",
  "relative-humidity",
  "barometric-pressure",
  "air-quality-index",
  "gas-voc",
  "gas-vsc",
  "co2",
  "particulate",
  "smoke",
  "spore-density-estimate",
  "camera-rgb",
  "camera-360",
  "camera-directional",
  "lidar",
  "radar",
  "wifi-sense",
  "thermal",
  "acoustic-air",
  "acoustic-underwater-passive",
  "acoustic-underwater-active",
  "bioelectric-fci",
  "soil-moisture",
  "soil-temperature",
  "soil-conductivity",
  "soil-ph",
  "soil-impedance",
  "root-mapping",
  "tactile-contact",
  "rf-spectrum",
  "light-ambient-uv",
  "gnss",
  "imu",
  "radiation",
  "magnetic-em",
] as const

export type PortfolioSensorCapabilityId = (typeof PORTFOLIO_SENSOR_CAPABILITY_IDS)[number]

export interface PortfolioSensorCapabilityV1 {
  id: string
  deviceId: string
  componentRef: string
  capabilityId: PortfolioSensorCapabilityId
  model: string | null
  claimState: PortfolioClaimState
  installationEvidence: "not-observed"
  adapterEvidence: "unbound"
  claimEvidence: "source-document-claim"
  authority: "portfolio-reference-only"
  sourceSections: readonly string[]
}

export type PortfolioComputeNodeFamily =
  | "mycobrain"
  | "esp32"
  | "edge-compute"
  | "m5stack"
  | "flight-controller"
  | "esc"

export interface PortfolioComputeTopologyNodeV1 {
  id: string
  deviceId: string
  componentRef: string
  family: PortfolioComputeNodeFamily
  label: string
  model: string | null
  role: string
  claimState: PortfolioClaimState
  installationEvidence: "not-observed"
  claimEvidence: "source-document-claim"
  authority: "portfolio-reference-only"
  sourceSections: readonly string[]
}

export type PortfolioComputeTopologyRelation =
  | "uart-bridge"
  | "paired-with"
  | "unresolved-control-path"

export interface PortfolioComputeTopologyEdgeV1 {
  id: string
  deviceId: string
  fromNodeRef: string
  toNodeRef: string
  interfaceComponentRef: string | null
  relation: PortfolioComputeTopologyRelation
  claimState: PortfolioClaimState
  installationEvidence: "not-observed"
  claimEvidence: "source-document-claim"
  authority: "portfolio-reference-only"
  sourceSections: readonly string[]
  note: string
}

export const HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1 = {
  schema: HARDWARE_PORTFOLIO_CONSUMER_SCHEMA,
  compatibleConsumers: ["device-manager", "dirtnet", "mdp", "mmp"],
  familyBinding: {
    field: "portfolioFamilyId",
    match: "exact-canonical-id-only",
    inferFromDisplayName: false,
    inferFromDeviceType: false,
    inferFromCapabilities: false,
  },
  evidencePrecedence: [
    "device-specific-signed-bom",
    "authoritative-registry-manifest",
    "passive-device-observation",
    "portfolio-reference",
  ],
  authority: "portfolio-reference-only",
  mutationAuthority: false,
  installedMergeRule: "Join by the exact portfolioFamilyId only. Never copy a portfolio claim into installed components or sensors; preserve device-specific evidence and surface conflicts for review.",
  revisionRule: "Cache and compare schema, contract version, effective date, and source SHA-256. A newer reference is reviewable input, not an automatic device mutation.",
} as const

export type PortfolioSystemIntegrationKind = "system" | "integration"
export type PortfolioSystemIntegrationId =
  | "mas"
  | "myca"
  | "mindex"
  | "natureos"
  | "rest"
  | "mqtt"
  | "ota"
  | "modbus"
  | "http-s"
  | "ntp"
  | "ptp"

export interface PortfolioSystemIntegrationReferenceV1 {
  id: PortfolioSystemIntegrationId
  kind: PortfolioSystemIntegrationKind
  label: string
  expandedName: string | null
  role: string
  topologyScopes: readonly PortfolioTopologyScope[]
  deviceRefs: readonly string[]
  claimEvidence: "source-document-claim"
  deploymentEvidence: "not-observed"
  authority: "portfolio-reference-only"
  sourceSections: readonly string[]
  note: string
}

export interface HardwarePortfolioV1 {
  schema: typeof HARDWARE_PORTFOLIO_SCHEMA
  version: typeof HARDWARE_PORTFOLIO_VERSION
  effectiveDate: typeof HARDWARE_PORTFOLIO_EFFECTIVE_DATE
  reviewedDate: typeof HARDWARE_PORTFOLIO_REVIEWED_DATE
  /** Compatibility field; new consumers must use the two explicit handling axes below. */
  classification: typeof HARDWARE_PORTFOLIO_CLASSIFICATION
  commercialConfidentiality: typeof HARDWARE_PORTFOLIO_COMMERCIAL_CONFIDENTIALITY
  nationalSecurityClassification: typeof HARDWARE_PORTFOLIO_NATIONAL_SECURITY_CLASSIFICATION
  source: typeof HARDWARE_PORTFOLIO_SOURCE
  installedStateRule: string
  upgradeStateRule: string
  devices: readonly HardwarePortfolioDeviceV1[]
  topologyEdges: readonly PortfolioTopologyEdgeV1[]
  systemIntegrationReferences: readonly PortfolioSystemIntegrationReferenceV1[]
  sensorCapabilities: readonly PortfolioSensorCapabilityV1[]
  computeTopologyNodes: readonly PortfolioComputeTopologyNodeV1[]
  computeTopologyEdges: readonly PortfolioComputeTopologyEdgeV1[]
  consumerBinding: typeof HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1
}

export interface HardwarePortfolioConsumerViewV1 {
  schema: typeof HARDWARE_PORTFOLIO_CONSUMER_SCHEMA
  portfolioFamilyId: string
  revision: {
    portfolioSchema: typeof HARDWARE_PORTFOLIO_SCHEMA
    contractVersion: typeof HARDWARE_PORTFOLIO_VERSION
    effectiveDate: typeof HARDWARE_PORTFOLIO_EFFECTIVE_DATE
    sourceSha256: typeof HARDWARE_PORTFOLIO_SOURCE.sha256
  }
  binding: typeof HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1
  device: HardwarePortfolioDeviceV1
  sensorCapabilities: readonly PortfolioSensorCapabilityV1[]
  computeTopologyNodes: readonly PortfolioComputeTopologyNodeV1[]
  computeTopologyEdges: readonly PortfolioComputeTopologyEdgeV1[]
  protocolReferences: readonly ProtocolReferenceV1[]
}

const component = (
  id: string,
  category: PortfolioComponentCategory,
  label: string,
  model: string | null,
  claimState: PortfolioClaimState,
  sourceSections: readonly string[],
  note: string,
): PortfolioComponentClaimV1 => ({
  id,
  category,
  label,
  model,
  claimState,
  installationEvidence: "not-observed",
  sourceSections,
  note,
})

export const PORTFOLIO_PROTOCOL_REFERENCES_V1: readonly ProtocolReferenceV1[] = [
  {
    id: "mdp",
    label: "MDP",
    expandedName: null,
    role: "Device framing and message compatibility reference.",
    claimState: "naming-unresolved",
    authority: "portfolio-reference-only",
    note: "The supplied portfolio and current repository material do not provide one stable expansion and version authority. Preserve the acronym until the canonical protocol specification resolves it.",
  },
  {
    id: "mmp",
    label: "MMP",
    expandedName: null,
    role: "Fleet or mission semantic transport reference.",
    claimState: "naming-unresolved",
    authority: "portfolio-reference-only",
    note: "The portfolio names MMP but does not establish a deployable schema, transport, or canonical expansion. It cannot authorize discovery, telemetry, or commands.",
  },
  {
    id: "mycorrhizae",
    label: "Mycorrhizae Protocol",
    expandedName: "Mycorrhizae Protocol",
    role: "Mesh networking and store-and-forward reference.",
    claimState: "declared",
    authority: "portfolio-reference-only",
    note: "A portfolio declaration is not proof that a particular device is joined to or reachable through the mesh.",
  },
] as const

/**
 * Systems and integrations named by the portfolio.
 *
 * These are typed source claims for architecture and compatibility planning.
 * They do not prove that software is deployed, configured, authenticated,
 * reachable, synchronized, or safe to invoke on any physical unit.
 */
export const PORTFOLIO_SYSTEM_INTEGRATION_REFERENCES_V1: readonly PortfolioSystemIntegrationReferenceV1[] = [
  {
    id: "mas", kind: "system", label: "MAS", expandedName: "Multi-Agent System",
    role: "Fleet-level multi-agent coordination reference.", topologyScopes: ["fleet"], deviceRefs: [],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["1.1", "7"],
    note: "The source names MAS as part of fleet coordination; it does not establish a running agent topology, permissions, or device-control authority.",
  },
  {
    id: "myca", kind: "system", label: "MYCA", expandedName: null,
    role: "Operating-intelligence and fleet-coordination reference.", topologyScopes: ["fleet"], deviceRefs: ["mushroom-1", "tricorder", "agaric"],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["1.1", "3.1", "3.2", "6.1", "7"],
    note: "The portfolio names local or fleet MYCA roles, but this reference does not prove an active runtime, session, model, tool permission, or autonomous-control path.",
  },
  {
    id: "mindex", kind: "system", label: "MINDEX", expandedName: null,
    role: "Data-integrity, evidence, and chain-of-custody reference.", topologyScopes: ["dirtnet", "fleet"], deviceRefs: ["mycobrain", "sporebase"],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["1.1", "2.1.1", "4.1", "7"],
    note: "A MINDEX integration claim does not prove ingestion, indexing, persistence, synchronization, or a verified evidence receipt.",
  },
  {
    id: "natureos", kind: "system", label: "NatureOS", expandedName: null,
    role: "Fleet-management, telemetry, and visualization reference.", topologyScopes: ["dirtnet", "fleet"], deviceRefs: [],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["1.1", "7"],
    note: "The source names NatureOS integration; it does not prove registry parity, an authenticated session, a live dashboard, or a current telemetry binding.",
  },
  {
    id: "rest", kind: "integration", label: "REST", expandedName: "Representational State Transfer",
    role: "Application API compatibility reference.", topologyScopes: ["dirtnet"], deviceRefs: ["mycobrain"],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["2.1.1"],
    note: "The source names a REST API; no endpoint, schema version, authentication mode, or reachable service is asserted here.",
  },
  {
    id: "mqtt", kind: "integration", label: "MQTT", expandedName: "MQ Telemetry Transport",
    role: "Telemetry and site-integration transport reference.", topologyScopes: ["dirtnet", "fleet"], deviceRefs: ["mycobrain", "hyphae-1"],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["2.1.1", "5.2.2", "7"],
    note: "No broker, topic, credential, quality-of-service policy, retained message, or active client is established by the portfolio.",
  },
  {
    id: "ota", kind: "integration", label: "OTA", expandedName: "Over-the-air update",
    role: "Firmware and model update capability reference.", topologyScopes: ["dirtnet", "fleet"], deviceRefs: ["mycobrain", "alarm"],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["2.1.1", "5.1.2"],
    note: "This record grants no update, firmware, reboot, deployment, signing, or rollback authority.",
  },
  {
    id: "modbus", kind: "integration", label: "Modbus", expandedName: "Modbus RTU/TCP",
    role: "Industrial I/O interoperability reference.", topologyScopes: ["dirtnet"], deviceRefs: ["hyphae-1"],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["5.2.2", "7"],
    note: "The source names Modbus for Hyphae 1; no register map, bus, unit address, gateway, or active connection is asserted.",
  },
  {
    id: "http-s", kind: "integration", label: "HTTP(S)", expandedName: "Hypertext Transfer Protocol and HTTPS",
    role: "Site-operator API and web transport reference.", topologyScopes: ["dirtnet"], deviceRefs: ["hyphae-1"],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["5.2.2", "7"],
    note: "The portfolio does not establish a URL, certificate, listener, route, authentication policy, or reachable HTTP(S) service.",
  },
  {
    id: "ntp", kind: "integration", label: "NTP", expandedName: "Network Time Protocol",
    role: "Network time-synchronization reference.", topologyScopes: ["dirtnet"], deviceRefs: ["hyphae-1"],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["5.2.2"],
    note: "A named time protocol is not evidence of a configured time source, clock accuracy, synchronization, or timestamp integrity.",
  },
  {
    id: "ptp", kind: "integration", label: "PTP", expandedName: "Precision Time Protocol",
    role: "Precision time-synchronization reference.", topologyScopes: ["dirtnet"], deviceRefs: ["hyphae-1"],
    claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["5.2.2"],
    note: "The source does not establish a grandmaster, clock profile, hardware timestamping, measured offset, or active synchronization.",
  },
] as const

const devices: readonly HardwarePortfolioDeviceV1[] = [
  {
    id: "mycobrain",
    label: "MycoBrain",
    deviceClass: "Shared sensor-acquisition and communications controller",
    portfolioStatusClaim: "Standalone module and common fleet controller",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["production-board", "module-variant", "future-revisions-3-4-5"],
    protocolRefs: ["mdp", "mmp", "mycorrhizae"],
    components: [
      component("controller.dual-esp32-s3", "controller", "Dual ESP32-S3 control plane", "ESP32-S3-WROOM-1", "declared-baseline", ["2.1", "2.1.1"], "Side A and Side B are declared as separate processors; firmware and board revision remain device-specific evidence."),
      component("interface.i2c", "interface", "I2C expansion bus", "SDA GPIO 21 / SCL GPIO 22", "declared-baseline", ["2.1.1"], "Portfolio electrical declaration only; attached peripheral identity must come from a live manifest or BOM."),
      component("interface.analog", "interface", "Four analog input channels", "0-3.3 V, 12-bit ADC", "declared-baseline", ["2.1.1"], "Channel availability does not prove a sensor is attached."),
      component("interface.mosfet", "interface", "Four MOSFET output channels", "Up to 30 V / 5 A per channel", "declared-baseline", ["2.1.1"], "Declared hardware capability; this contract grants no output or actuation authority."),
      component("interface.uart", "interface", "UART bridge", "GPIO 17/16, 115200 default", "declared-baseline", ["2.1.1"], "Pin and baud claims require revision-specific verification before adapter use."),
      component("communications.lora", "communications", "LoRa mesh radio", "Semtech SX1262", "declared-baseline", ["2.1.1"], "Band is deployment-dependent among the declared regional variants."),
      component("communications.wifi-ble", "communications", "Wi-Fi and Bluetooth LE", "802.11 b/g/n and BLE 5.0", "declared-baseline", ["2.1.1"], "Presence does not establish credentials, association, or reachability."),
      component("sensor.dual-bme688", "sensor", "Dual gas/environment sensors", "Bosch BME688", "variant-dependent", ["2.1.1", "2.1.2"], "Declared for the module variant; do not infer it on every production board."),
      component("compute.future-board-revisions", "controller", "Future MycoBrain revisions", null, "future", ["12.3"], "Revisions 3, 4, and 5 are updateable planning placeholders, not electrical specifications."),
    ],
    unresolved: [
      "Current schematic, pin map, firmware digest, and per-device board revision are not established by the portfolio.",
      "The production-board and module-variant memory and sensor configurations differ.",
    ],
  },
  {
    id: "mushroom-1",
    label: "Mushroom 1",
    deviceClass: "Walking ground droid and mobile edge data center",
    portfolioStatusClaim: "Pre-order; deployment timing is a source-document claim",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["jetson-orin-nano", "blackwell-plus-m5stack", "smaller-compute"],
    protocolRefs: ["mdp", "mmp", "mycorrhizae"],
    components: [
      component("controller.mycobrain", "controller", "MycoBrain controller", null, "declared-baseline", ["3.1.1"], "Exact board revision and installed firmware are unknown."),
      component("compute.edge", "compute", "Edge AI compute", "Jetson Orin Nano 8 GB or Blackwell-class plus M5Stack LLM8850", "variant-dependent", ["2.2", "3.1.1", "12.1"], "The source records a compute-stack conflict; no one module is universal or observed installed."),
      component("storage.nvme", "storage", "NVMe and local removable storage", "256 GB-1 TB NVMe plus microSD", "variant-dependent", ["2.2.4", "3.1.1"], "Capacity depends on configuration."),
      component("sensor.fci-soil", "sensor", "Ground-actuated FCI and soil array", null, "declared-baseline", ["3.1", "3.1.2"], "Includes bioelectric and soil-context claims; electrode layout and calibration remain unknown."),
      component("sensor.gas-environment", "sensor", "Gas and environmental sensing", "BME690 and BME688", "declared-baseline", ["3.1.2"], "Specific installed count and address require registry evidence."),
      component("sensor.bluesight-core", "sensor", "Imaging, LiDAR, radar, thermal, acoustic, tactile, RF, and light modalities", null, "declared-baseline", ["2.3", "3.1.2"], "Modality claims do not identify exact parts, calibrations, or live adapters."),
      component("sensor.ouster-rev8", "sensor", "Ouster REV8 LiDAR candidate", "Ouster OS0/OS1", "proposed", ["2.3.1", "3.1.3"], "The portfolio explicitly marks this as proposed and excludes it from the priced BOM total."),
      component("sensor.gnss-imu", "sensor", "GNSS and 9-DoF IMU", null, "proposed", ["8.2", "12.1"], "Required planning addition for geo-referenced BlueSight output; not a published installed component."),
      component("mechanical.quadruped", "mechanical", "Four-leg walking platform", null, "declared-baseline", ["3.1", "3.1.1"], "Joint layout, gait controller, actuators, and safety envelope remain unresolved."),
    ],
    unresolved: [
      "Reconcile Jetson Orin Nano versus Blackwell-class and M5Stack compute configurations.",
      "Identify the actual gait controller, motor bus, joint layout, limits, and independent emergency stop.",
    ],
  },
  {
    id: "sporebase",
    label: "SporeBase",
    deviceClass: "Time-indexed bioaerosol collector and edge node",
    portfolioStatusClaim: "In stock; technical specification v4 claimed",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["standard", "dual-lane-a-b"],
    protocolRefs: ["mdp", "mmp", "mycorrhizae"],
    components: [
      component("controller.mycobrain", "controller", "MycoBrain controller", null, "declared-baseline", ["4.1.1", "4.1.2"], "Exact board revision remains unknown."),
      component("compute.m5stack-8850", "compute", "Compact edge inference module", "M5Stack LLM Module 8850", "declared-baseline", ["4.1", "4.1.1"], "Portfolio claim only; installed module and software image are not observed."),
      component("mechanical.tape-cassette", "mechanical", "Fifteen-minute tape advance over a thirty-day cassette", null, "declared-baseline", ["4.1", "4.1.1"], "The declared cadence yields 2,880 intervals; laboratory identifications are delayed evidence, not live detections."),
      component("mechanical.sampling-fan", "mechanical", "Fan-driven active deposition", null, "declared-baseline", ["4.1.1", "4.1.2"], "Flow rate and calibration are not specified."),
      component("sensor.bme688-690", "sensor", "Environmental gas sensing", "BME688/690", "declared-baseline", ["4.1.1"], "Exact sensor model and address are configuration evidence."),
      component("sensor.bmv080", "sensor", "Particulate sensing", "Bosch BMV080", "declared-optional", ["4.1.1", "4.1.2"], "Optional in the source; never infer presence from the SporeBase name."),
      component("storage.microsd", "storage", "microSD plus module flash", "32-256 GB microSD", "variant-dependent", ["2.2.4", "4.1.1"], "Capacity is configuration-dependent."),
      component("power.solar", "power", "MPPT solar and Li-ion battery", null, "declared-baseline", ["4.1.1", "4.1.2"], "Installed capacity and health require device telemetry."),
    ],
    unresolved: ["Cassette reorder identity, airflow calibration, sensor addresses, and installed optional BMV080 are unresolved."],
  },
  {
    id: "alarm",
    label: "ALARM",
    deviceClass: "Indoor multi-sensor safety monitor",
    portfolioStatusClaim: "Pre-order; Standard and Pro variants claimed",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["standard", "pro"],
    protocolRefs: ["mdp", "mmp", "mycorrhizae"],
    components: [
      component("controller.esp32-s3", "controller", "TinyML controller", "ESP32-S3", "declared-baseline", ["5.1.1", "5.1.2"], "The device BOM names one ESP32-S3; the portfolio's broad MycoBrain-everywhere statement is not used to overwrite this specific line."),
      component("controller.mycobrain", "controller", "MycoBrain relationship", null, "unknown", ["1.1", "5.1.2"], "The general fleet statement and ALARM-specific BOM conflict; exact board relationship requires a current BOM."),
      component("sensor.smoke", "sensor", "Dual ionization and photoelectric smoke sensing", null, "declared-baseline", ["5.1.1", "5.1.2"], "Certification and installed part numbers require independent evidence."),
      component("sensor.environment", "sensor", "CO2, VOC, particulate, temperature, humidity, pressure, and light", null, "declared-baseline", ["5.1.1", "5.1.2"], "Pathogen or mold-spore density is an estimation claim, not a species identification."),
      component("communications.lora", "communications", "LoRa bridge", null, "declared-optional", ["5.1", "5.1.1"], "Optional by product variant."),
      component("power.ac-battery", "power", "AC with Li-ion backup", null, "declared-baseline", ["5.1.1"], "Installed electrical and certification state are not observed."),
    ],
    unresolved: ["Standard-versus-Pro feature delta, LoRa SKU, exact PM and smoke parts, AC input, and certification evidence are unresolved."],
  },
  {
    id: "myconode",
    label: "MycoNode",
    deviceClass: "Buried low-power bioelectric and soil probe",
    portfolioStatusClaim: "Enterprise/custom sales claim",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["buried-probe"],
    protocolRefs: ["mdp", "mycorrhizae"],
    components: [
      component("controller.esp32-s3", "controller", "Single-side MycoBrain-class MCU", "ESP32-S3", "declared-baseline", ["4.2.2"], "The specific single-side description differs from the shared dual-controller platform and must remain explicit."),
      component("compute.none", "compute", "No secondary edge accelerator", null, "declared-baseline", ["2.2", "4.2", "4.2.1"], "Data is intended to relay to another edge node."),
      component("sensor.bioelectric", "sensor", "Platinum-iridium bioelectric array", null, "declared-baseline", ["4.2.1", "4.2.2"], "Resolution is a portfolio claim; calibration and electrode identity are not observed."),
      component("sensor.soil", "sensor", "Moisture, RTD temperature, EC, ISFET pH, impedance, signal quality, and root mapping", null, "declared-baseline", ["4.2.1", "8.1"], "Specific models and calibrations vary or remain unspecified."),
      component("communications.lora", "communications", "LoRa mesh", "SX1262", "declared-baseline", ["4.2.1", "4.2.2"], "Reachability and band are deployment-specific."),
      component("storage.flash", "storage", "Onboard flash buffer", "32 MB", "declared-baseline", ["4.2.1"], "No SSD or removable media is declared."),
    ],
    unresolved: ["MCU/RAM, battery capacity, LoRaWAN class, firmware version, flash type, and current calibration evidence are unresolved."],
  },
  {
    id: "hyphae-1",
    label: "Hyphae 1",
    deviceClass: "Modular industrial I/O and fixed edge data center",
    portfolioStatusClaim: "Available in Compact, Standard, and Industrial variants",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["compact", "standard", "industrial"],
    protocolRefs: ["mdp", "mmp", "mycorrhizae"],
    components: [
      component("controller.mycobrain", "controller", "MycoBrain sensor and mesh controller", null, "declared-baseline", ["5.2", "5.2.3"], "Exact revision and connected modules are device-specific."),
      component("compute.edge", "compute", "Variant-specific edge compute", "M5Stack LLM 8850, Jetson Nano, or Jetson Orin Nano", "variant-dependent", ["2.2", "5.2", "5.2.2"], "Compact, Standard, and Industrial variants intentionally differ."),
      component("storage.edge", "storage", "Variant-specific local storage", "microSD or 256 GB-1 TB NVMe", "variant-dependent", ["2.2.4", "5.2.2", "5.2.3"], "Capacity and medium depend on configuration."),
      component("interface.industrial-io", "interface", "Four-, eight-, or sixteen-channel modular I/O", null, "variant-dependent", ["5.2.2"], "Connected cards and sensor instances must come from the registry, not the enclosure type."),
      component("communications.industrial", "communications", "Ethernet/PoE, Wi-Fi, LoRa, SDR, and optional LTE/5G", null, "variant-dependent", ["5.2.2"], "A listed bearer is not evidence of association or authorization."),
      component("sensor.virtual-antenna", "sensor", "BlueSight virtual antenna fabric for radar, LiDAR, and WiFiSense", null, "declared-optional", ["2.3", "5.2"], "This is a composable site role; it does not prove all three sensor types are installed on every unit."),
      component("power.ups", "power", "DIN-rail UPS", null, "proposed", ["8.2", "12.3"], "Recommended but not published as installed."),
    ],
    unresolved: ["Per-variant weight, actual storage, UPS, installed sensor cards, field of view, range, and accelerator details are unresolved."],
  },
  {
    id: "tricorder",
    label: "Tricorder",
    deviceClass: "Handheld environmental AI instrument",
    portfolioStatusClaim: "Pre-production",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["prototype"],
    protocolRefs: ["mdp", "mmp", "mycorrhizae"],
    components: [
      component("controller.mycobrain-tiny", "controller", "Compact sensor and LoRa controller", "MycoBrain Tiny", "proposed", ["6.1.2", "6.1.3"], "Pre-production component selection, not installed fact."),
      component("compute.edge", "compute", "Small local LLM accelerator", "M5Stack LLM 8850 or equivalent", "variant-dependent", ["6.1.2", "6.1.3"], "Exact module is unresolved."),
      component("sensor.environment", "sensor", "BME690 gas/VOC and BMV080 particulate", null, "proposed", ["6.1.1", "6.1.2"], "Prototype design declaration."),
      component("sensor.spatial", "sensor", "Camera, mmWave radar, and time-of-flight LiDAR", null, "proposed", ["6.1.1", "6.1.2"], "Exact parts are candidates, not final BOM authority."),
      component("sensor.audio", "sensor", "Speaker and MEMS microphone", null, "proposed", ["6.1.1", "6.1.2"], "Voice-interaction design target."),
      component("sensor.fci-accessory", "sensor", "Plug-in FCI bioelectric probe", null, "declared-optional", ["6.1.1", "6.1.2"], "FCI is an accessory, not the core device identity."),
    ],
    unresolved: ["Funding, final compute, sensor part selection, power, enclosure, voice runtime, and production validation remain open."],
  },
  {
    id: "petraeus",
    label: "Petraeus",
    deviceClass: "Petri-dish simulation and future bio-digital interface",
    portfolioStatusClaim: "Pre-production",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["v1-simulator", "v2-smart-petri-dish"],
    protocolRefs: ["mdp", "mmp"],
    components: [
      component("compute.v1-raspberry-pi", "compute", "V1 simulation computer", "Raspberry Pi 5 8 GB", "proposed", ["6.2.1", "6.2.2"], "V1 prototype design, not an observed build."),
      component("interface.v1-display", "interface", "Circular capacitive touch display", "Waveshare 5-inch 1080x1080", "proposed", ["6.2.1", "6.2.2"], "Candidate part for V1."),
      component("mechanical.v1-haptic", "mechanical", "Haptic feedback actuator", "LRA", "proposed", ["6.2.2"], "Candidate part for V1."),
      component("sensor.v2-hdmea", "sensor", "High-density microelectrode array", "64-256 electrodes", "future", ["6.2.3"], "V2 concept depends on cleanroom, calibration, biosafety, and stimulation safety work."),
      component("interface.v2-analog", "interface", "Multichannel amplifier, ADC, stimulation, and FPGA/MCU", null, "future", ["6.2.3"], "Architecture proposal only; no stimulation authority is granted."),
      component("environmental.v2-temperature", "environmental", "Culture temperature control", "Peltier plus controller", "future", ["6.2.3"], "V2 proposal."),
    ],
    unresolved: ["Neither V1 nor V2 installed prototype evidence is supplied; V2 depends on biological, electrical, and cleanroom validation."],
  },
  {
    id: "mushroom-2",
    label: "Mushroom 2",
    deviceClass: "Multi-dish biological computing chassis",
    portfolioStatusClaim: "Pre-production concept",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["4-dish", "8-dish", "16-dish"],
    protocolRefs: ["mdp", "mmp"],
    components: [
      component("compute.orchestrator", "compute", "Central FPGA or high-performance MCU", null, "future", ["6.3.1", "6.3.2"], "Concept-stage orchestration plane."),
      component("sensor.petraeus-stack", "sensor", "Stack of Petraeus V2 smart petri dishes", null, "future", ["6.3", "6.3.1", "6.3.2"], "Blocked on Petraeus V2 completion."),
      component("interface.interdish", "interface", "Multiplexed inter-dish analog bus", null, "future", ["6.3.1", "6.3.2"], "Concept-stage bus."),
      component("environmental.control", "environmental", "Per-dish temperature, humidity, and gas control", null, "future", ["6.3.1", "6.3.2"], "Concept-stage environment control."),
      component("storage.host", "storage", "Host-connected data streaming", "USB 3.0 or Ethernet", "future", ["6.3.1", "6.3.2"], "No deployed service or storage contract is established."),
    ],
    unresolved: ["Depends on Petraeus V2 and requires biological-compute validation, inter-dish protocol, containment, and safety review."],
  },
  {
    id: "agaric",
    label: "Agaric",
    deviceClass: "Flying environmental drone and fleet deployment platform",
    portfolioStatusClaim: "Published platform; BOM and availability unresolved",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["agaric-s", "agaric-m", "agaric-l"],
    protocolRefs: ["mdp", "mmp", "mycorrhizae"],
    components: [
      component("controller.mycobrain", "controller", "MycoBrain mission and sensor plane", null, "declared-baseline", ["3.2.2", "3.2.3"], "Exact board and interconnect are not observed."),
      component("controller.flight", "controller", "Flight controller", null, "unknown", ["3.2.2", "12.1"], "Exact make, model, firmware, bus, and authority are unresolved; do not infer from recalled names or repository forks."),
      component("controller.esc", "controller", "Electronic speed controller and power bus", null, "unknown", ["3.2.3", "8.2", "12.1"], "Exact ESC, current limits, and bus are unresolved."),
      component("compute.edge", "compute", "Jetson-class edge compute", null, "variant-dependent", ["2.2", "3.2.2", "3.2.3"], "The portfolio declares a Jetson candidate while operator notes leave flight mass and power unresolved."),
      component("mechanical.coaxial-propulsion", "mechanical", "Six-point coaxial propulsion", "Six H13MD systems / twelve rotors", "proposed", ["3.2.2", "3.2.3", "12.1"], "Heavy-lift AGARIC-L proposal only; it must not replace evidence for the current six-propeller build."),
      component("mechanical.payload", "mechanical", "Payload retention, release, recovery, winch, sling, and latch", null, "declared-baseline", ["3.2", "3.2.2"], "Declared platform capability; no actuation contract is authorized here."),
      component("sensor.bluesight", "sensor", "Gas, particulate, LiDAR, radar, cameras, thermal, acoustic, RF, magnetic, and radiation payloads", null, "declared-optional", ["2.3", "3.2.2"], "Composable payload catalog; not every modality is baseline or installed."),
      component("sensor.gnss-imu", "sensor", "GNSS and IMU", null, "proposed", ["8.2", "12.1"], "Required for geo-referenced flight and BlueSight outputs, but not yet published as an installed part."),
      component("communications.multi-bearer", "communications", "LoRa, Wi-Fi, BLE, LTE, and satellite diagnostics", null, "variant-dependent", ["3.2.2"], "Bearer availability and authorization are configuration-specific."),
    ],
    unresolved: [
      "Current flight controller, ESC, motors, propellers, battery, BMS, wiring, firmware, failsafe, and exact active variant are unknown.",
      "Validate the H13MD power and airframe proposal only for an appropriate heavy-lift configuration.",
    ],
  },
  {
    id: "psathyrella",
    label: "Psathyrella",
    deviceClass: "Self-propelled maritime sensor buoy",
    portfolioStatusClaim: "Published capability; full BOM and certification state unresolved",
    portfolioStatusEvidence: "source-document-claim",
    variants: ["mission-specific-configurations"],
    protocolRefs: ["mdp", "mmp", "mycorrhizae"],
    components: [
      component("controller.mycobrain", "controller", "MycoBrain sensor and communications plane", null, "declared-baseline", ["3.3.2"], "Exact board revision, firmware, and wiring are unknown."),
      component("compute.edge", "compute", "Jetson-class edge AI compute", null, "variant-dependent", ["2.2", "3.3.2"], "The exact installed SKU is not supplied; Orin Nano is only a candidate market reference."),
      component("mechanical.propulsion", "mechanical", "Self-propulsion system", null, "unknown", ["3.3", "3.3.2"], "Propulsion type, controllers, thrust, endurance, and safety behavior are not public in the source."),
      component("sensor.hydrophone", "sensor", "Passive underwater hydrophone sensing", null, "declared-baseline", ["3.3.1", "3.3.2"], "Exact hydrophone, array geometry, calibration, and installed channels remain unknown."),
      component("sensor.transducer", "sensor", "Active underwater transducer", null, "declared-baseline", ["3.3.1", "3.3.2"], "Transmission remains a separately gated device effect; this declaration grants no authority."),
      component("sensor.tower", "sensor", "8K 360 and 4K zoom cameras, microphones, radar, LiDAR, infrared, gas, SDR, and environmental telemetry", null, "declared-baseline", ["3.3.1", "3.3.2"], "Capabilities are documented through product-video evidence; exact installed parts are unknown."),
      component("communications.long-haul", "communications", "LoRa, Iridium, Starlink, and underwater optical communications", null, "variant-dependent", ["3.3.1", "3.3.2"], "Named bearers are capability claims; active subscriptions, terminals, and reachability are not observed."),
      component("sensor.gnss-imu", "sensor", "GNSS and IMU", null, "proposed", ["3.3.2", "8.2"], "Required planning addition for navigation and fusion, not an installed fact."),
    ],
    unresolved: [
      "Hull, displacement, propulsion, battery, endurance, compute SKU, sensor part numbers, actual certifications, and current installed configuration are unknown.",
      "Product-video capability evidence must be reconciled with a current unit BOM and registry manifest.",
    ],
  },
] as const

/**
 * Explicit normalized sensing claims for downstream read-only consumers.
 *
 * This index is intentionally keyed by canonical family/component identifiers.
 * Consumers must not recover capability from a display label or device type.
 */
const SENSOR_CAPABILITIES_BY_COMPONENT = {
  "mycobrain/sensor.dual-bme688": ["air-temperature", "relative-humidity", "barometric-pressure", "air-quality-index", "gas-voc"],
  "mushroom-1/sensor.fci-soil": ["bioelectric-fci", "soil-moisture", "soil-temperature", "soil-ph", "tactile-contact"],
  "mushroom-1/sensor.gas-environment": ["air-temperature", "relative-humidity", "barometric-pressure", "air-quality-index", "gas-voc", "gas-vsc"],
  "mushroom-1/sensor.bluesight-core": ["camera-directional", "lidar", "radar", "thermal", "acoustic-air", "tactile-contact", "rf-spectrum", "light-ambient-uv"],
  "mushroom-1/sensor.ouster-rev8": ["lidar"],
  "mushroom-1/sensor.gnss-imu": ["gnss", "imu"],
  "sporebase/sensor.bme688-690": ["air-temperature", "relative-humidity", "barometric-pressure", "air-quality-index", "gas-voc", "gas-vsc"],
  "sporebase/sensor.bmv080": ["particulate"],
  "alarm/sensor.smoke": ["smoke"],
  "alarm/sensor.environment": ["air-temperature", "relative-humidity", "barometric-pressure", "air-quality-index", "gas-voc", "co2", "particulate", "spore-density-estimate", "light-ambient-uv"],
  "myconode/sensor.bioelectric": ["bioelectric-fci"],
  "myconode/sensor.soil": ["soil-moisture", "soil-temperature", "soil-conductivity", "soil-ph", "soil-impedance", "root-mapping"],
  "hyphae-1/sensor.virtual-antenna": ["radar", "lidar", "wifi-sense"],
  "tricorder/sensor.environment": ["air-temperature", "relative-humidity", "barometric-pressure", "gas-voc", "gas-vsc", "particulate"],
  "tricorder/sensor.spatial": ["camera-rgb", "radar", "lidar"],
  "tricorder/sensor.audio": ["acoustic-air"],
  "tricorder/sensor.fci-accessory": ["bioelectric-fci"],
  "petraeus/sensor.v2-hdmea": ["bioelectric-fci"],
  "mushroom-2/sensor.petraeus-stack": ["bioelectric-fci"],
  "agaric/sensor.bluesight": ["air-temperature", "relative-humidity", "barometric-pressure", "air-quality-index", "gas-voc", "gas-vsc", "co2", "particulate", "camera-rgb", "camera-directional", "lidar", "radar", "thermal", "acoustic-air", "rf-spectrum", "radiation", "magnetic-em"],
  "agaric/sensor.gnss-imu": ["gnss", "imu"],
  "psathyrella/sensor.hydrophone": ["acoustic-underwater-passive"],
  "psathyrella/sensor.transducer": ["acoustic-underwater-active"],
  "psathyrella/sensor.tower": ["air-temperature", "relative-humidity", "barometric-pressure", "gas-voc", "camera-360", "camera-directional", "lidar", "radar", "thermal", "acoustic-air", "rf-spectrum"],
  "psathyrella/sensor.gnss-imu": ["gnss", "imu"],
} as const satisfies Readonly<Record<string, readonly PortfolioSensorCapabilityId[]>>

export const PORTFOLIO_SENSOR_CAPABILITIES_V1: readonly PortfolioSensorCapabilityV1[] = devices.flatMap((device) =>
  device.components
    .filter((claim) => claim.category === "sensor")
    .flatMap((claim) => {
      const key = `${device.id}/${claim.id}` as keyof typeof SENSOR_CAPABILITIES_BY_COMPONENT
      const capabilities = SENSOR_CAPABILITIES_BY_COMPONENT[key] ?? []
      return capabilities.map((capabilityId) => ({
        id: `${device.id}/${claim.id}/${capabilityId}`,
        deviceId: device.id,
        componentRef: claim.id,
        capabilityId,
        model: claim.model,
        claimState: claim.claimState,
        installationEvidence: "not-observed" as const,
        adapterEvidence: "unbound" as const,
        claimEvidence: "source-document-claim" as const,
        authority: "portfolio-reference-only" as const,
        sourceSections: claim.sourceSections,
      }))
    }),
)

const computeNode = (
  id: string,
  deviceId: string,
  componentRef: string,
  family: PortfolioComputeNodeFamily,
  label: string,
  model: string | null,
  role: string,
  claimState: PortfolioClaimState,
  sourceSections: readonly string[],
): PortfolioComputeTopologyNodeV1 => ({
  id,
  deviceId,
  componentRef,
  family,
  label,
  model,
  role,
  claimState,
  installationEvidence: "not-observed",
  claimEvidence: "source-document-claim",
  authority: "portfolio-reference-only",
  sourceSections,
})

/** Source-described compute/control nodes. Unknown flight hardware stays unknown. */
export const PORTFOLIO_COMPUTE_TOPOLOGY_NODES_V1: readonly PortfolioComputeTopologyNodeV1[] = [
  computeNode("mycobrain/esp32-side-a", "mycobrain", "controller.dual-esp32-s3", "esp32", "ESP32 Side A", "ESP32-S3-WROOM-1", "Sensor acquisition and I/O", "declared-baseline", ["2.1", "2.1.1", "2.1.3"]),
  computeNode("mycobrain/esp32-side-b", "mycobrain", "controller.dual-esp32-s3", "esp32", "ESP32 Side B", "ESP32-S3-WROOM-1", "LoRa mesh routing", "declared-baseline", ["2.1", "2.1.1", "2.1.3"]),
  computeNode("mushroom-1/mycobrain", "mushroom-1", "controller.mycobrain", "mycobrain", "MycoBrain", null, "Sensor and mesh control", "declared-baseline", ["3.1.1"]),
  computeNode("mushroom-1/edge-compute", "mushroom-1", "compute.edge", "edge-compute", "Edge AI compute", "Jetson Orin Nano or Blackwell-class plus M5Stack", "Inference and local data processing", "variant-dependent", ["2.2", "3.1.1", "12.1"]),
  computeNode("sporebase/mycobrain", "sporebase", "controller.mycobrain", "mycobrain", "MycoBrain", null, "Sampling and mesh control", "declared-baseline", ["4.1.1", "4.1.2"]),
  computeNode("sporebase/m5stack", "sporebase", "compute.m5stack-8850", "m5stack", "M5Stack LLM 8850", "M5Stack LLM Module 8850", "Local inference", "declared-baseline", ["4.1", "4.1.1"]),
  computeNode("hyphae-1/mycobrain", "hyphae-1", "controller.mycobrain", "mycobrain", "MycoBrain", null, "Sensor and mesh control", "declared-baseline", ["5.2", "5.2.3"]),
  computeNode("hyphae-1/edge-compute", "hyphae-1", "compute.edge", "edge-compute", "Variant edge compute", "M5Stack LLM 8850, Jetson Nano, or Jetson Orin Nano", "Local site processing", "variant-dependent", ["2.2", "5.2", "5.2.2"]),
  computeNode("tricorder/mycobrain-tiny", "tricorder", "controller.mycobrain-tiny", "mycobrain", "MycoBrain Tiny", "MycoBrain Tiny", "Sensor and LoRa control", "proposed", ["6.1.2", "6.1.3"]),
  computeNode("tricorder/edge-compute", "tricorder", "compute.edge", "edge-compute", "Compact edge compute", "M5Stack LLM 8850 or equivalent", "Local voice and inference", "variant-dependent", ["6.1.2", "6.1.3"]),
  computeNode("agaric/mycobrain", "agaric", "controller.mycobrain", "mycobrain", "MycoBrain", null, "Mission, sensor, and protocol plane", "declared-baseline", ["3.2.2", "3.2.3"]),
  computeNode("agaric/edge-compute", "agaric", "compute.edge", "edge-compute", "Jetson-class edge compute", null, "Inference and local mission processing", "variant-dependent", ["2.2", "3.2.2", "3.2.3"]),
  computeNode("agaric/flight-controller", "agaric", "controller.flight", "flight-controller", "Flight controller", null, "Flight stabilization and vehicle control", "unknown", ["3.2.2", "12.1"]),
  computeNode("agaric/esc", "agaric", "controller.esc", "esc", "Electronic speed controller", null, "Motor-speed and power interface", "unknown", ["3.2.3", "8.2", "12.1"]),
  computeNode("psathyrella/mycobrain", "psathyrella", "controller.mycobrain", "mycobrain", "MycoBrain", null, "Sensor and communications plane", "declared-baseline", ["3.3.2"]),
  computeNode("psathyrella/edge-compute", "psathyrella", "compute.edge", "edge-compute", "Jetson-class edge compute", null, "Inference and local mission processing", "variant-dependent", ["2.2", "3.3.2"]),
] as const

const computeEdge = (
  id: string,
  deviceId: string,
  fromNodeRef: string,
  toNodeRef: string,
  interfaceComponentRef: string | null,
  relation: PortfolioComputeTopologyRelation,
  claimState: PortfolioClaimState,
  sourceSections: readonly string[],
  note: string,
): PortfolioComputeTopologyEdgeV1 => ({
  id,
  deviceId,
  fromNodeRef,
  toNodeRef,
  interfaceComponentRef,
  relation,
  claimState,
  installationEvidence: "not-observed",
  claimEvidence: "source-document-claim",
  authority: "portfolio-reference-only",
  sourceSections,
  note,
})

export const PORTFOLIO_COMPUTE_TOPOLOGY_EDGES_V1: readonly PortfolioComputeTopologyEdgeV1[] = [
  computeEdge("mycobrain/side-a-uart-side-b", "mycobrain", "mycobrain/esp32-side-a", "mycobrain/esp32-side-b", "interface.uart", "uart-bridge", "declared-baseline", ["2.1.1", "2.1.3"], "The source declares a UART bridge between independently updatable sensor and router processors; no live board or firmware is inferred."),
  computeEdge("mushroom-1/mycobrain-edge", "mushroom-1", "mushroom-1/mycobrain", "mushroom-1/edge-compute", null, "paired-with", "variant-dependent", ["2.2", "3.1.1", "12.1"], "The source pairs MycoBrain with a configuration-dependent accelerator. The exact compute SKU, bus, carrier, and installed software remain device evidence."),
  computeEdge("sporebase/mycobrain-m5stack", "sporebase", "sporebase/mycobrain", "sporebase/m5stack", null, "paired-with", "declared-baseline", ["4.1", "4.1.1"], "The portfolio pairs these compute roles; physical presence and software state remain unobserved."),
  computeEdge("hyphae-1/mycobrain-edge", "hyphae-1", "hyphae-1/mycobrain", "hyphae-1/edge-compute", null, "paired-with", "variant-dependent", ["2.2", "5.2", "5.2.2"], "The compute pair varies by Compact, Standard, or Industrial configuration; no variant is inferred from the family name."),
  computeEdge("tricorder/mycobrain-edge", "tricorder", "tricorder/mycobrain-tiny", "tricorder/edge-compute", null, "paired-with", "proposed", ["6.1.2", "6.1.3"], "This is a pre-production pairing and not an installed prototype claim."),
  computeEdge("agaric/mycobrain-edge", "agaric", "agaric/mycobrain", "agaric/edge-compute", null, "paired-with", "variant-dependent", ["2.2", "3.2.2", "3.2.3"], "The portfolio pairs MycoBrain with Jetson-class compute, but mass, power, carrier, bus, and active variant remain unresolved."),
  computeEdge("agaric/mycobrain-flight", "agaric", "agaric/mycobrain", "agaric/flight-controller", null, "unresolved-control-path", "unknown", ["3.2.2", "12.1"], "A flight-control integration is required, but the controller model, bus, firmware, authority, and wiring are not established."),
  computeEdge("agaric/flight-esc", "agaric", "agaric/flight-controller", "agaric/esc", null, "unresolved-control-path", "unknown", ["3.2.3", "8.2", "12.1"], "The flight-controller-to-ESC path is unresolved; no current ESC, motor, power-bus, or command protocol is inferred."),
  computeEdge("psathyrella/mycobrain-edge", "psathyrella", "psathyrella/mycobrain", "psathyrella/edge-compute", null, "paired-with", "variant-dependent", ["2.2", "3.3.2"], "The source pairs MycoBrain with a Jetson-class candidate; the installed SKU, carrier, interface, and software remain unknown."),
] as const

export const SHARED_BLUESIGHT_STACK_V1 = {
  id: "bluesight",
  label: "BlueSight",
  kind: "shared-sensing-stack",
  sourceSections: ["2.3", "8.1", "8.2"],
  declaredModalities: [
    "blue-light-response", "lidar", "radar", "wifi-sense", "camera-360", "camera-directional",
    "gas-voc", "acoustic", "particulate", "bioelectric-fci", "thermal", "rf-spectrum",
  ],
  rule: "A shared-stack modality is a composable portfolio option. It never proves that a specific physical device has the sensor installed, calibrated, reachable, or authorized.",
  proposedCoreAdditions: ["GNSS/GPS", "9-DoF IMU", "radiometric thermal imager", "standardized microphone array"],
} as const

/**
 * Source-described architecture edges, normalized into DIRTNet and fleet
 * scopes. Every edge is a planning claim only; none is live topology evidence.
 */
export const PORTFOLIO_TOPOLOGY_EDGES_V1: readonly PortfolioTopologyEdgeV1[] = [
  {
    id: "fleet-mycobrain-shared-fabric", scope: "fleet",
    from: { kind: "device-family", id: "mycobrain" }, to: { kind: "topology-domain", id: "fleet" },
    relation: "shared-compute-fabric-for", claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["1.1", "7"],
    note: "The portfolio describes MycoBrain as the shared compute and sensor fabric; no installed board, route, or reachable node is inferred.",
  },
  {
    id: "fleet-bluesight-shared-sensing", scope: "fleet",
    from: { kind: "shared-sensing-stack", id: "bluesight" }, to: { kind: "topology-domain", id: "fleet" },
    relation: "shared-sensing-fabric-for", claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["2.3", "7", "8.1"],
    note: "The portfolio describes BlueSight as shared sensing options; it does not prove a modality is installed on a particular device.",
  },
  ...(["mushroom-1", "agaric", "psathyrella"] as const).map((deviceId): PortfolioTopologyEdgeV1 => ({
    id: `fleet-${deviceId}-member`, scope: "fleet",
    from: { kind: "device-family", id: deviceId }, to: { kind: "topology-domain", id: "fleet" },
    relation: "member-of", claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["7"],
    note: "The source places this platform in the coordinated fleet; registry presence, connection state, and deployment remain unobserved.",
  })),
  ...(["sporebase", "myconode", "hyphae-1"] as const).map((deviceId): PortfolioTopologyEdgeV1 => ({
    id: `dirtnet-${deviceId}-edge-node`, scope: "dirtnet",
    from: { kind: "device-family", id: deviceId }, to: { kind: "topology-domain", id: "dirtnet" },
    relation: "member-of", claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["4", "5.2", "7"],
    note: "DIRTNet is the operator contract label for this source-described edge or fixed-site role; no live node or network membership is asserted.",
  })),
  {
    id: "dirtnet-alarm-bridge-hyphae", scope: "dirtnet",
    from: { kind: "device-family", id: "alarm" }, to: { kind: "device-family", id: "hyphae-1" },
    relation: "bridges-through", claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["5.1", "5.2", "7"],
    note: "The portfolio describes an optional ALARM bridge through Hyphae 1 or a MycoBrain gateway; this edge proves neither endpoint nor bearer is deployed.",
  },
  ...(["sporebase", "myconode", "psathyrella"] as const).map((deviceId): PortfolioTopologyEdgeV1 => ({
    id: `fleet-agaric-supports-${deviceId}`, scope: "fleet",
    from: { kind: "device-family", id: "agaric" }, to: { kind: "device-family", id: deviceId },
    relation: "deployment-supports", claimEvidence: "source-document-claim", deploymentEvidence: "not-observed", authority: "portfolio-reference-only", sourceSections: ["3.2", "7"],
    note: "The source describes a deployment, retrieval, relay, or support role; no mission, payload attachment, transport, or command capability is proven.",
  })),
] as const

export const HARDWARE_PORTFOLIO_V1: HardwarePortfolioV1 = {
  schema: HARDWARE_PORTFOLIO_SCHEMA,
  version: HARDWARE_PORTFOLIO_VERSION,
  effectiveDate: HARDWARE_PORTFOLIO_EFFECTIVE_DATE,
  reviewedDate: HARDWARE_PORTFOLIO_REVIEWED_DATE,
  classification: HARDWARE_PORTFOLIO_CLASSIFICATION,
  commercialConfidentiality: HARDWARE_PORTFOLIO_COMMERCIAL_CONFIDENTIALITY,
  nationalSecurityClassification: HARDWARE_PORTFOLIO_NATIONAL_SECURITY_CLASSIFICATION,
  source: HARDWARE_PORTFOLIO_SOURCE,
  installedStateRule: "Static portfolio claims are planning defaults only. A physical device remains unobserved until exact identity and component evidence are supplied by an authoritative registry, signed BOM, photograph, or separately approved passive probe.",
  upgradeStateRule: "Optional, variant-dependent, proposed, and future claims are reviewable upgrade candidates only. They never become an installed configuration without device-specific evidence and approval.",
  devices,
  topologyEdges: PORTFOLIO_TOPOLOGY_EDGES_V1,
  systemIntegrationReferences: PORTFOLIO_SYSTEM_INTEGRATION_REFERENCES_V1,
  sensorCapabilities: PORTFOLIO_SENSOR_CAPABILITIES_V1,
  computeTopologyNodes: PORTFOLIO_COMPUTE_TOPOLOGY_NODES_V1,
  computeTopologyEdges: PORTFOLIO_COMPUTE_TOPOLOGY_EDGES_V1,
  consumerBinding: HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1,
}

export function hardwarePortfolioDevice(deviceId: string): HardwarePortfolioDeviceV1 | null {
  const id = deviceId.trim().toLowerCase()
  return HARDWARE_PORTFOLIO_V1.devices.find((device) => device.id === id) ?? null
}

export function portfolioClaimsByState(deviceId: string, state: PortfolioClaimState): readonly PortfolioComponentClaimV1[] {
  return hardwarePortfolioDevice(deviceId)?.components.filter((claim) => claim.claimState === state) ?? []
}

export function hardwarePortfolioUpgradeCandidates(deviceId: string): readonly PortfolioComponentClaimV1[] {
  const upgradeStates: ReadonlySet<PortfolioClaimState> = new Set([
    "declared-optional",
    "variant-dependent",
    "proposed",
    "future",
  ])
  return hardwarePortfolioDevice(deviceId)?.components.filter((claim) => upgradeStates.has(claim.claimState)) ?? []
}

/**
 * Build a downstream projection only from an exact canonical family id.
 * Display names, product types, capabilities, and network labels never bind a
 * physical registry record to a portfolio family.
 */
export function hardwarePortfolioConsumerView(portfolioFamilyId: string): HardwarePortfolioConsumerViewV1 | null {
  const device = HARDWARE_PORTFOLIO_V1.devices.find((candidate) => candidate.id === portfolioFamilyId)
  if (!device) return null
  return {
    schema: HARDWARE_PORTFOLIO_CONSUMER_SCHEMA,
    portfolioFamilyId,
    revision: {
      portfolioSchema: HARDWARE_PORTFOLIO_SCHEMA,
      contractVersion: HARDWARE_PORTFOLIO_VERSION,
      effectiveDate: HARDWARE_PORTFOLIO_EFFECTIVE_DATE,
      sourceSha256: HARDWARE_PORTFOLIO_SOURCE.sha256,
    },
    binding: HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1,
    device,
    sensorCapabilities: HARDWARE_PORTFOLIO_V1.sensorCapabilities.filter((claim) => claim.deviceId === portfolioFamilyId),
    computeTopologyNodes: HARDWARE_PORTFOLIO_V1.computeTopologyNodes.filter((node) => node.deviceId === portfolioFamilyId),
    computeTopologyEdges: HARDWARE_PORTFOLIO_V1.computeTopologyEdges.filter((edge) => edge.deviceId === portfolioFamilyId),
    protocolReferences: PORTFOLIO_PROTOCOL_REFERENCES_V1.filter((protocol) => device.protocolRefs.includes(protocol.id)),
  }
}

export function validateHardwarePortfolioV1(portfolio: HardwarePortfolioV1 = HARDWARE_PORTFOLIO_V1): readonly string[] {
  const issues: string[] = []
  if (portfolio.schema !== HARDWARE_PORTFOLIO_SCHEMA) issues.push("schema mismatch")
  if (portfolio.version !== HARDWARE_PORTFOLIO_VERSION) issues.push("contract version mismatch")
  if (portfolio.effectiveDate !== HARDWARE_PORTFOLIO_EFFECTIVE_DATE) issues.push("effective date mismatch")
  if (portfolio.reviewedDate !== HARDWARE_PORTFOLIO_REVIEWED_DATE) issues.push("reviewed date mismatch")
  if (portfolio.source.sha256 !== HARDWARE_PORTFOLIO_SOURCE.sha256 || portfolio.source.sourceVersion !== HARDWARE_PORTFOLIO_SOURCE.sourceVersion) issues.push("source revision mismatch")
  if (portfolio.classification !== HARDWARE_PORTFOLIO_CLASSIFICATION) issues.push("classification must remain UNCLASSIFIED")
  if (portfolio.commercialConfidentiality !== HARDWARE_PORTFOLIO_COMMERCIAL_CONFIDENTIALITY) issues.push("commercial confidentiality must remain MYCOSOFT_CONFIDENTIAL")
  if (portfolio.nationalSecurityClassification !== HARDWARE_PORTFOLIO_NATIONAL_SECURITY_CLASSIFICATION) issues.push("national-security classification must remain UNCLASSIFIED")
  const deviceIds = new Set<string>()
  const protocolIds = new Set(PORTFOLIO_PROTOCOL_REFERENCES_V1.map((protocol) => protocol.id))
  const componentRefs = new Map<string, PortfolioComponentClaimV1>()
  for (const device of portfolio.devices) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(device.id) || deviceIds.has(device.id)) issues.push(`invalid or duplicate device id: ${device.id}`)
    deviceIds.add(device.id)
    const componentIds = new Set<string>()
    for (const claim of device.components) {
      if (!claim.id || componentIds.has(claim.id)) issues.push(`${device.id}: invalid or duplicate component id ${claim.id}`)
      componentIds.add(claim.id)
      componentRefs.set(`${device.id}/${claim.id}`, claim)
      if (claim.installationEvidence !== "not-observed") issues.push(`${device.id}/${claim.id}: portfolio contract cannot claim installed hardware`)
      if (!claim.sourceSections.length) issues.push(`${device.id}/${claim.id}: missing source section`)
    }
    for (const protocolRef of device.protocolRefs) if (!protocolIds.has(protocolRef)) issues.push(`${device.id}: unknown protocol reference ${protocolRef}`)
  }

  if (portfolio.consumerBinding.schema !== HARDWARE_PORTFOLIO_CONSUMER_SCHEMA) issues.push("consumer binding schema mismatch")
  if (portfolio.consumerBinding.familyBinding.match !== "exact-canonical-id-only") issues.push("consumer family binding must remain exact-only")
  if (portfolio.consumerBinding.familyBinding.inferFromDisplayName || portfolio.consumerBinding.familyBinding.inferFromDeviceType || portfolio.consumerBinding.familyBinding.inferFromCapabilities) issues.push("consumer binding cannot infer a portfolio family")
  if (portfolio.consumerBinding.mutationAuthority !== false || portfolio.consumerBinding.authority !== "portfolio-reference-only") issues.push("consumer binding cannot grant mutation authority")

  const capabilityIds = new Set<string>()
  const knownCapabilities = new Set<string>(PORTFOLIO_SENSOR_CAPABILITY_IDS)
  const coveredSensorComponents = new Set<string>()
  for (const capability of portfolio.sensorCapabilities) {
    const componentKey = `${capability.deviceId}/${capability.componentRef}`
    const componentClaim = componentRefs.get(componentKey)
    if (!capability.id || capabilityIds.has(capability.id)) issues.push(`invalid or duplicate sensor capability: ${capability.id}`)
    capabilityIds.add(capability.id)
    if (!componentClaim || componentClaim.category !== "sensor") issues.push(`${capability.id}: unknown sensor component ${componentKey}`)
    else {
      coveredSensorComponents.add(componentKey)
      if (capability.claimState !== componentClaim.claimState) issues.push(`${capability.id}: sensor capability state disagrees with component claim`)
      if (capability.model !== componentClaim.model) issues.push(`${capability.id}: sensor capability model disagrees with component claim`)
    }
    if (!knownCapabilities.has(capability.capabilityId)) issues.push(`${capability.id}: unknown normalized sensor capability`)
    if (capability.installationEvidence !== "not-observed" || capability.adapterEvidence !== "unbound") issues.push(`${capability.id}: sensor capability cannot claim installation or adapter binding`)
    if (capability.claimEvidence !== "source-document-claim" || capability.authority !== "portfolio-reference-only") issues.push(`${capability.id}: sensor capability must remain reference-only`)
    if (!capability.sourceSections.length) issues.push(`${capability.id}: missing source section`)
  }
  for (const [componentKey, claim] of componentRefs) {
    if (claim.category === "sensor" && !coveredSensorComponents.has(componentKey)) issues.push(`${componentKey}: sensor component lacks a normalized capability`)
  }

  const computeNodeIds = new Set<string>()
  for (const node of portfolio.computeTopologyNodes) {
    const componentKey = `${node.deviceId}/${node.componentRef}`
    const componentClaim = componentRefs.get(componentKey)
    if (!node.id || computeNodeIds.has(node.id)) issues.push(`invalid or duplicate compute topology node: ${node.id}`)
    computeNodeIds.add(node.id)
    if (!componentClaim) issues.push(`${node.id}: unknown compute component ${componentKey}`)
    else if (node.claimState !== componentClaim.claimState) issues.push(`${node.id}: compute topology state disagrees with component claim`)
    if (node.installationEvidence !== "not-observed" || node.claimEvidence !== "source-document-claim" || node.authority !== "portfolio-reference-only") issues.push(`${node.id}: compute topology node cannot claim deployment`)
    if (!node.sourceSections.length) issues.push(`${node.id}: missing source section`)
  }

  const computeEdgeIds = new Set<string>()
  for (const edge of portfolio.computeTopologyEdges) {
    if (!edge.id || computeEdgeIds.has(edge.id)) issues.push(`invalid or duplicate compute topology edge: ${edge.id}`)
    computeEdgeIds.add(edge.id)
    const from = portfolio.computeTopologyNodes.find((node) => node.id === edge.fromNodeRef)
    const to = portfolio.computeTopologyNodes.find((node) => node.id === edge.toNodeRef)
    if (!from || !to) issues.push(`${edge.id}: compute topology endpoint is unknown`)
    else if (from.deviceId !== edge.deviceId || to.deviceId !== edge.deviceId) issues.push(`${edge.id}: compute topology crosses device families`)
    if (edge.interfaceComponentRef && !componentRefs.has(`${edge.deviceId}/${edge.interfaceComponentRef}`)) issues.push(`${edge.id}: unknown interface component ${edge.interfaceComponentRef}`)
    if (edge.installationEvidence !== "not-observed" || edge.claimEvidence !== "source-document-claim" || edge.authority !== "portfolio-reference-only") issues.push(`${edge.id}: compute topology edge cannot claim deployment`)
    if (!edge.sourceSections.length) issues.push(`${edge.id}: missing source section`)
  }

  const systemIntegrationIds = new Set<string>()
  for (const reference of portfolio.systemIntegrationReferences) {
    if (systemIntegrationIds.has(reference.id)) issues.push(`duplicate system/integration reference: ${reference.id}`)
    systemIntegrationIds.add(reference.id)
    if (reference.claimEvidence !== "source-document-claim" || reference.deploymentEvidence !== "not-observed") issues.push(`${reference.id}: system/integration reference cannot claim deployment`)
    if (reference.authority !== "portfolio-reference-only") issues.push(`${reference.id}: system/integration authority must remain reference-only`)
    if (!reference.sourceSections.length) issues.push(`${reference.id}: missing source section`)
    for (const deviceRef of reference.deviceRefs) if (!deviceIds.has(deviceRef)) issues.push(`${reference.id}: unknown device reference ${deviceRef}`)
  }

  const topologyIds = new Set<string>()
  const endpointExists = (endpoint: PortfolioTopologyEndpointV1) => {
    if (endpoint.kind === "device-family") return deviceIds.has(endpoint.id)
    if (endpoint.kind === "shared-sensing-stack") return endpoint.id === SHARED_BLUESIGHT_STACK_V1.id
    return endpoint.id === "dirtnet" || endpoint.id === "fleet"
  }
  for (const edge of portfolio.topologyEdges) {
    if (!edge.id || topologyIds.has(edge.id)) issues.push(`invalid or duplicate topology edge: ${edge.id}`)
    topologyIds.add(edge.id)
    if (!endpointExists(edge.from)) issues.push(`${edge.id}: unknown from endpoint ${edge.from.kind}/${edge.from.id}`)
    if (!endpointExists(edge.to)) issues.push(`${edge.id}: unknown to endpoint ${edge.to.kind}/${edge.to.id}`)
    if (edge.to.kind === "topology-domain" && edge.relation.endsWith("-for") && edge.to.id !== edge.scope) issues.push(`${edge.id}: topology scope and domain disagree`)
    if (edge.claimEvidence !== "source-document-claim" || edge.deploymentEvidence !== "not-observed") issues.push(`${edge.id}: topology edge cannot claim deployment`)
    if (edge.authority !== "portfolio-reference-only") issues.push(`${edge.id}: topology authority must remain reference-only`)
    if (!edge.sourceSections.length) issues.push(`${edge.id}: missing source section`)
  }
  return issues
}
