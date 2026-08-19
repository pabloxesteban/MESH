# La vista previa web

Cómo mirar MESH en un teléfono sin instalar nada, qué prueba y qué no.

## Qué es

`npm run web:preview` produce **un solo archivo HTML** con la app adentro:
las pantallas reales, los componentes reales, las tipografías reales, el motor
de gusto real y el de matching real, sobre un catálogo de fixtures horneado —
imágenes incluidas, como data URI.

No hay red. No hay Supabase. No hay sesión. Se abre y funciona.

## Cómo funciona

Dos piezas.

**1 · El catálogo horneado.** `npm run preview:data` lee `content/artists/` —la
misma fuente que carga el seeder— y escribe
`apps/mobile/preview/data.generated.ts` con las piezas y sus imágenes
redimensionadas a 560 px. Son 58 imágenes y pesan 0,44 MB en total.

**2 · El intercambio de módulos.** Con `MESH_PREVIEW=1`, Metro resuelve cada
uno de estos cinco archivos a su hermano `.preview.ts`:

```
src/features/discovery/queries.ts       → queries.preview.ts
src/features/discovery/interactions.ts  → interactions.preview.ts
src/features/taste/queries.ts           → queries.preview.ts
src/features/matches/queries.ts         → queries.preview.ts
src/features/profile/queries.ts         → queries.preview.ts
```

Los cinco son exactamente los módulos que hablan con Supabase. Todo lo demás
—pantallas, hooks, componentes, tokens, i18n, y los motores de
`packages/domain`— es el mismo código que corre en el teléfono.

El intercambio se hace **por ruta resuelta y no por el texto del import**: media
docena de features importan `'./queries.ts'`, así que reescribir por el
especificador arrastraría también a proyectos y a auth, que no tienen versión de
preview.

## Qué prueba, y qué no

| Sí | No |
|---|---|
| Color, contraste, tipografía, espaciado | Hápticos |
| Los dos temas en una pantalla real | Gestos nativos y su física |
| El flujo completo: mazo → gusto → encajes → perfil | Performance real |
| El modo artista entero: alta propia, estilos, ubicación, subir obra | Que un artista no pueda escribir en el perfil de otro |
| Que el motor de gusto y el ranking dan lo que se espera | Offline y la cola de interacciones |
| Áreas táctiles y etiquetas de accesibilidad | RLS, permisos, paginación contra la base |

El modo artista anda de punta a punta en el preview: en **Perfil → Tu estudio**
se crea un perfil propio con nombre y contacto (o se canjea `BRIZA123`, un
código de mentira que solo existe acá), se declaran estilos, se publica una
ubicación fija de ejemplo y se sube una foto que aparece en el mazo. El único
perfil con coordenadas es el propio: el catálogo horneado no trae GPS de nadie,
porque nadie lo dio.

Lo que el preview **no** prueba de todo eso es justamente lo que importa de
seguridad —que un artista no pueda escribir en el perfil de otro—, porque eso lo
decide RLS y acá no hay base. Está en `supabase/tests/25_artist_ownership.sql`,
`supabase/tests/26_artist_self_signup.sql` y en `tests/integration/`.

**Un preview que se ve bien no dice que la app esté bien.** react-native-web es
una traducción. Antes de un release hay que abrirla en un dispositivo con Expo
Go.

## Se verifica antes de entregarse

El script termina abriendo el HTML en un Chromium headless con locale `es-AR` y
falla si el resultado no renderiza, si tira errores, o si no aparece ninguno de
los artistas del catálogo.

Esto existe porque una vez el preview salió **completamente negro** y se entregó
igual: pesaba lo que tenía que pesar. El tamaño no dice nada sobre si se ve algo.

El canario es el nombre de un artista y no un texto de interfaz. La versión
anterior usaba una clave de i18n y fallaba con el preview perfectamente sano: el
navegador headless corre en inglés y la app traduce. Un canario que depende del
locale del verificador no verifica el preview, verifica el locale.

## Cómo se comparte

El archivo es autocontenido y no le pide nada a ningún host, así que se puede
publicar como una página y abrir el enlace desde el teléfono. Descargarlo y
abrirlo desde el sistema de archivos del celular tiende a fallar según el
navegador — conviene un enlace.

## Lo que este preview no reemplaza

Correr la app de verdad:

```
npm run db:start          # Supabase local
npm run content:fixtures
npm run seed -w @mesh/seed -- --publish
npm run mobile            # Expo, y se escanea el QR con Expo Go
```

Eso necesita que el teléfono y la máquina estén en la misma red. Desde un
entorno remoto no alcanza: haría falta un túnel, y los túneles tipo ngrok no
pasan por proxies que reterminan TLS.
