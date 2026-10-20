import assert from 'node:assert/strict'
import test from 'node:test'
import { diningLayout, customerModel, DINING_SCALE } from '../src/features/supervisor/scene/diningLayout.ts'

test('one seat per capacity, facing inward, with clearance and within the reserved footprint', () => {
  for (let capacity = 1; capacity <= 8; capacity++) {
    const { seats } = diningLayout(capacity)
    assert.equal(seats.length, capacity)
    for (const seat of seats) {
      assert.ok(seat.x * Math.sin(seat.rotation) + seat.z * Math.cos(seat.rotation) < 0)
      assert.ok((Math.hypot(seat.x, seat.z) + 0.34) * DINING_SCALE < 0.73)
      for (const other of seats) {
        if (seat !== other) assert.ok(Math.hypot(seat.x - other.x, seat.z - other.z) > 0.64)
      }
    }
  }
})

test('customer appearances remain stable across table renders', () => {
  assert.equal(customerModel('customer-123'), customerModel('customer-123'))
  assert.ok(new Set(Array.from({ length: 12 }, (_, i) => customerModel(`customer-${i}`))).size > 1)
})
