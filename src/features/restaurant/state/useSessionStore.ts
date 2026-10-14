import { useStore } from 'zustand'
import { createSessionStore } from './sessionStore'
import type { SessionState } from './sessionStore'

const sessionStore = createSessionStore()

export function useSessionStore<T>(selector: (state: SessionState) => T): T {
  return useStore(sessionStore, selector)
}

export function createCommandId() {
  return crypto.randomUUID()
}
