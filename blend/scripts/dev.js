import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const processes = [
  spawn(process.execPath, ['api/server.js'], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { cwd: root, stdio: 'inherit' }),
]
let stopping = false

function stopAll(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of processes) if (child.exitCode === null) child.kill()
  process.exitCode = code
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error('Could not start the blog service:', error.message)
    stopAll(1)
  })
  child.on('exit', (code) => {
    if (!stopping) stopAll(code || 0)
  })
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))