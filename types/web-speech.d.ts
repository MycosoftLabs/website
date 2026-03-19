/**
 * Web Speech API type declarations for SpeechRecognition.
 * Browsers expose this as SpeechRecognition or webkitSpeechRecognition.
 */

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  grammars: unknown

  start(): void
  stop(): void
  abort(): void

  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
  onstart: ((event: Event) => void) | null
  onaudiostart: ((event: Event) => void) | null
  onaudioend: ((event: Event) => void) | null
  onsoundstart: ((event: Event) => void) | null
  onsoundend: ((event: Event) => void) | null
  onspeechstart: ((event: Event) => void) | null
  onspeechend: ((event: Event) => void) | null
  onnomatch: ((event: Event) => void) | null
}

declare let SpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}

declare let webkitSpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}
