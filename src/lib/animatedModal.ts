import { useEffect, useState } from 'react'

export const MODAL_TRANSITION_MS = 320

export function useAnimatedModal(isOpen: boolean) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true))
      })
      return () => window.cancelAnimationFrame(frame)
    }

    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), MODAL_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  return { mounted, visible }
}
