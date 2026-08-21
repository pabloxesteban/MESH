# ADR-015 — Entrar con Google vincula, no crea otro usuario

**Estado:** Aceptado (2026-08-20) · **Fecha:** 2026-08-20 · **Responsable:** security-reviewer

## Contexto

Desde [ADR-013](ADR-013-artist-self-signup.md) un tatuador se da de alta solo
desde la app: crea su perfil, declara sus estilos, sube su obra. Todo eso queda
colgado de su `auth.uid()`.

Y desde [ADR-002](ADR-002-authentication.md) ese `auth.uid()` existe desde el
primer arranque, **antes de que haya cuenta**: MESH abre una sesión anónima
sola. Crear una cuenta con correo no cambia el id porque se hace con
`updateUser()` y no con `signUp()`. Esa línea es toda la razón por la que MESH
no tiene una rutina de fusión de usuarios — y las rutinas de fusión son donde
viven los bugs de privacidad.

El pedido que originó esta decisión fue: *"quiero completar y dar de alta el
perfil desde la app y que quede guardado, con cada uno de los usuarios que
registre, quiero que ya funcione sso"*.

## Problema

Un botón "Continuar con Google" tiene dos implementaciones que **se ven
exactamente iguales en la pantalla** y hacen cosas opuestas:

- `signInWithOAuth()` abre una sesión nueva, con un usuario nuevo.
- `linkIdentity()` le agrega la identidad de Google al usuario que ya existe.

Con sesión anónima, la primera deja el perfil de artista que la persona acaba
de cargar en un usuario al que nadie va a volver a entrar nunca. No falla, no
tira error, no hay ninguna pantalla donde se note. Es el mismo riesgo que
ADR-002 evitó para el correo, con otro nombre.

## Decisión

**Con sesión anónima se vincula. Con cuenta ya creada, se entra.**

```
oauthAction(isAnonymous) → 'link' | 'signIn'
```

La decisión tiene función propia, pura y con test (`features/auth/oauth.ts`),
porque es el único lugar donde elegir mal no se ve.

Cuatro consecuencias que se derivan de eso:

1. **La sesión decide, no la pantalla.** `useGoogle()` lee `isAnonymous` de la
   sesión viva. Alguien puede llegar a "entrar" con sesión anónima —es la que
   MESH abre sola— y ahí lo correcto sigue siendo vincular. Si cada ruta
   decidiera por su cuenta, "entrar" perdería el perfil.
2. **Si esa cuenta de Google ya es de otro usuario de MESH, se dice.** Pasa
   cuando alguien ya se registró en otro teléfono. No se puede unir a los dos
   sin la rutina de fusión que ADR-002 evita, así que se avisa en vez de
   cambiarle el usuario por debajo y dejarle atrás lo que hizo en este
   teléfono. Es la única decisión de esta ADR que le agrega fricción a alguien,
   y es a propósito.
3. **Cancelar no es un error.** Cerrar la pestaña del navegador es una
   decisión. `formOutcome()` devuelve `null` y la pantalla no muestra nada. Un
   cartel rojo ahí convierte "me arrepentí" en "algo se rompió".
4. **Google va arriba del correo.** Es el camino que la mayoría elige, y
   ponerlo debajo del formulario obliga a leer dos campos para descubrir que no
   hacían falta.

### Flujo PKCE, con el navegador del sistema

`supabase.auth` corre en `flowType: 'pkce'`. El navegador se abre con
`WebBrowser.openAuthSessionAsync()` —el navegador del sistema, no un WebView
adentro de la app— y vuelve con un `code` que se canjea con
`exchangeCodeForSession()`. El `code_verifier` nunca sale del dispositivo.

Un WebView propio habría sido la otra opción y está descartada: Google la
rechaza desde 2021 (`disallowed_useragent`), y además le daría a MESH acceso al
formulario donde la persona escribe su contraseña de Google. No queremos ese
acceso ni aunque no lo usemos.

### No hay ninguna credencial de Google en la app

El navegador va a `<supabase>/auth/v1/authorize?provider=google`. Es **Supabase**
quien habla con Google, con el `client_id` y el `secret` que viven de su lado.
Google solo tiene registrada una URL de redirect: la de Supabase.

Eso no es un detalle de comodidad, son dos propiedades:

- No hay secreto que filtrar desde el cliente. Ver
  [security-model](../architecture/security-model.md).
- **Funciona en Expo Go.** La app vuelve a un `exp://192.168.x.x:8081/--/…` que
  Google jamás aceptaría como redirect URI — pero Google nunca lo ve. El que
  redirige ahí es Supabase, y ahí sí alcanza con tenerlo en
  `additional_redirect_urls`.

## Consecuencias

**Lo que se gana.** Registrarse deja de ser un formulario. Para un tatuador que
acaba de cargar seis fotos de su obra, la diferencia entre "elegí una
contraseña de 10 caracteres" y "dos toques" decide si termina o abandona.

**Lo que se paga.**

- **Esto no alcanza para la App Store.** La guideline 4.8 de Apple exige
  ofrecer *Sign in with Apple* junto a cualquier otro inicio de sesión social.
  Google solo es un paso; Apple es obligatorio antes de publicar en iOS, y
  requiere un build propio (no corre en Expo Go). Está anotado en el roadmap.
