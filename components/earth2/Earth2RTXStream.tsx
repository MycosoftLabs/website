"use client";

/**
 * Earth-2 RTX Stream Component - February 5, 2026
 *
 * WebRTC streaming component for receiving NVIDIA Omniverse RTX
 * rendered Earth-2 visualization in the browser.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";

interface Earth2RTXStreamProps {
  signalingUrl?: string;
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface StreamConfig {
  signalingUrl: string;
  e2ccUrl: string;
  iceServers: RTCIceServer[];
  resolution: [number, number];
  bitrate: number;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "failed";

export default function Earth2RTXStream({
  signalingUrl = "ws://localhost:8212/ws",
  autoConnect = true,
  onConnected,
  onDisconnected,
  onError,
  className = "",
}: Earth2RTXStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [config, setConfig] = useState<StreamConfig | null>(null);
  const [stats, setStats] = useState<{
    fps: number;
    bitrate: number;
    latency: number;
  }>({ fps: 0, bitrate: 0, latency: 0 });

  // Fetch streaming configuration
  useEffect(() => {
    async function fetchConfig() {
      try {
        const resp = await fetch("http://localhost:8210/stream/config");
        if (resp.ok) {
          const data = await resp.json();
          setConfig(data);
        }
      } catch (e) {
        console.error("[E2RTX] Failed to fetch config:", e);
        // Use defaults
        setConfig({
          signalingUrl,
          e2ccUrl: "http://localhost:8211",
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          resolution: [1920, 1080],
          bitrate: 10000000,
        });
      }
    }
    fetchConfig();
  }, [signalingUrl]);

  // Initialize WebRTC connection
  const connect = useCallback(async () => {
    if (!config) return;

    setConnectionState("connecting");

    try {
      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: config.iceServers,
      });
      pcRef.current = pc;

      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log("[E2RTX] Received track:", event.track.kind);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "ice_candidate",
              candidate: event.candidate,
            })
          );
        }
      };

      // Connection state changes
      pc.onconnectionstatechange = () => {
        console.log("[E2RTX] Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setConnectionState("connected");
          onConnected?.();
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          setConnectionState("failed");
          onDisconnected?.();
        }
      };

      // Connect to signaling server
      const ws = new WebSocket(config.signalingUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[E2RTX] Signaling connected");
        ws.send(
          JSON.stringify({
            type: "request_stream",
            resolution: config.resolution,
          })
        );
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "offer":
            // Receive offer from Omniverse
            await pc.setRemoteDescription(
              new RTCSessionDescription(message.sdp)
            );
            // Create answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(
              JSON.stringify({
                type: "answer",
                sdp: answer,
              })
            );
            break;

          case "ice_candidate":
            if (message.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
            break;

          case "stream_ready":
            console.log("[E2RTX] Stream ready");
            break;

          case "error":
            console.error("[E2RTX] Server error:", message.message);
            onError?.(new Error(message.message));
            break;
        }
      };

      ws.onerror = (error) => {
        console.error("[E2RTX] WebSocket error:", error);
        setConnectionState("failed");
        onError?.(new Error("WebSocket connection failed"));
      };

      ws.onclose = () => {
        console.log("[E2RTX] Signaling disconnected");
        if (connectionState === "connected") {
          setConnectionState("disconnected");
          onDisconnected?.();
        }
      };
    } catch (error) {
      console.error("[E2RTX] Connection error:", error);
      setConnectionState("failed");
      onError?.(error as Error);
    }
  }, [config, connectionState, onConnected, onDisconnected, onError]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState("disconnected");
  }, []);

  // Send command to Omniverse
  const sendCommand = useCallback(
    (command: string, data: Record<string, unknown>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: command,
            ...data,
          })
        );
      }
    },
    []
  );

  // Auto-connect
  useEffect(() => {
    if (autoConnect && config && connectionState === "disconnected") {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, config, connectionState, connect, disconnect]);

  // Stats collection
  useEffect(() => {
    if (connectionState !== "connected" || !pcRef.current) return;

    const interval = setInterval(async () => {
      const stats = await pcRef.current?.getStats();
      stats?.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          const fps = report.framesPerSecond || 0;
          const bytesReceived = report.bytesReceived || 0;
          setStats((prev) => ({
            fps: Math.round(fps),
            bitrate: Math.round((bytesReceived * 8) / 1000000),
            latency: prev.latency,
          }));
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionState]);

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      {/* Video stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      {/* Connection overlay */}
      {connectionState !== "connected" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            {connectionState === "connecting" && (
              <>
                <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white">Connecting to Earth-2 RTX...</p>
              </>
            )}
            {connectionState === "disconnected" && (
              <>
                <p className="text-white mb-4">Earth-2 RTX Stream</p>
                <button
                  onClick={connect}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Connect
                </button>
              </>
            )}
            {connectionState === "failed" && (
              <>
                <p className="text-red-500 mb-4">Connection failed</p>
                <button
                  onClick={connect}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats overlay */}
      {connectionState === "connected" && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {stats.fps} FPS | {stats.bitrate} Mbps
        </div>
      )}
    </div>
  );
}

// Hook for controlling the stream
export function useEarth2Stream() {
  const wsRef = useRef<WebSocket | null>(null);

  const setWebSocket = (ws: WebSocket | null) => {
    wsRef.current = ws;
  };

  const toggleLayer = (layer: string, visible: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "layer_toggle",
          layer,
          visible,
        })
      );
    }
  };

  const setTime = (time: string, animate = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "set_time",
          time,
          animate,
        })
      );
    }
  };

  const setBounds = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "set_bounds",
          ...bounds,
        })
      );
    }
  };

  const runModel = (model: string, params: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "run_model",
          model,
          ...params,
        })
      );
    }
  };

  return {
    setWebSocket,
    toggleLayer,
    setTime,
    setBounds,
    runModel,
  };
}
