/**
 * UniFi Network API
 * 
 * Provides real-time network data from UniFi Dream Machine Pro
 * including devices, clients, traffic, topology, and security monitoring
 */

import { NextRequest, NextResponse } from 'next/server';

// Disable SSL verification for self-signed certs (UniFi uses self-signed)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// UniFi API configuration
const UNIFI_HOST = process.env.UNIFI_HOST || '192.168.0.1';
const UNIFI_API_KEY = process.env.UNIFI_API_KEY || '';
const UNIFI_SITE = process.env.UNIFI_SITE || 'default';

// Use mock data if API key not configured
const USE_MOCK_DATA = !UNIFI_API_KEY;

interface UniFiApiResponse<T> {
  meta: { rc: string; msg?: string };
  data: T[];
}

// Fetch helper for UniFi API
async function unifiRequest<T>(endpoint: string): Promise<T[]> {
  if (USE_MOCK_DATA) {
    console.log('UniFi API key not configured, using mock data');
    return [];
  }

  const url = `https://${UNIFI_HOST}/proxy/network/api/s/${UNIFI_SITE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': UNIFI_API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`UniFi API error: ${response.status} for ${endpoint}`);
      return [];
    }

    const data = await response.json() as UniFiApiResponse<T>;
    return data.data || [];
  } catch (error) {
    console.error('UniFi API request failed:', error);
    return [];
  }
}

async function unifiPost<T>(endpoint: string, body: object): Promise<T[]> {
  if (USE_MOCK_DATA) {
    console.log('UniFi API key not configured, skipping POST');
    return [];
  }

  const url = `https://${UNIFI_HOST}/proxy/network/api/s/${UNIFI_SITE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': UNIFI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`UniFi API POST error: ${response.status}`);
      return [];
    }

    const data = await response.json() as UniFiApiResponse<T>;
    return data.data || [];
  } catch (error) {
    console.error('UniFi API POST failed:', error);
    return [];
  }
}

