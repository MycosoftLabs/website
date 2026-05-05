/**
 * Maps raw UniFi Controller payloads to the shape expected by
 * `app/security/network/page.tsx` (real data only — no mock fallbacks).
 * @date May 03, 2026
 */

export interface WANStatus {
  ip: string;
  isp: string;
  download_speed_mbps: number;
  upload_speed_mbps: number;
  latency_ms: number;
  availability: number;
  status: string;
}

export interface LANStatus {
  status: string;
  num_user: number;
  num_guest: number;
  tx_bytes_rate: number;
  rx_bytes_rate: number;
}

export interface WifiStatus {
  status: string;
  num_ap: number;
  num_user: number;
  num_guest: number;
  tx_bytes_rate: number;
  rx_bytes_rate: number;
}

export interface Device {
  name: string;
  model: string;
  mac: string;
  ip: string;
  type: string;
  state: string;
  uptime: number;
  version: string;
  cpu?: number;
  mem?: number;
}

export interface Client {
  name: string;
  mac: string;
  ip: string;
  tx_bytes: number;
  rx_bytes: number;
  is_wired: boolean;
  signal?: number;
  satisfaction?: number;
}

export interface TrafficCategory {
  name: string;
  tx_bytes: number;
  rx_bytes: number;
  total_bytes: number;
  tx_formatted: string;
  rx_formatted: string;
  total_formatted: string;
}

export interface Alarm {
  id: string;
  type: string;
  message: string;
  time: string;
  subsystem: string;
}

export interface WifiNetwork {
  name: string;
  enabled: boolean;
  security: string;
  is_guest: boolean;
  num_sta: number;
}

/** Live throughput from UniFi `/stat/sta` byte rates (Mbps). */
export interface ThroughputPayload {
  timestamp: string;
  lan: { tx_mbps: number; rx_mbps: number };
  wan: { tx_mbps: number; rx_mbps: number };
  source?: string;
}

export interface DashboardData {
  timestamp: string;
  wan: WANStatus | null;
  lan: LANStatus | null;
  wifi: WifiStatus | null;
  devices: {
    total: number;
    online: number;
    offline: number;
    list: Device[];
  };
  clients: {
    total: number;
    wired: number;
    wireless: number;
    guests: number;
    top: Client[];
  };
  traffic: {
    total_tx_bytes: number;
    total_rx_bytes: number;
    top_apps: TrafficCategory[];
  };
  alarms: {
    total: number;
    active: number;
    list: Alarm[];
  };
  wifi_networks: WifiNetwork[];
}

