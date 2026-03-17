import { useRef } from 'react'

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  /** Minimum horizontal pixel distance to count as a swipe. Default: 50 */
  threshold?: number
}

/**
 * Returns onTouchStart + onTouchEnd handlers that fire onSwipeLeft / onSwipeRight.
 * Only fires if the horizontal distance exceeds the threshold AND is greater than
 * the vertical distance (avoids conflicts with vertical scrolling).
 */
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeOptions) {
  const startX = useRef<number>(0)
  const startY = useRef<number>(0)

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const deltaX = e.changedTouches[0].clientX - startX.current
    const deltaY = e.changedTouches[0].clientY - startY.current

    // Only fire if horizontal movement dominates and exceeds threshold
    if (Math.abs(deltaX) < threshold) return
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return

    if (deltaX < 0) {
      onSwipeLeft?.()
    } else {
      onSwipeRight?.()
    }
  }

  return { onTouchStart, onTouchEnd }
}
