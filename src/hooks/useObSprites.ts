import { useEffect } from 'react'

const SPRITES_URL = '/img/sprites-ob.svg'

/**
 * Fetches the OnlyBart SVG sprite sheet once and injects it as a hidden
 * `<svg>` element into the document body, making all `<use href="#icon-*">`
 * references in OnlyBart pages resolve correctly.
 */
export function useObSprites() {
  useEffect(() => {
    if (document.getElementById('ob-sprites')) return
    fetch(SPRITES_URL)
      .then(r => r.text())
      .then(text => {
        if (!text.includes('<svg')) return
        const div = document.createElement('div')
        div.innerHTML = text
        const svg = div.firstElementChild as SVGElement | null
        if (svg) {
          svg.style.display = 'none'
          svg.id = 'ob-sprites'
          document.body.appendChild(svg)
        }
      })
      .catch(e => console.error('Failed to load OB sprites', e))
  }, [])
}
