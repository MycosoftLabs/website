export interface Device {
  id: string
  name: string
  type: "mushroom1" | "sporebase" | "trufflebot"
  status: "active" | "inactive" | "maintenance"
  lastPing: string
  location: {
    lat: number
    lng: number
  }
}
