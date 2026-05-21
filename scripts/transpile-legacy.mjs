// Wegwerf-Experiment: macht das IE11-Legacy-Build lauffähig.
//
// 1) Transpiliert in *-legacy-*.js NUR Arrow Functions nach ES5.
//    Wichtig: NICHT volles preset-env! Das wuerde core-js mit-transpilieren und
//    dessen Symbol-/Receiver-Logik zerschiessen ("Incompatible receiver, Symbol required").
//    Die Arrows stammen ausschliesslich aus Rolldowns CJS-Wrapper; core-js selbst ist ES5.
// 2) Vendor-Patch fuer date-fns v4 (siehe unten).
// 3) Cache-Buster am Polyfill in dist/index.html.
import { transformFileSync } from '@babel/core'
import transformArrows from '@babel/plugin-transform-arrow-functions'
import { readdirSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const assetsDir = path.resolve('dist/assets')
const files = readdirSync(assetsDir).filter(f => /-legacy-.*\.js$/.test(f))

for (const f of files) {
  const full = path.join(assetsDir, f)
  const before = statSync(full).size
  const out = transformFileSync(full, {
    babelrc: false,
    configFile: false,
    compact: true,
    sourceType: 'unambiguous',
    plugins: [transformArrows],
  })
  let code = out.code
  // Vendor-Patch (date-fns v4): "X in Y ? Y[X]" neutralisieren. Das ist die
  // constructFrom-Symbol-Branch (Symbol.for('constructDateFrom') in date). Der
  // in-Operator mit core-js-polyfillten Symbolen ist in IE11 kaputt -> "Objekt erwartet".
  // Diese App nutzt nur echte Date-Objekte, die Branch ist also entbehrlich.
  code = code.replace(/\b(\w+) in (\w+)\?\2\[\1\]/g, '!1?$2[$1]')
  writeFileSync(full, code)
  console.log(`${f}: ${before} -> ${statSync(full).size} bytes`)
}

// ---- index.html: nur Polyfill-Cache-Buster ----
const htmlPath = path.resolve('dist/index.html')
let html = readFileSync(htmlPath, 'utf-8')

// Cache-Buster NUR am Polyfill (normales <script>, nicht im Modulgraph). Idempotent:
// vorhandenes ?v= zuerst schlucken, damit Re-Runs kein ?v=A?v=B erzeugen.
// NICHT am vite-legacy-entry: Sub-Chunks importieren den Entry als nackten Dateinamen;
// ein ?v= dort waere fuer SystemJS eine andere URL -> Entry doppelt ausgewertet
// -> doppelte React-Contexts ("useToast must be used within ToastProvider").
const v = Date.now()
html = html.replace(/(id="vite-legacy-polyfill"[^>]*\bsrc=")([^"?]+)(?:\?v=\d+)?(")/, `$1$2?v=${v}$3`)

writeFileSync(htmlPath, html)
console.log(`\n${files.length} Dateien transpiliert, Polyfill cache-busted.`)
