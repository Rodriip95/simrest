import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { createCommandId, useSessionStore } from '../state/useSessionStore'
import { selectActiveVisit } from '../state/selectors'
import { MIN_ORDER_QUANTITY, MAX_ORDER_QUANTITY } from '../domain/orders'
import { DomainError } from '../domain/commands'
import { can } from '../domain/permissions'

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
  const state = useSessionStore(state => state)
  const catalog = Object.values(state.products)
  const visit = selectActiveVisit(state, tableId)
  const visitId = visit?.id
  const draft = visitId ? state.transient.orderDrafts[visitId] : undefined
  const createDraftLine = (productId: string) => visitId && state.ensureOrderDraft(visitId, productId)
  const updateDraftQuantity = (productId: string, quantity: number) => visitId && state.setOrderLineQuantity(visitId, productId, quantity)
  const updateDraftNote = (productId: string, note: string) => visitId && state.setOrderLineNote(visitId, productId, note)
  const removeDraftLine = (productId: string) => visitId && state.removeOrderLine(visitId, productId)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmId, setConfirmId] = useState(createCommandId)
  const [deliverIds, setDeliverIds] = useState<Record<string, string>>({})
  const formId = useId()

  const items = draft?.items ?? []
  const totalCents = items.reduce((sum, line) => sum + (state.products[line.productId]?.unitPriceCents ?? 0) * line.quantity, 0)
  if (!visit || !visitId || !can(state, 'viewDetails', tableId)) return null
  const ordersForVisit = Object.values(state.orders).filter(order => order.visitId === visitId)
  const canConfirm = items.length > 0 && can(state, 'confirmOrder', tableId)

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
      updateDraftQuantity?.(productId, qty)
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
    try {
      state.confirmOrder({ visitId, commandId: id })
      setConfirmId(createCommandId())
      setNotice('Pedido confirmado.')
    } catch (cause) {
      setError(cause instanceof DomainError ? cause.message : 'No se pudo confirmar el pedido.')
    }
  }

  const handleDeliver = (orderId: string) => {
    setError('')
    setNotice('')
    const id = deliverIds[orderId] ?? createCommandId()
    setDeliverIds(prev => ({ ...prev, [orderId]: id }))
    try {
      state.deliverOrder({ orderId, commandId: id })
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
        </form>
      )}
      <p className="form-error" role="alert">{error}</p>
      <p className="form-notice" role="status">{notice}</p>
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