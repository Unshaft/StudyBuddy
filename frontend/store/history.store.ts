'use client'

import { create } from 'zustand'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import type { HistoryEntry } from '@/types'

const IDB_KEY = 'studybuddy_history'

interface HistoryStore {
  entries: HistoryEntry[]
  loaded: boolean
  load: () => Promise<void>
  addEntry: (entry: HistoryEntry) => Promise<void>
  updateFeedback: (sessionId: string, feedback: 1 | -1) => Promise<void>
  clear: () => Promise<void>
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return
    try {
      const stored = await idbGet<HistoryEntry[]>(IDB_KEY)
      set({ entries: stored ?? [], loaded: true })
    } catch {
      set({ entries: [], loaded: true })
    }
  },

  addEntry: async (entry) => {
    const next = [entry, ...get().entries].slice(0, 100)
    set({ entries: next })
    await idbSet(IDB_KEY, next).catch(() => {})
  },

  updateFeedback: async (sessionId, feedback) => {
    const next = get().entries.map((e) =>
      e.sessionId === sessionId ? { ...e, feedback } : e
    )
    set({ entries: next })
    await idbSet(IDB_KEY, next).catch(() => {})
  },

  clear: async () => {
    set({ entries: [] })
    await idbDel(IDB_KEY).catch(() => {})
  },
}))
