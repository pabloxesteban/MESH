/**
 * Qué le falta a cada borrador para poder publicarse.
 *
 * Un borrador no se valida ni se carga — esa regla no cambia, y es la que deja
 * que un perfil esperando fotos o consentimiento viva en el repo sin romper el
 * build. Pero hasta acá tampoco recibía ningún feedback: se trabajaba a ciegas
 * hasta borrar el `DRAFT`, y recién ahí aparecían todos los errores juntos.
 *
 * Esto corre exactamente los mismos chequeos que la validación real y los
 * muestra como una lista para ir tachando. No publica nada y no puede publicar
 * nada: solo lee.
 *
 * Uso:  npm run content:doctor
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { diagnoseDraft, listDrafts } from './validate.ts'

const CONTENT_ROOT = resolve(import.meta.dirname, '../../../content/artists')

function main(): void {
  const drafts = listDrafts(CONTENT_ROOT)

  if (drafts.length === 0) {
    console.log('No hay ningún borrador en content/artists/.')
    return
  }

  for (const dir of drafts) {
    const findings = diagnoseDraft(CONTENT_ROOT, dir)

    console.log(`\n${dir}`)
    console.log('─'.repeat(dir.length))

    if (findings.length === 0) {
      console.log(
        '\n  ✓ Pasa todos los chequeos automáticos.\n' +
          '    Borrá el archivo DRAFT y corré `npm run content:validate`.\n' +
          '    Lo que la máquina NO puede verificar sigue siendo tuyo: que la\n' +
          '    persona haya dicho que sí, que la bio sean sus palabras, y que\n' +
          '    los pesos de estilo los haya revisado ella.',
      )
    } else {
      console.log(`\n  Faltan ${findings.length}:\n`)
      for (const finding of findings) console.log(`  · ${finding}`)
    }

    // Las notas a mano del DRAFT dicen cosas que ningún chequeo puede ver —
    // "confirmar con ella si está en Buenos Aires o en Sydney" no es algo que
    // se deduzca de un archivo.
    const notas = join(CONTENT_ROOT, dir, 'DRAFT')
    if (existsSync(notas)) {
      const texto = readFileSync(notas, 'utf8').trim()
      if (texto.length > 0) {
        console.log('\n  Notas del borrador:\n')
        for (const linea of texto.split('\n')) console.log(`  │ ${linea}`)
      }
    }
  }

  console.log('')
}

if (import.meta.filename === process.argv[1]) {
  main()
}
