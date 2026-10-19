import assert from 'node:assert/strict'
import test from 'node:test'
import { parseGuestCount, SpeechInputError, speechErrorMessage } from './guestCountSpeech.ts'

test('interpreta un único número en frases simples', () => {
  for (const [text, expected] of [['4', 4], ['cuatro', 4], ['somos cuatro', 4], ['Mesa para una', 1], ['OCHO personas', 8]] as const) {
    assert.equal(parseGuestCount(text), expected)
  }
})

test('rechaza cantidades ambiguas, fuera de rango, decimales y vacías', () => {
  for (const text of ['', 'dos o cuatro', '0', '9', '-2', 'menos dos', '2,5', 'dos y 4', 'muchos']) {
    assert.throws(() => parseGuestCount(text), SpeechInputError)
  }
})

test('traduce errores del navegador en mensajes accionables', () => {
  assert.match(speechErrorMessage('not-allowed'), /permiso/)
  assert.match(speechErrorMessage('no-speech'), /escuchó/)
  assert.match(speechErrorMessage('audio-capture'), /micrófono/)
  assert.match(speechErrorMessage('network'), /manual/)
})
