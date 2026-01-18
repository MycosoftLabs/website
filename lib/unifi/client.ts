/**
 * UniFi API Client
 * 
 * Comprehensive client for UniFi Dream Machine Pro integration
 * Supports devices, clients, traffic, topology, and real-time monitoring
 */

interface UniFiDevice {
  _id: string;
  mac: string;
  name: string;
  model: string;
  type: string;
  state: number; // 1 = online
  adopted: boolean;
  ip: string;
  version: string;
  uptime: number;
  last_seen: number;
  system_stats?: {
    cpu: number;
    mem: number;
    loadavg_1: number;
    loadavg_5: number;
    loadavg_15: number;
  };
  uplink?: {
    type: string;
    tx_bytes: number;
    rx_bytes: number;
    tx_packets: number;
    rx_packets: number;
  };
  port_table?: UniFiPort[];
  radio_table?: UniFiRadio[];
}

interface UniFiPort {
  port_idx: number;
  name: string;
  enable: boolean;
  up: boolean;
  speed: number;
  full_duplex: boolean;
  tx_bytes: number;
  rx_bytes: number;
  tx_packets: number;
  rx_packets: number;
  tx_errors: number;
  rx_errors: number;
}

interface UniFiRadio {
  name: string;
  radio: string;
  channel: number;
  ht: string;
  tx_power: number;
  num_sta: number;
  satisfaction: number;
}

interface UniFiClient {
  _id: string;
  mac: string;
  hostname?: string;
  name?: string;
  ip: string;
  oui: string;
  is_wired: boolean;
  is_guest: boolean;
  network: string;
  network_id: string;
  first_seen: number;
  last_seen: number;
  uptime: number;
  tx_bytes: number;
  rx_bytes: number;
  tx_packets: number;
  rx_packets: number;
  tx_rate: number;
  rx_rate: number;
  signal?: number;
  rssi?: number;
  noise?: number;
  satisfaction?: number;
  ap_mac?: string;
  essid?: string;
  channel?: number;
  radio?: string;
  vlan?: number;
  authorized: boolean;
  blocked: boolean;
  dev_cat?: number;
  dev_family?: number;
  dev_vendor?: number;
  os_name?: string;
  dev_id?: number;
  qos_policy_applied: boolean;
}

interface UniFiHealth {
  subsystem: string;
  status: string;
  num_adopted: number;
  num_user: number;
  num_guest: number;
  num_iot: number;
  tx_bytes_r: number;
  rx_bytes_r: number;
  num_ap: number;
  num_sw: number;
  num_gw: number;
  num_disabled: number;
  num_disconnected: number;
  num_pending: number;
  lan_ip: string;
  gw_mac: string;
  wan_ip: string;
  isp_name: string;
  isp_organization: string;
  uptime_stats?: {
    WAN: { availability: number; latency_average: number };
    LAN: { availability: number };
  };
  speedtest_status: string;
  speedtest_lastrun: number;
  speedtest_ping: number;
  xput_down: number;
  xput_up: number;
}

interface UniFiWifiNetwork {
  _id: string;
  name: string;
  enabled: boolean;
  security: string;
  wpa_mode: string;
  is_guest: boolean;
  vlan?: number;
  num_sta: number;
  tx_bytes: number;
  rx_bytes: number;
}

interface UniFiTrafficStat {
  type: string;
  client_mac?: string;
  app_id?: number;
  app_name?: string;
  category_id?: number;
  category_name?: string;
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
}

interface UniFiAlarm {
  _id: string;
  key: string;
  datetime: string;
  msg: string;
  time: number;
  archived: boolean;
  subsystem: string;
  ap?: string;
  sw?: string;
  gw?: string;
  site_id: string;
}

interface UniFiDPICategory {
  cat: number;
  name: string;
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
}

interface UniFiDPIApp {
  app: number;
  cat: number;
  name: string;
  rx_bytes: number;
  tx_bytes: number;
}

interface UniFiRouteInfo {
  interface: string;
  gateway: string;
  destination: string;
  metric: number;
  type: string;
}

interface UniFiFirewallGroup {
  _id: string;
  name: string;
  group_type: string;
  group_members: string[];
  site_id: string;
}

