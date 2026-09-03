export type BiologyModelId = "logistic" | "exponential" | "competition" | "sir"
export type BiologyScaleId = "cell-culture" | "fungal-colony" | "microbial-culture" | "population"
export interface BiologyScenario { schema: string; model: BiologyModelId; scale: BiologyScaleId; durationHours: number; stepMinutes: number; parameters: Record<string, number> }
export interface BiologySeries { id: string; label: string; unit: string; color: string; points: Array<{ hour: number; value: number }> }
export interface BiologySimulationResult { ok: true; errors: []; schema: string; model: string; scenario: BiologyScenario; series: BiologySeries[]; phase: Array<{x:number;y:number;hour:number}> | null; summary: { seriesCount:number; pointCount:number; minimum:number; maximum:number; finalValues:Record<string,number|null> }; provenance: { source:string; liveTelemetry:false; calibrated:false; persisted:false; integrator:string; note:string } }
export interface BiologyValidationFailure { ok:false; errors:string[]; scenario:null }
export const BIOLOGY_MODEL_SCHEMA: string
export const BIOLOGY_SCALES: ReadonlyArray<{ id: BiologyScaleId; label: string }>
export const BIOLOGY_MODELS: ReadonlyArray<{ id: BiologyModelId; label: string; description: string }>
export const DEFAULT_MODEL_PARAMETERS: Readonly<Record<BiologyModelId, Record<string, number>>>
export const DEFAULT_BIOLOGY_SCENARIO: Readonly<BiologyScenario>
export function validateBiologyScenario(input: unknown): {ok:true;errors:[];scenario:BiologyScenario}|BiologyValidationFailure
export function simulateBiologyScenario(input: unknown): BiologySimulationResult|BiologyValidationFailure
export function simulateBiologyPopulation(input: unknown): any
