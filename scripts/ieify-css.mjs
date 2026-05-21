// Wegwerf-Experiment: macht die gebaute dist-CSS so IE11-tauglich wie automatisch moeglich.
//  - postcss-custom-properties: brennt var(--x) zu statischen Werten ein (IE kann kein var()).
//    importFrom = ALLE CSS-Dateien, weil Definitionen (:root) und Nutzung in verschiedenen
//    Chunk-Dateien liegen.
//  - autoprefixer (ie 11, grid:autoplace): erzeugt -ms-grid etc.
// Bewusste Grenzen: Runtime-Theme-Switching ist danach tot (nur :root-Werte eingebrannt),
// und Flex-`gap` hat in IE11 keinen automatischen Fallback -> Abstaende koennen fehlen.
import postcss from 'postcss'
import customProperties from 'postcss-custom-properties'
import autoprefixer from 'autoprefixer'
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import path from 'node:path'

const dir = path.resolve('dist/assets')
const cssFiles = readdirSync(dir).filter(f => f.endsWith('.css')).map(f => path.join(dir, f))

// Flex-`gap` -> margin-Fallback fuer IE11 (kein gap-Support). Sichere Variante:
// margin auf der Haupt-Achse via "selector > * + *" (keine negativen Margins).
// Grenzen: nur Flex (kein Grid), nur Haupt-Achse (kein Cross-Axis bei flex-wrap).
const flexGapFallback = () => ({
  postcssPlugin: 'flex-gap-fallback',
  Rule(rule) {
    let display = null, direction = 'row', gap = null, rowGap = null, colGap = null
    rule.walkDecls(decl => {
      const p = decl.prop.toLowerCase()
      if (p === 'display') display = decl.value.toLowerCase()
      else if (p === 'flex-direction') direction = decl.value.toLowerCase()
      else if (p === 'gap') gap = decl.value.trim()
      else if (p === 'row-gap') rowGap = decl.value.trim()
      else if (p === 'column-gap') colGap = decl.value.trim()
    })
    if (!display || display.indexOf('flex') === -1) return
    if (gap) {
      const parts = gap.split(/\s+/)
      rowGap = rowGap || parts[0]
      colGap = colGap || parts[1] || parts[0]
    }
    const isColumn = direction.indexOf('column') !== -1
    const value = isColumn ? rowGap : colGap
    if (!value || value === '0' || value === '0px') return
    const side = isColumn ? 'margin-top' : 'margin-left'
    const selector = rule.selectors.map(s => `${s} > * + *`).join(', ')
    const fb = postcss.rule({ selector })
    fb.append({ prop: side, value })
    rule.after(fb)
  },
})
flexGapFallback.postcss = true

// object-fit-Hint: object-fit-images (JS-Polyfill) liest object-fit/-position aus der
// font-family-Property, weil IE11 object-fit nicht via getComputedStyle exponiert.
const objectFitHint = () => ({
  postcssPlugin: 'object-fit-hint',
  Rule(rule) {
    let ofit = null, opos = null, hasFont = false
    rule.walkDecls(d => {
      const p = d.prop.toLowerCase()
      if (p === 'object-fit') ofit = d.value.trim()
      else if (p === 'object-position') opos = d.value.trim()
      else if (p === 'font-family') hasFont = true
    })
    if (!ofit || hasFont) return
    let hint = `object-fit: ${ofit};`
    if (opos) hint += ` object-position: ${opos};`
    rule.append({ prop: 'font-family', value: `'${hint}'` })
  },
})
objectFitHint.postcss = true

const processor = postcss([
  customProperties({ importFrom: cssFiles, preserve: false }),
  flexGapFallback(),
  objectFitHint(),
  autoprefixer({ overrideBrowserslist: ['ie 11'], grid: 'autoplace' }),
])

for (const file of cssFiles) {
  const before = statSync(file).size
  const css = readFileSync(file, 'utf-8')
  const result = await processor.process(css, { from: file, to: file })
  writeFileSync(file, result.css)
  console.log(`${path.basename(file)}: ${before} -> ${statSync(file).size} bytes`)
}
console.log(`\n${cssFiles.length} CSS-Dateien IE-tauglich gemacht.`)
