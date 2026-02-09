/**
 * Progressive Loader - February 6, 2026
 * 
 * Progressive data loading for timeline.
 */

export type LoadPriority = 'low' | 'medium' | 'high' | 'critical';

export interface LoadRequest {
  id: string;
  type: string;
  priority: LoadPriority;
  bounds?: { north: number; south: number; east: number; west: number };
  timeRange?: { start: number; end: number };
  resolution?: 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
  onComplete?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface QueuedRequest extends LoadRequest {
  abortController: AbortController;
  startTime: number;
}

const PRIORITY_ORDER: Record<LoadPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export class ProgressiveLoader {
  private queue: QueuedRequest[] = [];
  private activeRequests: Map<string, QueuedRequest> = new Map();
  private maxConcurrent: number;
  private baseUrl: string;
  
  constructor(options: { maxConcurrent?: number; baseUrl?: string } = {}) {
    this.maxConcurrent = options.maxConcurrent || 4;
    this.baseUrl = options.baseUrl || '/api/timeline';
  }

  /**
   * Add request to queue
   */
  enqueue(request: LoadRequest): void {
    const queuedRequest: QueuedRequest = {
      ...request,
      abortController: new AbortController(),
      startTime: Date.now(),
    };
    
    this.queue.push(queuedRequest);
    this.sortQueue();
    this.processQueue();
  }

  /**
   * Cancel a pending or active request
   */
  cancel(id: string): void {
    // Cancel from queue
    const queueIdx = this.queue.findIndex(r => r.id === id);
    if (queueIdx >= 0) {
      this.queue.splice(queueIdx, 1);
    }
    
    // Cancel active request
    const active = this.activeRequests.get(id);
    if (active) {
      active.abortController.abort();
      this.activeRequests.delete(id);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    this.queue = [];
    for (const [id, request] of this.activeRequests) {
      request.abortController.abort();
    }
    this.activeRequests.clear();
  }

  /**
   * Get queue status
   */
  getStatus(): { queued: number; active: number } {
    return {
      queued: this.queue.length,
      active: this.activeRequests.size,
    };
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.startTime - b.startTime;  // FIFO within same priority
    });
  }

  /**
   * Process next items in queue
   */
  private processQueue(): void {
    while (
      this.queue.length > 0 &&
      this.activeRequests.size < this.maxConcurrent
    ) {
      const request = this.queue.shift()!;
      this.executeRequest(request);
    }
  }

  /**
   * Execute a load request
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    this.activeRequests.set(request.id, request);
    
    try {
      const params = new URLSearchParams({
        type: request.type,
        resolution: request.resolution || 'medium',
      });
      
      if (request.bounds) {
        params.append('bounds', JSON.stringify(request.bounds));
      }
      if (request.timeRange) {
        params.append('start', String(request.timeRange.start));
        params.append('end', String(request.timeRange.end));
      }
      
      const response = await fetch(
        `${this.baseUrl}/data?${params}`,
        { signal: request.abortController.signal }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        const data = await response.json();
        request.onComplete?.(data);
        return;
      }
      
      const chunks: Uint8Array[] = [];
      const contentLength = parseInt(response.headers.get('content-length') || '0');
      let receivedLength = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength > 0) {
          request.onProgress?.(receivedLength / contentLength);
        }
      }
      
      const text = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[]))
      );
      const data = JSON.parse(text);
      request.onComplete?.(data);
      
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        request.onError?.(error as Error);
      }
    } finally {
      this.activeRequests.delete(request.id);
      this.processQueue();
    }
  }
}

// Singleton
let loaderInstance: ProgressiveLoader | null = null;

export function getProgressiveLoader(options?: { maxConcurrent?: number; baseUrl?: string }): ProgressiveLoader {
  if (!loaderInstance) {
    loaderInstance = new ProgressiveLoader(options);
  }
  return loaderInstance;
}

export default ProgressiveLoader;