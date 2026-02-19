'use client'

import { useUser } from '@/hooks/useUser'

/**
 * Initialise le store auth (user + session) sur toutes les pages authentifiées.
 * Doit être rendu dans le layout (app) pour garantir que user != null partout.
 */
export function AuthInit() {
  useUser()
  return null
}
