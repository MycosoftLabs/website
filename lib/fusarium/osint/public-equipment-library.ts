export const OSINT_EQUIPMENT_SCHEMA = "mycosoft.fusarium.osint-equipment.v1" as const

export interface OsintEquipmentCard {
  id: string
  name: string
  class: string
  manufacturer: string
  publicPayload: string
  source: string
  onHandUnlessRegistrySaysSo: false
  classifiedSpecs: "NOT_SUPPLIED"
}

/** Public encyclopedia / manufacturer-marketing class cards. Not inventory. */
export const PUBLIC_OSINT_EQUIPMENT: readonly OsintEquipmentCard[] = [
  {
    id: "dji-matrice-350-rtk",
    name: "DJI Matrice 350 RTK",
    class: "Commercial multirotor UAS",
    manufacturer: "SZ DJI Technology Co., Ltd.",
    publicPayload: "Public marketing: RTK GNSS, dual batteries, interchangeable payload gimbal. Endurance / classified payload: NOT_SUPPLIED.",
    source: "Public DJI product pages / Wikipedia commercial UAS class",
    onHandUnlessRegistrySaysSo: false,
    classifiedSpecs: "NOT_SUPPLIED",
  },
  {
    id: "dji-mavic-3-enterprise",
    name: "DJI Mavic 3 Enterprise",
    class: "Small commercial UAS",
    manufacturer: "SZ DJI Technology Co., Ltd.",
    publicPayload: "Public marketing: wide/tele cameras, optional RTK module. Military fit: NOT_SUPPLIED.",
    source: "Public DJI Enterprise product pages",
    onHandUnlessRegistrySaysSo: false,
    classifiedSpecs: "NOT_SUPPLIED",
  },
  {
    id: "generic-ais-class-a",
    name: "AIS Class A transponder (generic)",
    class: "Maritime cooperative tracking",
    manufacturer: "Various (IEC 61993-2 class)",
    publicPayload: "Public ITU / IMO cooperative vessel identity and position reports. Specific hull inventory: NOT_SUPPLIED.",
    source: "Public ITU/IMO AIS class descriptions",
    onHandUnlessRegistrySaysSo: false,
    classifiedSpecs: "NOT_SUPPLIED",
  },
  {
    id: "adsb-1090es",
    name: "1090ES ADS-B (generic)",
    class: "Cooperative aviation surveillance",
    manufacturer: "Various",
    publicPayload: "Public ICAO ADS-B Out identity/position on 1090 MHz. Platform tail numbers are only those collectors already return.",
    source: "Public ICAO ADS-B / OpenSky documentation",
    onHandUnlessRegistrySaysSo: false,
    classifiedSpecs: "NOT_SUPPLIED",
  },
]
