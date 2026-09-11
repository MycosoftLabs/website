import { createOverviewRecord, type OverviewSnapshot } from "@/lib/fusarium/overview/contracts"
import type { ScenarioSimFrame } from "./contracts"

export function applyScenarioSimToOverview(snapshot: OverviewSnapshot, frame: ScenarioSimFrame): OverviewSnapshot {
  if (!frame.running) return snapshot
  const { context, generatedAt: now } = snapshot
  const v = frame.variables
  const nlmNote = v.nlm.loaded
    ? `${v.nlm.weights.length} real checkpoint(s). loaded=${String(v.nlm.loaded)} forecast_qualified=false p=null`
    : "NLM service polled. No invented p. Weights listed only when MAS returns them."
  const card = (
    recordId: string,
    surface: string,
    payload: { title: string; summary: string; kicker?: string; location?: string; nextStep?: string; details?: { label: string; value: string }[] },
    basis: string,
  ) =>
    createOverviewRecord({
      recordId,
      missionAreaId: context.missionAreaId,
      now,
      payload,
      state: "simulated",
      condition: "simulated",
      source: "fusarium-scenario-sim",
      surface,
      reason: "Fort Stewart ITDX training packet. SYNTHETIC EXERCISE. live=false.",
      dataMode: "simulated",
      sourceIds: ["itdx-replay-core", "itdx-lab-catalog", frame.runId],
      provenanceRef: `exercise://${frame.runId}/${recordId}`,
      confidence: { score: null, label: "not_assessed", basis },
      staleAfterSeconds: 3600,
      demo: true,
    })

  return {
    ...snapshot,
    operationalPosture: card(
      "sim-posture",
      "Overview / Operational posture",
      {
        kicker: "SYNTHETIC EXERCISE · live=false",
        title: "Fort Stewart interop simulation is running",
        summary: `${v.scenarioName} · ${v.intelBeat.title}. ${v.units.length} authored markers stepping on the shared clock.`,
        location: frame.ao.place,
        nextStep: "Open Earth Simulator for movement and ITDX for briefing / Algorithm Lab.",
        details: [
          { label: "Clock", value: frame.clockIso },
          { label: "Index", value: `${frame.index}/${v.movement.sampleCount}` },
          { label: "NLM", value: nlmNote },
        ],
      },
      "Shared scenario bus. Not a live COP.",
    ),
    environmentalPicture: card(
      "sim-picture",
      "Overview / Environmental picture",
      {
        kicker: "AO-CAPPED · NON-LIVE",
        title: frame.ao.place,
        summary: `AO ${frame.ao.lng}, ${frame.ao.lat}. Weather is a simulation cite (${v.weather.nwsCwa}). Live Earth Sim layers stay off unless the operator enables Live Data.`,
        location: frame.ao.place,
        details: [
          { label: "Weather", value: v.weather.temperatureC == null ? "CITE ONLY · NO INVENTED TEMP" : `${v.weather.temperatureC}°C Open-Meteo cite` },
          { label: "Movement", value: v.movement.replayTime || "replay" },
          { label: "Catalog doc", value: v.documentName },
        ],
        nextStep: "Keep CREP filters off for the all-off smoothness check.",
      },
      "ITDX replay-core + packaged catalog.",
    ),
    oeiBrief: card(
      "sim-intel",
      "Overview / OEI situation brief",
      {
        kicker: "SYNTHETIC EXERCISE",
        title: v.intelBeat.title,
        summary: v.intelBeat.question,
        nextStep: "Official Army injects remain NOT_SUPPLIED.",
      },
      "Training PIRs from synthetic-briefing.ts.",
    ),
    activity: [
      card(
        "sim-activity",
        "Overview / Activity timeline",
        {
          kicker: `T+${frame.index} · INTEROP`,
          title: "Simulation test stepping all bound surfaces",
          summary: `Duty ${v.personnel.personaTitle}. Scenario ${v.scenarioId}. ${v.nlm.weights.length} NLM weight row(s) from MAS.`,
          nextStep: "Confirm Earth Sim movement and ITDX briefing share this clock.",
        },
        "Scenario bus tick.",
      ),
      ...snapshot.activity.filter((row) => row.status.condition !== "loading"),
    ],
  }
}
