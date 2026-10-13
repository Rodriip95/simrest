import { useState } from 'react'
import type { Role } from '../domain/types'
import { viewLabels } from '../domain/permissions'
import { DomainError } from '../domain/commands'
import { useSessionStore } from '../state/useSessionStore'

export default function RoleNavigation() {
  const session = useSessionStore(state => state.session)
  const waiters = useSessionStore(state => state.waiters)
  const switchRole = useSessionStore(state => state.switchRole)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<{ role: Role; waiterId: string | null } | null>(null)
  const activeWaiters = Object.values(waiters).filter(waiter => waiter.active)

  function change(role: Role, waiterId: string | null, discard = false) {
    try {
      switchRole(role, waiterId, discard)
      setPending(null)
      setError('')
    } catch (cause) {
      if (cause instanceof DomainError && cause.code === 'UNRESOLVED_DRAFT') setPending({ role, waiterId })
      else setError(cause instanceof Error ? cause.message : 'No se pudo cambiar de rol.')
    }
  }

  return (
    <section className="role-navigation" aria-label="Modo demo">
      <div><strong>Modo demo</strong><p>Los roles comparten la misma sesión local.</p></div>
      <nav aria-label="Vistas por rol">
        {(Object.keys(viewLabels) as Role[]).map(role => (
          <button key={role} type="button" aria-current={session.activeRole === role ? 'page' : undefined}
            disabled={role === 'waiter' && activeWaiters.length === 0}
            onClick={() => change(role, role === 'waiter' ? session.activeWaiterId ?? activeWaiters[0]?.id ?? null : null)}>
            {viewLabels[role]}
          </button>
        ))}
      </nav>
      {session.activeRole === 'waiter' && (
        <label>Mozo activo
          <select value={session.activeWaiterId ?? ''} onChange={event => change('waiter', event.target.value)}>
            {activeWaiters.map(waiter => <option key={waiter.id} value={waiter.id}>{waiter.name}</option>)}
          </select>
        </label>
      )}
      {pending && <div className="draft-warning" role="alert">
        <p>Hay un pedido sin confirmar. ¿Querés descartarlo para cambiar de vista?</p>
        <button type="button" onClick={() => setPending(null)}>Seguir editando</button>
        <button type="button" onClick={() => change(pending.role, pending.waiterId, true)}>Descartar y cambiar</button>
      </div>}
      <p className="form-error" role="alert">{error}</p>
    </section>
  )
}
