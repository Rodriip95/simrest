export class SpeechInputError extends Error {}

const numberWords: Record<string, number> = {
  uno: 1,
  una: 1,
  un: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
}

export function parseGuestCount(transcript: string): number {
  const normalized = transcript.toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (!normalized) throw new SpeechInputError('No se escuchó una cantidad. Podés ingresarla manualmente.')
  if (/(?:^|\s)menos\s+\w+|-[0-9]/.test(normalized)) {
    throw new SpeechInputError('La cantidad debe ser un número positivo entre uno y ocho.')
  }
  if (/\d+[.,]\d+/.test(normalized)) {
    throw new SpeechInputError('La cantidad debe ser un número entero.')
  }

  const matches: number[] = []
  for (const token of normalized.match(/[a-z]+|\d+/g) ?? []) {
    if (/^\d+$/.test(token)) matches.push(Number(token))
    else if (numberWords[token] !== undefined) matches.push(numberWords[token])
  }
  if (matches.length !== 1) {
    throw new SpeechInputError(matches.length ? 'Se escuchó más de una cantidad. Decí un único número.' : 'No se reconoció una cantidad entre uno y ocho.')
  }
  const value = matches[0]
  if (!Number.isInteger(value) || value < 1 || value > 8) {
    throw new SpeechInputError('La cantidad debe estar entre uno y ocho.')
  }
  return value
}

export function speechErrorMessage(code: string) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'El navegador no permitió usar el micrófono. Revisá el permiso o ingresá la cantidad manualmente.'
  if (code === 'no-speech') return 'No se escuchó ninguna cantidad. Probá de nuevo o ingresala manualmente.'
  if (code === 'audio-capture') return 'No se encontró un micrófono disponible.'
  return 'No se pudo completar el dictado. La entrada manual sigue disponible.'
}
