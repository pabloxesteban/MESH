# Entrar con Google: lo que hay que hacer una sola vez

El código ya está. Lo que falta son **dos pantallas de configuración que solo
puede tocar una persona con las cuentas**, porque las credenciales de Google no
viven en el repositorio y no tienen que vivir ahí.

La decisión de fondo —por qué vincula en vez de crear otro usuario— está en
[ADR-015](../decisions/ADR-015-social-sign-in.md). Esto es solamente el paso a
paso.

## Lo primero, porque ahorra la mitad del trabajo

**Alcanza con UN client ID, del tipo "Aplicación web".** No hacen falta ni el
de iOS ni el de Android.

Suena raro para una app de celular, y la razón es que la app nunca habla con
Google: abre el navegador contra Supabase, y Supabase es quien habla con
Google. Lo único que Google tiene registrado es la URL de Supabase.

## 1 · Google Cloud (~10 minutos)

1. Entrá a <https://console.cloud.google.com/> y creá un proyecto. Nombre
   sugerido: `mesh`.
2. **Pantalla de consentimiento de OAuth** (*OAuth consent screen*):
   - Tipo de usuario: **Externo**.
   - Nombre de la app: `MESH`. Correo de soporte: el tuyo.
   - Dominio: se puede dejar vacío mientras esté en modo *Testing*.
   - Permisos (*scopes*): agregá `openid`, `.../auth/userinfo.email` y
     `.../auth/userinfo.profile`. Nada más. MESH no pide contactos, ni agenda,
     ni Drive.
   - Mientras esté en **Testing**, agregate como *usuario de prueba*. En ese
     modo entran hasta 100 cuentas y **no hace falta la verificación de
     Google**, que tarda semanas. Alcanza de sobra para probar y para los
     primeros artistas.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: `MESH (Supabase)`.
   - **URIs de redireccionamiento autorizados** — este es el campo que importa,
     y va la URL de *Supabase*, no la de la app:
     - Producción: `https://<TU-REF>.supabase.co/auth/v1/callback`
     - Local: `http://127.0.0.1:54321/auth/v1/callback`
   - *Orígenes de JavaScript autorizados* se puede dejar vacío: MESH no es una
     web que abra la ventana desde su propio dominio.
4. Guardá el **Client ID** y el **Client secret**. El secret se muestra una vez.

## 2 · Supabase

### En el proyecto hosteado

*Authentication → Sign In / Providers → Google*:

- Activá el proveedor.
- Pegá **Client ID** y **Client Secret**.
- Copiá de esa misma pantalla la **Callback URL**: tiene que ser idéntica a la
  que pusiste en Google. Si no coinciden carácter por carácter, Google
  responde `redirect_uri_mismatch`.

*Authentication → URL Configuration → Redirect URLs*, agregá:

```
mesh://auth/callback
```

Y **solo mientras se prueba con Expo Go**, también:

```
exp://*/--/auth/callback
```

Ese comodín existe porque en Expo Go la URL de vuelta lleva la IP de LAN de la
máquina que corre el bundler, y esa IP cambia de red en red. **Sacalo antes de
publicar**: en producción la app vuelve por `mesh://`.

*Authentication → Providers → (abajo)*: dejá **Manual linking** encendido. Sin
eso, `linkIdentity()` falla con `manual_linking_disabled` y entrar con Google
dejaría de conservar el perfil. Ver ADR-015.

### En local

Ya está en `supabase/config.toml` — solo faltan las dos variables de entorno,
que **no se commitean**:

```sh
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="…apps.googleusercontent.com"
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="GOCSPX-…"
supabase stop && supabase start
```

## 3 · Probarlo

Con `npx expo start` y la app abierta desde el QR:

1. **Perfil → Crear cuenta.** El botón de Google está arriba del correo.
2. Se abre el navegador del sistema, elegís la cuenta, y vuelve solo.
3. En Perfil ahora figura el correo de Google.

Y la prueba que de verdad importa, que es la que ADR-015 existe para proteger:

1. Sin cuenta, andá a **Perfil → Ofrezco un servicio** y creá tu perfil de
   artista con un par de fotos.
2. Recién ahí, **Crear cuenta → Continuar con Google**.
3. **El perfil de artista tiene que seguir ahí.** Si desapareció, se llamó a
   `signInWithOAuth()` donde correspondía `linkIdentity()`, y eso es un bug, no
   una configuración.

## Cuando algo falla

| Lo que se ve | Qué es |
|---|---|
| `redirect_uri_mismatch` | La URL en Google no es igual a la callback de Supabase. Compará carácter por carácter. |
| `Unable to exchange external code` | El *Client secret* está mal o vencido. |
| "No se pudo entrar con Google" y en el log `manual_linking_disabled` | Falta encender *Manual linking*. |
| El navegador se abre y no vuelve nunca | La URL de vuelta (`exp://…` o `mesh://…`) no está en *Redirect URLs*. |
| `invalid_client` en Google, o la pantalla de Google dice que falta el cliente | Las dos variables no estaban exportadas cuando corriste `supabase start`. El CLI pasa el literal `env(...)` tal cual en vez de fallar, así que el síntoma aparece recién en Google. Exportalas y reiniciá. |
| `access_denied` | La cuenta no está en la lista de usuarios de prueba, y la app sigue en modo *Testing*. |
| "Esa cuenta de Google ya está asociada a otra cuenta de MESH" | **No es un error.** Esa persona ya tiene cuenta desde otro teléfono; tiene que entrar con ella desde *Entrar*. Ver ADR-015. |

