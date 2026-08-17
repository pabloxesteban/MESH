# MESH — Arquitectura de navegación

**Estado:** Propuesto · **Responsables:** ux-product-designer + mobile-engineer

---

## 1. Estructura

Expo Router, basado en archivos, con rutas tipadas. Las rutas se nombran en
inglés (son código); las etiquetas visibles van en español.

```
app/
  _layout.tsx                    raíz: providers, tipografías, arranque de sesión
  intro.tsx                      una pantalla, una línea, una acción
  (tabs)/
    _layout.tsx                  4 pestañas
    discover/
      index.tsx                  el mazo
      [itemId].tsx               detalle de obra (push)
    matches/
      index.tsx                  resumen de gusto + gente rankeada
    projects/
      index.tsx                  lista, o el estado vacío de crear proyecto
      [projectId].tsx            proyecto + sus matches
    you/
      index.tsx                  guardados · gusto · cuenta · ajustes
  artist/
    [slug].tsx                   perfil profesional (push desde cualquier lado)
  (modals)/
    project-new.tsx              hoja por pasos
    contact.tsx                  mensaje precargado y editable
    filters.tsx                  filtros de búsqueda
    auth.tsx                     creación de cuenta / ingreso, a demanda
```

## 2. Pestañas

**Descubrir · Matches · Proyectos · Vos**

Cuatro y no tres, porque §08 del brief define dos puntos de entrada *iguales*
—exploratorio y dirigido— y enterrar la creación de proyectos dentro de una
pestaña de perfil hace que la persona dirigida tenga que buscar justamente
aquello que vino a hacer. El costo es una pestaña más; el beneficio es que
ambas intenciones son visibles en el primer arranque.

Esta es la [pregunta abierta Q2](../product/product-spec.md#14-preguntas-abiertas).
Si tras la primera cohorte los `project_started` originados en la pestaña
Proyectos son insignificantes, colapsar a tres pestañas y exponer proyectos
desde Descubrir.

Notas por pestaña:

- **Matches** lleva el resumen de gusto arriba, y después la gente rankeada. El
  gusto y los matches son la misma idea a dos niveles de zoom; separarlos en
  pestañas distintas obligaría a la persona a armar sola la conexión.
- **Proyectos** sin proyectos *es* el punto de entrada para crear uno — el
  estado vacío es la feature, no un placeholder.
- **Vos** guarda los trabajos guardados, los ajustes de gusto, la cuenta y la
  privacidad. Sin insignias, sin puntitos, sin nada que parezca una
  notificación.

## 3. Acceso a las rutas

| Ruta | Sesión anónima | Cuenta durable |
|---|---|---|
| Intro, Descubrir, detalle de obra, perfil de artista, búsqueda | ✅ | ✅ |
| Interacciones, gusto, matches | ✅ | ✅ |
| Traspaso a contacto | ✅ | ✅ |
| Crear/conservar un proyecto | se le propone crear cuenta | ✅ |
| Ajustes, cuenta, borrar datos | ✅ | ✅ |

Toda persona tiene una sesión de Supabase desde el primer arranque (anónima). No
hay un estado de "deslogueado" que diseñar, ni un camino de lectura sin
autenticar en RLS, y por lo tanto no hay ningún guard de ruta que se pueda
olvidar. La propuesta de crear una cuenta real aparece donde le sirve a la
persona —conservar un proyecto, conservar el gusto entre dispositivos— y se
puede descartar.

Justificación y contrapartidas:
[ADR-002](../decisions/ADR-002-authentication.md).

## 4. Transiciones

| De → A | Transición |
|---|---|
| Pestaña → pestaña | Instantáneo, sin animación |
| Tarjeta del mazo → detalle de obra | Elemento compartido sobre la imagen, 240ms |
| Cualquier lado → perfil de artista | Push, slide nativo de iOS; hero compartido cuando el origen fue una imagen |
| Cualquiera → modal | Hoja, con manija; se cierra arrastrando y con un Cerrar explícito |
| Revelación del gusto | Editorial: los estilos aparecen en secuencia, ~500ms en total, respeta reducción de movimiento |

Las duraciones, los easings y el comportamiento con reducción de movimiento son
tokens del design system — las pantallas no los definen. Nada supera los 500ms.
Las transiciones nunca bloquean la entrada.

## 5. Deep links

Esquema `mesh://`, más universal/app links sobre un futuro dominio `mesh.app`.

| Link | Destino |
|---|---|
| `mesh://artist/{slug}` | Perfil profesional |
| `mesh://work/{itemId}` | Detalle de obra |
| `mesh://style/{categorySlug}/{styleSlug}` | Exploración filtrada |
| `mesh://project/{id}` | Proyecto — **solo si pertenece a la sesión actual** |

Reglas:

1. Todo parámetro se valida antes de usarse — patrón de slug, formato UUID. Un
   link malformado cae en una pantalla de no encontrado, nunca en un crash ni en
   una consulta cruda.
2. Los deep links nunca pueden llevar tokens, credenciales ni códigos de auth.
   Los callbacks de auth de Supabase usan la ruta dedicada
   `mesh://auth/callback` y ninguna otra.
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
- El modal de contacto vuelve al perfil, no al mazo: la persona venía de algún
  lado y tiene que aterrizar de nuevo en contexto.
- Después de crear un proyecto, la persona aterriza en los matches de ese
  proyecto — la recompensa, no una pantalla de confirmación.

## 7. Accesibilidad

- Las etiquetas de la barra de pestañas están siempre visibles — nunca solo
  íconos.
- Todo gesto tiene un botón equivalente con etiqueta; los controles del mazo (Me
  gusta / Paso / Guardar / Deshacer) son el camino accesible principal, no un
  plan B, y miden ≥ 44×44pt.
- Los lectores de pantalla reciben un orden lineal por tarjeta: obra, artista,
  estilos, y después acciones. El mazo expone `accessibilityActions` para me
  gusta / paso / guardar, así quien usa VoiceOver o TalkBack actúa sin
  deslizar.
- La reducción de movimiento colapsa las transiciones de elemento compartido y
  de revelación a un fundido.
- Se respeta la tipografía dinámica hasta el tamaño accesible más grande; los
  layouts usan flujo, no alturas fijas, y las tarjetas ajustan su texto en vez
  de recortarlo.
