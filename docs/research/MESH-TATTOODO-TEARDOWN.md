# Tattoodo, mirado de cerca

**Fecha:** 2026-08-19 · **Fuente:** seis capturas de pantalla de Tattoodo
10.20.0 en iPhone, tomadas por el equipo · **Para:** decidir qué tomar y qué
rechazar de la competencia directa.

---

## Lo que NO pude verificar

Esto importa antes que cualquier conclusión.

- **No usé la app.** Vi seis pantallas quietas. No sé cómo se siente el scroll,
  cuánto tarda en cargar, qué pasa al tocar, ni cómo son las transiciones.
  Cualquier afirmación sobre interacción acá es una inferencia y está marcada
  como tal.
- **No vi el perfil de un artista**, que es la pantalla donde se decide contactar
  y la más importante de las dos apps. Lo que sigue sobre el perfil ajeno es
  deducción a partir de las tarjetas.
- **No vi el flujo de contacto** más allá del botón "Send request".
- **No vi la app con una cuenta con datos.** Las capturas son de una cuenta
  vacía: "No saved artists", "No boards", "No results". Los estados vacíos que
  critico abajo podrían verse distinto con uso real.
- **La cuenta está en Bondi Beach, Australia**, no en Buenos Aires. La densidad
  de artistas que muestra no dice nada sobre cómo se vería en CABA.

---

## 1. La estructura ya convergió, y eso es la noticia

| | Tattoodo | MESH |
|---|---|---|
| 1 | **Explore** — artistas cerca tuyo | **Inicio** — artistas cerca tuyo |
| 2 | **Tattoos** — toda la obra | **Explorar** — toda la obra |
| 3 | **Inbox** — mensajes | **Chats** — mensajes |
| 4 | **Profile** | **Perfil** |

Son las mismas cuatro pestañas, en el mismo orden, con la misma división de
trabajo: una contesta *quién tatúa cerca mío*, la otra *qué me quiero tatuar*.
MESH llegó ahí solo, por [D-010](../design/MESH-DESIGN-DECISIONS.md), y la
coincidencia es una buena señal de que la estructura es correcta.

**También es la mala noticia: MESH no puede ganar por arquitectura de
información.** Si el que ya tiene el catálogo global tiene las mismas cuatro
pestañas, la diferencia tiene que estar en otro lado — y hoy está en tres
lugares: qué se muestra sin inventar, cómo se hace el contacto, y cuán local es
el catálogo. Eso hay que defenderlo, no diluirlo.

---

## 2. Dónde Tattoodo es mejor

Las tres primeras son deudas reales de MESH. No están en orden de esfuerzo:
están en orden de cuánto duelen.

### 2.1 La ubicación se ve y se cambia

Tattoodo pone **"Bondi Beach, NSW, Australia ⌄"** como título grande de Explore,
con un selector. Abajo, cada artista dice **"0.1mi away"**.

MESH ordena por cercanía en silencio. El único control de ubicación es el radio
de búsqueda, escondido en Perfil, y la ubicación sale del GPS sin que se pueda
corregir. Para CABA eso es peor de lo que parece: alguien que vive en Palermo
pero se va a tatuar cerca del trabajo en Microcentro no tiene forma de decirlo, y
alguien que abre la app en el subte queda con la ubicación equivocada sin
enterarse.

**Es el hallazgo más fuerte de las seis capturas.** Y encaja con una regla que
MESH ya tiene escrita: la distancia ordena pero nunca filtra. Un selector visible
no rompe nada — solo hace explícito el "desde dónde".

### 2.2 Secciones editoriales en vez de una lista plana

Explore no es una lista: son bloques con título y "See all" — **"Nearest
Artists"**, **"Worth traveling for"**.

"Worth traveling for" es una buena idea y es exactamente la regla de MESH dicha
en la interfaz: la distancia no descarta a nadie, y alguien lejos puede valer el
viaje. MESH tiene una sola lista ordenada por cercanía, donde el artista de
Rosario que hace justo lo que buscás queda al final sin explicación.

### 2.3 No hay búsqueda por texto en MESH

Tattoodo tiene dos campos: "Find artists by style and motif" y "Search tattoos".
MESH tiene filtros por estilo sobre lo que ya bajó, y buscar con una foto. No
tiene forma de escribir "dragón" o "fine line en Villa Crespo".

Con quince artistas no es urgente. Con cien, la falta de búsqueda es la primera
cosa que alguien va a extrañar.

