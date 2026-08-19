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

**Cuatro, y no las mismas cuatro para todos.** Dependen de a qué vino la
persona — ver [ADR-014](../decisions/ADR-014-two-sided.md).

| | Busca a alguien | Ofrece un servicio |
|---|---|---|
| 1 | **Inicio** — obra | **Inicio** — búsquedas de gente |
| 2 | **Búsqueda** — por fotos, con IA | **Estudio** — perfil, estilos, obra |
| 3 | **Matches** — encajes, chats e interesados | **Chats** |
| 4 | **Perfil** | **Perfil** |

Cuatro y no seis: con seis, la barra pasa a ser un menú que hay que estudiar en
vez de un lugar donde la mano ya sabe ir. La intención se cambia desde Perfil.

**Inicio tiene a su vez dos modos** para quien busca: el mazo (se decide, y MESH
aprende) y la grilla (se recorre y se compara). Con cuál abre lo decide cuántas
decisiones hay, no una preferencia escondida. Ver
[MESH-DESIGN-DECISIONS D-009](../design/MESH-DESIGN-DECISIONS.md).

**"Explorar" no es una pestaña.** El recorrido de producto lo nombra como paso
—descubrir, explorar, entender, confiar, encajar, contactar— pero explorar es
lo que pasa **adentro** de la grilla y adentro del mundo de una persona, no una
superficie propia. Una quinta pestaña rompería la regla de cuatro para nombrar
algo que ya está sucediendo en las que hay.

Notas por pestaña:

- **Matches** lleva los chats arriba, después quién se interesó en tu búsqueda,
  y después la gente rankeada. Son la misma idea a tres niveles de cercanía;
  separarlas en pestañas distintas obligaría a la persona a armar sola la
  conexión.
- **Búsqueda** sin búsquedas *es* el punto de entrada para crear una — el
  estado vacío es la feature, no un placeholder.


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
