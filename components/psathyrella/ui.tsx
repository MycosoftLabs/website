"use client";

/**
 * Psathyrella GCS — shared tactical UI primitives.
 * Palette mirrors the CREP ground-station aesthetic: #0a0f1e glass, cyan-500
 * borders, status LEDs. Keep these dependency-free (React + cn + lucide only).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Scales its content down so it always fits the available height — never scrolls.
 * Transform-only (constant layout width) so the ResizeObserver can't oscillate.
 */
export function FitScale({ children, min = 0.58, className }: { children: ReactNode; min?: number; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const compute = () => {
      const avail = outer.clientHeight;
      const needed = inner.scrollHeight;
      if (avail && needed) setScale(needed > avail + 1 ? Math.max(min, avail / needed) : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [min]);
  return (
    <div ref={outerRef} className={cn("h-full w-full overflow-hidden", className)}>
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

export type LedColor = "green" | "amber" | "red" | "cyan" | "slate";

const LED_CLASS: Record<LedColor, string> = {
  green: "bg-green-400 shadow-[0_0_6px] shadow-green-400/60",
  amber: "bg-amber-400 shadow-[0_0_6px] shadow-amber-400/60",
  red: "bg-red-500 shadow-[0_0_6px] shadow-red-500/60",
  cyan: "bg-cyan-400 shadow-[0_0_6px] shadow-cyan-400/60",
  slate: "bg-slate-600",
};

export function StatLED({ color, pulse, className }: { color: LedColor; pulse?: boolean; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", LED_CLASS[color], pulse && "animate-pulse", className)} />;
}

export function Panel({
  title,
  icon,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("psa-glass flex flex-col overflow-hidden rounded-xl", className)}>
      {title !== undefined && (
        <div className="flex items-center justify-between gap-2 border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent px-3 py-2">
          <div className="flex items-center gap-2 text-cyan-300">
            {icon}
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">{title}</span>
          </div>
          {right}
        </div>
      )}
      <div className={cn("min-h-0 flex-1 overflow-hidden px-3 py-2.5", bodyClassName)}>
        <FitScale>{children}</FitScale>
      </div>
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-1 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60", className)}>{children}</div>;
}

/** A labelled numeric readout. Renders "—" / standby when value is null. */
export function Readout({
  label,
  value,
  unit,
  status = "ok",
  className,
}: {
  label: ReactNode;
  value: number | string | null | undefined;
  unit?: string;
  status?: "ok" | "warn" | "crit" | "idle";
  className?: string;
}) {
  const has = value !== null && value !== undefined && value !== "";
  const valueColor = !has
    ? "text-slate-600"
    : status === "crit"
      ? "text-red-400"
      : status === "warn"
        ? "text-amber-300"
        : status === "idle"
          ? "text-slate-400"
          : "text-white";
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-[9px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className={cn("font-mono text-sm leading-tight tabular-nums", valueColor)}>
        {has ? value : "—"}
        {has && unit ? <span className="ml-0.5 text-[10px] text-slate-500">{unit}</span> : null}
      </span>
    </div>
  );
}

/** Thin horizontal meter (0..1 fill). */
export function Bar({ value, color = "cyan", className }: { value: number | null; color?: "cyan" | "green" | "amber" | "red" | "blue"; className?: string }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  const fill = { cyan: "bg-cyan-400", green: "bg-green-400", amber: "bg-amber-400", red: "bg-red-500", blue: "bg-sky-400" }[color];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/5", className)}>
      <div className={cn("h-full rounded-full transition-all duration-300", value === null ? "bg-slate-700" : fill)} style={{ width: `${value === null ? 18 : pct}%`, opacity: value === null ? 0.4 : 1 }} />
    </div>
  );
}

export function TacButton({
  children,
  onClick,
  active,
  tone = "default",
  disabled,
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  tone?: "default" | "danger" | "go";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const toneClass =
    tone === "danger"
      ? active
        ? "border-red-500/60 bg-red-500/20 text-red-200"
        : "border-red-500/30 text-red-300/80 hover:border-red-500/50 hover:bg-red-500/10"
      : tone === "go"
        ? active
          ? "border-green-500/60 bg-green-500/20 text-green-200"
          : "border-green-500/30 text-green-300/80 hover:border-green-500/50 hover:bg-green-500/10"
        : active
          ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-100"
          : "border-white/10 text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10";
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "psa-glass-btn inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        "disabled:cursor-not-allowed disabled:opacity-40",
        toneClass,
        className
      )}
    >
      {children}
    </button>
  );
}

/** Centered "no feed" overlay used by sensor scopes that have no live source. */
export function NoFeed({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 text-center">
      <div className="rounded-md border border-amber-500/30 bg-black/50 px-3 py-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300/90">{label}</span>
      </div>
      {sub ? <span className="text-[10px] uppercase tracking-wider text-slate-500">{sub}</span> : null}
    </div>
  );
}

export function ViewBadge({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-3 top-3 z-10 rounded-md border border-cyan-500/20 bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
      {children}
    </div>
  );
}

/**
 * Touch-first bottom sheet for tablet/portrait, where the desktop side panels are
 * hidden. Self-contained (no external dialog dep). Renders a fixed-height body so
 * the inner Panel scrolls internally with ≥44px touch targets.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="psa-glass absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl border-t shadow-2xl shadow-black/60 duration-200 animate-in slide-in-from-bottom">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2 text-cyan-200">
            {icon}
            <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[72vh] overflow-hidden px-2 pb-3">{children}</div>
      </div>
    </div>
  );
}