### 2.4 Dos que son discutibles, no deudas

- **Pie de artista en cada obra de la grilla.** Tattoodo pone avatar + nombre +
  estudio + ciudad debajo de cada tatuaje. MESH los sacó a propósito
  ([VISUAL-DIRECTION-2 §4](../design/MESH-VISUAL-DIRECTION-2.md)): con un pie por
  obra la grilla se lee como una lista de gente en vez de un muro de trabajo.
  Mirando las dos, la de Tattoodo **da más sensación de comunidad** y la de MESH
  se ve más limpia. No lo resuelvo desde una captura; queda como candidato a
  probar con gente.
- **Guardar.** Tattoodo tiene bookmark por artista y "Boards". MESH se quedó sin
  guardar cuando salió el mazo (D-010). Alguien que recorre Explorar buscando
  ideas hoy no tiene dónde ponerlas, y eso es un agujero real — pero volver a
  meter guardado es una decisión de producto con su propio ADR, no un ajuste.

---

## 3. Dónde MESH ya es mejor, y no hay que aflojar

### 3.1 No hay muro de registro

Tattoodo abre con **"Browse tattoos. Book artists."** y tres botones de login
sobre la grilla, con un "Skip" chiquito arriba a la derecha. MESH le da a todo el
mundo una sesión anónima desde el primer arranque
([ADR-002](../decisions/ADR-002-authentication.md)): no hay pantalla de login que
saltear porque no hay login.

### 3.2 Reseñas y estrellas

Tattoodo tiene **"Latest Reviews"** con estrellas y texto. MESH tiene prohibido
mostrar reseñas, y no por falta de tabla: está en los innegociables de
`CLAUDE.md`. Con quince artistas, tres reseñas de cinco estrellas no son
información, son ruido con forma de dato.

### 3.3 Disponibilidad inventada

**"Available"** y **"Responds within a few days"** aparecen en cada tarjeta. No
sé de dónde salen; si son estadísticas de respuesta, MESH no las tiene y no las
va a fabricar. MESH muestra disponibilidad solo cuando el artista la declaró,
con la fecha en que la declaró, y la marca como vieja cuando lo es.

**Esta es la diferencia más grande entre las dos apps y no se ve en una
captura.** Tattoodo llena; MESH deja el hueco.

### 3.4 Los estados vacíos

Tres capturas muestran vacíos sin salida: "No results" en Inbox, "No saved
artists" y "No boards" en Profile. Ninguno ofrece qué hacer. En MESH,
`EmptyState` **exige** una acción — no se puede compilar un vacío sin salida.

### 3.5 El acento

Tattoodo usa azul saturado en cada tarjeta: "Send request" repetido, más un
banner azul entero de "Join as artist". MESH usa el acento como máximo una vez
por pantalla. Una lista de botones idénticos y gritones deja de tener jerarquía:
cuando todo resalta, nada resalta.

---

## 4. Una tensión que no resuelvo acá

**La barra de pestañas flotante.** Tattoodo usa una píldora translúcida que flota
sobre el contenido, y se ve bien: le devuelve a la obra los 56pt de una barra
sólida. MESH la evaluó y la rechazó en
[D-004](../design/MESH-DESIGN-DECISIONS.md), con la cita de las HIG de Apple
verificada.

No cambio D-004 con una captura. Pero la dejo anotada como la única decisión
visual donde la competencia eligió distinto y el resultado se ve mejor de lo que
D-004 anticipaba. Si alguna vez se revisa, se revisa mirando las dos en un
teléfono, no discutiendo la cita.

---

## 5. Qué haría, en orden

1. **Ubicación visible y editable en Inicio.** Un encabezado que diga desde
   dónde se está midiendo y deje cambiarlo. Es la deuda más clara y la más
   barata.
2. **Secciones en Inicio.** Al menos dos: "Cerca tuyo" y algo con la forma de
   "vale el viaje". Le da sentido a los artistas lejanos sin filtrarlos.
3. **Buscar por texto**, cuando el catálogo pase de unas decenas.
4. **Volver a poner guardado**, con su ADR: qué se guarda, dónde se ve, y por qué
   no es una lista de deseos que nadie revisa.
5. **Probar el pie de artista en la grilla** con gente, no en una reunión.

Lo que **no** haría, y conviene que esté escrito para cuando alguien lo proponga:
estrellas, reseñas, "disponible ahora", muro de registro, y un botón de acción
azul repetido en cada tarjeta.
