# MESH — Arquitectura de navegación

**Estado:** Vigente · **Responsables:** ux-product-designer + mobile-engineer

---

## 1. Estructura

Expo Router, basado en archivos, con rutas tipadas. Las rutas se nombran en
inglés (son código); las etiquetas visibles van en español.

```
app/
  _layout.tsx                    raíz: providers, tipografías, arranque de sesión
  (tabs)/
    _layout.tsx                  4 pestañas, distintas según la intención
    index.tsx                    Inicio — grilla de artistas / mazo de búsquedas
    explorar.tsx                 toda la obra, de todos lados
    estudio.tsx                  tu perfil de artista (solo "ofrezco")
    para-vos.tsx                 chats
    perfil.tsx                   cuenta, alcance, tema, acceso al estudio
    buscar.tsx                   buscar por fotos — ruta sin pestaña
  asistente.tsx                  contarlo con palabras — ruta sin pestaña
  ubicacion.tsx                  desde dónde mirar — se llega desde Inicio
  artista/[slug].tsx             perfil profesional (push desde cualquier lado)
  chat/[id].tsx                  una conversación
  contacto/[slug].tsx            traspaso a WhatsApp / Instagram
  proyectos/index.tsx            tus búsquedas
  proyectos/nuevo.tsx            crear una búsqueda
  cuenta/*                       crear, entrar, recuperar — se llega desde Perfil
  auth/callback.tsx              la vuelta del enlace del correo (deep link)
  estudio.tsx                    el estudio por enlace directo, sin pestaña
  galeria.tsx · playground.tsx   herramientas de desarrollo
```


## 2. Pestañas

**Cuatro, y no las mismas cuatro para todos.** Dependen de a qué vino la
persona — ver [ADR-014](../decisions/ADR-014-two-sided.md).

| | Busca a alguien | Ofrece un servicio |
|---|---|---|
| 1 | **Inicio** — artistas cerca tuyo | **Inicio** — búsquedas de gente |
| 2 | **Explorar** — toda la obra | **Estudio** — perfil, estilos, obra, horario |
| 3 | **Chats** | **Chats** |
| 4 | **Perfil** | **Perfil** |

Cuatro y no seis: con seis, la barra pasa a ser un menú que hay que estudiar en
vez de un lugar donde la mano ya sabe ir. La intención se cambia desde Perfil.

**No hay mazo ni pestaña de encajes.** MESH dejó de recomendar gente puntuada
para mostrar quién hay y qué hizo. Ver
[MESH-DESIGN-DECISIONS D-010](../design/MESH-DESIGN-DECISIONS.md).

Notas por pestaña:

- **Inicio** contesta *quién tatúa cerca mío*: una grilla de artistas, cada uno
  con un carrusel chico de su obra y, debajo, nombre, foto y ubicación. Arriba
  dice **desde dónde** se está midiendo y se puede cambiar — GPS, un barrio a
  mano, o nada (D-012). El orden lo hacen `sortByProximity` o
  `sortByNeighborhood` en `packages/domain`, nunca el SQL. La ubicación
  **ordena pero nunca filtra**: quien está lejos, o no publicó dónde trabaja,
  aparece igual y más abajo.
- **Explorar** contesta *qué me quiero tatuar*: toda la obra de todos los que se
  registraron, esté cerca o lejos. Cada obra abre a la persona que la hizo —
  una grilla que se pueda recorrer sin llegar nunca a alguien sería otra app.
  Buscar por fotos se entra desde acá.
- **Chats**, en los dos lados, es solo chats. Con una sola cosa más, y solo del
  lado del artista: **el turno sale de acá**. El dueño de la agenda ve un botón
  para darlo, y el turno dado lo ven los dos con la fecha, el horario y un botón
  para cancelarlo. Ver [ADR-018](../decisions/ADR-018-availability.md).
- **El almanaque** no es una pestaña y no debería serlo. Se carga desde el
  Estudio y se mira desde el perfil del artista, donde dice cuántos horarios le
  quedan libres esta semana — el número, nunca cuáles.
- **Perfil** guarda el nombre, la intención, la cuenta y —para quien tatúa— el
  acceso al estudio.

**Perfil es la única puerta a `cuenta/`**, y por un tiempo no hubo ninguna:
`app/cuenta/` existía como rutas y ninguna pantalla llevaba ahí, así que crear
cuenta era código que corría en los tests y que nadie podía alcanzar desde la
app. Las rutas de `cuenta/` son destinos: se entra desde Perfil y se vuelve a
Perfil.


## 3. Acceso a las rutas

| Ruta | Sesión anónima | Cuenta durable |
|---|---|---|
| Inicio, Explorar, perfil de artista, buscar por fotos | ✅ | ✅ |
| Chats | ✅ | ✅ |
| Traspaso a contacto | ✅ | ✅ |
| Crear/conservar un proyecto | se le propone crear cuenta | ✅ |
| Ajustes, cuenta, borrar datos | ✅ | ✅ |

