/**
 * Frame Controller - February 6, 2026
 * 
 * Adaptive frame rate control for timeline scrubbing.
 */

export interface FrameControllerOptions {
  targetFPS?: number;
  scrubbingFPS?: number;
  minFPS?: number;
}

export type FrameCallback = (timestamp: number, deltaTime: number) => void;

export class FrameController {
  private targetFPS: number;
  private scrubbingFPS: number;
  private minFPS: number;
  
  private currentFPS: number;
  private isDragging: boolean = false;
  private lastFrameTime: number = 0;
  private frameInterval: number;
  private animationId: number | null = null;
  
  private callbacks: Set<FrameCallback> = new Set();
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private measuredFPS: number = 0;
  
  constructor(options: FrameControllerOptions = {}) {
    this.targetFPS = options.targetFPS || 60;
    this.scrubbingFPS = options.scrubbingFPS || 15;
    this.minFPS = options.minFPS || 10;
    
    this.currentFPS = this.targetFPS;
    this.frameInterval = 1000 / this.currentFPS;
  }

  /**
   * Start the render loop
   */
  start(): void {
    if (this.animationId !== null) return;
    
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.frameCount = 0;
    
    this.loop();
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Subscribe to frame updates
   */
  subscribe(callback: FrameCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Notify start of timeline scrubbing
   */
  onScrubbingStart(): void {
    this.isDragging = true;
    this.setFPS(this.scrubbingFPS);
  }

  /**
   * Notify end of timeline scrubbing
   */
  onScrubbingEnd(): void {
    this.isDragging = false;
    this.setFPS(this.targetFPS);
    this.forceRender();
  }

  /**
   * Force an immediate full-quality render
   */
  forceRender(): void {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    for (const callback of this.callbacks) {
      callback(now, deltaTime);
    }
  }

  /**
   * Check if current frame should be rendered
   */
  shouldRenderFrame(): boolean {
    const elapsed = performance.now() - this.lastFrameTime;
    return elapsed >= this.frameInterval;
  }

  /**
   * Get current measured FPS
   */
  getMeasuredFPS(): number {
    return this.measuredFPS;
  }

  /**
   * Get current target FPS
   */
  getTargetFPS(): number {
    return this.currentFPS;
  }

  /**
   * Is currently scrubbing
   */
  isScrubbing(): boolean {
    return this.isDragging;
  }

  /**
   * Set target FPS
   */
  private setFPS(fps: number): void {
    this.currentFPS = Math.max(this.minFPS, fps);
    this.frameInterval = 1000 / this.currentFPS;
  }

  /**
   * Main render loop
   */
  private loop = (): void => {
    this.animationId = requestAnimationFrame(this.loop);
    
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    // Track FPS
    this.frameCount++;
    if (now - this.fpsUpdateTime >= 1000) {
      this.measuredFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }
    
    // Only render if enough time has passed
    if (elapsed < this.frameInterval) return;
    
    this.lastFrameTime = now - (elapsed % this.frameInterval);
    
    // Call all subscribers
    for (const callback of this.callbacks) {
      callback(now, elapsed);
    }
  };
}

// Singleton
let frameControllerInstance: FrameController | null = null;

export function getFrameController(options?: FrameControllerOptions): FrameController {
  if (!frameControllerInstance) {
    frameControllerInstance = new FrameController(options);
  }
  return frameControllerInstance;
}

export default FrameController;