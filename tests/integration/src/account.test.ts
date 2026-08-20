/**
 * De sesión anónima a cuenta, sin perder nada.
 *
 * Es la promesa que sostiene a [ADR-002](../../../docs/decisions/ADR-002-authentication.md):
 * MESH abre una sesión anónima desde el primer arranque, y crear una cuenta
 * **conserva el mismo `auth.uid()`**. Al no cambiar el id no hay ninguna rutina
 * de fusión que migre datos de un usuario a otro — y esa rutina es donde viven
 * los bugs de privacidad.
 *
 * Todo el resto de los tests de alta de artista corre con sesión anónima. Este
 * es el único que verifica lo que le importa a alguien que se registra de
 * verdad: **que el perfil que cargó desde la app siga ahí mañana, en su
 * teléfono y en otro.**
 *
 * Sin esto, "dar de alta el perfil desde la app" es una demo: funciona hasta que
 * la persona cierra sesión.
 */

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

import { anonClient, serviceClient, signedInAnon } from './client.ts'

/** Una casilla por corrida: los tests no pueden pisarse entre sí. */
const CORRIDA = Date.now().toString(36)
const EMAIL = `alta.${CORRIDA}@ejemplo.test`
const PASSWORD = 'una-clave-larga-de-verdad'
const NOMBRE = `Alta Con Cuenta ${CORRIDA}`

let userId = ''
let slug = ''

before(async () => {
  const limpieza = serviceClient()
  await limpieza.from('professionals').delete().eq('display_name', NOMBRE)
})

after(async () => {
  // Solo limpieza. Ningún test verifica nada con la service-role key.
  const limpieza = serviceClient()
  await limpieza.from('professionals').delete().eq('display_name', NOMBRE)
  if (userId !== '') await limpieza.auth.admin.deleteUser(userId)
})

describe('de anónimo a cuenta', () => {
  test('crear la cuenta conserva el mismo usuario', async () => {
    const { client, userId: anonimo } = await signedInAnon()
    userId = anonimo

    // Lo que la app hace desde el estudio: crear el perfil propio.
    const creado = await client.rpc('create_own_professional', {
      p_display_name: NOMBRE,
      p_instagram: `alta${CORRIDA}`,
    })
    assert.equal(creado.error, null, `el alta falló: ${creado.error?.message}`)
    slug = creado.data ?? ''
    assert.notEqual(slug, '')

    // Y después, lo que hace la pantalla de crear cuenta.
    const { data, error } = await client.auth.updateUser({
      email: EMAIL,
      password: PASSWORD,
    })
    assert.equal(error, null, `crear la cuenta falló: ${error?.message}`)

    // **El id no cambió.** Es toda la decisión de ADR-002 en una línea: sin
    // esto haría falta migrar interacciones, chats y el perfil de artista de un
    // usuario a otro, y ahí es donde se pierden cosas.
    assert.equal(data.user?.id, anonimo)
  })

  test('el perfil sigue siendo suyo después de crear la cuenta', async () => {
    const { data } = await serviceClient()
      .from('professionals')
      .select('owner_user_id, is_published')
      .eq('slug', slug)
      .single()

    assert.equal(data?.owner_user_id, userId)
    assert.equal(data?.is_published, true)
  })

  test('cerrar sesión y volver a entrar devuelve el mismo usuario', async () => {
    // Es la prueba de que la cuenta sirve para algo: el perfil no vive en el
    // teléfono, vive en la cuenta.
    const otro = anonClient()
    const { data, error } = await otro.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    })

    assert.equal(error, null, `no se pudo entrar: ${error?.message}`)
    assert.equal(data.user?.id, userId)
  })

  test('entrando desde otro teléfono, el perfil está', async () => {
    // Cliente nuevo, sin nada guardado: es lo que pasa al instalar la app en
    // otro dispositivo.
    const otroTelefono = anonClient()
    await otroTelefono.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    })

    const { data, error } = await otroTelefono
      .from('professionals')
      .select('slug, display_name')
      .eq('owner_user_id', userId)
      .single()

    assert.equal(error, null, `no encontró su perfil: ${error?.message}`)
    assert.equal(data?.slug, slug)
    assert.equal(data?.display_name, NOMBRE)
  })

  test('desde esa cuenta puede seguir editando su perfil', async () => {
    // Ser dueño no puede depender de cómo se abrió la sesión. Si `set_own_styles`
    // fallara acá, el perfil quedaría congelado el día que la persona se
    // registra — que es exactamente cuando empieza a usarlo en serio.
    const suyo = anonClient()
    await suyo.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })

    const { error } = await suyo.rpc('set_own_styles', {
      p_style_slugs: ['fine-line', 'blackwork'],
    })
    assert.equal(error, null, `no pudo declarar estilos: ${error?.message}`)

    const { data } = await serviceClient()
      .from('professional_styles')
      .select('style_id')
      .eq(
        'professional_id',
        (
          await serviceClient()
            .from('professionals')
            .select('id')
            .eq('slug', slug)
            .single()
        ).data?.id ?? '',
      )

    assert.equal(data?.length, 2)
  })

  test('la contraseña equivocada no entra', async () => {
    const otro = anonClient()
    const { error } = await otro.auth.signInWithPassword({
      email: EMAIL,
      password: 'esta-no-es-la-clave',
    })
    assert.ok(error != null, 'entró con la contraseña equivocada')
  })

  test('otra persona no se queda con ese perfil', async () => {
    // El perfil es de quien lo creó, y crear una cuenta no lo cambia.
    const intrusa = await signedInAnon()
    const { error } = await intrusa.client.rpc('set_own_styles', {
      p_style_slugs: ['blackwork'],
    })
    assert.ok(error != null, 'una sesión ajena pudo tocar el perfil')
  })
})
