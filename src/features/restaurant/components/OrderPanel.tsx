import { FormEvent, useId, useMemo, useState } from 'react'
import { createCommandId, useSessionStore } from '../state/useSessionStore'
import { selectCatalogArray, selectHasUnresolvedDraft, selectTableDetail } from '../state/selectors'
import { MIN_ORDER_QUANTITY, MAX_ORDER_QUANTITY } from '../domain/orders'
import { DomainError } from '../domain/commands'
import { requirePermission } from '../domain/permissions'

type OrderPanelProps = {
  tableId: string
}

function quantityError(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < MIN_ORDER_QUANTITY || quantity > MAX_ORDER_QUANTITY) {
    return `Cantidad entre ${MIN_ORDER_QUANTITY} y ${MAX_ORDER_QUANTITY}`
  }
  return ''
}

export default function OrderPanel({ tableId }: OrderPanelProps) {
  const catalog = useSessionStore(state => selectCatalogArray(state))
  const detail = useSessionStore(state => selectTableDetail(state, tableId))
  const visitId = detail.visit?.id ?? null
  const orderDrafts = useSessionStore(state => state.transient.orderDrafts)
  const draft = visitId ? orderDrafts[visitId] : undefined
  const createDraftLine = useSessionStore(state => {
    if (!visitId) return null
    return (productId: string) => state.ensureOrderDraft(visitId, productId)
  })
  const updateDraftQuantity = useSessionStore(state => {
    if (!visitId) return null
    return (productId: string, quantity: number) => state.setOrderLineQuantity(visitId, productId, quantity)
  })
  const updateDraftNote = useSessionStore(state => {
    if (!visitId) return null
    return (productId: string, note: string) => state.setOrderLineNote(visitId, productId, note)
  })
  const removeDraftLine = useSessionStore(state => {
    if (!visitId) return null
    return (productId: string) => state.removeOrderLine(visitId, productId)
  })
  const confirmOrder = useSessionStore(state => (visitId ? (commandId: string) => state.confirmOrder({ visitId, commandId }) : null))
  const deliverOrder = useSessionStore(state => (orderId: string, commandId: string) => state.deliverOrder({ orderId, commandId }))
  const ensureOrderDraftForVisit = useSessionStore(state => (vId: string) => state.ensureOrderDraftForVisit(vId))
  const hasDraft = useSessionStore(state => visitId ? selectHasUnresolvedDraft(state, visitId) : false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmId, setConfirmId] = useState(createCommandId)
  const [deliverIds, setDeliverIds] = useState<Record<string, string>>({})
  const formId = useId()

  const items = draft?.items ?? []
  const totalCents = useMemo(() => items.reduce((sum, line) => {
    const product = catalog.find(p => p.id === line.productId)
    if (!product || !product.available) return sum
    return sum + product.unitPriceCents * line.quantity
  }, 0), [items, catalog])

  if (!detail.visit || !visitId) {
    return null
  }

  const visit = detail.visit
  const ordersForVisit = detail.orders.filter(order => order.visitId === visitId)
  const canConfirm = hasDraft
  const canOperate = (() => {
    try {
      // Check permission through requirePermission logic by calling can? but we want boolean
      // easier: just try not needed; permissions checked on commands
      return true
    } catch {
      return false
    }
  })()

  const handleAddProduct = (productId: string) => {
    setError('')
    setNotice('')
    try {
      createDraftLine?.(productId)
    } catch (cause) {
      setError(cause instanceof DomainError ? cause.message : 'No se pudo agregar el producto.')
    }
  }

  const handleQuantityChange = (productId: string, value: string) => {
    setError('')
    const qty = Number(value)
    if (!Number.isFinite(qty)) return
    try {
      updateDraftQuantity?.(productId, Math.trunc(qty))
    } catch (cause) {
      setError(cause instanceof DomainError ? cause.message : 'Cantidad inválida.')
    }
  }

  const handleNoteChange = (productId: string, value: string) => {
    setError('')
    try {
      updateDraftNote?.(productId, value)
    } catch (cause) {
      setError(cause instanceof DomainError ? cause.message : 'Observación inválida.')
    }
  }

  const handleRemove = (productId: string) => {
    setError('')
    setNotice('')
    try {
      removeDraftLine?.(productId)
    } catch (cause) {
      setError(cause instanceof DomainError ? cause.message : 'No se pudo quitar el producto.')
    }
  }

  const handleConfirm = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const id = confirmId
    setConfirmId(createCommandId)
    try {
      ensureOrderDraftForVisit(visitId)
      confirmOrder?.(id)
      setNotice('Pedido confirmado.')
    } catch (cause) {
      setError(cause instanceof DomainError ? cause.message : 'No se pudo confirmar el pedido.')
    }
  }

  const handleDeliver = (orderId: string) => {
    setError('')
    setNotice('')
    const id = deliverIds[orderId] ?? createCommandId
    setDeliverIds(prev => ({ ...prev, [orderId]: createCommandId }))
    try {
      deliverOrder(orderId, id)
      setNotice('Pedido marcado como entregado.')
    } catch (cause) {
      setError(cause instanceof DomainError ? cause.message : 'No se pudo marcar la entrega.')
    }
  }

  return (
    <section className="order-panel" aria-label={`Pedidos de la mesa ${visit.tableNumber}`}>
      <h3>Tomar pedido</h3>
      <p className="detail-description">Seleccioná productos para el borrador, luego confirmá.</p>
      <div className="catalog-list">
        {catalog.map(product => {
          const inDraft = items.some(line => line.productId === product.id)
          return (
            <button
              key={product.id}
              type="button"
              className={`catalog-item${inDraft ? ' active' : ''}${!product.available ? ' disabled' : ''}`}
              onClick={() => product.available && handleAddProduct(product.id)}
              disabled={!product.available}
              aria-disabled={!product.available}
              title={product.available ? 'Agregar al borrador' : 'Producto no disponible'}
            >
              <span>{product.name}</span>
              <span>{(product.unitPriceCents / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })}</span>
              {!product.available && <small>Sin stock</small>}
            </button>
          )
        })}
      </div>
      {items.length === 0 && <p className="empty-state">El borrador está vacío.</p>}
      {items.length > 0 && (
        <form id={formId} className="draft-list" onSubmit={handleConfirm} noValidate>
          {items.map(line => {
            const product = catalog.find(p => p.id === line.productId)
            const qtyError = quantityError(line.quantity)
            const unitPrice = product ? product.unitPriceCents / 100 : 0
            const subtotal = unitPrice * line.quantity
            return (
              <fieldset key={line.productId} className="draft-line">
                <legend>{product?.name ?? line.productId}</legend>
                <div className="draft-controls">
                  <label>
                    Cantidad
                    <input
                      type="number"
                      min={MIN_ORDER_QUANTITY}
                      max={MAX_ORDER_QUANTITY}
                      step={1}
                      value={line.quantity}
                      onChange={event => handleQuantityChange(line.productId, event.target.value)}
                      aria-invalid={!!qtyError}
                    />
                  </label>
                  {qtyError && <small role="alert">{qtyError}</small>}
                  <label className="note">
                    Observación
                    <input
                      type="text"
                      maxLength={200}
                      value={line.note}
                      placeholder="Sin cebolla..."
                      onChange={event => handleNoteChange(line.productId, event.target.value)}
                    />
                  </label>
                  <div className="subtotal">
                    {(subtotal).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })}
                  </div>
                  <button type="button" className="ghost" onClick={() => handleRemove(line.productId)}>
                    Quitar
                  </button>
                </div>
              </fieldset>
            )
          })}
          <div className="draft-total">
            Total estimado: {(totalCents / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })}
          </div>
          <div className="actions">
            <button type="submit" className="primary" disabled={!canConfirm}>
              Confirmar pedido
            </button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
        </form>
      )}
      <div className="orders-history">
        <h4>Pedidos</h4>
        {ordersForVisit.length === 0 && <p className="empty-state">Aún no hay pedidos confirmados.</p>}
        {ordersForVisit.map(order => {
          const total = order.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
          return (
            <article key={order.id} className={`order-card ${order.status}`}>
              <header>
                <span>{new Date(order.confirmedAt).toLocaleTimeString('es-AR')}</span>
                <span className="status">{order.status === 'confirmed' ? 'Confirmado' : 'Entregado'}</span>
              </header>
              <ul>
                {order.items.map(item => (
                  <li key={item.productId + item.note}>
                    {item.quantity} × {item.nameSnapshot}
                    {item.note && <small> · {item.note}</small>}
                    <span className="item-price">
                      {(item.unitPriceCents * item.quantity / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              </ul>
              <footer>
                <strong>Total: {(total / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })}</strong>
                {order.status === 'confirmed' && (
                  <button type="button" className="ghost" onClick={() => handleDeliver(order.id)}>
                    Marcar como entregado
                  </button>
                )}
                {order.status === 'delivered' && order.deliveredAt && (
                  <small>Entregado a las {new Date(order.deliveredAt).toLocaleTimeString('es-AR')}</small>
                )}
              </footer>
            </article>
          )
        })}
      </div>
    </section>
  )
}