#!/usr/bin/env node
import { randomBytes, scryptSync } from 'node:crypto'

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
  process.stderr.write('Exécutez cette commande dans un terminal interactif.\n')
  process.exit(1)
}

const chunks = []
process.stderr.write('Nouveau mot de passe Admin (saisie masquée) : ')
process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.on('data', chunk => {
  for (const byte of chunk) {
    if (byte === 3) { process.stderr.write('\nAnnulé.\n'); process.exit(130) }
    if (byte === 13 || byte === 10) {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      const password = Buffer.concat(chunks).toString('utf8')
      process.stderr.write('\n')
      if (Buffer.byteLength(password, 'utf8') < 12) {
        process.stderr.write('Choisissez au moins 12 octets.\n')
        process.exit(1)
      }
      const salt = randomBytes(16)
      const digest = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 })
      process.stdout.write(`scrypt$16384$8$1$${salt.toString('hex')}$${digest.toString('hex')}\n`)
      for (const chunk of chunks) chunk.fill(0)
      process.exit(0)
    }
    if (byte === 127 || byte === 8) { chunks.pop()?.fill(0); continue }
    chunks.push(Buffer.from([byte]))
  }
})
