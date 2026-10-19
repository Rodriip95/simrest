import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useSessionStore } from '../state/useSessionStore'

export default function CloseVisitControl({ visitId }: { visitId: string }) {
  const state = useSessionStore(state => state)
  const [confirming, setConfirming] = useState(false)
  const [discardDraft, setDiscardDraft] = useState(false)
  const [error, setError] = useState('')
  const draft = state.transient.orderDrafts[visitId]
  const hasDraft = !!draft?.items.length
  const pending = Object.values(state.orders).filter(order => order.visitId === visitId && order.status === 'confirmed').length

  function close() {
    try {
      state.closeVisit({ visitId, discardDraft, commandId: crypto.randomUUID() })
      setError('')
      setConfirming(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo finalizar la visita.')
    }
  }

  return <section className="close-visit" aria-label="Finalizar visita">
    <h4>Finalizar atención</h4>
    <p>Esto libera la mesa y conserva sus pedidos en el historial. No representa un cobro.</p>
    {!confirming ? <button type="button" disabled={pending > 0} onClick={() => setConfirming(true)}><CheckCircle2 size={15} /> Finalizar visita</button> : <div className="draft-warning" role="alert">
      <p>¿Finalizar esta visita y retirar los clientes de la escena?</p>
      {hasDraft && <label><input type="checkbox" checked={discardDraft} onChange={event => setDiscardDraft(event.target.checked)} /> Descartar el pedido sin confirmar</label>}
      <button type="button" onClick={() => { setConfirming(false); setDiscardDraft(false); setError('') }}>Seguir atendiendo</button>
      <button type="button" disabled={hasDraft && !discardDraft} onClick={close}>Confirmar finalización</button>
    </div>}
    {pending > 0 && <p className="form-error">Hay {pending} {pending === 1 ? 'pedido confirmado pendiente' : 'pedidos confirmados pendientes'} de entrega.</p>}
    <p className="form-error" role="alert">{error}</p>
  </section>
}
