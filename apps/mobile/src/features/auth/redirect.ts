/**
 * A dónde vuelve la app cuando sale al navegador o al correo.
 *
 * En módulo propio y no adentro de `oauth.ts` porque también lo necesita
 * `queries.ts` para el enlace de recuperación de contraseña, y `oauth.ts`
 * arrastra `expo-web-browser`, que ahí no hace falta.
 *
 * Un valor y no una constante: en Expo Go devuelve
 * `exp://192.168.x.x:8081/--/auth/callback` —con la IP de LAN del bundler, que
 * cambia de red en red— y en un build propio, `mesh://auth/callback`. Estaba
 * escrito a mano como `'mesh://auth/callback'`, y con eso el correo de
 * recuperación abría un esquema que en Expo Go no existe: el enlace no llevaba
 * a ningún lado justo cuando la persona ya no puede entrar de otra forma.
 */

import * as AuthSession from 'expo-auth-session'

export function redirectUri(): string {
  return AuthSession.makeRedirectUri({ scheme: 'mesh', path: 'auth/callback' })
}
