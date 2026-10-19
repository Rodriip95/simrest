import { speechErrorMessage } from './guestCountSpeech'

export type SpeechCaptureCallbacks = {
  onResult: (transcript: string) => void
  onError: (message: string) => void
  onEnd: () => void
}

type RecognitionResultEvent = { results: ArrayLike<{ 0: { transcript: string } }> }
type RecognitionErrorEvent = { error: string }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionResultEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type RecognitionConstructor = new () => Recognition

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
}

export type SpeechCapture = { start: () => void; stop: () => void; cancel: () => void }

export function browserSpeechSupported() {
  return !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)
}

export function createBrowserSpeechCapture(callbacks: SpeechCaptureCallbacks): SpeechCapture | null {
  const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition
  if (!Constructor) return null
  const recognition = new Constructor()
  recognition.lang = 'es-AR'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.onresult = (event: RecognitionResultEvent) => callbacks.onResult(event.results[0]?.[0]?.transcript ?? '')
  recognition.onerror = (event: RecognitionErrorEvent) => callbacks.onError(speechErrorMessage(event.error))
  recognition.onend = callbacks.onEnd
  return { start: () => recognition.start(), stop: () => recognition.stop(), cancel: () => recognition.abort() }
}