interface UniFiPortForward {
  _id: string;
  name: string;
  enabled: boolean;
  pfwd_interface: string;
  src: string;
  dst_port: string;
  fwd: string;
  fwd_port: string;
  proto: string;
}

interface UniFiApiResponse<T> {
  meta: {
    rc: string;
    msg?: string;
  };
  data: T[];
}

export class UniFiApiClient {
  private baseUrl: string;
  private apiKey: string;
  private site: string;

  constructor(host?: string, apiKey?: string, site: string = 'default') {
    this.baseUrl = `https://${host || process.env.UNIFI_HOST || '192.168.0.1'}`;
    this.apiKey = apiKey || process.env.UNIFI_API_KEY || '';
    this.site = site;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T[]> {
    const url = `${this.baseUrl}/proxy/network/api/s/${this.site}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        // @ts-ignore - Node.js fetch option
        rejectUnauthorized: false,
      });

      if (!response.ok) {
        throw new Error(`UniFi API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as UniFiApiResponse<T>;
      
      if (data.meta?.rc !== 'ok') {
        throw new Error(`UniFi API error: ${data.meta?.msg || 'Unknown error'}`);
      }

      return data.data || [];
    } catch (error) {
      console.error(`UniFi API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  private async requestRaw<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        // @ts-ignore
        rejectUnauthorized: false,
      });

      if (!response.ok) {
        throw new Error(`UniFi API error: ${response.status}`);
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`UniFi API raw request failed:`, error);
      throw error;
    }
  }

  // ===== Device Operations =====

  async getDevices(): Promise<UniFiDevice[]> {
    return this.request<UniFiDevice>('/stat/device');
  }

  async getDevice(mac: string): Promise<UniFiDevice | null> {
    const devices = await this.request<UniFiDevice>(`/stat/device/${mac}`);
    return devices[0] || null;
  }

  async getDeviceBasic(): Promise<UniFiDevice[]> {
    return this.request<UniFiDevice>('/stat/device-basic');
  }

  // ===== Client Operations =====

  async getActiveClients(): Promise<UniFiClient[]> {
    return this.request<UniFiClient>('/stat/sta');
  }

  async getAllClients(): Promise<UniFiClient[]> {
    return this.request<UniFiClient>('/rest/user');
  }

  async getClient(mac: string): Promise<UniFiClient | null> {
    const clients = await this.request<UniFiClient>(`/stat/sta/${mac}`);
    return clients[0] || null;
  }

  async getClientHistory(mac: string, hours: number = 24): Promise<any[]> {
    const end = Math.floor(Date.now() / 1000);
    const start = end - (hours * 3600);
    return this.request(`/stat/report/hourly.user?start=${start}&end=${end}&macs=${mac}`);
  }

  async blockClient(mac: string): Promise<boolean> {
    try {
      await this.request('/cmd/stamgr', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'block-sta', mac }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async unblockClient(mac: string): Promise<boolean> {
    try {
      await this.request('/cmd/stamgr', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'unblock-sta', mac }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async kickClient(mac: string): Promise<boolean> {
    try {
      await this.request('/cmd/stamgr', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'kick-sta', mac }),
      });
      return true;
    } catch {
      return false;
    }
  }

  // ===== Health & Status =====

  async getHealth(): Promise<UniFiHealth[]> {
    return this.request<UniFiHealth>('/stat/health');
  }

  async getSiteSettings(): Promise<any[]> {
    return this.request('/rest/setting');
  }

  async getSysinfo(): Promise<any[]> {
    return this.request('/stat/sysinfo');
  }

  // ===== Network Configuration =====

  async getNetworks(): Promise<any[]> {
    return this.request('/rest/networkconf');
  }

  async getWifiNetworks(): Promise<UniFiWifiNetwork[]> {
    return this.request<UniFiWifiNetwork>('/rest/wlanconf');
  }

  async getPortProfiles(): Promise<any[]> {
    return this.request('/rest/portconf');
  }

  // ===== Traffic & DPI =====

  async getDPIStats(): Promise<UniFiDPICategory[]> {
    return this.request<UniFiDPICategory>('/stat/dpi');
  }

  async getDPIAppStats(): Promise<UniFiDPIApp[]> {
    return this.request<UniFiDPIApp>('/stat/sitedpi');
  }

  async getTopClients(hours: number = 24): Promise<any[]> {
    const end = Math.floor(Date.now() / 1000);
    const start = end - (hours * 3600);
    return this.request(`/stat/report/hourly.site?start=${start}&end=${end}&attrs=wlan-num_sta,lan-num_sta,num_sta,tx_bytes,rx_bytes`);
  }

  async getHourlyStats(hours: number = 24): Promise<any[]> {
    const end = Math.floor(Date.now() / 1000);
    const start = end - (hours * 3600);
    return this.request(`/stat/report/hourly.site?start=${start}&end=${end}`);
  }

  async getDailyStats(days: number = 7): Promise<any[]> {
    const end = Math.floor(Date.now() / 1000);
    const start = end - (days * 86400);
    return this.request(`/stat/report/daily.site?start=${start}&end=${end}`);
  }

  // ===== Alarms & Events =====

  async getAlarms(): Promise<UniFiAlarm[]> {
    return this.request<UniFiAlarm>('/stat/alarm');
  }

  async getEvents(limit: number = 50): Promise<any[]> {
    return this.request(`/stat/event?_limit=${limit}&_sort=-time`);
  }

  async archiveAlarm(alarmId: string): Promise<boolean> {
    try {
      await this.request('/cmd/evtmgr', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'archive-alarm', _id: alarmId }),
      });
      return true;
    } catch {
      return false;
    }
  }

  // ===== Routing & Firewall =====

  async getRoutes(): Promise<UniFiRouteInfo[]> {
    return this.request<UniFiRouteInfo>('/stat/routing');
  }

  async getFirewallGroups(): Promise<UniFiFirewallGroup[]> {
    return this.request<UniFiFirewallGroup>('/rest/firewallgroup');
  }

  async getFirewallRules(): Promise<any[]> {
    return this.request('/rest/firewallrule');
  }

  async getPortForwards(): Promise<UniFiPortForward[]> {
    return this.request<UniFiPortForward>('/rest/portforward');
  }

  // ===== WAN & Internet =====

  async getWANStatus(): Promise<any> {
    const health = await this.getHealth();
    const wan = health.find(h => h.subsystem === 'wan');
    return wan;
  }

  async runSpeedtest(): Promise<boolean> {
    try {
      await this.request('/cmd/devmgr', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'speedtest' }),
      });
      return true;
    } catch {
      return false;
    }
  }

  // ===== Topology =====

  async getTopology(): Promise<{
    devices: UniFiDevice[];
    clients: UniFiClient[];
    networks: any[];
    connections: Array<{ from: string; to: string; type: string }>;
  }> {
    const [devices, clients, networks] = await Promise.all([
      this.getDevices(),
      this.getActiveClients(),
      this.getNetworks(),
    ]);

    // Build connections map
    const connections: Array<{ from: string; to: string; type: string }> = [];

    // Device uplinks
    for (const device of devices) {
      if (device.uplink) {
        connections.push({
          from: device.mac,
          to: 'gateway',
          type: device.uplink.type,
        });
      }
    }

    // Client connections
    for (const client of clients) {
      if (client.ap_mac) {
        connections.push({
          from: client.mac,
          to: client.ap_mac,
          type: 'wifi',
        });
      } else if (client.is_wired) {
        connections.push({
          from: client.mac,
          to: 'switch',
          type: 'wired',
        });
      }
    }

    return { devices, clients, networks, connections };
  }

  // ===== Aggregated Dashboard Data =====

  async getDashboardData(): Promise<{
    health: UniFiHealth[];
    devices: {
      total: number;
      online: number;
      offline: number;
      items: UniFiDevice[];
    };
    clients: {
      total: number;
      wired: number;
      wireless: number;
      guests: number;
      items: UniFiClient[];
    };
    wan: {
      ip: string;
      isp: string;
      downloadSpeed: number;
      uploadSpeed: number;
      latency: number;
      uptime: number;
    } | null;
    traffic: {
      totalTx: number;
      totalRx: number;
      topApps: UniFiDPIApp[];
      topCategories: UniFiDPICategory[];
    };
    alarms: UniFiAlarm[];
    wifiNetworks: UniFiWifiNetwork[];
  }> {
    const [health, devices, clients, dpiApps, dpiCategories, alarms, wifiNetworks] = await Promise.all([
      this.getHealth(),
      this.getDevices(),
      this.getActiveClients(),
      this.getDPIAppStats().catch(() => []),
      this.getDPIStats().catch(() => []),
      this.getAlarms().catch(() => []),
      this.getWifiNetworks().catch(() => []),
    ]);

    const wanHealth = health.find(h => h.subsystem === 'wan');
    const lanHealth = health.find(h => h.subsystem === 'lan');

    const onlineDevices = devices.filter(d => d.state === 1);
    const wiredClients = clients.filter(c => c.is_wired);
    const wirelessClients = clients.filter(c => !c.is_wired);
    const guestClients = clients.filter(c => c.is_guest);

    // Calculate total traffic
    let totalTx = 0;
    let totalRx = 0;
    for (const client of clients) {
      totalTx += client.tx_bytes || 0;
      totalRx += client.rx_bytes || 0;
    }

    return {
      health,
      devices: {
        total: devices.length,
        online: onlineDevices.length,
        offline: devices.length - onlineDevices.length,
        items: devices,
      },
      clients: {
        total: clients.length,
        wired: wiredClients.length,
        wireless: wirelessClients.length,
        guests: guestClients.length,
        items: clients,
      },
      wan: wanHealth ? {
        ip: wanHealth.wan_ip,
        isp: wanHealth.isp_name || wanHealth.isp_organization || 'Unknown',
        downloadSpeed: wanHealth.xput_down || 0,
        uploadSpeed: wanHealth.xput_up || 0,
        latency: wanHealth.speedtest_ping || 0,
        uptime: wanHealth.uptime_stats?.WAN?.availability || 100,
      } : null,
      traffic: {
        totalTx,
        totalRx,
        topApps: dpiApps.slice(0, 10),
        topCategories: dpiCategories.slice(0, 10),
      },
      alarms: alarms.filter(a => !a.archived).slice(0, 20),
      wifiNetworks,
    };
  }

  // ===== Real-time Throughput =====

  async getRealTimeThroughput(): Promise<{
    timestamp: number;
    tx_bytes_r: number;
    rx_bytes_r: number;
    tx_rate_mbps: number;
    rx_rate_mbps: number;
  }> {
    const health = await this.getHealth();
    const lanHealth = health.find(h => h.subsystem === 'lan');

    return {
      timestamp: Date.now(),
      tx_bytes_r: lanHealth?.tx_bytes_r || 0,
      rx_bytes_r: lanHealth?.rx_bytes_r || 0,
      tx_rate_mbps: (lanHealth?.tx_bytes_r || 0) * 8 / 1_000_000,
      rx_rate_mbps: (lanHealth?.rx_bytes_r || 0) * 8 / 1_000_000,
    };
  }

  // ===== Security-specific =====

  async getBlockedClients(): Promise<UniFiClient[]> {
    const clients = await this.getAllClients();
    return clients.filter(c => c.blocked);
  }

  async getRogueAPs(): Promise<any[]> {
    return this.request('/stat/rogueap');
  }

  async getKnownClients(): Promise<UniFiClient[]> {
    return this.request<UniFiClient>('/stat/alluser');
  }

  async getUnauthorizedClients(): Promise<UniFiClient[]> {
    const clients = await this.getActiveClients();
    return clients.filter(c => !c.authorized);
  }
}

// Export singleton instance
export const unifiClient = new UniFiApiClient();

// Export types
export type {
  UniFiDevice,
  UniFiClient,
  UniFiHealth,
  UniFiWifiNetwork,
  UniFiTrafficStat,
  UniFiAlarm,
  UniFiDPICategory,
  UniFiDPIApp,
  UniFiRouteInfo,
  UniFiFirewallGroup,
  UniFiPortForward,
};
