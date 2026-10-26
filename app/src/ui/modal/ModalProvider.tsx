import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { App as CapApp } from '@capacitor/app'
import { ModalContext } from './ModalContext'
import type { ModalContextValue, ModalEntry, ModalSpec, ModalType } from './types'

let nextId = 1

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ModalEntry[]>([])
  const stackRef = useRef<ModalEntry[]>([])
  stackRef.current = stack

  const openModal = useCallback((spec: ModalSpec): string => {
    let resultId = ''
    setStack((prev) => {
      // Предотвращаем дублирование одной и той же уникальной модалки на вершине стека
      const top = prev[prev.length - 1]
      if (top && top.spec.type === spec.type) {
        if ('taskId' in top.spec && 'taskId' in spec && top.spec.taskId === spec.taskId) {
          resultId = top.id
          return prev
        }
        if (top.spec.type === 'sort-group' || top.spec.type === 'settings' || top.spec.type === 'more-sheet') {
          resultId = top.id
          return prev
        }
      }
      const id = `modal_${nextId++}_${spec.type}`
      resultId = id
      return [...prev, { id, spec }]
    })
    return resultId
  }, [])

  const closeModal = useCallback((id?: string) => {
    setStack((prev) => {
      if (!id) return prev.slice(0, -1)
      return prev.filter((m) => m.id !== id)
    })
  }, [])

  const closeTopModal = useCallback((): boolean => {
    if (stackRef.current.length === 0) return false
    setStack((prev) => prev.slice(0, -1))
    return true
  }, [])

  const closeAllModals = useCallback(() => {
    setStack([])
  }, [])

  const isModalOpen = useCallback((type?: ModalType): boolean => {
    if (!type) return stackRef.current.length > 0
    return stackRef.current.some((m) => m.spec.type === type)
  }, [])

  const topModal = useMemo(() => (stack.length > 0 ? stack[stack.length - 1] : null), [stack])

  // Перехват аппаратной кнопки Back на Android: закрываем верхнюю модалку в стеке
  useEffect(() => {
    let sub: { remove: () => Promise<void> } | null = null

    const handleBackButton = () => {
      if (stackRef.current.length > 0) {
        closeTopModal()
      }
    }

    void CapApp.addListener('backButton', handleBackButton)
      .then((h) => {
        sub = h
      })
      .catch(() => undefined)

    return () => {
      if (sub) void sub.remove().catch(() => undefined)
    }
  }, [closeTopModal])

  // Перехват клавиши Escape на десктопе
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stackRef.current.length > 0) {
        const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')
        if (!typing) {
          e.preventDefault()
          closeTopModal()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeTopModal])

  const contextValue: ModalContextValue = useMemo(
    () => ({
      stack,
      topModal,
      openModal,
      closeModal,
      closeTopModal,
      closeAllModals,
      isModalOpen,
    }),
    [stack, topModal, openModal, closeModal, closeTopModal, closeAllModals, isModalOpen],
  )

  return <ModalContext.Provider value={contextValue}>{children}</ModalContext.Provider>
}

