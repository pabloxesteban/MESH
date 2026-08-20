/**
 * Recuperar la contraseña, de punta a punta y por el correo de verdad.
 *
 * Es el test que decide si alguien que se registró con correo puede volver a
 * entrar. Hasta ayer no podía: `resetPasswordForEmail` mandaba a
 * `mesh://auth/callback`, esa ruta no existía en la app, y el enlace caía en
 * "Unmatched Route" — con el perfil de artista adentro de una cuenta a la que
 * ya nadie llegaba.
 *
 * **Se lee el buzón, no se genera el enlace.** `auth.admin.generateLink()`
 * habría sido más corto y habría probado otra cosa: devuelve un enlace sin
 * PKCE, y lo que la app recorre es el que efectivamente llega al correo.
 *
 * La service-role key aparece una sola vez y solo para crear y borrar la
 * cuenta de prueba. Ningún test verifica nada con ella.
 */

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

import {
  anonClient,
  followVerify,
  lastLinkTo,
  pkceClient,
  serviceClient,
} from './client.ts'

const CORRIDA = Date.now().toString(36)
const EMAIL = `olvido.${CORRIDA}@ejemplo.test`
const VIEJA = 'la-vieja-que-olvide'
const NUEVA = 'la-nueva-que-elegi'

/** El teléfono desde el que se pide la recuperación. */
let telefono: ReturnType<typeof pkceClient>
let userId = ''
let vuelta = ''

before(async () => {
  const service = serviceClient()
  const { data, error } = await service.auth.admin.createUser({
    email: EMAIL,
    password: VIEJA,
    email_confirm: true,
  })
  if (error != null) throw error
  userId = data.user?.id ?? ''

  telefono = pkceClient()
  const pedido = await telefono.auth.resetPasswordForEmail(EMAIL, {
    redirectTo: 'mesh://auth/callback',
  })
  if (pedido.error != null) throw pedido.error

  vuelta = await followVerify(await lastLinkTo(EMAIL))
})

after(async () => {
  if (userId !== '') await serviceClient().auth.admin.deleteUser(userId)
})

describe('el enlace que llega al correo', () => {
  test('devuelve a la app con un código y nada más', () => {
    // Lo que la app recibe de verdad, y la razón por la que `recovery.ts` no
    // puede mirar la URL para saber que esto es una recuperación: no lo dice.
    const url = new URL(vuelta)
    assert.equal(
      `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, ''),
      'mesh://auth/callback',
    )
    assert.ok(url.searchParams.get('code') != null, 'no volvió ningún código')
    assert.equal(
      url.searchParams.get('type'),
      null,
      'la URL no dice `recovery`',
    )
    assert.equal(url.searchParams.get('token_hash'), null)
  })

  test('abrirlo en otro teléfono no entra', async () => {
    // El `code_verifier` vive en el teléfono que pidió la recuperación. Este es
    // el caso real —pedirlo en el celular, abrir el correo en la computadora—
    // y por eso `auth.error.otherDevice` tiene mensaje propio.
    const otro = pkceClient()
    const code = new URL(vuelta).searchParams.get('code') ?? ''
    const { error } = await otro.auth.exchangeCodeForSession(code)

    assert.ok(error != null, 'un código ajeno abrió sesión')
    assert.match(error.message.toLowerCase(), /verifier|challenge/)
  })
})

describe('desde el mismo teléfono', () => {
  test('el canje avisa que esto es una recuperación', async () => {
    // La única señal que hay. Si dejara de emitirse, la app metería a la
    // persona adentro sin pedirle la contraseña nueva — que es lo que vino a
    // hacer— y se quedaría con la vieja, que no recuerda.
    const eventos: string[] = []
    telefono.auth.onAuthStateChange((evento) => eventos.push(evento))

    const code = new URL(vuelta).searchParams.get('code') ?? ''
    const { error } = await telefono.auth.exchangeCodeForSession(code)

    assert.equal(error, null, `el canje falló: ${error?.message}`)
    assert.ok(
      eventos.includes('PASSWORD_RECOVERY'),
      `no llegó PASSWORD_RECOVERY, llegaron: ${eventos.join(', ')}`,
    )
  })

  test('la contraseña nueva se guarda', async () => {
    const { error } = await telefono.auth.updateUser({ password: NUEVA })
    assert.equal(error, null, `no se pudo cambiar: ${error?.message}`)
  })

  test('con la nueva entra, desde cualquier teléfono', async () => {
    const limpio = anonClient()
    const { data, error } = await limpio.auth.signInWithPassword({
      email: EMAIL,
      password: NUEVA,
    })
    assert.equal(error, null, `no entró con la nueva: ${error?.message}`)
    assert.equal(data.user?.id, userId, 'entró, pero como otra persona')
  })

  test('la vieja deja de servir', async () => {
    // Si siguiera sirviendo, "cambiar la contraseña" sería "agregar otra": el
    // que la robó sigue adentro.
    const limpio = anonClient()
    const { error } = await limpio.auth.signInWithPassword({
      email: EMAIL,
      password: VIEJA,
    })
    assert.ok(error != null, 'la contraseña vieja todavía entra')
  })

  test('el enlace no se puede usar dos veces', async () => {
    const otraVez = pkceClient()
    const code = new URL(vuelta).searchParams.get('code') ?? ''
    const { error } = await otraVez.auth.exchangeCodeForSession(code)
    assert.ok(error != null, 'el mismo enlace abrió sesión una segunda vez')
  })
})
