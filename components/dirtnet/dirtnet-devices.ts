import type { ProductMarkId } from "@/components/brand/product-icon"

/**
 * DirtNet orbit catalog — real device routes and NAS asset paths only.
 * No mock metrics. Images match devices-portal / product pages.
 */
export interface DirtNetOrbitDevice {
  id: string
  name: string
  tagline: string
  product: ProductMarkId
  href: string
  image: string
  imageAlt: string
  whatItDoes: string
  dirtNetRole: string
}

export const DIRTNET_ORBIT_DEVICES: readonly DirtNetOrbitDevice[] = [
  {
    id: "mycobrain",
    name: "MycoBrain",
    tagline: "Edge compute & MDP gateway",
    product: "mycobrain",
    href: "/devices/mycobrain",
    image: "/assets/devices/mycobrainjetson-white.jpg",
    imageAlt: "MycoBrain controller with Jetson edge module",
    whatItDoes:
      "Dual ESP32-S3 (and Jetson-class) controller that runs MDP, local sensing I/O, mesh radios, and edge inference so field nodes can sense and act without waiting on a cloud round trip.",
    dirtNetRole:
      "The network spine. Every DirtNet node speaks through MycoBrain: telemetry, commands, MycoSpeak intents, and gateway relays into Mycorrhizae, NatureOS, and MINDEX.",
  },
  {
    id: "mushroom-1",
    name: "Mushroom 1",
    tagline: "Walking ground droid",
    product: "mushroom-1",
    href: "/devices/mushroom-1",
    image: "/assets/mushroom1/Main A.jpg",
    imageAlt: "Mushroom 1 walking ground droid",
    whatItDoes:
      "Autonomous ground droid for underground fungal networks, soil conditions, and multi-depth environmental sensing with LoRa mesh backhaul.",
    dirtNetRole:
      "Mobile soil edge. Walks the mesh, samples bioelectric and environmental signals, and publishes MDP payloads into DirtNet from places fixed probes cannot reach.",
  },
  {
    id: "sporebase",
    name: "SporeBase",
    tagline: "Breathing aerosol collector",
    product: "sporebase",
    href: "/devices/sporebase",
    image: "/assets/sporebase/sporebase%20main2.jpg",
    imageAlt: "SporeBase aerosol collector",
    whatItDoes:
      "Time-indexed bioaerosol collection with sealed adhesive tape cassettes, MycoBrain control, and mesh telemetry for lab-grade environmental archives.",
    dirtNetRole:
      "Atmospheric sampling node. Turns airborne biology into chain-of-custody samples and live DirtNet telemetry for allergy, agriculture, and air intelligence.",
  },
  {
    id: "hyphae-1",
    name: "Hyphae 1",
    tagline: "Modular exterior datacenter",
    product: "hyphae-1",
    href: "/devices/hyphae-1",
    image: "/assets/hyphae1/hyphae1-lab-prototype.png",
    imageAlt: "Hyphae 1 modular I/O enclosure",
    whatItDoes:
      "Industrial IP66 modular I/O and edge compute for building automation, agriculture, and outdoor monitoring with Ethernet, LoRa, and LTE paths.",
    dirtNetRole:
      "Fixed infrastructure hub. Concentrates sensor channels, runs local inference, and anchors DirtNet mesh segments where power and weatherproofing matter.",
  },
  {
    id: "myconode",
    name: "MycoNode",
    tagline: "Buried mesh probe",
    product: "myconode",
    href: "/devices/myconode",
    image: "/assets/myconode/myconode-main.png",
    imageAlt: "MycoNode buried soil probe",
    whatItDoes:
      "Buried bioelectric and soil probes that resolve mycelial microvolt signals and publish long-life LoRa mesh observations.",
    dirtNetRole:
      "Subsurface sensing fabric. Densifies DirtNet underground so soil health and fungal network state stay continuous across a site.",
  },
  {
    id: "alarm",
    name: "ALARM",
    tagline: "Biological home alarm",
    product: "alarm",
    href: "/devices/alarm",
    image: "/assets/alarm/alarm-device.jpg",
    imageAlt: "ALARM indoor biological safety monitor",
    whatItDoes:
      "Indoor safety monitor for smoke, mold pressure, pathogens, VOCs, and air quality with mesh alerts and TinyML pattern recognition.",
    dirtNetRole:
      "Built-environment edge. Extends DirtNet indoors so biological and air threats join the same MDP and Mycorrhizae message fabric as field nodes.",
  },
  {
    id: "psathyrella",
    name: "Psathyrella",
    tagline: "Swimming sensor buoy",
    product: "psathyrella",
    href: "/devices/psathyrella",
    image: "/assets/psathyrella/hero.png",
    imageAlt: "Psathyrella aquatic sensor buoy",
    whatItDoes:
      "Aquatic buoy with passive acoustics, multimodal fusion, MycoBrain acquisition, Jetson-class NLM edge SI, and Mycorrhizae mesh backhaul.",
    dirtNetRole:
      "Waterborne DirtNet node. Carries acoustic and six-sense payloads across littoral and inland waters into NatureOS and MINDEX.",
  },
  {
    id: "agaric",
    name: "Agaric",
    tagline: "Flying Myco drone",
    product: "agaric",
    href: "/devices/agaric",
    image: "/assets/agaric/hero.jpg",
    imageAlt: "Agaric flying MycoBrain drone",
    whatItDoes:
      "Flying Mycorrhizae / MDP gateway that deploys, retrieves, and data-mules SporeBase, MycoNode, and Mushroom 1 across Mini, Standard, and Heavy-Lift variants.",
    dirtNetRole:
      "Aerial mesh extender. Relays DirtNet traffic, lifts sensors into position, and closes gaps when ground radios cannot see each other.",
  },
] as const

