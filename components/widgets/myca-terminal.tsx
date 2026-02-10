"use client";

/**
 * MYCA Terminal Widget v3.0 - Consciousness Integration
 * 
 * A terminal-style display showing system-wide events from MYCA (Mycosoft Autonomous Cognitive Agent).
 * Displays real-time events in a scrolling terminal format with color-coded severity.
 * Now with Consciousness API integration for true AI conversation.
 * 
 * Updated: Feb 10, 2026
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Terminal, 
  Bot, 
  RefreshCw, 
  Pause, 
  Play, 
  Maximize2, 
  Minimize2, 
  X,
  Send,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { NLQResponse } from "@/lib/services/myca-nlq";

interface MYCAEvent {
  id: string;
  timestamp: Date;
  level: "info" | "success" | "warning" | "error" | "debug";
  source: string;
  message: string;
  agent?: string;
  metadata?: Record<string, unknown>;
}

interface MYCATerminalProps {
  className?: string;
  maxEvents?: number;
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

const LEVEL_COLORS = {
  info: "text-blue-400",
  success: "text-green-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  debug: "text-gray-400",
};

const LEVEL_PREFIXES = {
  info: "INFO",
  success: "SUCC",
  warning: "WARN",
  error: "ERRO",
  debug: "DEBG",
};

export function MYCATerminal({
  className = "",
  maxEvents = 100,
  onClose,
  onMaximize,
  isMaximized = false,
}: MYCATerminalProps) {
  const [events, setEvents] = useState<MYCAEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  
  // NLQ input state
  const [nlqQuery, setNlqQuery] = useState("");
  const [nlqLoading, setNlqLoading] = useState(false);
  const [showNlqInput, setShowNlqInput] = useState(false);
  const nlqInputRef = useRef<HTMLInputElement>(null);
  
  // Handle query submission - tries consciousness API first, then NLQ
  const handleNlqSubmit = useCallback(async () => {
    if (!nlqQuery.trim() || nlqLoading) return;
    
    setNlqLoading(true);
    
    // Add user query as event
    const userEvent: MYCAEvent = {
      id: `nlq-user-${Date.now()}`,
      timestamp: new Date(),
      level: "info",
      source: "USER",
      message: `> ${nlqQuery}`,
    };
    setEvents(prev => [userEvent, ...prev].slice(0, maxEvents));
    
    const queryText = nlqQuery;
    setNlqQuery("");
    
    try {
      // Try consciousness API first for conversational queries
      const consciousnessResponse = await fetch("/api/myca/consciousness/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          session_id: `terminal-${Date.now()}`,
        }),
      });
      
      if (consciousnessResponse.ok) {
        const consciousnessData = await consciousnessResponse.json();
        if (consciousnessData.reply) {
          const responseEvent: MYCAEvent = {
            id: `consciousness-response-${Date.now()}`,
            timestamp: new Date(),
            level: "success",
            source: "MYCA",
            message: consciousnessData.reply,
            agent: "consciousness",
          };
          setEvents(prev => [responseEvent, ...prev].slice(0, maxEvents));
          
          // Show emotional state if available
          if (consciousnessData.emotional_state) {
            const emotionEvent: MYCAEvent = {
              id: `emotion-${Date.now()}`,
              timestamp: new Date(),
              level: "debug",
              source: "SOUL",
              message: `  → Emotions: ${Object.entries(consciousnessData.emotional_state)
                .map(([k, v]) => `${k}: ${Math.round((v as number) * 100)}%`)
                .join(", ")}`,
            };
            setEvents(prev => [emotionEvent, ...prev].slice(0, maxEvents));
          }
          
          setNlqLoading(false);
          return;
        }
      }
      
      // Fall back to NLQ for data queries
      const response = await fetch("/api/myca/nlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: queryText,
          context: { currentPage: "terminal" },
          options: { maxResults: 5 },
        }),
      });
      
      if (response.ok) {
        const data: NLQResponse = await response.json();
        
        // Add MYCA response as event
        const responseEvent: MYCAEvent = {
          id: `nlq-response-${Date.now()}`,
          timestamp: new Date(),
          level: data.type === "error" ? "error" : "success",
          source: "MYCA",
          message: data.text,
          agent: "nlq-engine",
        };
        setEvents(prev => [responseEvent, ...prev].slice(0, maxEvents));
        
        // Add data items as events if present
        if (data.data && data.data.length > 0) {
          data.data.slice(0, 3).forEach((item, idx) => {
            const dataEvent: MYCAEvent = {
              id: `nlq-data-${Date.now()}-${idx}`,
              timestamp: new Date(),
              level: "debug",
              source: "DATA",
              message: `  → ${item.title}${item.subtitle ? ` (${item.subtitle})` : ""}`,
            };
            setEvents(prev => [dataEvent, ...prev].slice(0, maxEvents));
          });
        }
      } else {
        const errorEvent: MYCAEvent = {
          id: `nlq-error-${Date.now()}`,
          timestamp: new Date(),
          level: "error",
          source: "MYCA",
          message: "Query failed. Please try again.",
        };
        setEvents(prev => [errorEvent, ...prev].slice(0, maxEvents));
      }
    } catch (error) {
      const errorEvent: MYCAEvent = {
        id: `nlq-error-${Date.now()}`,
        timestamp: new Date(),
        level: "error",
        source: "SYSTEM",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
      setEvents(prev => [errorEvent, ...prev].slice(0, maxEvents));
    } finally {
      setNlqLoading(false);
    }
  }, [nlqQuery, nlqLoading, maxEvents]);

  const fetchEvents = useCallback(async () => {
    if (isPaused) return;
    
    try {
      const [activityRes, mycaRes, deviceRes] = await Promise.allSettled([
        fetch("/api/natureos/activity").then(r => r.ok ? r.json() : { events: [] }),
        fetch("/api/myca/events").then(r => r.ok ? r.json() : { events: [] }),
        fetch("/api/mycobrain/events").then(r => r.ok ? r.json() : { events: [] }),
      ]);

      const allEvents: MYCAEvent[] = [];

      // Parse activity events
      if (activityRes.status === "fulfilled" && activityRes.value.events) {
        activityRes.value.events.forEach((e: any) => {
          allEvents.push({
            id: e.id || `act-${Date.now()}-${Math.random()}`,
            timestamp: new Date(e.timestamp || Date.now()),
            level: e.status === "error" ? "error" : e.status === "warning" ? "warning" : "info",
            source: "MAS",
            message: e.message || "System event",
            metadata: e,
          });
        });
      }

      // Parse MYCA events
      if (mycaRes.status === "fulfilled" && mycaRes.value.events) {
        mycaRes.value.events.forEach((e: any) => {
          allEvents.push({
            id: e.id || `myca-${Date.now()}-${Math.random()}`,
            timestamp: new Date(e.timestamp || Date.now()),
            level: e.level || "info",
            source: "MYCA",
            message: e.message || "Agent event",
            agent: e.agent,
            metadata: e,
          });
        });
      }

      // Parse device events
      if (deviceRes.status === "fulfilled" && deviceRes.value.events) {
        deviceRes.value.events.forEach((e: any) => {
          allEvents.push({
            id: e.id || `dev-${Date.now()}-${Math.random()}`,
            timestamp: new Date(e.timestamp || Date.now()),
            level: e.connected ? "success" : "warning",
            source: "DEVICE",
            message: `${e.device_id || "Device"}: ${e.message || (e.connected ? "Online" : "Offline")}`,
            metadata: e,
          });
        });
      }

      // Add simulated MYCA agent events for demonstration
      const now = new Date();
      const simulatedEvents: MYCAEvent[] = [
        {
          id: `sim-1-${now.getTime()}`,
          timestamp: new Date(now.getTime() - 1000),
          level: "info",
          source: "MYCA",
          message: "Orchestrator: 42 agents active, 7 in_progress tasks",
          agent: "orchestrator",
        },
        {
          id: `sim-2-${now.getTime()}`,
          timestamp: new Date(now.getTime() - 5000),
          level: "success",
          source: "MINDEX",
          message: "ETL pipeline: Synced 1,247 observations from iNaturalist",
        },
        {
          id: `sim-3-${now.getTime()}`,
          timestamp: new Date(now.getTime() - 15000),
          level: "debug",
          source: "N8N",
          message: "Workflow 'weather-sync' completed in 2.3s",
        },
      ];

      allEvents.push(...simulatedEvents);

      // Sort by timestamp (newest first) and limit
      allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setEvents(allEvents.slice(0, maxEvents));
      setLastUpdate(new Date());
    } catch (error) {
      console.error("MYCA Terminal: Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isPaused, maxEvents]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
    autoScrollRef.current = isAtBottom;
  };

  return (
    <Card className={`bg-gray-950 border-gray-800 ${className}`}>
      <CardHeader className="py-2 px-3 border-b border-gray-800 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2 text-green-400 font-mono">
          <Terminal className="h-4 w-4" />
          MYCA TERMINAL
          {!isPaused && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] font-mono text-gray-400 border-gray-700">
            {events.length} events
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${showNlqInput ? "text-purple-400" : "text-gray-400"} hover:text-purple-400`}
            onClick={() => {
              setShowNlqInput(!showNlqInput);
              setTimeout(() => nlqInputRef.current?.focus(), 100);
            }}
            title="Ask MYCA (NLQ)"
          >
            <Sparkles className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={fetchEvents}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {onMaximize && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-white"
              onClick={onMaximize}
            >
              {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-red-400"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      {/* NLQ Input Bar */}
      {showNlqInput && (
        <div className="px-3 py-2 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <Input
              ref={nlqInputRef}
              value={nlqQuery}
              onChange={(e) => setNlqQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNlqSubmit()}
              placeholder="Ask MYCA... (e.g., 'show agent status', 'list errors')"
              className="h-7 text-xs bg-transparent border-gray-700 text-gray-200 placeholder:text-gray-500 focus:border-purple-500"
              disabled={nlqLoading}
            />
            <Button
              size="sm"
              className="h-7 px-2 bg-purple-600 hover:bg-purple-700"
              onClick={handleNlqSubmit}
              disabled={nlqLoading || !nlqQuery.trim()}
            >
              {nlqLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
      <CardContent className="p-0">
        <ScrollArea className={isMaximized ? "h-[600px]" : "h-[200px]"}>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="p-2 font-mono text-xs space-y-0.5"
          >
            {isLoading && events.length === 0 ? (
              <div className="text-gray-500 animate-pulse">
                Connecting to MYCA...
              </div>
            ) : events.length === 0 ? (
              <div className="text-gray-500">
                No events. System idle.
              </div>
            ) : (
              [...events].reverse().map((event) => (
                <div key={event.id} className="flex gap-2 leading-relaxed">
                  <span className="text-gray-600">[{formatTimestamp(event.timestamp)}]</span>
                  <span className={LEVEL_COLORS[event.level]}>
                    [{LEVEL_PREFIXES[event.level]}]
                  </span>
                  <span className="text-cyan-400">[{event.source}]</span>
                  {event.agent && (
                    <span className="text-purple-400">[{event.agent}]</span>
                  )}
                  <span className="text-gray-300 flex-1">{event.message}</span>
                </div>
              ))
            )}
            {isPaused && (
              <div className="text-yellow-400 mt-2">
                ⏸ Stream paused
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default MYCATerminal;
