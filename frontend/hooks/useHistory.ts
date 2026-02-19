'use client'

import { useEffect } from 'react'
import { useHistoryStore } from '@/store/history.store'

export function useHistory() {
  const store = useHistoryStore()

  useEffect(() => {
    store.load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return store
}
