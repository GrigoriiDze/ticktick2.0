import { useContext } from 'react'
import { ModalContext } from './ModalContext'
import type { ModalContextValue } from './types'

export function useModalStack(): ModalContextValue {
  const ctx = useContext(ModalContext)
  if (!ctx) {
    throw new Error('useModalStack must be used within a ModalProvider')
  }
  return ctx
}

