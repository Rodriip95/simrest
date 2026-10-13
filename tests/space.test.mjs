import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSpace, removeTable, tableCapacity } from '../src/features/supervisor/domain/space.ts'

test('genera exactamente las mesas solicitadas, desde el centro, con margen y separación', () => {
  for (const area of [4, 9, 35.9, 36, 100, 100.5, 400, 2500]) {
    const count = tableCapacity(area)
    const layout = buildSpace(area, count)
    assert.equal(layout.tables.length, count)
    assert.ok(Math.abs(layout.side ** 2 - area) < 1e-9)
    assert.equal(layout.tables[0].x, 0)
    assert.equal(layout.tables[0].z, 0)
    assert.equal(new Set(layout.tables.map(table => table.id)).size, count)
    let previousDistance = -1
    for (const table of layout.tables) {
      assert.ok(Math.abs(table.x) + 1 <= layout.side / 2 + 1e-9)
      assert.ok(Math.abs(table.z) + 1 <= layout.side / 2 + 1e-9)
      const distance = table.x ** 2 + table.z ** 2
      assert.ok(distance >= previousDistance)
      previousDistance = distance
    }
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = layout.tables[i], b = layout.tables[j]
        assert.ok(Math.abs(a.x - b.x) >= 2 || Math.abs(a.z - b.z) >= 2)
      }
    }
  }
})

test('permite un terreno vacío y reconstrucciones deterministas sin acumular mesas', () => {
  assert.equal(buildSpace(100, 0).tables.length, 0)
  assert.equal(buildSpace(100, 6).tables.length, 6)
  assert.equal(buildSpace(100, 2).tables.length, 2)
  assert.deepEqual(buildSpace(100, 6), buildSpace(100, 6))
})

test('rechaza entradas inválidas y cantidades que superan la capacidad', () => {
  for (const [area, count] of [[NaN, 2], [Infinity, 2], [0, 1], [2501, 1], [100, -1], [100, 1.5], [100, Infinity], [4, 2], [2500, 201]]) {
    assert.throws(() => buildSpace(area, count))
  }
  assert.equal(tableCapacity(NaN), 0)
  assert.equal(tableCapacity(4), 1)
  assert.equal(tableCapacity(100), 25)
})

test('elimina solo la mesa elegida sin reordenar, renumerar ni mover las restantes', () => {
  const original = buildSpace(100, 6)
  const result = removeTable(original, 'table-3')
  assert.equal(result.tables.length, 5)
  assert.equal(original.tables.length, 6)
  assert.equal(result.area, original.area)
  assert.equal(result.side, original.side)
  assert.deepEqual(result.tables, original.tables.filter(table => table.id !== 'table-3'))
  assert.deepEqual(removeTable(result, 'table-3'), result)
  assert.deepEqual(removeTable(result, 'missing'), result)
})

test('permite eliminar todas las mesas y construir un nuevo espacio', () => {
  const original = buildSpace(4, 1)
  assert.equal(removeTable(original, 'table-1').tables.length, 0)
  assert.equal(buildSpace(4, 1).tables.length, 1)
})