# Entrar con Apple: lo que hay que hacer una sola vez

**El código ya está** desde el 2026-08-21, con el botón en crear cuenta y en
entrar, solo en iOS. Lo que falta son credenciales de una cuenta de Apple
Developer, que cuesta USD 99 por año y no se puede evitar: la guideline 4.8 de
la App Store exige ofrecer Sign in with Apple junto a cualquier otro inicio de
sesión social, así que **con Google solo, la app no se publica en iOS**.

> **Corrección del 2026-08-21.** Esta página decía antes que Sign in with Apple
> "necesita un build propio: no corre en Expo Go". Es falso:
> [los docs de la SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/)
> dicen *"Included in Expo Go"* y *"You can test this library in Expo Go on iOS
> without following any of the instructions above"*. Lo que sí necesita un build
> propio es **publicar**, no probar.

## Por qué acá sí hay módulo nativo y en Google no

Google abre el navegador contra Supabase. Apple usa la hoja del sistema, con
Face ID. No es coquetería: en un iPhone, pedir la contraseña de Apple en una
pestaña de navegador se lee como una estafa, y es de las cosas que un revisor
mira. Ver `apps/mobile/src/features/auth/apple.ts`.

## 1 · Apple Developer (~20 minutos, y hay que pagar)

1. Entrá a <https://developer.apple.com/account/> con el Apple ID de MESH.
2. **Certificates, Identifiers & Profiles → Identifiers**:
   - Creá un **App ID** con el bundle de la app, y tildá **Sign In with Apple**.
   - Creá un **Services ID** aparte —es el que usa Supabase— y tildá también
     *Sign In with Apple*. Anotá el identificador: es el `client_id`.
   - Configurá el Services ID:
     - *Domains*: el dominio de tu proyecto de Supabase.
     - *Return URLs*: la callback de Supabase,
       `https://<proyecto>.supabase.co/auth/v1/callback`.
3. **Keys → +**: creá una clave con *Sign In with Apple* habilitado. Bajá el
   `.p8`. **Se baja una sola vez**; si lo perdés hay que hacer otra clave.
   Anotá el *Key ID* y tu *Team ID* (arriba a la derecha en la consola).

## 2 · Supabase (~5 minutos)

En **Authentication → Providers → Apple**, encendelo y cargá:

| Campo | De dónde sale |
|---|---|
| *Client IDs* | El **Services ID** del paso 1.2, y además el **bundle de la app** separado por coma — el nativo manda el bundle como audiencia, no el Services ID. |
| *Secret Key* | El contenido del `.p8`, entero, con las líneas `BEGIN`/`END`. |
| *Key ID* | Del paso 1.3. |
| *Team ID* | Del paso 1.3. |

Y en **Authentication → URL Configuration**, *Manual linking* tiene que seguir
encendido: sin eso, `linkIdentity()` responde `manual_linking_disabled` y la
persona pierde lo que hizo sin cuenta.

> **Los dos client IDs no son opcionales.** Es el error más difícil de
> diagnosticar de esta configuración: si solo cargás el Services ID, la hoja
> nativa funciona, devuelve un token, y Supabase lo rechaza porque la audiencia
> del token es el bundle. El síntoma es "no se pudo entrar con Apple" sin más
> pistas.

## 3 · La app

`expo-apple-authentication` ya está en `package.json`. Para **EAS Build** hay
que agregar su config plugin en `app.json`; para probar en Expo Go no hace
falta nada.

## Probarlo

Igual que con Google, y la prueba que importa es la misma:

1. Sin cuenta, andá a **Perfil → Ofrezco un servicio** y creá tu perfil de
   artista con un par de fotos.
2. Recién ahí, **Crear cuenta → Continuar con Apple**.
3. **El perfil de artista tiene que seguir ahí.** Si desapareció, se llamó a
   `signInWithIdToken()` donde correspondía `linkIdentity()`.

## Cuando algo falla, del lado de Apple

| Lo que se ve | Qué es |
|---|---|
| "No se pudo entrar con Apple", sin más | Casi siempre falta el bundle en *Client IDs* de Supabase. Ver el recuadro de arriba. |
| `invalid_client` | El *Services ID*, el *Key ID* o el *Team ID* no coinciden con la clave. |
| La hoja no aparece y sale "este teléfono no lo tiene" | Estás en Android, en la web, o en un iOS anterior a 13. El botón no debería ni dibujarse fuera de iOS; si lo ves, es un bug del guard de plataforma. |
| "Esa cuenta de Apple ya está asociada a otra cuenta de MESH" | **No es un error.** Esa persona ya tiene cuenta desde otro teléfono. |
| El correo llega como `…@privaterelay.appleid.com` | **Es normal.** Eligió esconderlo. Es una dirección real que reenvía. |

## Una cosa que Apple hace y conviene tener presente

**El nombre viene una sola vez**, en la primera autorización, y nunca más. MESH
no lo usa —el nombre para mostrar se elige en Perfil— así que no lo pedimos ni
lo guardamos. Si algún día alguien quiere prellenarlo con lo que da Apple, hay
que hacerlo en esa primera vez o no hay segunda.
