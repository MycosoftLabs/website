/**
 * Unified Animation Controller
 * February 4, 2026
 * 
 * Centralizes all requestAnimationFrame loops for Earth-2 layers
 * Implements frame rate limiting (30fps for weather, 60fps for entities)
 * Priority queue for layer updates to prevent lag
 */

type AnimationCallback = (deltaTime: number, timestamp: number) => void;

interface AnimationSubscriber {
  id: string;
  callback: AnimationCallback;
  priority: "high" | "normal" | "low";
  targetFps: number;
  lastExecuted: number;
  enabled: boolean;
}

interface AnimationControllerOptions {
  maxFps?: number;
  enableAdaptiveFps?: boolean;
  performanceThreshold?: number; // ms, frame time above this triggers adaptive slowdown
}

class AnimationController {
  private static instance: AnimationController | null = null;
  
  private subscribers: Map<string, AnimationSubscriber> = new Map();
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private lastTimestamp: number = 0;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  private adaptiveFpsMultiplier: number = 1;
  
  private readonly maxFps: number;
  private readonly minFrameTime: number;
  private readonly enableAdaptiveFps: boolean;
  private readonly performanceThreshold: number;

  private constructor(options: AnimationControllerOptions = {}) {
    this.maxFps = options.maxFps ?? 60;
    this.minFrameTime = 1000 / this.maxFps;
    this.enableAdaptiveFps = options.enableAdaptiveFps ?? true;
    this.performanceThreshold = options.performanceThreshold ?? 20; // 20ms = ~50fps
  }

  public static getInstance(options?: AnimationControllerOptions): AnimationController {
    if (!AnimationController.instance) {
      AnimationController.instance = new AnimationController(options);
    }
    return AnimationController.instance;
  }

  /**
   * Subscribe to animation updates
   * @param id Unique identifier for this subscriber
   * @param callback Function to call on each frame
   * @param options Subscription options
   * @returns Unsubscribe function
   */
  public subscribe(
    id: string,
    callback: AnimationCallback,
    options: {
      priority?: "high" | "normal" | "low";
      targetFps?: number;
    } = {}
  ): () => void {
    const subscriber: AnimationSubscriber = {
      id,
      callback,
      priority: options.priority ?? "normal",
      targetFps: options.targetFps ?? 30,
      lastExecuted: 0,
      enabled: true,
    };

    this.subscribers.set(id, subscriber);

    // Start the animation loop if not already running
    if (!this.isRunning) {
      this.start();
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(id);
    };
  }

  /**
   * Unsubscribe from animation updates
   */
  public unsubscribe(id: string): void {
    this.subscribers.delete(id);

    // Stop the loop if no subscribers
    if (this.subscribers.size === 0) {
      this.stop();
    }
  }

  /**
   * Enable/disable a subscriber
   */
  public setEnabled(id: string, enabled: boolean): void {
    const subscriber = this.subscribers.get(id);
    if (subscriber) {
      subscriber.enabled = enabled;
    }
  }

  /**
   * Update target FPS for a subscriber
   */
  public setTargetFps(id: string, fps: number): void {
    const subscriber = this.subscribers.get(id);
    if (subscriber) {
      subscriber.targetFps = fps;
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): {
    fps: number;
    frameTime: number;
    subscriberCount: number;
    adaptiveFpsMultiplier: number;
  } {
    const avgFps = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      : 0;
    
    return {
      fps: Math.round(avgFps),
      frameTime: avgFps > 0 ? Math.round(1000 / avgFps) : 0,
      subscriberCount: this.subscribers.size,
      adaptiveFpsMultiplier: this.adaptiveFpsMultiplier,
    };
  }

  private start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.animationLoop(this.lastTimestamp);
  }

  private stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isRunning = false;
  }

  private animationLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const deltaTime = timestamp - this.lastTimestamp;
    
    // Skip if too fast (frame rate limiting)
    if (deltaTime < this.minFrameTime * this.adaptiveFpsMultiplier) {
      this.animationFrameId = requestAnimationFrame(this.animationLoop);
      return;
    }

    this.lastTimestamp = timestamp;
    this.frameCount++;

    // Calculate FPS
    const fps = 1000 / deltaTime;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    // Adaptive FPS adjustment
    if (this.enableAdaptiveFps && deltaTime > this.performanceThreshold) {
      this.adaptiveFpsMultiplier = Math.min(2, this.adaptiveFpsMultiplier + 0.1);
    } else if (this.adaptiveFpsMultiplier > 1) {
      this.adaptiveFpsMultiplier = Math.max(1, this.adaptiveFpsMultiplier - 0.01);
    }

    // Sort subscribers by priority
    const sortedSubscribers = Array.from(this.subscribers.values())
      .filter(s => s.enabled)
      .sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    // Execute callbacks based on their target FPS
    for (const subscriber of sortedSubscribers) {
      const timeSinceLastExec = timestamp - subscriber.lastExecuted;
      const targetFrameTime = 1000 / subscriber.targetFps;

      if (timeSinceLastExec >= targetFrameTime * this.adaptiveFpsMultiplier) {
        try {
          subscriber.callback(timeSinceLastExec, timestamp);
          subscriber.lastExecuted = timestamp;
        } catch (error) {
          console.error(`[AnimationController] Error in subscriber ${subscriber.id}:`, error);
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animationLoop);
  };

  /**
   * Reset the controller (for testing or reinitializing)
   */
  public reset(): void {
    this.stop();
    this.subscribers.clear();
    this.fpsHistory = [];
    this.adaptiveFpsMultiplier = 1;
    this.frameCount = 0;
  }

  /**
   * Destroy the singleton instance
   */
  public static destroy(): void {
    if (AnimationController.instance) {
      AnimationController.instance.reset();
      AnimationController.instance = null;
    }
  }
}

// Export singleton accessor
export function getAnimationController(options?: AnimationControllerOptions): AnimationController {
  return AnimationController.getInstance(options);
}

// Export type for external use
export type { AnimationCallback, AnimationControllerOptions };

// Utility hook for React components
export function useAnimationSubscription(
  id: string,
  callback: AnimationCallback,
  options: {
    priority?: "high" | "normal" | "low";
    targetFps?: number;
    enabled?: boolean;
  } = {}
): void {
  // This is a placeholder for React hook implementation
  // In actual use, this would use useEffect to subscribe/unsubscribe
  // The actual implementation would be in a separate React-specific file
}

export default AnimationController;
