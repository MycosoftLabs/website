export { AutonomousExperimentEngine, autoExperimentEngine } from './experiment-engine'
export type { 
  ExperimentStep, 
  ExperimentProtocol, 
  AutoExperiment, 
  Adaptation, 
  ExperimentResult, 
  Finding 
} from './experiment-engine'

export { HypothesisGenerationEngine, hypothesisEngine } from './hypothesis-engine'
export type { 
  GeneratedHypothesis, 
  LiteratureReference, 
  ExperimentSuggestion, 
  HypothesisValidation, 
  Evidence, 
  ResearchAgenda 
} from './hypothesis-engine'
