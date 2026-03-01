\"use client\";

import { useCallback, useEffect, useMemo, useState } from \"react\";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from \"recharts\";

interface GeoJsonPoint {
  type: string;
  coordinates: [number, number];
}

interface TelemetrySample {
  device_id: string;
  device_name: string;
  device_slug?: string | null;
  stream_key: string;
  stream_unit?: string | null;
  recorded_at: string;
  value_numeric?: number | null;
  value_text?: string | null;
  value_json?: Record<string, unknown> | null;
  value_unit?: string | null;
  sample_metadata?: Record<string, unknown>;
  sample_location?: GeoJsonPoint | null;
  device_location?: GeoJsonPoint | null;
}

interface TelemetryResponse {
  data: TelemetrySample[];
}

interface TelemetrySeriesPoint {
  recorded_at: string;
  value: number | null;
}

function getPointCoordinates(sample: TelemetrySample) {
  const geo = sample.device_location || sample.sample_location;
  if (!geo || !Array.isArray(geo.coordinates)) return null;
  const [lon, lat] = geo.coordinates;
  if (typeof lon !== \"number\" || typeof lat !== \"number\") return null;
  return { lon, lat };
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString();
}

function getStatus(sample: TelemetrySample) {
  const timestamp = new Date(sample.recorded_at).getTime();
  if (!timestamp) return \"unknown\";
  const minutes = (Date.now() - timestamp) / 60000;
  if (minutes <= 10) return \"online\";
  if (minutes <= 60) return \"stale\";
  return \"offline\";
}

function mapToPercent(value: number, min: number, max: number) {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

export function TelemetryDashboard() {
  const [latest, setLatest] = useState<TelemetrySample[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [series, setSeries] = useState<TelemetrySeriesPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeriesLoading, setIsSeriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(\"/api/natureos/telemetry\", {
        cache: \"no-store\",
      });
      if (!response.ok) throw new Error(\"Telemetry request failed\");
      const payload = (await response.json()) as TelemetryResponse;
      setLatest(payload.data ?? []);
      if (!selectedSlug && payload.data?.length) {
        setSelectedSlug(payload.data[0].device_slug ?? null);
      }
    } catch (err) {
      console.error(\"Telemetry dashboard error:\", err);
      setError(\"Telemetry data unavailable\");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSlug]);

  const loadSeries = useCallback(async (deviceSlug: string) => {
    setIsSeriesLoading(true);
    try {
      const response = await fetch(
        `/api/mindex/telemetry/samples?device_slug=${encodeURIComponent(
          deviceSlug
        )}&limit=200`,
        { cache: \"no-store\" }
      );
      if (!response.ok) throw new Error(\"Series request failed\");
      const payload = await response.json();
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const points = rows.map((row: any) => ({
        recorded_at: row.recorded_at,
        value:
          typeof row.value_numeric === \"number\" ? row.value_numeric : null,
      }));
      setSeries(points);
    } catch (err) {
      console.error(\"Telemetry series error:\", err);
      setSeries([]);
    } finally {
      setIsSeriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatest();
    const interval = setInterval(loadLatest, 10000);
    return () => clearInterval(interval);
  }, [loadLatest]);

  useEffect(() => {
    if (selectedSlug) loadSeries(selectedSlug);
  }, [selectedSlug, loadSeries]);

  const devices = useMemo(() => {
    const map = new Map<string, TelemetrySample>();
    latest.forEach((sample) => {
      const slug = sample.device_slug || sample.device_id;
      if (!map.has(slug)) map.set(slug, sample);
    });
    return Array.from(map.values());
  }, [latest]);

  const mapPoints = useMemo(() => {
    return devices
      .map((sample) => {
        const coords = getPointCoordinates(sample);
        if (!coords) return null;
        return { sample, ...coords };
      })
      .filter(Boolean) as Array<{
      sample: TelemetrySample;
      lon: number;
      lat: number;
    }>;
  }, [devices]);

  if (isLoading)
    return (
      <div className=\"rounded-2xl border border-white/10 bg-black/20 p-6\">
        <p className=\"text-sm text-muted-foreground\">Loading telemetry...</p>
      </div>
    );

  if (error)
    return (
      <div className=\"rounded-2xl border border-white/10 bg-black/20 p-6\">
        <p className=\"text-sm text-muted-foreground\">{error}</p>
      </div>
    );

  if (!devices.length)
    return (
      <div className=\"rounded-2xl border border-white/10 bg-black/20 p-6\">
        <p className=\"text-sm text-muted-foreground\">No telemetry available.</p>
      </div>
    );

  return (
    <div className=\"flex flex-col gap-6\">
      <div className=\"grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]\">
        <div className=\"rounded-2xl border border-white/10 bg-black/20 p-4 md:p-6\">
          <div className=\"flex items-center justify-between\">
            <h3 className=\"text-base font-semibold text-white\">Device map</h3>
            <span className=\"text-xs text-muted-foreground\">
              {mapPoints.length} located
            </span>
          </div>
          <div className=\"relative mt-4 h-[260px] w-full rounded-xl border border-white/10 bg-gradient-to-b from-black/60 to-black/20\">
            {mapPoints.map(({ sample, lon, lat }) => {
              const x = mapToPercent(lon, -180, 180);
              const y = mapToPercent(90 - lat, -90, 90);
              const status = getStatus(sample);
              const color =
                status === \"online\"
                  ? \"bg-emerald-400\"
                  : status === \"stale\"
                  ? \"bg-amber-400\"
                  : \"bg-rose-400\";
              return (
                <button
                  key={sample.device_id + sample.stream_key}
                  type=\"button\"
                  onClick={() =>
                    setSelectedSlug(sample.device_slug || sample.device_id)
                  }
                  className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${color}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={sample.device_name}
                />
              );
            })}
          </div>
        </div>

        <div className=\"rounded-2xl border border-white/10 bg-black/20 p-4 md:p-6\">
          <div className=\"flex flex-wrap items-center justify-between gap-2\">
            <h3 className=\"text-base font-semibold text-white\">
              Recent telemetry
            </h3>
            <span className=\"text-xs text-muted-foreground\">
              Last 24h (latest 200 samples)
            </span>
          </div>
          <div className=\"mt-4 h-[260px] w-full\">
            {isSeriesLoading ? (
              <div className=\"flex h-full items-center justify-center text-sm text-muted-foreground\">
                Loading series...
              </div>
            ) : (
              <ResponsiveContainer width=\"100%\" height=\"100%\">
                <LineChart data={series}>
                  <XAxis
                    dataKey=\"recorded_at\"
                    tickFormatter={formatTimestamp}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [value, \"Value\"]}
                    labelFormatter={formatTimestamp}
                  />
                  <Line
                    type=\"monotone\"
                    dataKey=\"value\"
                    stroke=\"#4ade80\"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className=\"grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3\">
        {devices.map((sample) => {
          const status = getStatus(sample);
          return (
            <button
              key={sample.device_id + sample.stream_key}
              type=\"button\"
              onClick={() =>
                setSelectedSlug(sample.device_slug || sample.device_id)
              }
              className=\"flex min-h-[44px] flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-4 text-left transition hover:border-emerald-400/50\"
            >
              <div className=\"flex items-center justify-between\">
                <span className=\"text-sm font-semibold text-white\">
                  {sample.device_name}
                </span>
                <span className=\"text-xs uppercase text-muted-foreground\">
                  {status}
                </span>
              </div>
              <div className=\"text-xs text-muted-foreground\">
                {sample.stream_key}
                {sample.stream_unit ? ` · ${sample.stream_unit}` : \"\"}
              </div>
              <div className=\"text-sm text-white\">
                {typeof sample.value_numeric === \"number\"
                  ? `${sample.value_numeric.toFixed(2)}${
                      sample.value_unit ? ` ${sample.value_unit}` : \"\"
                    }`
                  : sample.value_text || \"No numeric value\"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"

import { TelemetryGrid, telemetryGridFetcher, telemetryGridKey, TelemetryGridResponse } from "@/components/iot/telemetry-grid"
import { TelemetryCompare } from "@/components/iot/telemetry-compare"
import { TelemetryChart } from "@/components/iot/telemetry-chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TrendPoint {
  timestamp: string
  metrics: Record<string, any>
}

interface TrendSeries {
  points: TrendPoint[]
}

const METRIC_KEYS = ["temperature", "humidity", "pressure", "iaq"]

function formatTimestamp(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function TelemetryDashboard() {
  const { data, error, isLoading } = useSWR<TelemetryGridResponse>(
    telemetryGridKey,
    telemetryGridFetcher,
    { refreshInterval: 15000 }
  )

  const rows = useMemo(() => data?.rows ?? [], [data])
  const deviceOptions = useMemo(
    () =>
      rows.map((row) => ({
        id: row.device.device_id,
        label:
          row.device.device_display_name ||
          row.device.device_name ||
          row.device.device_id,
      })),
    [rows]
  )

  const [selectedId, setSelectedId] = useState<string>("")

  useEffect(() => {
    if (!selectedId && deviceOptions.length) {
      setSelectedId(deviceOptions[0].id)
    } else if (selectedId && deviceOptions.length) {
      const exists = deviceOptions.some((option) => option.id === selectedId)
      if (!exists) setSelectedId(deviceOptions[0].id)
    }
  }, [deviceOptions, selectedId])

  const trendsKey = selectedId
    ? `/api/iot/insights/trends?device_id=${encodeURIComponent(selectedId)}`
    : "/api/iot/insights/trends"

  const { data: trendsData } = useSWR<TrendSeries>(trendsKey, async (url) => {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return { points: [] }
    return response.json()
  })

  const trendSeries = useMemo(() => {
    if (!trendsData?.points?.length) return []
    return trendsData.points.map((point) => ({
      timestamp: formatTimestamp(point.timestamp),
      ...point.metrics,
    }))
  }, [trendsData])

  if (isLoading) {
    return <div className="rounded-lg border p-6">Loading telemetry...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Unable to load telemetry data.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TelemetryGrid />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Telemetry Trends</h2>
            <p className="text-sm text-muted-foreground">
              Historical sensor trends from the analytics pipeline.
            </p>
          </div>
          {deviceOptions.length ? (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-11 w-full text-base md:w-60">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {deviceOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {METRIC_KEYS.map((metric) => (
            <TelemetryChart
              key={metric}
              title={metric}
              data={trendSeries}
              dataKey={metric}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Device Comparison</h2>
        <TelemetryCompare rows={rows} />
      </div>
    </div>
  )
}
