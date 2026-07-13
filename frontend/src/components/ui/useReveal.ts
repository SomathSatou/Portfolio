import React from 'react'

/**
 * Anime l'apparition d'un élément lorsqu'il entre dans le viewport.
 * Usage : const ref = useReveal<HTMLDivElement>()
 *         <div ref={ref} className="reveal">…</div>
 */
export default function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = React.useRef<T | null>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('reveal-visible')
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return ref
}
