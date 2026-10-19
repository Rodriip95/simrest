import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Square } from 'lucide-react'
import { parseGuestCount } from '../speech/guestCountSpeech'
import { browserSpeechSupported, createBrowserSpeechCapture } from '../speech/browserSpeech'
import type { SpeechCapture } from '../speech/browserSpeech'
import { useSessionStore } from '../state/useSessionStore'

type Props = { onCount: (value: number) => void }

export default function SpeechGuestCount({ onCount }: Props) {
  const setMicState = useSessionStore(state => state.setMicState)
  const micState = useSessionStore(state => state.transient.micState)
  const [showWarning, setShowWarning] = useState(false)
  const [message, setMessage] = useState('')
  const capture = useRef<SpeechCapture | null>(null)
  const generation = useRef(0)
  const supported = browserSpeechSupported()

  function cancel() {
    generation.current++
    capture.current?.cancel()
    capture.current = null
    setMicState('idle')
    setShowWarning(false)
  }

  useEffect(() => () => {
    generation.current++
    capture.current?.cancel()
    setMicState('idle')
  }, [setMicState])

  function start() {
    const token = ++generation.current
    setMessage('')
    const next = createBrowserSpeechCapture({
      onResult(transcript) {
        if (generation.current !== token) return
        setMicState('processing')
        try {
          const value = parseGuestCount(transcript)
          onCount(value)
          setMessage(`Se escuchó ${value}. Revisá la cantidad y confirmá el ingreso.`)
        } catch (cause) {
          setMessage(cause instanceof Error ? cause.message : 'No se pudo interpretar la cantidad.')
        }
      },
      onError(error) {
        if (generation.current !== token) return
        setMessage(error)
        setMicState('idle')
      },
      onEnd() {
        if (generation.current !== token) return
        capture.current = null
        setMicState('idle')
        setShowWarning(false)
      },
    })
    if (!next) {
      setMessage('Este navegador no ofrece dictado. Ingresá la cantidad manualmente.')
      setShowWarning(false)
      return
    }
    capture.current = next
    setMicState('listening')
    setShowWarning(false)
    try { next.start() } catch { setMicState('idle'); setMessage('No se pudo iniciar el micrófono. Probá la entrada manual.') }
  }

  if (!supported) return <p className="speech-fallback"><MicOff size={14} /> Dictado no disponible. Usá la entrada manual.</p>

  return <div className="speech-count">
    {micState === 'idle' && !showWarning && <button type="button" onClick={() => setShowWarning(true)}><Mic size={15} /> Dictar cantidad</button>}
    {showWarning && <div className="speech-warning" role="alert">
      <p>Al iniciar, el proveedor del navegador puede procesar el audio remotamente. Restaurant Sim no guarda audio ni transcripciones.</p>
      <button type="button" onClick={start}><Mic size={15} /> Iniciar escucha</button>
      <button type="button" onClick={cancel}>Cancelar</button>
    </div>}
    {micState === 'listening' && <div className="speech-listening" role="status"><span /> Escuchando…
      <button type="button" onClick={() => capture.current?.stop()}><Square size={13} /> Detener</button>
      <button type="button" onClick={cancel}>Cancelar</button>
    </div>}
    {micState === 'processing' && <p role="status">Interpretando cantidad…</p>}
    {message && <p className="speech-message" role="status">{message}</p>}
  </div>
}