- **En Expo Go la URL de vuelta cambia de red en red**, porque lleva la IP de
  LAN del bundler. Se resuelve con un comodín `exp://*/--/auth/callback` en la
  lista de redirects permitidos, y ese comodín **no va en producción**: ahí solo
  `mesh://auth/callback`.
- **Un usuario que entra con Google puede no tener correo visible.** Ya estaba
  contemplado: `isAnonymous` se lee de `is_anonymous` en el JWT, nunca de "no
  hay email".

## Alternativas descartadas

- **Google One Tap / id token nativo** (`signInWithIdToken`). Es mejor
  experiencia y no abre navegador, pero necesita `@react-native-google-signin`,
  que es un módulo nativo: **no corre en Expo Go**. Cuando haya build propio se
  puede migrar sin tocar nada de lo de arriba salvo la costura `openAuth`.
- **Magic link por correo.** Cero contraseñas, pero mueve a la persona a su app
  de correo en el peor momento posible, y en el arranque el `site_url` local
  hace que el enlace no vuelva a la app.
- **El proxy de autenticación de Expo** (`auth.expo.io`). Deprecado, y mete un
  tercero en el camino de un token de sesión.

## Un defecto que apareció al enchufarlo

Al mirar la pantalla en el preview: **no había ninguna forma de llegar a crear
cuenta.** `app/cuenta/crear`, `entrar` y `recuperar` existían como rutas, y
`app/cuenta/index.tsx` era la pantalla que llevaba a ellas — pero nada
navegaba a `/cuenta`. Los tests pasaban, el flujo de correo funcionaba de punta
a punta contra la base, y desde la app no se podía registrar nadie.

Ahora la cuenta vive en **Perfil**, que es la única puerta, y `app/cuenta/*`
son destinos: se entra desde Perfil y se vuelve a Perfil. `app/cuenta/index.tsx`
se borró — era una tercera pantalla de cuenta que duplicaba lo que ya estaba en
Perfil.

Mirando eso se cayó también el texto: la invitación prometía guardar *"tu gusto
y tus guardados"*. El gusto se sacó con [D-010](../design/MESH-DESIGN-DECISIONS.md)
y los guardados nunca se construyeron. Ahora dice lo que la cuenta conserva de
verdad: el perfil, las búsquedas y los chats.

## Qué mirar si esto se rompe

- Alguien que se registra y **pierde su perfil de artista** → `oauthAction()`
  devolvió `'signIn'` con sesión anónima. El test que lo cubre es el primero de
  `oauth.test.ts`.
- **`manual_linking_disabled`** → falta `enable_manual_linking = true`.
- **`redirect_to` no permitido** → la URL de Expo Go no está en la lista.

## Enmienda del 2026-08-21 — Apple, y por qué va por otro camino

Se sumó **Sign in with Apple**. No es una preferencia: la guideline 4.8 de la
App Store lo exige junto a cualquier otro inicio de sesión social, así que con
Google solo la app no se publica en iOS.

**La regla de arriba no cambia**: con sesión anónima se vincula. Lo que cambia
es el mecanismo, y vale la pena escribir por qué.

Google va por el navegador contra el OAuth hospedado de Supabase. Apple **no**:
usa la hoja del sistema, con Face ID, vía `expo-apple-authentication`. Dos
razones que se suman:

1. **Solo se muestra en iOS**, que es donde Apple lo exige y donde la gente lo
   reconoce. En Android un botón de Apple es ruido, y el hook devuelve `null`
   fuera de iOS para que ni se dibuje.
2. **En un iPhone, pedir la contraseña de Apple en una pestaña de navegador se
   lee como una estafa.** Es de las cosas que un revisor mira.

**Dos suposiciones que había que verificar, y una estaba mal.**

- Se supuso que el camino nativo no podía vincular, porque `signInWithIdToken()`
  abre un usuario nuevo. **Falso**: `linkIdentity()` tiene una sobrecarga que
  acepta un id token. Se comprobó contra los tipos de `@supabase/auth-js` antes
  de escribir el módulo. Si no existiera, habría habido que elegir entre la hoja
  nativa y no perderle los datos a nadie — y habría ganado lo segundo.
- `docs/launch/sso-setup.md` afirmaba que Sign in with Apple "no corre en Expo
  Go". **También falso**: los docs de la SDK 57 dicen *"Included in Expo Go"*.
  Corregido ahí.

**Lo que queda sin probar, y hay que decirlo:** la hoja del sistema nunca se
ejecutó. Necesita iOS y una cuenta de Apple Developer configurada. Lo que sí
está probado es todo lo que la rodea —vincular contra entrar, cancelar, los
mensajes, el teléfono sin soporte— con las mismas costuras inyectables que usa
Google. La primera vez que alguien la corra de verdad va a ser en un iPhone.

## Referencias

- [ADR-002](ADR-002-authentication.md) — anónimo primero, y por qué el id no cambia
- [ADR-013](ADR-013-artist-self-signup.md) — qué se pierde si el id cambia
- [docs/launch/sso-setup.md](../launch/sso-setup.md) — los pasos que solo puede hacer una persona
