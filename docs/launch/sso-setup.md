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

## Lo que todavía falta para la App Store

La guideline 4.8 de Apple exige ofrecer **Sign in with Apple** junto a
cualquier otro inicio de sesión social. Google solo no alcanza para publicar en
iOS, y Sign in with Apple necesita un build propio: no corre en Expo Go. Es el
próximo paso de esta línea, y está anotado en el roadmap.
