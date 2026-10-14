import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LayoutGrid, Eye, UtensilsCrossed, AlertTriangle, RefreshCw } from 'lucide-react'
import type { Role } from '../domain/types'
import { viewLabels } from '../domain/permissions'
import { DomainError } from '../domain/commands'
import { useSessionStore } from '../state/useSessionStore'
import HudButton from './hud/HudButton'
import HudSelect from './hud/HudSelect'

const roleIcons: Record<Role, LucideIcon> = { admin: LayoutGrid, supervisor: Eye, waiter: UtensilsCrossed }

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
    <section className="role-hud" aria-label="Modo demo">
      <nav className="role-segment" aria-label="Vistas por rol">
        {(Object.keys(viewLabels) as Role[]).map(role => (
          <HudButton key={role} icon={roleIcons[role]} label={viewLabels[role]}
            current={session.activeRole === role} active={session.activeRole === role}
            disabled={role === 'waiter' && activeWaiters.length === 0}
            onClick={() => change(role, role === 'waiter' ? session.activeWaiterId ?? activeWaiters[0]?.id ?? null : null)} />
        ))}
      </nav>
      {session.activeRole === 'waiter' && (
        <HudSelect id="active-waiter" label="Mozo" value={session.activeWaiterId ?? ''}
          options={activeWaiters.map(waiter => ({ value: waiter.id, label: waiter.name }))}
          onChange={value => change('waiter', value)} />
      )}
      {pending && <div className="hud-alert" role="alert">
        <AlertTriangle size={16} aria-hidden="true" />
        <div>
          <p>Hay un pedido sin confirmar. ¿Querés descartarlo para cambiar de vista?</p>
          <div className="hud-alert-actions">
            <button type="button" onClick={() => setPending(null)}><RefreshCw size={14} aria-hidden="true" /> Seguir editando</button>
            <button type="button" className="is-danger" onClick={() => change(pending.role, pending.waiterId, true)}>Descartar y cambiar</button>
          </div>
        </div>
      </div>}
      {error && <p className="hud-alert hud-alert-error" role="alert">{error}</p>}
    </section>
  )
}