function formatBytesShort(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function subsystemRow(health: Record<string, unknown>[], name: string): Record<string, unknown> {
  const row = health.find((h) => String(h.subsystem) === name);
  return (row || {}) as Record<string, unknown>;
}

export function mapUnifiToNetworkDashboard(input: {
  health: Record<string, unknown>[];
  devices: Record<string, unknown>[];
  clients: Record<string, unknown>[];
  alarms: Record<string, unknown>[];
  wlans: Record<string, unknown>[];
  dpi?: Record<string, unknown>[];
}): DashboardData {
  const { health, devices, clients, alarms, wlans, dpi } = input;
  const wanH = subsystemRow(health, "wan");
  const lanH = subsystemRow(health, "lan");
  const wifiH = subsystemRow(health, "wifi");

  const wan: WANStatus | null = {
    ip: String(wanH["ip"] || wanH["gw_name"] || "0.0.0.0"),
    isp: String(wanH["isp_name"] || wanH["name"] || "—"),
    download_speed_mbps: Number(wanH["speedtest-download"] || wanH["rx_bytes-r"] || 0) / 1e6 || 0,
    upload_speed_mbps: Number(wanH["speedtest-upload"] || wanH["tx_bytes-r"] || 0) / 1e6 || 0,
    latency_ms: Number(wanH["latency"] || wanH["speedtest-latency"] || 0),
    availability: wanH["status"] === "ok" ? 100 : wanH["status"] === "warning" ? 95 : 90,
    status: String(wanH["status"] || "unknown"),
  };

  const lan: LANStatus | null = {
    status: String(lanH["status"] || "unknown"),
    num_user: Number(lanH["num_user"] || 0),
    num_guest: Number(lanH["num_guest"] || 0),
    tx_bytes_rate: Number(lanH["tx_bytes-r"] || 0),
    rx_bytes_rate: Number(lanH["rx_bytes-r"] || 0),
  };

  const wifi: WifiStatus | null = {
    status: String(wifiH["status"] || "unknown"),
    num_ap: Number(wifiH["num_ap"] || 0),
    num_user: Number(wifiH["num_user"] || 0),
    num_guest: Number(wifiH["num_guest"] || 0),
    tx_bytes_rate: Number(wifiH["tx_bytes-r"] || 0),
    rx_bytes_rate: Number(wifiH["rx_bytes-r"] || 0),
  };

  const devList: Device[] = (devices || []).map((d) => {
    const st = d["system-stats"] as Record<string, unknown> | undefined;
    return {
      name: String(d.name || d.hostname || d.mac || "device"),
      model: String(d.model || d.type || "unknown"),
      mac: String(d.mac || ""),
      ip: String(d.ip || ""),
      type: String(d.type || "unknown"),
      state: Number(d.state) === 1 ? "online" : "offline",
      uptime: Number(d.uptime || 0),
      version: String(d.version || ""),
      cpu: st?.cpu !== undefined ? Number(st.cpu) : undefined,
      mem: st?.mem !== undefined ? Number(st.mem) : undefined,
    };
  });

  let wired = 0;
  let wireless = 0;
  let guests = 0;

  const mappedClients: Client[] = (clients || []).map((c) => {
    if (c.is_guest) guests += 1;
    if (c.is_wired) wired += 1;
    else wireless += 1;
    return {
      name: String(c.hostname || c.name || c.mac || "client"),
      mac: String(c.mac || ""),
      ip: String(c.ip || ""),
      tx_bytes: Number(c.tx_bytes || 0),
      rx_bytes: Number(c.rx_bytes || 0),
      is_wired: Boolean(c.is_wired),
      signal: c.signal !== undefined ? Number(c.signal) : undefined,
      satisfaction:
        c.satisfaction !== undefined && c.satisfaction !== null
          ? Math.round(Number(c.satisfaction))
          : undefined,
    };
  });

  const top = [...mappedClients]
    .sort((a, b) => b.tx_bytes + b.rx_bytes - (a.tx_bytes + a.rx_bytes))
    .slice(0, 40);

  let totalTx = 0;
  let totalRx = 0;
  for (const c of mappedClients) {
    totalTx += c.tx_bytes;
    totalRx += c.rx_bytes;
  }

  const topApps: TrafficCategory[] = [];
  if (dpi && dpi.length) {
    for (const row of dpi.slice(0, 24)) {
      const tx = Number(row.tx_bytes || 0);
      const rx = Number(row.rx_bytes || 0);
      const total = tx + rx;
      topApps.push({
        name: String(row.name || row.cat_id || row.type || "category"),
        tx_bytes: tx,
        rx_bytes: rx,
        total_bytes: total,
        tx_formatted: formatBytesShort(tx),
        rx_formatted: formatBytesShort(rx),
        total_formatted: formatBytesShort(total),
      });
    }
  }

  const rawAlarms = (alarms || []).slice(0, 50);
  const alarmList: Alarm[] = rawAlarms.map((a, idx) => ({
    id: String(a._id || a.id || `alarm-${idx}`),
    type: String(a.type || a.key || "alarm"),
    message: String(a.msg || a.message || a.appr || "UniFi alarm"),
    time: String(a.datetime || a.time || new Date().toISOString()),
    subsystem: String(a.subsystem || "network"),
  }));

  const activeAlarms = rawAlarms.filter((a) => !a.archived).length;

  const wifiNetworks: WifiNetwork[] = (wlans || []).map((w) => ({
    name: String(w.name || "wlan"),
    enabled: w.enabled !== false,
    security: String(w.security || w.wpa_mode || "unknown"),
    is_guest: Boolean(w.is_guest),
    num_sta: Number(w.num_sta || 0),
  }));

  const onlineDev = devList.filter((d) => d.state === "online").length;

  return {
    timestamp: new Date().toISOString(),
    wan,
    lan,
    wifi,
    devices: {
      total: devList.length,
      online: onlineDev,
      offline: Math.max(0, devList.length - onlineDev),
      list: devList,
    },
    clients: {
      total: mappedClients.length,
      wired,
      wireless,
      guests,
      top,
    },
    traffic: {
      total_tx_bytes: totalTx,
      total_rx_bytes: totalRx,
      top_apps: topApps,
    },
    alarms: {
      total: alarmList.length,
      active: activeAlarms || alarmList.length,
      list: alarmList,
    },
    wifi_networks: wifiNetworks,
  };
}
