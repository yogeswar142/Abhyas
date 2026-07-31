'use client'
import { useEffect, useRef, useState } from 'react'

export function useReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px', ...options }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}
