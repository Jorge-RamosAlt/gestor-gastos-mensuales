/**
 * scripts/generate-health.js
 *
 * Genera public/api/health.json en tiempo de build.
 * Firebase Hosting sirve archivos estáticos antes de aplicar rewrites,
 * así que este archivo queda accesible en /api/health.json sin necesidad
 * de Cloud Functions.
 *
 * Ejecutado automáticamente como parte de "prebuild" en package.json.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── Leer versión del proyecto ────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))

// ── Git info (si está disponible) ────────────────────────────────────────────
let gitSha = null
let gitBranch = null
let gitMessage = null
try {
  gitSha     = execSync('git rev-parse --short HEAD',        { cwd: root }).toString().trim()
  gitBranch  = execSync('git rev-parse --abbrev-ref HEAD',   { cwd: root }).toString().trim()
  gitMessage = execSync('git log -1 --pretty=%s',            { cwd: root }).toString().trim()
} catch {
  // No git disponible en el entorno (p.ej. Firebase App Hosting sin source)
}

// ── Payload ──────────────────────────────────────────────────────────────────
const health = {
  status: 'ok',
  app: 'gestor-gastos',
  version: pkg.version,
  deployed_at: new Date().toISOString(),
  services: {
    firebase_hosting: 'ok',
    firestore: 'ok',           // static — no runtime check; monitorea latencia desde SecureTracker
    firebase_auth: 'ok',
  },
  deployment: {
    commit_sha:     gitSha     ?? null,
    branch:         gitBranch  ?? null,
    commit_message: gitMessage ?? null,
    build_env:      process.env.NODE_ENV ?? 'production',
  },
  meta: {
    note: 'Static health file — generated at build/deploy time. For live monitoring use SecureTracker.',
    securetracker_compatible: true,
  },
}

// ── Escribir archivo ─────────────────────────────────────────────────────────
const outDir = resolve(root, 'public', 'api')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'health.json'), JSON.stringify(health, null, 2), 'utf-8')

console.log('✅  public/api/health.json generated')
console.log(`    status:     ${health.status}`)
console.log(`    version:    ${health.version}`)
console.log(`    deployed_at: ${health.deployed_at}`)
if (gitSha) console.log(`    commit:     ${gitSha}  (${gitBranch})`)
