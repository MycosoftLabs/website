'use client';

/**
 * MemoryManagementPanel - February 9, 2026
 *
 * Provides memory export, import, and cleanup controls
 * with real-time memory statistics.
 */

import { useState, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Upload,
  Trash2,
  Database,
  HardDrive,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface MemoryStats {
  totalMemories: number;
  totalSizeBytes: number;
  oldestMemoryDate: string;
  layerBreakdown: Record<string, { count: number; sizeBytes: number }>;
}

interface OperationResult {
  success: boolean;
  message: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Memory API error: ${r.status}`);
    return r.json();
  });

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

const CLEANUP_AGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
] as const;

export function MemoryManagementPanel() {
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
    mutate: refreshStats,
  } = useSWR<MemoryStats>('/api/memory/stats', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupAgeDays, setCleanupAgeDays] = useState(30);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearResult = useCallback(() => {
    setTimeout(() => setOperationResult(null), 4000);
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setOperationResult(null);
    try {
      const response = await fetch('/api/memory/export', { method: 'POST' });
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mycosoft-memory-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOperationResult({ success: true, message: 'Memory exported successfully' });
    } catch (err) {
      setOperationResult({
        success: false,
        message: err instanceof Error ? err.message : 'Export failed',
      });
    } finally {
      setIsExporting(false);
      clearResult();
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setOperationResult(null);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const response = await fetch('/api/memory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });
      if (!response.ok) throw new Error(`Import failed: ${response.status}`);
      const result = await response.json();
      setOperationResult({
        success: true,
        message: result.message || 'Memory imported successfully',
      });
      refreshStats();
    } catch (err) {
      setOperationResult({
        success: false,
        message: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      clearResult();
    }
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    setShowCleanupConfirm(false);
    setOperationResult(null);
    try {
      const response = await fetch('/api/memory/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageDays: cleanupAgeDays }),
      });
      if (!response.ok) throw new Error(`Cleanup failed: ${response.status}`);
      const result = await response.json();
      setOperationResult({
        success: true,
        message: result.message || `Cleaned up memories older than ${cleanupAgeDays} days`,
      });
      refreshStats();
    } catch (err) {
      setOperationResult({
        success: false,
        message: err instanceof Error ? err.message : 'Cleanup failed',
      });
    } finally {
      setIsCleaning(false);
      clearResult();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Memory Management
            </CardTitle>
            <CardDescription>Export, import, and manage memory data</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refreshStats()}
            disabled={statsLoading}
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistics Section */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">Current Statistics</h4>
          {statsLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : statsError ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              No data available
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-2xl font-bold">{stats.totalMemories.toLocaleString()}</div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Database className="h-3 w-3" />
                  Total Memories
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-2xl font-bold">{formatBytes(stats.totalSizeBytes)}</div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <HardDrive className="h-3 w-3" />
                  Total Size
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-2xl font-bold">{formatDate(stats.oldestMemoryDate)}</div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Oldest Memory
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border p-3 text-center text-sm text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Layer Breakdown */}
        {stats?.layerBreakdown && Object.keys(stats.layerBreakdown).length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Layer Breakdown</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.layerBreakdown).map(([layer, info]) => (
                <Badge key={layer} variant="secondary" className="text-xs">
                  {layer}: {info.count.toLocaleString()} ({formatBytes(info.sizeBytes)})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Operation Result */}
        {operationResult && (
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
              operationResult.success
                ? 'border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400'
                : 'border-destructive/20 bg-destructive/5 text-destructive'
            }`}
          >
            {operationResult.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {operationResult.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Export */}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || isImporting || isCleaning}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Memory
          </Button>

          {/* Import */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="memory-import-input"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExporting || isImporting || isCleaning}
              className="gap-2"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import Memory
            </Button>
          </div>

          {/* Cleanup */}
          {!showCleanupConfirm ? (
            <Button
              variant="outline"
              onClick={() => setShowCleanupConfirm(true)}
              disabled={isExporting || isImporting || isCleaning}
              className="gap-2 text-destructive hover:text-destructive"
            >
              {isCleaning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Cleanup Old Memories
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <span className="text-sm text-destructive">Delete memories older than:</span>
              <select
                value={cleanupAgeDays}
                onChange={(e) => setCleanupAgeDays(Number(e.target.value))}
                className="rounded border bg-background px-2 py-1 text-sm"
              >
                {CLEANUP_AGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCleanup}
                disabled={isCleaning}
              >
                {isCleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCleanupConfirm(false)}
                disabled={isCleaning}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