Toda persona tiene una sesión de Supabase desde el primer arranque (anónima). No
hay un estado de "deslogueado" que diseñar, ni un camino de lectura sin
autenticar en RLS, y por lo tanto no hay ningún guard de ruta que se pueda
olvidar. La propuesta de crear una cuenta real aparece donde le sirve a la
persona —conservar una búsqueda o un chat entre dispositivos— y se puede
descartar.

Justificación y contrapartidas:
[ADR-002](../decisions/ADR-002-authentication.md).

## 4. Transiciones

| De → A | Transición |
|---|---|
| Pestaña → pestaña | Instantáneo, sin animación |
| Obra → perfil de artista | La obra crece desde donde estaba hasta ser el hero del perfil, 280ms, mientras la pantalla se funde. Ver [D-011](../design/MESH-DESIGN-DECISIONS.md) |
| Fila del nombre en Inicio → perfil | Fundido. No hay obra que crecer, así que no hay nada que seguir con la vista |
| Perfil → atrás | La obra encoge hasta su lugar en la grilla, si ese lugar todavía se ve; si no, navegación de siempre (D-011) |
| Cualquiera → modal | Hoja, con manija; se cierra arrastrando y con un Cerrar explícito |

Las duraciones, los easings y el comportamiento con reducción de movimiento son
tokens del design system — las pantallas no los definen. Nada supera los 500ms.
Las transiciones nunca bloquean la entrada.

## 5. Deep links

Esquema `mesh://`, más universal/app links sobre un futuro dominio `mesh.app`.

| Link | Destino |
|---|---|
| `mesh://artist/{slug}` | Perfil profesional |
| `mesh://explore` | Explorar |
| `mesh://style/{categorySlug}/{styleSlug}` | Explorar, filtrado por ese estilo |
| `mesh://project/{id}` | Proyecto — **solo si pertenece a la sesión actual** |
| `mesh://auth/callback?code=…` | La vuelta del enlace de recuperación de contraseña |

Reglas:

1. Todo parámetro se valida antes de usarse — patrón de slug, formato UUID. Un
   link malformado cae en una pantalla de no encontrado, nunca en un crash ni en
   una consulta cruda.
2. Los deep links nunca pueden llevar tokens, credenciales ni códigos de auth.
   Los callbacks de auth de Supabase usan la ruta dedicada
   `mesh://auth/callback` y ninguna otra. Lo que viaja ahí es un código PKCE de
   un solo uso que **no sirve sin el `code_verifier`**, y ese verifier vive en
   el llavero del teléfono que pidió el enlace: interceptar la URL no alcanza
   para entrar a la cuenta.

   En Expo Go el esquema es `exp://…/--/auth/callback`, con la IP de LAN del
   bundler. `redirectUri()` devuelve el que corresponde en cada caso — escribir
   `mesh://` a mano dejaba el enlace del correo sin destino durante todo el
   desarrollo.
3. Un deep link a un recurso que la sesión no posee resuelve a no encontrado —
   la misma respuesta que un recurso inexistente, para que los links no se puedan
   usar para sondear existencia. RLS lo impone sin importar qué haga el cliente.
4. Los deep links nunca ejecutan una mutación. Nada de `mesh://like/{id}`.

Ver [`threat-model.md`](../security/threat-model.md) §T7.

## 6. Comportamiento del "atrás" y callejones sin salida

- El botón físico de atrás de Android se maneja en todas las pantallas; desde
  la raíz de una pestaña manda la app a segundo plano en vez de dejar una pila
  vacía.
- Todo estado de error y de vacío lleva una acción hacia adelante — reintentar,
  explorar, o volver. Una pantalla cuya única salida es el gesto de atrás del
  sistema operativo es un defecto.
- El modal de contacto vuelve al perfil: la persona venía de algún lado y tiene
  que aterrizar de nuevo en contexto.
- **El perfil tiene su propia salida en pantalla**, además del gesto del
  sistema. Se agregó al construir la vuelta de la transición; su ausencia era un
  defecto según esta misma sección y nadie lo había mirado.

## 7. Accesibilidad

- Las etiquetas de la barra de pestañas están siempre visibles — nunca solo
  íconos.
- Todo gesto tiene un botón equivalente con etiqueta a ≥ 44×44pt. El único
  gesto que quedó en la app de quien busca es el carrusel horizontal de la
  tarjeta de Inicio, y no esconde nada: todas sus obras abren el mismo perfil,
  que también se abre desde la fila del nombre. El mazo de búsquedas del lado
  del artista conserva sus botones equivalentes.
- Los lectores de pantalla reciben un orden lineal por tarjeta: obra, artista,
  estilos.
- La reducción de movimiento colapsa las transiciones: la obra aparece en su
  lugar final, sin recorrido. No se anima más rápido — no se anima. Y la
  navegación nunca depende de que la transición salga bien: si la obra no se
  puede medir, el perfil se abre igual, sin animación.
- Se respeta la tipografía dinámica hasta el tamaño accesible más grande; los
  layouts usan flujo, no alturas fijas, y las tarjetas ajustan su texto en vez
  de recortarlo.
