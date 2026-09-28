'use client'

import { useEffect } from 'react'

export default function ServicosMotion() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined
    }

    const elements = document.querySelectorAll('.services-page [data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -5% 0px' },
    )

    elements.forEach((element) => observer.observe(element))
    document.documentElement.classList.add('services-motion-ready')

    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('services-motion-ready')
    }
  }, [])

  return null
}