// ===== API Route Handler =====

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'dashboard';

  // Mock data is available even without API key (for development)
  try {
    switch (action) {
      case 'dashboard':
        return NextResponse.json(await getDashboardData());

      case 'devices':
        return NextResponse.json(await getDevices());

      case 'clients':
        return NextResponse.json(await getClients());

      case 'topology':
        return NextResponse.json(await getTopology());

      case 'traffic':
        return NextResponse.json(await getTrafficStats());

      case 'throughput':
        return NextResponse.json(await getRealTimeThroughput());

      case 'health':
        return NextResponse.json(await getHealth());

      case 'wan':
        return NextResponse.json(await getWANStatus());

      case 'wifi':
        return NextResponse.json(await getWifiNetworks());

      case 'alarms':
        return NextResponse.json(await getAlarms());

      case 'events':
        const limit = parseInt(searchParams.get('limit') || '50');
        return NextResponse.json(await getEvents(limit));

      case 'dpi':
        return NextResponse.json(await getDPIStats());

      case 'firewall':
        return NextResponse.json(await getFirewallRules());

      case 'routes':
        return NextResponse.json(await getRoutes());

      case 'port-forwards':
        return NextResponse.json(await getPortForwards());

      case 'rogue-aps':
        return NextResponse.json(await getRogueAPs());

      case 'blocked':
        return NextResponse.json(await getBlockedClients());

      case 'client':
        const mac = searchParams.get('mac');
        if (!mac) {
          return NextResponse.json({ error: 'MAC address required' }, { status: 400 });
        }
        return NextResponse.json(await getClientDetails(mac));

      case 'sites':
        return NextResponse.json(await getSites());

      case 'site-stats':
        return NextResponse.json(await getSiteStats());

      case 'active-clients':
        return NextResponse.json(await getActiveClients());

      case 'bandwidth':
        return NextResponse.json(await getBandwidthStats());

      case 'app-traffic':
        return NextResponse.json(await getAppTraffic());

      case 'hourly-stats':
        const hours = parseInt(searchParams.get('hours') || '24');
        return NextResponse.json(await getHourlyStats(hours));

      case 'daily-stats':
        const days = parseInt(searchParams.get('days') || '7');
        return NextResponse.json(await getDailyStats(days));

      case 'vpn-users':
        return NextResponse.json(await getVPNUsers());

      case 'dhcp-leases':
        return NextResponse.json(await getDHCPLeases());

      case 'speed-test':
        return NextResponse.json(await getSpeedTestResults());

      case 'port-stats':
        return NextResponse.json(await getPortStats());

      case 'ips-events':
        return NextResponse.json(await getIPSEvents());

      case 'threats':
        return NextResponse.json(await getThreatManagement());

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('UniFi API error:', error);
    return NextResponse.json({ error: 'Failed to fetch UniFi data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, mac, reason } = body;

  // POST actions require API key (no mock data for mutations)
  if (!UNIFI_API_KEY || USE_MOCK_DATA) {
    return NextResponse.json({ 
      success: false, 
      message: 'Mock mode - action simulated',
      mock_data: true 
    });
  }

  try {
    switch (action) {
      case 'block-client':
        if (!mac) {
          return NextResponse.json({ error: 'MAC address required' }, { status: 400 });
        }
        await unifiPost('/cmd/stamgr', { cmd: 'block-sta', mac });
        return NextResponse.json({ success: true, message: `Client ${mac} blocked` });

      case 'unblock-client':
        if (!mac) {
          return NextResponse.json({ error: 'MAC address required' }, { status: 400 });
        }
        await unifiPost('/cmd/stamgr', { cmd: 'unblock-sta', mac });
        return NextResponse.json({ success: true, message: `Client ${mac} unblocked` });

      case 'kick-client':
        if (!mac) {
          return NextResponse.json({ error: 'MAC address required' }, { status: 400 });
        }
        await unifiPost('/cmd/stamgr', { cmd: 'kick-sta', mac });
        return NextResponse.json({ success: true, message: `Client ${mac} disconnected` });

      case 'speedtest':
        await unifiPost('/cmd/devmgr', { cmd: 'speedtest' });
        return NextResponse.json({ success: true, message: 'Speed test initiated' });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('UniFi API POST error:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}

// ===== Data Fetching Functions =====

async function getDashboardData() {
  // Return mock data if API key not configured
  if (USE_MOCK_DATA) {
    return getMockDashboardData();
  }

  const [health, devices, clients, dpi, alarms, wifiNetworks] = await Promise.all([
    unifiRequest<any>('/stat/health'),
    unifiRequest<any>('/stat/device'),
    unifiRequest<any>('/stat/sta'),
    unifiRequest<any>('/stat/dpi').catch(() => []),
    unifiRequest<any>('/stat/alarm').catch(() => []),
    unifiRequest<any>('/rest/wlanconf').catch(() => []),
  ]);

  const wanHealth = health.find((h: any) => h.subsystem === 'wan');
  const lanHealth = health.find((h: any) => h.subsystem === 'lan');
  const wlanHealth = health.find((h: any) => h.subsystem === 'wlan');

  // Calculate totals
  const onlineDevices = devices.filter((d: any) => d.state === 1);
  const wiredClients = clients.filter((c: any) => c.is_wired);
  const wirelessClients = clients.filter((c: any) => !c.is_wired);
  const guestClients = clients.filter((c: any) => c.is_guest);

  // Traffic totals
  let totalTx = 0;
  let totalRx = 0;
  for (const client of clients) {
    totalTx += client.tx_bytes || 0;
    totalRx += client.rx_bytes || 0;
  }

  // Top clients by traffic
  const topClients = [...clients]
    .sort((a: any, b: any) => (b.tx_bytes + b.rx_bytes) - (a.tx_bytes + a.rx_bytes))
    .slice(0, 10)
    .map((c: any) => ({
      name: c.hostname || c.name || c.mac,
      mac: c.mac,
      ip: c.ip,
      tx_bytes: c.tx_bytes,
      rx_bytes: c.rx_bytes,
      is_wired: c.is_wired,
      signal: c.signal,
      satisfaction: c.satisfaction,
    }));

  // Top apps by DPI
  const topApps = dpi
    .sort((a: any, b: any) => (b.rx_bytes + b.tx_bytes) - (a.rx_bytes + a.tx_bytes))
    .slice(0, 10)
    .map((d: any) => ({
      name: d.name || `Category ${d.cat}`,
      category: d.cat,
      tx_bytes: d.tx_bytes,
      rx_bytes: d.rx_bytes,
    }));

  return {
    timestamp: new Date().toISOString(),
    wan: wanHealth ? {
      ip: wanHealth.wan_ip,
      isp: wanHealth.isp_name || wanHealth.isp_organization || 'Unknown',
      download_speed_mbps: wanHealth.xput_down || 0,
      upload_speed_mbps: wanHealth.xput_up || 0,
      latency_ms: wanHealth.speedtest_ping || 0,
      availability: wanHealth.uptime_stats?.WAN?.availability || 100,
      status: wanHealth.status,
    } : null,
    lan: lanHealth ? {
      status: lanHealth.status,
      num_user: lanHealth.num_user || 0,
      num_guest: lanHealth.num_guest || 0,
      tx_bytes_rate: lanHealth.tx_bytes_r || 0,
      rx_bytes_rate: lanHealth.rx_bytes_r || 0,
    } : null,
    wifi: wlanHealth ? {
      status: wlanHealth.status,
      num_ap: wlanHealth.num_ap || 0,
      num_user: wlanHealth.num_user || 0,
      num_guest: wlanHealth.num_guest || 0,
      tx_bytes_rate: wlanHealth.tx_bytes_r || 0,
      rx_bytes_rate: wlanHealth.rx_bytes_r || 0,
    } : null,
    devices: {
      total: devices.length,
      online: onlineDevices.length,
      offline: devices.length - onlineDevices.length,
      list: devices.map((d: any) => ({
        name: d.name || 'Unnamed',
        model: d.model,
        mac: d.mac,
        ip: d.ip,
        type: d.type,
        state: d.state === 1 ? 'online' : 'offline',
        uptime: d.uptime,
        version: d.version,
        cpu: d.system_stats?.cpu,
        mem: d.system_stats?.mem,
      })),
    },
    clients: {
      total: clients.length,
      wired: wiredClients.length,
      wireless: wirelessClients.length,
      guests: guestClients.length,
      top: topClients,
    },
    traffic: {
      total_tx_bytes: totalTx,
      total_rx_bytes: totalRx,
      top_apps: topApps,
    },
    alarms: {
      total: alarms.length,
      active: alarms.filter((a: any) => !a.archived).length,
      list: alarms.filter((a: any) => !a.archived).slice(0, 10).map((a: any) => ({
        id: a._id,
        type: a.key,
        message: a.msg,
        time: a.datetime || new Date(a.time * 1000).toISOString(),
        subsystem: a.subsystem,
      })),
    },
    wifi_networks: wifiNetworks.map((w: any) => ({
      name: w.name,
      enabled: w.enabled,
      security: w.security,
      is_guest: w.is_guest,
      num_sta: w.num_sta || 0,
    })),
  };
}

async function getDevices() {
  const devices = await unifiRequest<any>('/stat/device');
  return {
    count: devices.length,
    devices: devices.map((d: any) => ({
      id: d._id,
      name: d.name || 'Unnamed',
      model: d.model,
      model_name: d.model_name,
      mac: d.mac,
      ip: d.ip,
      type: d.type,
      state: d.state === 1 ? 'online' : 'offline',
      adopted: d.adopted,
      uptime: d.uptime,
      uptime_formatted: formatUptime(d.uptime),
      version: d.version,
      last_seen: d.last_seen ? new Date(d.last_seen * 1000).toISOString() : null,
      system_stats: d.system_stats ? {
        cpu: Math.round(d.system_stats.cpu),
        mem: Math.round(d.system_stats.mem),
        loadavg_1: d.system_stats.loadavg_1,
        loadavg_5: d.system_stats.loadavg_5,
      } : null,
      uplink: d.uplink ? {
        type: d.uplink.type,
        tx_bytes: d.uplink.tx_bytes,
        rx_bytes: d.uplink.rx_bytes,
      } : null,
      ports: d.port_table?.map((p: any) => ({
        idx: p.port_idx,
        name: p.name,
        enabled: p.enable,
        up: p.up,
        speed: p.speed,
        tx_bytes: p.tx_bytes,
        rx_bytes: p.rx_bytes,
      })) || [],
      radios: d.radio_table?.map((r: any) => ({
        name: r.name,
        channel: r.channel,
        tx_power: r.tx_power,
        num_sta: r.num_sta,
        satisfaction: r.satisfaction,
      })) || [],
    })),
  };
}

async function getClients() {
  const clients = await unifiRequest<any>('/stat/sta');
  return {
    count: clients.length,
    wired: clients.filter((c: any) => c.is_wired).length,
    wireless: clients.filter((c: any) => !c.is_wired).length,
    guests: clients.filter((c: any) => c.is_guest).length,
    clients: clients.map((c: any) => ({
      id: c._id,
      name: c.hostname || c.name || c.mac,
      mac: c.mac,
      ip: c.ip,
      is_wired: c.is_wired,
      is_guest: c.is_guest,
      network: c.network,
      vlan: c.vlan,
      uptime: c.uptime,
      uptime_formatted: formatUptime(c.uptime),
      first_seen: c.first_seen ? new Date(c.first_seen * 1000).toISOString() : null,
      last_seen: c.last_seen ? new Date(c.last_seen * 1000).toISOString() : null,
      tx_bytes: c.tx_bytes,
      rx_bytes: c.rx_bytes,
      tx_bytes_formatted: formatBytes(c.tx_bytes),
      rx_bytes_formatted: formatBytes(c.rx_bytes),
      tx_rate: c.tx_rate,
      rx_rate: c.rx_rate,
      signal: c.signal,
      rssi: c.rssi,
      satisfaction: c.satisfaction,
      ap_mac: c.ap_mac,
      essid: c.essid,
      channel: c.channel,
      radio: c.radio,
      os_name: c.os_name,
      authorized: c.authorized,
      blocked: c.blocked,
      oui: c.oui,
    })),
  };
}

async function getTopology() {
  if (USE_MOCK_DATA) {
    return getMockTopology();
  }

  const [devices, clients, networks] = await Promise.all([
    unifiRequest<any>('/stat/device'),
    unifiRequest<any>('/stat/sta'),
    unifiRequest<any>('/rest/networkconf'),
  ]);

  // Build nodes
  const nodes: any[] = [];
  const links: any[] = [];

  // Gateway node
  const gateway = devices.find((d: any) => d.type === 'ugw' || d.type === 'udm');
  if (gateway) {
    nodes.push({
      id: gateway.mac,
      name: gateway.name || 'Gateway',
      type: 'gateway',
      model: gateway.model,
      ip: gateway.ip,
      state: gateway.state === 1 ? 'online' : 'offline',
    });
  }

  // Switch and AP nodes
  for (const device of devices) {
    if (device.mac === gateway?.mac) continue;
    
    nodes.push({
      id: device.mac,
      name: device.name || 'Device',
      type: device.type,
      model: device.model,
      ip: device.ip,
      state: device.state === 1 ? 'online' : 'offline',
    });

    // Link to gateway
    if (gateway) {
      links.push({
        source: device.mac,
        target: gateway.mac,
        type: 'uplink',
      });
    }
  }

  // Client nodes (grouped)
  const wiredClients = clients.filter((c: any) => c.is_wired);
  const wirelessClients = clients.filter((c: any) => !c.is_wired);

  // Group wireless by AP
  const clientsByAP: Record<string, any[]> = {};
  for (const client of wirelessClients) {
    const apMac = client.ap_mac || 'unknown';
    if (!clientsByAP[apMac]) clientsByAP[apMac] = [];
    clientsByAP[apMac].push(client);
  }

  // Add client groups
  for (const [apMac, apClients] of Object.entries(clientsByAP)) {
    const groupId = `clients-${apMac}`;
    nodes.push({
      id: groupId,
      name: `${apClients.length} Wireless Clients`,
      type: 'client-group',
      count: apClients.length,
      clients: apClients.map((c: any) => ({
        name: c.hostname || c.name || c.mac,
        mac: c.mac,
        ip: c.ip,
        signal: c.signal,
      })),
    });

    links.push({
      source: groupId,
      target: apMac,
      type: 'wireless',
    });
  }

  // Wired clients
  if (wiredClients.length > 0) {
    nodes.push({
      id: 'wired-clients',
      name: `${wiredClients.length} Wired Clients`,
      type: 'client-group',
      count: wiredClients.length,
      clients: wiredClients.map((c: any) => ({
        name: c.hostname || c.name || c.mac,
        mac: c.mac,
        ip: c.ip,
      })),
    });

    // Link to switch or gateway
    const switchDevice = devices.find((d: any) => d.type === 'usw');
    links.push({
      source: 'wired-clients',
      target: switchDevice?.mac || gateway?.mac || 'unknown',
      type: 'wired',
    });
  }

  return {
    nodes,
    links,
    networks: networks.map((n: any) => ({
      id: n._id,
      name: n.name,
      vlan: n.vlan_id,
      subnet: n.ip_subnet,
      purpose: n.purpose,
    })),
  };
}

async function getTrafficStats() {
  if (USE_MOCK_DATA) {
    return getMockTrafficStats();
  }

  const end = Math.floor(Date.now() / 1000);
  const start = end - (24 * 3600); // Last 24 hours

  const [hourlyStats, dpi, clients] = await Promise.all([
    unifiRequest<any>(`/stat/report/hourly.site?start=${start}&end=${end}`),
    unifiRequest<any>('/stat/dpi'),
    unifiRequest<any>('/stat/sta'),
  ]);

  // Top clients by traffic
  const topClients = [...clients]
    .sort((a: any, b: any) => (b.tx_bytes + b.rx_bytes) - (a.tx_bytes + a.rx_bytes))
    .slice(0, 15)
    .map((c: any) => ({
      name: c.hostname || c.name || c.mac,
      mac: c.mac,
      ip: c.ip,
      tx_bytes: c.tx_bytes,
      rx_bytes: c.rx_bytes,
      total_bytes: c.tx_bytes + c.rx_bytes,
      tx_formatted: formatBytes(c.tx_bytes),
      rx_formatted: formatBytes(c.rx_bytes),
      total_formatted: formatBytes(c.tx_bytes + c.rx_bytes),
    }));

  // Top categories
  const topCategories = [...dpi]
    .sort((a: any, b: any) => (b.rx_bytes + b.tx_bytes) - (a.rx_bytes + a.tx_bytes))
    .slice(0, 15)
    .map((d: any) => ({
      name: d.name || `Category ${d.cat}`,
      category_id: d.cat,
      tx_bytes: d.tx_bytes,
      rx_bytes: d.rx_bytes,
      total_bytes: d.tx_bytes + d.rx_bytes,
      tx_formatted: formatBytes(d.tx_bytes),
      rx_formatted: formatBytes(d.rx_bytes),
      total_formatted: formatBytes(d.tx_bytes + d.rx_bytes),
    }));

  // Hourly breakdown
  const hourlyData = hourlyStats.map((h: any) => ({
    time: h.time ? new Date(h.time * 1000).toISOString() : null,
    tx_bytes: h.tx_bytes || 0,
    rx_bytes: h.rx_bytes || 0,
    num_sta: h.num_sta || 0,
  }));

  return {
    period: '24h',
    top_clients: topClients,
    top_categories: topCategories,
    hourly: hourlyData,
  };
}

async function getRealTimeThroughput() {
  if (USE_MOCK_DATA) {
    return getMockThroughput();
  }

  const health = await unifiRequest<any>('/stat/health');
  const lanHealth = health.find((h: any) => h.subsystem === 'lan');
  const wanHealth = health.find((h: any) => h.subsystem === 'wan');

  return {
    timestamp: new Date().toISOString(),
    lan: {
      tx_bytes_rate: lanHealth?.tx_bytes_r || 0,
      rx_bytes_rate: lanHealth?.rx_bytes_r || 0,
      tx_mbps: ((lanHealth?.tx_bytes_r || 0) * 8) / 1_000_000,
      rx_mbps: ((lanHealth?.rx_bytes_r || 0) * 8) / 1_000_000,
    },
    wan: {
      tx_bytes_rate: wanHealth?.tx_bytes_r || 0,
      rx_bytes_rate: wanHealth?.rx_bytes_r || 0,
      tx_mbps: ((wanHealth?.tx_bytes_r || 0) * 8) / 1_000_000,
      rx_mbps: ((wanHealth?.rx_bytes_r || 0) * 8) / 1_000_000,
    },
  };
}

async function getHealth() {
  const health = await unifiRequest<any>('/stat/health');
  return health.map((h: any) => ({
    subsystem: h.subsystem,
    status: h.status,
    num_adopted: h.num_adopted,
    num_user: h.num_user,
    num_guest: h.num_guest,
    tx_bytes_rate: h.tx_bytes_r,
    rx_bytes_rate: h.rx_bytes_r,
    lan_ip: h.lan_ip,
    wan_ip: h.wan_ip,
    isp: h.isp_name,
    speedtest: h.speedtest_status ? {
      status: h.speedtest_status,
      ping: h.speedtest_ping,
      download: h.xput_down,
      upload: h.xput_up,
      last_run: h.speedtest_lastrun ? new Date(h.speedtest_lastrun * 1000).toISOString() : null,
    } : null,
  }));
}

async function getWANStatus() {
  const health = await unifiRequest<any>('/stat/health');
  const wanHealth = health.find((h: any) => h.subsystem === 'wan');

  if (!wanHealth) {
    return { error: 'WAN health data not available' };
  }

  return {
    status: wanHealth.status,
    ip: wanHealth.wan_ip,
    gateway_mac: wanHealth.gw_mac,
    isp: wanHealth.isp_name || wanHealth.isp_organization,
    latency: wanHealth.uptime_stats?.WAN?.latency_average,
    availability: wanHealth.uptime_stats?.WAN?.availability,
    speedtest: {
      status: wanHealth.speedtest_status,
      last_run: wanHealth.speedtest_lastrun ? new Date(wanHealth.speedtest_lastrun * 1000).toISOString() : null,
      ping_ms: wanHealth.speedtest_ping,
      download_mbps: wanHealth.xput_down,
      upload_mbps: wanHealth.xput_up,
    },
    tx_bytes_rate: wanHealth.tx_bytes_r,
    rx_bytes_rate: wanHealth.rx_bytes_r,
  };
}

async function getWifiNetworks() {
  const networks = await unifiRequest<any>('/rest/wlanconf');
  return networks.map((n: any) => ({
    id: n._id,
    name: n.name,
    enabled: n.enabled,
    security: n.security,
    wpa_mode: n.wpa_mode,
    is_guest: n.is_guest,
    vlan: n.vlan,
    hide_ssid: n.hide_ssid,
    num_sta: n.num_sta || 0,
  }));
}

async function getAlarms() {
  const alarms = await unifiRequest<any>('/stat/alarm');
  return alarms.map((a: any) => ({
    id: a._id,
    key: a.key,
    type: a.key.split(':')[0],
    message: a.msg,
    time: a.datetime || new Date(a.time * 1000).toISOString(),
    archived: a.archived,
    subsystem: a.subsystem,
    device_mac: a.ap || a.sw || a.gw,
  }));
}

async function getEvents(limit: number) {
  const events = await unifiRequest<any>(`/stat/event?_limit=${limit}&_sort=-time`);
  return events.map((e: any) => ({
    id: e._id,
    key: e.key,
    message: e.msg,
    time: e.datetime || new Date(e.time * 1000).toISOString(),
    subsystem: e.subsystem,
    user: e.user,
    guest: e.guest,
    admin: e.admin,
  }));
}

async function getDPIStats() {
  const dpi = await unifiRequest<any>('/stat/dpi');
  return dpi.map((d: any) => ({
    category: d.cat,
    name: d.name || `Category ${d.cat}`,
    tx_bytes: d.tx_bytes,
    rx_bytes: d.rx_bytes,
    total_bytes: d.tx_bytes + d.rx_bytes,
    tx_formatted: formatBytes(d.tx_bytes),
    rx_formatted: formatBytes(d.rx_bytes),
  })).sort((a: any, b: any) => b.total_bytes - a.total_bytes);
}

async function getFirewallRules() {
  const [rules, groups] = await Promise.all([
    unifiRequest<any>('/rest/firewallrule'),
    unifiRequest<any>('/rest/firewallgroup'),
  ]);

  return {
    rules: rules.map((r: any) => ({
      id: r._id,
      name: r.name,
      enabled: r.enabled,
      action: r.action,
      ruleset: r.ruleset,
      protocol: r.protocol,
      src: r.src_address || r.src_networkconf_id,
      dst: r.dst_address || r.dst_networkconf_id,
      dst_port: r.dst_port,
    })),
    groups: groups.map((g: any) => ({
      id: g._id,
      name: g.name,
      type: g.group_type,
      members: g.group_members,
    })),
  };
}

async function getRoutes() {
  const routes = await unifiRequest<any>('/stat/routing');
  return routes.map((r: any) => ({
    interface: r.interface,
    gateway: r.gateway,
    destination: r.destination,
    metric: r.metric,
    type: r.type,
  }));
}

async function getPortForwards() {
  const forwards = await unifiRequest<any>('/rest/portforward');
  return forwards.map((f: any) => ({
    id: f._id,
    name: f.name,
    enabled: f.enabled,
    interface: f.pfwd_interface,
    src: f.src,
    dst_port: f.dst_port,
    forward_to: f.fwd,
    forward_port: f.fwd_port,
    protocol: f.proto,
  }));
}

async function getRogueAPs() {
  const rogues = await unifiRequest<any>('/stat/rogueap');
  return rogues.map((r: any) => ({
    mac: r.bssid,
    ssid: r.essid,
    channel: r.channel,
    rssi: r.rssi,
    security: r.security,
    is_rogue: r.is_rogue,
    last_seen: r.last_seen ? new Date(r.last_seen * 1000).toISOString() : null,
  }));
}

async function getBlockedClients() {
  const clients = await unifiRequest<any>('/rest/user');
  return clients
    .filter((c: any) => c.blocked)
    .map((c: any) => ({
      mac: c.mac,
      name: c.name || c.hostname || c.mac,
      note: c.note,
      blocked_at: c.blocked_at ? new Date(c.blocked_at * 1000).toISOString() : null,
    }));
}

async function getClientDetails(mac: string) {
  const clients = await unifiRequest<any>(`/stat/sta/${mac}`);
  if (!clients.length) {
    return { error: 'Client not found' };
  }

  const client = clients[0];
  return {
    mac: client.mac,
    name: client.hostname || client.name || client.mac,
    ip: client.ip,
    is_wired: client.is_wired,
    is_guest: client.is_guest,
    network: client.network,
    vlan: client.vlan,
    uptime: client.uptime,
    uptime_formatted: formatUptime(client.uptime),
    first_seen: client.first_seen ? new Date(client.first_seen * 1000).toISOString() : null,
    last_seen: client.last_seen ? new Date(client.last_seen * 1000).toISOString() : null,
    traffic: {
      tx_bytes: client.tx_bytes,
      rx_bytes: client.rx_bytes,
      tx_formatted: formatBytes(client.tx_bytes),
      rx_formatted: formatBytes(client.rx_bytes),
      tx_rate: client.tx_rate,
      rx_rate: client.rx_rate,
    },
    wifi: !client.is_wired ? {
      ap_mac: client.ap_mac,
      essid: client.essid,
      channel: client.channel,
      radio: client.radio,
      signal: client.signal,
      rssi: client.rssi,
      noise: client.noise,
      satisfaction: client.satisfaction,
    } : null,
    device_info: {
      os_name: client.os_name,
      oui: client.oui,
      authorized: client.authorized,
      blocked: client.blocked,
    },
  };
}

// ===== New Extended API Functions =====

async function getSites() {
  // Sites are at a different endpoint level
  if (USE_MOCK_DATA) {
    return {
      mock_data: true,
      sites: [
        { name: 'default', desc: 'Default Site', role: 'admin', health: [
          { subsystem: 'www', status: 'ok' },
          { subsystem: 'wan', status: 'ok' },
          { subsystem: 'lan', status: 'ok' },
          { subsystem: 'wlan', status: 'ok' },
          { subsystem: 'vpn', status: 'ok' },
        ]},
      ],
    };
  }

  try {
    const url = `https://${UNIFI_HOST}/proxy/network/api/self/sites`;
    const response = await fetch(url, {
      headers: {
        'X-API-Key': UNIFI_API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      // @ts-ignore
      agent: httpsAgent,
    });

    if (!response.ok) {
      console.error(`Sites API error: ${response.status}`);
      return { error: 'Failed to fetch sites' };
    }

    const data = await response.json();
    return { sites: data.data || [] };
  } catch (error) {
    console.error('Sites API failed:', error);
    return { error: 'Sites API request failed' };
  }
}

async function getSiteStats() {
  if (USE_MOCK_DATA) {
    return getMockSiteStats();
  }

  const [health, sysinfo] = await Promise.all([
    unifiRequest<any>('/stat/health'),
    unifiRequest<any>('/stat/sysinfo'),
  ]);

  return {
    timestamp: new Date().toISOString(),
    health: health.map((h: any) => ({
      subsystem: h.subsystem,
      status: h.status,
      num_user: h.num_user,
      num_guest: h.num_guest,
      num_iot: h.num_iot,
      tx_bytes_rate: h.tx_bytes_r,
      rx_bytes_rate: h.rx_bytes_r,
    })),
    sysinfo: sysinfo[0] ? {
      version: sysinfo[0].version,
      build: sysinfo[0].build,
      timezone: sysinfo[0].timezone,
      autobackup: sysinfo[0].autobackup,
      hostname: sysinfo[0].hostname,
    } : null,
  };
}

async function getActiveClients() {
  if (USE_MOCK_DATA) {
    return getMockActiveClients();
  }

  const clients = await unifiRequest<any>('/stat/sta');
  const now = Math.floor(Date.now() / 1000);
  
  // Filter to clients seen in last 5 minutes
  const activeClients = clients.filter((c: any) => 
    c.last_seen && (now - c.last_seen) < 300
  );

  // Group by network
  const byNetwork: Record<string, any[]> = {};
  for (const client of activeClients) {
    const network = client.network || 'default';
    if (!byNetwork[network]) byNetwork[network] = [];
    byNetwork[network].push({
      name: client.hostname || client.name || client.mac,
      mac: client.mac,
      ip: client.ip,
      is_wired: client.is_wired,
      tx_rate: client.tx_rate,
      rx_rate: client.rx_rate,
      signal: client.signal,
      satisfaction: client.satisfaction,
      uptime: formatUptime(client.uptime),
    });
  }

  return {
    timestamp: new Date().toISOString(),
    total_active: activeClients.length,
    by_network: byNetwork,
    clients: activeClients.map((c: any) => ({
      name: c.hostname || c.name || c.mac,
      mac: c.mac,
      ip: c.ip,
      network: c.network || 'default',
      is_wired: c.is_wired,
      essid: c.essid,
      tx_bytes: c.tx_bytes,
      rx_bytes: c.rx_bytes,
      tx_rate_mbps: (c.tx_rate || 0) / 1000,
      rx_rate_mbps: (c.rx_rate || 0) / 1000,
      signal: c.signal,
      satisfaction: c.satisfaction,
    })),
  };
}

async function getBandwidthStats() {
  if (USE_MOCK_DATA) {
    return getMockBandwidthStats();
  }

  const [health, devices] = await Promise.all([
    unifiRequest<any>('/stat/health'),
    unifiRequest<any>('/stat/device'),
  ]);

  const wanHealth = health.find((h: any) => h.subsystem === 'wan');
  const lanHealth = health.find((h: any) => h.subsystem === 'lan');

  // Port statistics from devices
  const portStats: any[] = [];
  for (const device of devices) {
    if (device.port_table) {
      for (const port of device.port_table) {
        if (port.up) {
          portStats.push({
            device: device.name || device.model,
            port: port.port_idx,
            name: port.name,
            speed: port.speed,
            tx_bytes: port.tx_bytes,
            rx_bytes: port.rx_bytes,
            tx_rate: port.tx_bytes_r || 0,
            rx_rate: port.rx_bytes_r || 0,
          });
        }
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    wan: wanHealth ? {
      tx_mbps: ((wanHealth.tx_bytes_r || 0) * 8) / 1_000_000,
      rx_mbps: ((wanHealth.rx_bytes_r || 0) * 8) / 1_000_000,
      max_down_mbps: wanHealth.xput_down || 0,
      max_up_mbps: wanHealth.xput_up || 0,
      latency_ms: wanHealth.speedtest_ping || 0,
    } : null,
    lan: lanHealth ? {
      tx_mbps: ((lanHealth.tx_bytes_r || 0) * 8) / 1_000_000,
      rx_mbps: ((lanHealth.rx_bytes_r || 0) * 8) / 1_000_000,
      active_users: lanHealth.num_user || 0,
    } : null,
    top_ports: portStats.sort((a, b) => (b.tx_rate + b.rx_rate) - (a.tx_rate + a.rx_rate)).slice(0, 10),
  };
}

async function getAppTraffic() {
  if (USE_MOCK_DATA) {
    return getMockAppTraffic();
  }

  const dpi = await unifiRequest<any>('/stat/dpi');
  
  // DPI category mapping
  const categoryNames: Record<number, string> = {
    0: 'Instant Messaging',
    1: 'P2P',
    2: 'Online Games',
    3: 'File Transfer',
    4: 'Email',
    5: 'Web',
    6: 'Remote Access',
    7: 'Database',
    8: 'VoIP',
    9: 'Security Software',
    10: 'Media Streaming',
    11: 'Business Applications',
    12: 'Social Networks',
    13: 'Video Streaming',
    14: 'Audio Streaming',
    15: 'VPN/Tunneling',
    16: 'System Services',
    17: 'eCommerce',
    18: 'Social Media',
    19: 'Advertising',
    20: 'Cloud Services',
    21: 'IoT/Smart Home',
  };

  const apps = dpi.map((d: any) => ({
    name: d.name || categoryNames[d.cat] || `Category ${d.cat}`,
    category_id: d.cat,
    category_name: categoryNames[d.cat] || 'Other',
    tx_bytes: d.tx_bytes,
    rx_bytes: d.rx_bytes,
    total_bytes: d.tx_bytes + d.rx_bytes,
    tx_formatted: formatBytes(d.tx_bytes),
    rx_formatted: formatBytes(d.rx_bytes),
    total_formatted: formatBytes(d.tx_bytes + d.rx_bytes),
  })).sort((a: any, b: any) => b.total_bytes - a.total_bytes);

  // Group by category
  const byCategory: Record<string, { total: number; apps: any[] }> = {};
  for (const app of apps) {
    const cat = app.category_name;
    if (!byCategory[cat]) byCategory[cat] = { total: 0, apps: [] };
    byCategory[cat].total += app.total_bytes;
    byCategory[cat].apps.push(app);
  }

  return {
    timestamp: new Date().toISOString(),
    total_apps: apps.length,
    top_apps: apps.slice(0, 20),
    by_category: Object.entries(byCategory)
      .map(([name, data]) => ({
        category: name,
        total_bytes: data.total,
        total_formatted: formatBytes(data.total),
        app_count: data.apps.length,
      }))
      .sort((a, b) => b.total_bytes - a.total_bytes),
  };
}

async function getHourlyStats(hours: number) {
  if (USE_MOCK_DATA) {
    return getMockHourlyStats(hours);
  }

  const end = Math.floor(Date.now() / 1000);
  const start = end - (hours * 3600);

  const stats = await unifiRequest<any>(`/stat/report/hourly.site?start=${start}&end=${end}`);
  
  return {
    period: `${hours}h`,
    data: stats.map((s: any) => ({
      time: s.time ? new Date(s.time * 1000).toISOString() : null,
      tx_bytes: s.tx_bytes || 0,
      rx_bytes: s.rx_bytes || 0,
      tx_formatted: formatBytes(s.tx_bytes || 0),
      rx_formatted: formatBytes(s.rx_bytes || 0),
      num_sta: s.num_sta || 0,
      wan_tx_bytes: s['wan-tx_bytes'] || 0,
      wan_rx_bytes: s['wan-rx_bytes'] || 0,
    })),
  };
}

async function getDailyStats(days: number) {
  if (USE_MOCK_DATA) {
    return getMockDailyStats(days);
  }

  const end = Math.floor(Date.now() / 1000);
  const start = end - (days * 86400);

  const stats = await unifiRequest<any>(`/stat/report/daily.site?start=${start}&end=${end}`);
  
  return {
    period: `${days}d`,
    data: stats.map((s: any) => ({
      date: s.time ? new Date(s.time * 1000).toISOString().split('T')[0] : null,
      tx_bytes: s.tx_bytes || 0,
      rx_bytes: s.rx_bytes || 0,
      tx_formatted: formatBytes(s.tx_bytes || 0),
      rx_formatted: formatBytes(s.rx_bytes || 0),
      num_sta: s.num_sta || 0,
    })),
  };
}

async function getVPNUsers() {
  if (USE_MOCK_DATA) {
    return {
      mock_data: true,
      active_vpn_users: 0,
      users: [],
    };
  }

  const vpnUsers = await unifiRequest<any>('/stat/remoteuserlist');
  
  return {
    active_vpn_users: vpnUsers.length,
    users: vpnUsers.map((u: any) => ({
      name: u.name,
      ip: u.ip,
      remote_ip: u.remote_ip,
      type: u.type,
      connected_since: u.time ? new Date(u.time * 1000).toISOString() : null,
      tx_bytes: u.tx_bytes,
      rx_bytes: u.rx_bytes,
    })),
  };
}

async function getDHCPLeases() {
  if (USE_MOCK_DATA) {
    return getMockDHCPLeases();
  }

  // DHCP leases can be derived from client data
  const clients = await unifiRequest<any>('/rest/user');
  
  return {
    total_leases: clients.length,
    leases: clients.slice(0, 100).map((c: any) => ({
      mac: c.mac,
      hostname: c.hostname || c.name,
      ip: c.last_ip || c.ip,
      oui: c.oui,
      first_seen: c.first_seen ? new Date(c.first_seen * 1000).toISOString() : null,
      last_seen: c.last_seen ? new Date(c.last_seen * 1000).toISOString() : null,
      fixed_ip: c.use_fixedip,
      network: c.network,
    })),
  };
}

async function getSpeedTestResults() {
  if (USE_MOCK_DATA) {
    return {
      mock_data: true,
      last_run: new Date(Date.now() - 3600000).toISOString(),
      download_mbps: 940,
      upload_mbps: 35,
      latency_ms: 12,
      status: 'ok',
    };
  }

  const health = await unifiRequest<any>('/stat/health');
  const wanHealth = health.find((h: any) => h.subsystem === 'wan');

  if (!wanHealth) {
    return { error: 'WAN data not available' };
  }

  return {
    last_run: wanHealth.speedtest_lastrun ? new Date(wanHealth.speedtest_lastrun * 1000).toISOString() : null,
    download_mbps: wanHealth.xput_down || 0,
    upload_mbps: wanHealth.xput_up || 0,
    latency_ms: wanHealth.speedtest_ping || 0,
    status: wanHealth.speedtest_status || 'unknown',
    isp: wanHealth.isp_name || wanHealth.isp_organization || 'Unknown',
    wan_ip: wanHealth.wan_ip,
  };
}

async function getPortStats() {
  if (USE_MOCK_DATA) {
    return getMockPortStats();
  }

  const devices = await unifiRequest<any>('/stat/device');
  const result: any[] = [];

  for (const device of devices) {
    if (device.port_table) {
      result.push({
        device_name: device.name || device.model,
        device_mac: device.mac,
        device_type: device.type,
        ports: device.port_table.map((p: any) => ({
          idx: p.port_idx,
          name: p.name || `Port ${p.port_idx}`,
          enabled: p.enable !== false,
          up: p.up,
          speed: p.speed || 0,
          full_duplex: p.full_duplex,
          media: p.media,
          poe_enable: p.poe_enable,
          poe_power: p.poe_power,
          tx_bytes: p.tx_bytes,
          rx_bytes: p.rx_bytes,
          tx_packets: p.tx_packets,
          rx_packets: p.rx_packets,
          tx_errors: p.tx_errors,
          rx_errors: p.rx_errors,
        })),
      });
    }
  }

  return { devices: result };
}

async function getIPSEvents() {
  if (USE_MOCK_DATA) {
    return {
      mock_data: true,
      total_events: 0,
      events: [],
    };
  }

  const events = await unifiRequest<any>('/stat/ips/event?_limit=100');
  
  return {
    total_events: events.length,
    events: events.map((e: any) => ({
      id: e._id,
      time: e.datetime || new Date(e.time * 1000).toISOString(),
      type: e.catname,
      severity: e.action === 'block' ? 'high' : 'medium',
      source_ip: e.src_ip,
      source_port: e.src_port,
      dest_ip: e.dest_ip,
      dest_port: e.dest_port,
      protocol: e.proto,
      signature: e.signature,
      app: e.app,
      action: e.action,
    })),
  };
}

async function getThreatManagement() {
  if (USE_MOCK_DATA) {
    return getMockThreatManagement();
  }

  const [ipsEvents, rogueAPs, blockedClients] = await Promise.all([
    unifiRequest<any>('/stat/ips/event?_limit=50').catch(() => []),
    unifiRequest<any>('/stat/rogueap').catch(() => []),
    unifiRequest<any>('/rest/user').then(users => users.filter((u: any) => u.blocked)).catch(() => []),
  ]);

  return {
    timestamp: new Date().toISOString(),
    summary: {
      ips_events_24h: ipsEvents.length,
      rogue_aps_detected: rogueAPs.filter((r: any) => r.is_rogue).length,
      blocked_clients: blockedClients.length,
    },
    recent_ips_events: ipsEvents.slice(0, 10).map((e: any) => ({
      time: e.datetime || new Date(e.time * 1000).toISOString(),
      type: e.catname,
      source: e.src_ip,
      destination: e.dest_ip,
      action: e.action,
    })),
    rogue_aps: rogueAPs.filter((r: any) => r.is_rogue).slice(0, 10).map((r: any) => ({
      mac: r.bssid,
      ssid: r.essid,
      channel: r.channel,
      signal: r.rssi,
    })),
    blocked_clients: blockedClients.map((c: any) => ({
      mac: c.mac,
      name: c.name || c.hostname,
    })),
  };
}

// ===== Extended Mock Data =====

function getMockSiteStats() {
  return {
    mock_data: true,
    timestamp: new Date().toISOString(),
    health: [
      { subsystem: 'www', status: 'ok', num_user: 0, num_guest: 0 },
      { subsystem: 'wan', status: 'ok', num_user: 15, tx_bytes_rate: 450000, rx_bytes_rate: 3200000 },
      { subsystem: 'lan', status: 'ok', num_user: 5, tx_bytes_rate: 125000, rx_bytes_rate: 450000 },
      { subsystem: 'wlan', status: 'ok', num_user: 12, num_guest: 2, tx_bytes_rate: 950000, rx_bytes_rate: 320000 },
      { subsystem: 'vpn', status: 'ok', num_user: 0 },
    ],
    sysinfo: {
      version: '8.0.26',
      build: 'atag_8.0.26_20960',
      timezone: 'America/Los_Angeles',
      hostname: 'UDM-Pro',
    },
  };
}

function getMockActiveClients() {
  return {
    mock_data: true,
    timestamp: new Date().toISOString(),
    total_active: 17,
    by_network: {
      'Default': [
        { name: 'mycocomp', ip: '192.168.0.172', is_wired: true, tx_rate: 1000000, rx_rate: 3500000 },
        { name: 'Proxmox-Build', ip: '192.168.0.202', is_wired: true, tx_rate: 800000, rx_rate: 2500000 },
      ],
      'Production': [
        { name: 'mycosoft-sandbox-vm', ip: '192.168.20.103', is_wired: true, tx_rate: 500000, rx_rate: 1500000 },
      ],
    },
    clients: [
      { name: 'mycocomp', mac: 'aa:bb:cc:dd:ee:01', ip: '192.168.0.172', network: 'Default', is_wired: true, tx_rate_mbps: 8, rx_rate_mbps: 28 },
      { name: 'Proxmox-Build', mac: 'aa:bb:cc:dd:ee:02', ip: '192.168.0.202', network: 'Default', is_wired: true, tx_rate_mbps: 6.4, rx_rate_mbps: 20 },
      { name: 'mycosoft-sandbox-vm', mac: 'aa:bb:cc:dd:ee:03', ip: '192.168.20.103', network: 'Production', is_wired: true, tx_rate_mbps: 4, rx_rate_mbps: 12 },
      { name: 'Morgan-iPhone', mac: 'aa:bb:cc:dd:ee:04', ip: '192.168.0.150', network: 'Default', is_wired: false, essid: 'MycoNet', signal: -45, satisfaction: 98 },
      { name: 'MacBook-Pro', mac: 'aa:bb:cc:dd:ee:05', ip: '192.168.0.151', network: 'Default', is_wired: false, essid: 'MycoNet', signal: -52, satisfaction: 95 },
    ],
  };
}

function getMockBandwidthStats() {
  return {
    mock_data: true,
    timestamp: new Date().toISOString(),
    wan: {
      tx_mbps: 3.6 + Math.random() * 2,
      rx_mbps: 25.6 + Math.random() * 10,
      max_down_mbps: 940,
      max_up_mbps: 35,
      latency_ms: 12,
    },
    lan: {
      tx_mbps: 10 + Math.random() * 5,
      rx_mbps: 36 + Math.random() * 15,
      active_users: 17,
    },
    top_ports: [
      { device: 'Core Switch', port: 1, name: 'Uplink to UDM', speed: 10000, tx_rate: 1250000, rx_rate: 4500000 },
      { device: 'Core Switch', port: 3, name: 'mycocomp', speed: 2500, tx_rate: 500000, rx_rate: 1500000 },
      { device: 'Core Switch', port: 5, name: 'Proxmox', speed: 2500, tx_rate: 400000, rx_rate: 1200000 },
      { device: 'Core Switch', port: 7, name: 'NAS', speed: 2500, tx_rate: 300000, rx_rate: 800000 },
    ],
  };
}

function getMockAppTraffic() {
  return {
    mock_data: true,
    timestamp: new Date().toISOString(),
    total_apps: 45,
    top_apps: [
      { name: 'Netflix', category_name: 'Video Streaming', total_bytes: 25678901234, total_formatted: '23.9 GB' },
      { name: 'YouTube', category_name: 'Video Streaming', total_bytes: 18765432109, total_formatted: '17.5 GB' },
      { name: 'iCloud', category_name: 'Cloud Services', total_bytes: 12345678901, total_formatted: '11.5 GB' },
      { name: 'GitHub', category_name: 'Cloud Services', total_bytes: 8765432109, total_formatted: '8.16 GB' },
      { name: 'Anthropic API', category_name: 'Cloud Services', total_bytes: 6543210987, total_formatted: '6.09 GB' },
      { name: 'OpenAI API', category_name: 'Cloud Services', total_bytes: 5432109876, total_formatted: '5.06 GB' },
      { name: 'Supabase', category_name: 'Database', total_bytes: 4321098765, total_formatted: '4.02 GB' },
      { name: 'Spotify', category_name: 'Audio Streaming', total_bytes: 3210987654, total_formatted: '2.99 GB' },
      { name: 'Discord', category_name: 'VoIP', total_bytes: 2109876543, total_formatted: '1.96 GB' },
      { name: 'Zoom', category_name: 'VoIP', total_bytes: 1098765432, total_formatted: '1.02 GB' },
    ],
    by_category: [
      { category: 'Video Streaming', total_bytes: 45678901234, total_formatted: '42.5 GB', app_count: 5 },
      { category: 'Cloud Services', total_bytes: 34567890123, total_formatted: '32.2 GB', app_count: 12 },
      { category: 'Web', total_bytes: 12345678901, total_formatted: '11.5 GB', app_count: 8 },
      { category: 'Audio Streaming', total_bytes: 5678901234, total_formatted: '5.29 GB', app_count: 3 },
      { category: 'VoIP', total_bytes: 3456789012, total_formatted: '3.22 GB', app_count: 4 },
      { category: 'Gaming', total_bytes: 2345678901, total_formatted: '2.18 GB', app_count: 6 },
      { category: 'Social Media', total_bytes: 1234567890, total_formatted: '1.15 GB', app_count: 5 },
    ],
  };
}

function getMockHourlyStats(hours: number) {
  const data = [];
  const now = Date.now();
  for (let i = hours; i >= 0; i--) {
    data.push({
      time: new Date(now - i * 3600000).toISOString(),
      tx_bytes: Math.floor(Math.random() * 500000000) + 100000000,
      rx_bytes: Math.floor(Math.random() * 2000000000) + 500000000,
      num_sta: Math.floor(Math.random() * 5) + 12,
    });
  }
  return { mock_data: true, period: `${hours}h`, data };
}

function getMockDailyStats(days: number) {
  const data = [];
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    data.push({
      date: new Date(now - i * 86400000).toISOString().split('T')[0],
      tx_bytes: Math.floor(Math.random() * 10000000000) + 5000000000,
      rx_bytes: Math.floor(Math.random() * 50000000000) + 20000000000,
      num_sta: Math.floor(Math.random() * 5) + 15,
    });
  }
  return { mock_data: true, period: `${days}d`, data };
}

function getMockDHCPLeases() {
  return {
    mock_data: true,
    total_leases: 25,
    leases: [
      { mac: 'aa:bb:cc:dd:ee:01', hostname: 'mycocomp', ip: '192.168.0.172', network: 'Default', fixed_ip: true },
      { mac: 'aa:bb:cc:dd:ee:02', hostname: 'Proxmox-Build', ip: '192.168.0.202', network: 'Default', fixed_ip: true },
      { mac: 'aa:bb:cc:dd:ee:03', hostname: 'mycosoft-sandbox-vm', ip: '192.168.20.103', network: 'Production', fixed_ip: true },
      { mac: 'aa:bb:cc:dd:ee:04', hostname: 'Morgan-iPhone', ip: '192.168.0.150', network: 'Default', fixed_ip: false },
      { mac: 'aa:bb:cc:dd:ee:05', hostname: 'MacBook-Pro', ip: '192.168.0.151', network: 'Default', fixed_ip: false },
      { mac: 'aa:bb:cc:dd:ee:06', hostname: 'Smart-TV', ip: '192.168.40.10', network: 'IoT', fixed_ip: false },
      { mac: 'aa:bb:cc:dd:ee:07', hostname: 'iPad', ip: '192.168.0.153', network: 'Default', fixed_ip: false },
      { mac: 'aa:bb:cc:dd:ee:08', hostname: 'NAS', ip: '192.168.0.5', network: 'Default', fixed_ip: true },
    ],
  };
}

function getMockPortStats() {
  return {
    mock_data: true,
    devices: [
      {
        device_name: 'Dream Machine Pro',
        device_type: 'udm',
        ports: [
          { idx: 1, name: 'WAN', enabled: true, up: true, speed: 1000, tx_bytes: 25678901234, rx_bytes: 87654321098 },
          { idx: 2, name: 'LAN 1', enabled: true, up: true, speed: 10000, tx_bytes: 87654321098, rx_bytes: 25678901234 },
        ],
      },
      {
        device_name: 'Core Switch',
        device_type: 'usw',
        ports: [
          { idx: 1, name: 'Uplink', enabled: true, up: true, speed: 10000, tx_bytes: 25678901234, rx_bytes: 87654321098 },
          { idx: 3, name: 'mycocomp', enabled: true, up: true, speed: 2500, poe_power: 12.5, tx_bytes: 12345678901, rx_bytes: 5234567890 },
          { idx: 5, name: 'Proxmox', enabled: true, up: true, speed: 2500, tx_bytes: 8765432109, rx_bytes: 3456789012 },
          { idx: 7, name: 'NAS', enabled: true, up: true, speed: 2500, tx_bytes: 6543210987, rx_bytes: 2345678901 },
          { idx: 9, name: 'Office AP', enabled: true, up: true, speed: 1000, poe_power: 8.2, tx_bytes: 4321098765, rx_bytes: 1234567890 },
        ],
      },
    ],
  };
}

function getMockThreatManagement() {
  return {
    mock_data: true,
    timestamp: new Date().toISOString(),
    summary: {
      ips_events_24h: 3,
      rogue_aps_detected: 1,
      blocked_clients: 0,
    },
    recent_ips_events: [
      { time: new Date(Date.now() - 3600000).toISOString(), type: 'Port Scan', source: '45.33.32.156', destination: '192.168.0.1', action: 'block' },
      { time: new Date(Date.now() - 7200000).toISOString(), type: 'Suspicious DNS', source: '192.168.0.150', destination: '8.8.8.8', action: 'alert' },
    ],
    rogue_aps: [
      { mac: 'ff:ee:dd:cc:bb:aa', ssid: 'FreeWifi', channel: 6, signal: -75 },
    ],
    blocked_clients: [],
  };
}

// ===== Utility Functions =====

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  if (!seconds) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '0m';
}

// ===== Mock Data for Development =====

function getMockDashboardData() {
  return {
    timestamp: new Date().toISOString(),
    mock_data: true,
    wan: {
      ip: '76.23.145.67',
      isp: 'Cox Communications',
      download_speed_mbps: 940,
      upload_speed_mbps: 35,
      latency_ms: 12,
      availability: 99.9,
      status: 'ok',
    },
    lan: {
      status: 'ok',
      num_user: 15,
      num_guest: 2,
      tx_bytes_rate: 1250000,
      rx_bytes_rate: 4500000,
    },
    wifi: {
      status: 'ok',
      num_ap: 3,
      num_user: 12,
      num_guest: 2,
      tx_bytes_rate: 950000,
      rx_bytes_rate: 3200000,
    },
    devices: {
      total: 5,
      online: 5,
      offline: 0,
      list: [
        { name: 'Dream Machine Pro', model: 'UDM-Pro', mac: 'fc:ec:da:aa:bb:cc', ip: '192.168.0.1', type: 'udm', state: 'online', uptime: 2592000, version: '3.2.7', cpu: 15, mem: 45 },
        { name: 'Core Switch', model: 'USW-Pro-24-PoE', mac: 'fc:ec:da:dd:ee:ff', ip: '192.168.0.2', type: 'usw', state: 'online', uptime: 2592000, version: '7.0.23', cpu: 8, mem: 32 },
        { name: 'Office AP', model: 'U6-Pro', mac: 'fc:ec:da:11:22:33', ip: '192.168.0.10', type: 'uap', state: 'online', uptime: 2592000, version: '7.0.23' },
        { name: 'Living Room AP', model: 'U6-Lite', mac: 'fc:ec:da:44:55:66', ip: '192.168.0.11', type: 'uap', state: 'online', uptime: 2592000, version: '7.0.23' },
        { name: 'Garage AP', model: 'U6-Mesh', mac: 'fc:ec:da:77:88:99', ip: '192.168.0.12', type: 'uap', state: 'online', uptime: 2592000, version: '7.0.23' },
      ],
    },
    clients: {
      total: 17,
      wired: 5,
      wireless: 12,
      guests: 2,
      top: [
        { name: 'mycocomp', mac: 'aa:bb:cc:dd:ee:01', ip: '192.168.0.172', tx_bytes: 5234567890, rx_bytes: 12345678901, is_wired: true, signal: 0, satisfaction: 100 },
        { name: 'Proxmox-Build', mac: 'aa:bb:cc:dd:ee:02', ip: '192.168.0.202', tx_bytes: 3456789012, rx_bytes: 8765432109, is_wired: true, signal: 0, satisfaction: 100 },
        { name: 'mycosoft-sandbox-vm', mac: 'aa:bb:cc:dd:ee:03', ip: '192.168.0.103', tx_bytes: 2345678901, rx_bytes: 6543210987, is_wired: true, signal: 0, satisfaction: 100 },
        { name: 'Morgan-iPhone', mac: 'aa:bb:cc:dd:ee:04', ip: '192.168.0.150', tx_bytes: 1234567890, rx_bytes: 3456789012, is_wired: false, signal: -45, satisfaction: 98 },
        { name: 'MacBook-Pro', mac: 'aa:bb:cc:dd:ee:05', ip: '192.168.0.151', tx_bytes: 987654321, rx_bytes: 2345678901, is_wired: false, signal: -52, satisfaction: 95 },
        { name: 'Smart-TV', mac: 'aa:bb:cc:dd:ee:06', ip: '192.168.0.152', tx_bytes: 876543210, rx_bytes: 1987654321, is_wired: false, signal: -60, satisfaction: 88 },
        { name: 'iPad', mac: 'aa:bb:cc:dd:ee:07', ip: '192.168.0.153', tx_bytes: 654321098, rx_bytes: 1234567890, is_wired: false, signal: -48, satisfaction: 96 },
        { name: 'NAS', mac: 'aa:bb:cc:dd:ee:08', ip: '192.168.0.5', tx_bytes: 543210987, rx_bytes: 987654321, is_wired: true, signal: 0, satisfaction: 100 },
      ],
    },
    traffic: {
      total_tx_bytes: 25678901234,
      total_rx_bytes: 87654321098,
      top_apps: [
        { name: 'Streaming Media', category: 13, tx_bytes: 1234567890, rx_bytes: 45678901234, total_formatted: '43.7 GB' },
        { name: 'Web', category: 5, tx_bytes: 2345678901, rx_bytes: 12345678901, total_formatted: '13.7 GB' },
        { name: 'Cloud Services', category: 20, tx_bytes: 3456789012, rx_bytes: 8765432109, total_formatted: '11.4 GB' },
        { name: 'Gaming', category: 8, tx_bytes: 987654321, rx_bytes: 3456789012, total_formatted: '4.1 GB' },
        { name: 'Social Media', category: 18, tx_bytes: 654321098, rx_bytes: 2345678901, total_formatted: '2.8 GB' },
        { name: 'File Transfer', category: 3, tx_bytes: 1987654321, rx_bytes: 987654321, total_formatted: '2.8 GB' },
        { name: 'VoIP', category: 15, tx_bytes: 234567890, rx_bytes: 234567890, total_formatted: '447 MB' },
        { name: 'Email', category: 4, tx_bytes: 123456789, rx_bytes: 234567890, total_formatted: '342 MB' },
      ],
    },
    alarms: {
      total: 2,
      active: 1,
      list: [
        { id: 'alarm-001', type: 'EVT_AP_Lost_Contact', message: 'AP temporarily lost contact with controller', time: new Date(Date.now() - 3600000).toISOString(), subsystem: 'wlan' },
      ],
    },
    wifi_networks: [
      { name: 'MycoNet', enabled: true, security: 'WPA3', is_guest: false, num_sta: 10 },
      { name: 'MycoNet-IoT', enabled: true, security: 'WPA2', is_guest: false, num_sta: 5 },
      { name: 'MycoNet-Guest', enabled: true, security: 'WPA2', is_guest: true, num_sta: 2 },
    ],
  };
}

function getMockThroughput() {
  return {
    timestamp: new Date().toISOString(),
    mock_data: true,
    lan: {
      tx_bytes_rate: 1250000 + Math.random() * 500000,
      rx_bytes_rate: 4500000 + Math.random() * 1000000,
      tx_mbps: 10 + Math.random() * 4,
      rx_mbps: 36 + Math.random() * 8,
    },
    wan: {
      tx_bytes_rate: 450000 + Math.random() * 200000,
      rx_bytes_rate: 3200000 + Math.random() * 800000,
      tx_mbps: 3.6 + Math.random() * 1.6,
      rx_mbps: 25.6 + Math.random() * 6.4,
    },
  };
}

function getMockTopology() {
  return {
    mock_data: true,
    nodes: [
      { id: 'fc:ec:da:aa:bb:cc', name: 'Dream Machine Pro', type: 'gateway', model: 'UDM-Pro', ip: '192.168.0.1', state: 'online' },
      { id: 'fc:ec:da:dd:ee:ff', name: 'Core Switch', type: 'usw', model: 'USW-Pro-24-PoE', ip: '192.168.0.2', state: 'online' },
      { id: 'fc:ec:da:11:22:33', name: 'Office AP', type: 'uap', model: 'U6-Pro', ip: '192.168.0.10', state: 'online' },
      { id: 'fc:ec:da:44:55:66', name: 'Living Room AP', type: 'uap', model: 'U6-Lite', ip: '192.168.0.11', state: 'online' },
      { id: 'wired-clients', name: '5 Wired Clients', type: 'client-group', count: 5, clients: [
        { name: 'mycocomp', mac: 'aa:bb:cc:dd:ee:01', ip: '192.168.0.172' },
        { name: 'Proxmox-Build', mac: 'aa:bb:cc:dd:ee:02', ip: '192.168.0.202' },
        { name: 'mycosoft-sandbox-vm', mac: 'aa:bb:cc:dd:ee:03', ip: '192.168.0.103' },
        { name: 'NAS', mac: 'aa:bb:cc:dd:ee:08', ip: '192.168.0.5' },
        { name: 'DC1', mac: 'aa:bb:cc:dd:ee:09', ip: '192.168.0.2' },
      ]},
      { id: 'wireless-clients', name: '12 Wireless Clients', type: 'client-group', count: 12, clients: [
        { name: 'Morgan-iPhone', mac: 'aa:bb:cc:dd:ee:04', ip: '192.168.0.150', signal: -45 },
        { name: 'MacBook-Pro', mac: 'aa:bb:cc:dd:ee:05', ip: '192.168.0.151', signal: -52 },
        { name: 'Smart-TV', mac: 'aa:bb:cc:dd:ee:06', ip: '192.168.0.152', signal: -60 },
        { name: 'iPad', mac: 'aa:bb:cc:dd:ee:07', ip: '192.168.0.153', signal: -48 },
      ]},
    ],
    links: [
      { source: 'fc:ec:da:dd:ee:ff', target: 'fc:ec:da:aa:bb:cc', type: 'uplink' },
      { source: 'fc:ec:da:11:22:33', target: 'fc:ec:da:dd:ee:ff', type: 'uplink' },
      { source: 'fc:ec:da:44:55:66', target: 'fc:ec:da:dd:ee:ff', type: 'uplink' },
      { source: 'wired-clients', target: 'fc:ec:da:dd:ee:ff', type: 'wired' },
      { source: 'wireless-clients', target: 'fc:ec:da:11:22:33', type: 'wireless' },
    ],
    networks: [
      { id: 'net-001', name: 'Default', vlan: 1, subnet: '192.168.0.0/24', purpose: 'corporate' },
      { id: 'net-002', name: 'Production', vlan: 20, subnet: '192.168.20.0/24', purpose: 'corporate' },
      { id: 'net-003', name: 'Agents', vlan: 30, subnet: '192.168.30.0/24', purpose: 'corporate' },
      { id: 'net-004', name: 'IoT', vlan: 40, subnet: '192.168.40.0/24', purpose: 'guest' },
    ],
  };
}

function getMockTrafficStats() {
  return {
    mock_data: true,
    period: '24h',
    top_clients: [
      { name: 'mycocomp', mac: 'aa:bb:cc:dd:ee:01', ip: '192.168.0.172', tx_bytes: 5234567890, rx_bytes: 12345678901, total_bytes: 17580246791, tx_formatted: '4.88 GB', rx_formatted: '11.5 GB', total_formatted: '16.4 GB' },
      { name: 'Proxmox-Build', mac: 'aa:bb:cc:dd:ee:02', ip: '192.168.0.202', tx_bytes: 3456789012, rx_bytes: 8765432109, total_bytes: 12222221121, tx_formatted: '3.22 GB', rx_formatted: '8.16 GB', total_formatted: '11.4 GB' },
      { name: 'mycosoft-sandbox-vm', mac: 'aa:bb:cc:dd:ee:03', ip: '192.168.0.103', tx_bytes: 2345678901, rx_bytes: 6543210987, total_bytes: 8888889888, tx_formatted: '2.18 GB', rx_formatted: '6.09 GB', total_formatted: '8.28 GB' },
      { name: 'Morgan-iPhone', mac: 'aa:bb:cc:dd:ee:04', ip: '192.168.0.150', tx_bytes: 1234567890, rx_bytes: 3456789012, total_bytes: 4691356902, tx_formatted: '1.15 GB', rx_formatted: '3.22 GB', total_formatted: '4.37 GB' },
      { name: 'MacBook-Pro', mac: 'aa:bb:cc:dd:ee:05', ip: '192.168.0.151', tx_bytes: 987654321, rx_bytes: 2345678901, total_bytes: 3333333222, tx_formatted: '941 MB', rx_formatted: '2.18 GB', total_formatted: '3.1 GB' },
    ],
    top_categories: [
      { name: 'Streaming Media', category_id: 13, tx_bytes: 1234567890, rx_bytes: 45678901234, total_bytes: 46913469124, tx_formatted: '1.15 GB', rx_formatted: '42.5 GB', total_formatted: '43.7 GB' },
      { name: 'Web', category_id: 5, tx_bytes: 2345678901, rx_bytes: 12345678901, total_bytes: 14691357802, tx_formatted: '2.18 GB', rx_formatted: '11.5 GB', total_formatted: '13.7 GB' },
      { name: 'Cloud Services', category_id: 20, tx_bytes: 3456789012, rx_bytes: 8765432109, total_bytes: 12222221121, tx_formatted: '3.22 GB', rx_formatted: '8.16 GB', total_formatted: '11.4 GB' },
      { name: 'Gaming', category_id: 8, tx_bytes: 987654321, rx_bytes: 3456789012, total_bytes: 4444443333, tx_formatted: '941 MB', rx_formatted: '3.22 GB', total_formatted: '4.1 GB' },
      { name: 'Social Media', category_id: 18, tx_bytes: 654321098, rx_bytes: 2345678901, total_bytes: 2999999999, tx_formatted: '624 MB', rx_formatted: '2.18 GB', total_formatted: '2.8 GB' },
    ],
    hourly: [],
  };
}