export interface DirtNetSystemLink {
  title: string
  description: string
  href: string
  product?: ProductMarkId
}

export const DIRTNET_SYSTEM_LINKS: readonly DirtNetSystemLink[] = [
  {
    title: "All devices",
    description: "Full Mycosoft device portfolio and product pages.",
    href: "/devices",
  },
  {
    title: "MycoBrain",
    description: "Controllers, MDP, Jetson edge, and integration paths.",
    href: "/devices/mycobrain",
    product: "mycobrain",
  },
  {
    title: "Mycorrhizae Protocol",
    description: "Mesh-native environmental messaging schema and API.",
    href: "/protocols/mycorrhizae",
  },
  {
    title: "NatureOS",
    description: "Operate fleets, labs, and environmental intelligence.",
    href: "/natureos",
    product: "natureos",
  },
  {
    title: "Earth Simulator",
    description: "Planetary spatial context for device positions and layers.",
    href: "/natureos/earth-simulator",
    product: "earth-simulator",
  },
  {
    title: "MINDEX via NatureOS",
    description: "Evidence, search, and species context fed by field data.",
    href: "/natureos/mindex",
  },
  {
    title: "Mushroom 1",
    description: "Walking ground droid for soil and fungal networks.",
    href: "/devices/mushroom-1",
    product: "mushroom-1",
  },
  {
    title: "SporeBase",
    description: "Time-indexed bioaerosol collection nodes.",
    href: "/devices/sporebase",
    product: "sporebase",
  },
  {
    title: "Hyphae 1",
    description: "Weatherproof modular I/O and edge hubs.",
    href: "/devices/hyphae-1",
    product: "hyphae-1",
  },
  {
    title: "MycoNode",
    description: "Buried bioelectric and soil mesh probes.",
    href: "/devices/myconode",
    product: "myconode",
  },
  {
    title: "ALARM",
    description: "Indoor biological and air-quality edge alarms.",
    href: "/devices/alarm",
    product: "alarm",
  },
  {
    title: "Psathyrella",
    description: "Aquatic sensing buoys on the DirtNet mesh.",
    href: "/devices/psathyrella",
    product: "psathyrella",
  },
  {
    title: "Agaric",
    description: "Flying MDP gateway and sensor lift drone.",
    href: "/devices/agaric",
    product: "agaric",
  },
] as const
