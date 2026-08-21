# Por qué alguien dejaría Instagram por MESH

**Fecha:** 2026-08-21 · **Estado:** Para discutir y romper · **Origen:** la
pregunta de que la app todavía no soluciona un problema real.

Este documento contesta una sola pregunta y no se ocupa de ninguna otra.

---

## Lo que no pude verificar

Va primero, como en el teardown de Tattoodo, porque cambia cuánto pesa todo lo
demás.

- **No hablé con un solo tatuador ni con una sola persona que se haya
  tatuado.** Todo lo que sigue sobre el dolor real es una hipótesis, no un
  hallazgo. Está marcado.
- **No tengo datos del mercado argentino.** Que el descubrimiento de tatuadores
  en CABA pase por Instagram y WhatsApp es lo que creo y lo que da toda la
  literatura del rubro, pero **acá no está medido**. Es la primera cosa que hay
  que salir a comprobar, y se comprueba con veinte conversaciones, no con
  código.
- **MESH no tiene usuarios.** No hay retención, ni conversión, ni una sola
  búsqueda real. Lo que sigue es análisis de producto, no lectura de evidencia.

Con eso dicho: lo que **sí** está verificado es todo lo que sale del propio
repositorio, y alcanza para el diagnóstico.

---

## 1. El diagnóstico: la tesis se borró y nadie escribió otra

`product-spec.md` §2 dice, textual, para qué existe V1:

> La gente descubre tatuadores de manera más efectiva cuando MESH **aprende su
> gusto visual** y le recomienda profesionales en base a ese gusto.

[D-010](../design/MESH-DESIGN-DECISIONS.md), el 2026-08-19, desenchufó
exactamente eso. Y tuvo razón: con quince artistas, un encaje puntuado es una
promesa que no se puede cumplir sin inventar, y eso rompe el innegociable 2.

Pero mirá cómo cierra D-010:

> Una grilla de artistas no promete nada que no muestre.

Eso arregló el sobre-prometer y dejó **cero promesa**. Desde entonces se
construyeron unas quince features. Todas competentes. Casi todas **mesa de
entrada**: lo que hace falta para no ser peor que los demás. Ninguna es un
motivo para elegirnos.

**La sensación de que la app no resuelve nada tiene fecha: 19 de agosto.**

### La evidencia de que nadie lo notó

Tres documentos siguen describiendo el producto anterior:

| Documento | Qué dice | Qué pasa |
|---|---|---|
| `product-spec.md` §2 | La hipótesis es el gusto visual | Desenchufada hace dos días |
| `metrics.md` §2 | Objetivos sobre `taste_profile_generated` ≥40% y `match_viewed` ≥35% | Los dos eventos salen de motores apagados. **El embudo tiene el medio borrado** |
| `competitive-analysis.md` | 28 eventos declarados de analytics | Se disparan 10; varios son de features que ya no existen |

Un embudo cuyo centro no puede dispararse nunca no va a mostrar activación
aunque la haya. Hoy MESH **no puede saber si funciona**, ni aunque tuviera
usuarios.

---

## 2. Convergimos con Tattoodo, y lo festejamos

El [teardown](../research/MESH-TATTOODO-TEARDOWN.md) tiene este titular:

> ## 1. La estructura ya convergió, y eso es la noticia

Y la tabla siguiente muestra que MESH y Tattoodo tienen las mismas cuatro
pestañas, en el mismo orden, con la misma división de trabajo.

**Eso no es una validación. Es el hallazgo malo del documento, leído como
bueno.** Si tu estructura es indistinguible de la del competidor directo, no
tenés una cuña: tenés la misma app con menos catálogo. Tattoodo tiene años de
oferta cargada; nosotros tenemos quince perfiles y catorce son de prueba.

Llegar solo al mismo lugar que el competidor dice que el lugar es cómodo, no
que sea nuestro.

---

## 3. El competidor real no está analizado

`competitive-analysis.md`, línea 14, sobre Instagram:

> Nada que aplique — es grafo social y feed cronológico/algorítmico de gente que
> seguís.

Eso es un análisis de Instagram **como referencia de diseño**, y como tal está
bien. Pero el documento nunca hace la pregunta competitiva, que es otra:

> En CABA, ¿dónde encuentra hoy la gente a su tatuador, y por qué se iría de
> ahí?

**Hipótesis, sin verificar:** el descubrimiento pasa por el Explore de
Instagram y el hashtag; el contacto por DM; la seña y la coordinación por
WhatsApp. Ese es el titular, y no es una app de tatuajes: es una app de fotos
con una mensajería adentro.

Contra ese titular, MESH hoy es **un Instagram mejor ordenado para una
ciudad**. Estar mejor ordenado no mueve a nadie de donde ya están los artistas
que le gustan, las fotos, y su propia costumbre.

### Lo que Instagram hace mejor que nosotros, y siempre va a hacer mejor

- Tiene toda la obra del mundo, no quince perfiles.
- Tiene al artista entero: sus historias, su vida, su cara.
- Ya está instalado y ya lo sabés usar.
- El artista ya construyó su audiencia ahí y no la va a mudar.

**Competir en descubrimiento visual contra Instagram es perder.** Cualquier
plan que empiece con "pero nuestra grilla es más linda" ya perdió.

---

## 4. Lo que Instagram estructuralmente NO puede hacer

Acá está la única respuesta que encontré, y no es una idea nueva: **ya está
construida en MESH y está enterrada.**

### El dolor (hipótesis, la más importante de validar)

Alguien quiere tatuarse algo que tiene medio pensado. En Instagram:

1. Le escribe lo mismo a ocho tatuadores, uno por uno.
2. Seis lo dejan en visto.
3. Ninguno le dice un precio hasta la tercera respuesta.
4. No sabe si alguno tiene lugar este mes.
5. Y no tiene idea de cuánto debería salir, así que no puede saber si le están
   cobrando de más.

Eso no es un problema de descubrimiento. Es un problema de **coordinación y de
información**, y un feed no lo puede resolver porque un feed no tiene la forma
de un pedido.

### Lo que MESH ya tiene, de punta a punta

- Describís la idea **una sola vez** — con palabras
  ([ADR-021](../decisions/ADR-021-brief-assistant.md)) o con una foto
  ([ADR-011](../decisions/ADR-011-photo-classification.md)).
- Se convierte en un pedido estructurado, con estilo y rasgos de la taxonomía
  ([ADR-020](../decisions/ADR-020-brief.md)).
- Va a los artistas que efectivamente hacen eso
  ([ADR-014](../decisions/ADR-014-two-sided.md)).
- Ellos contestan **con un rango de precio y cantidad de sesiones**.
- Y se ve quién suele contestar y quién no
  ([ADR-022](../decisions/ADR-022-reply-habit.md)).

**Eso es una primitiva de mercado, no de feed.** Instagram no lo va a construir
nunca, porque su negocio es que te quedes mirando, no que resuelvas y te vayas.

### Por qué hoy no existe, aunque esté construido

Tres decisiones, cada una razonable por separado, que juntas lo apagan:

1. **Vive a dos toques adentro de la segunda pestaña.** Explorar → *Contame con
   palabras*.
2. **Inicio dice otra cosa.** "Acá están los artistas cerca tuyo" es la promesa
   con forma de Instagram, y es la primera pantalla.
3. **El interruptor está apagado por default.**
   `is_open_to_professionals boolean not null default false`. La mecánica que
   hace funcionar todo esto es opt-in, escondida, y en una app sin usuarios
   nadie la va a prender.

El mercado existe en el código y no existe en el producto.

---

## 5. La tesis que propongo

> **MESH existe para que decir lo que querés tatuarte cueste una sola vez, y
> para que la respuesta incluya un precio.**

Dicho al usuario:

> Contá tu idea una vez. Te contestan los que la pueden hacer, con precio.

Tres cosas que esta tesis tiene y la anterior no:

- **Es un dolor que se puede nombrar**, y cualquiera que se haya tatuado lo
  reconoce en una frase.
- **No compite con Instagram en su terreno.** No promete tener más fotos ni
  mejor descubrimiento visual.
- **Se puede falsear rápido**, sin construir nada — ver §8.

### Cómo se falsea

La tesis muere si pasa cualquiera de estas:

- La gente **no quiere** escribir un pedido: prefiere mirar fotos y escribir por
  su cuenta. (Se prueba con veinte conversaciones.)
- Los artistas **no quieren dar un precio** sin ver a la persona. (Ídem, y este
  es el riesgo más grande de los dos.)
- Los artistas **ya tienen agenda llena** y no necesitan demanda nueva. Si es
  así, MESH no tiene qué ofrecerle al lado que hay que llenar primero, y el
  negocio es otro.

---

## 6. Qué lado se llena primero

Un mercado de dos lados se llena de uno solo, y elegir mal cuesta el proyecto.

**Primero la demanda, y con trampa.** El artista entra por un solo motivo: que
alguien ya esté pidiendo lo que él hace. No por una app linda, no por una
herramienta de agenda, no por un perfil.

En la práctica, y esto no es código:

1. Conseguir veinte pedidos reales de gente real que se quiere tatuar en CABA.
   Pueden entrar por un formulario, por Instagram, o a mano.
2. Llevárselos a los tatuadores **de a uno y por mensaje**, sin app de por
   medio. "Tengo a alguien que quiere esto, ¿te interesa y cuánto sale?"
3. Si los artistas contestan con precio, la tesis vive y MESH es la
   automatización de algo que ya funciona.
4. Si no contestan, no hay app que lo arregle.

El punto 2 se hace sin escribir una línea. **Eso es lo que hay que hacer antes
de la próxima feature.**

---

## 7. Qué sobra

Bajo la tesis nueva, esto pasa a ser accesorio. No digo borrarlo —está
construido y funciona— digo que **no puede volver a recibir trabajo** hasta que
la tesis esté validada:

| Feature | Por qué sobra hoy |
|---|---|
| Guardados y su ranking | Es Pinterest. No acerca a nadie a un pedido con precio. |
| Reseñas | Mesa de entrada. Sin transacciones no hay reseñas que mostrar. |
| Turnos y horario semanal | Herramienta para el artista, que es el lado que **no** hay que llenar primero. |
| Buscar por nombre | Sirve a quien ya sabe a quién busca, que es justo quien no nos necesita. |
| Avisos, exportar, borrar cuenta, moderación | Obligatorios para operar, cero diferenciales. Ya están: no tocarlos más. |

Lo que **sí** es la tesis y hoy está a medias:

- El asistente y el clasificador de foto: son la puerta, y están en la segunda
  pestaña.
- La propuesta con precio: es la respuesta, y casi nadie la puede recibir
  porque el interruptor está apagado.

---

## 8. Lo que NO hay que hacer

- **No agregar tecnología.** Probar el tatuaje en tu piel con realidad
  aumentada es real, impresiona, y resuelve una ansiedad de verdad — y no
  cambia nada de lo de arriba. Un producto sin tesis con AR es un producto sin
  tesis más caro.
- **No mejorar el descubrimiento visual.** Es el terreno de Instagram.
- **No construir más herramientas para el artista** hasta tener demanda que
  mostrarle.
- **No reescribir el spec todavía.** Primero las veinte conversaciones.

---

## 9. Lo primero, si esto se aprueba

En orden, y lo de código va último a propósito:

1. **Veinte conversaciones** con gente que se tatuó en el último año, y diez con
   tatuadores de CABA. Buscando una sola cosa: si el dolor de §4 es real y si un
   artista da un precio por escrito.
2. **Reescribir `product-spec.md` §2 y `metrics.md` §2** con la tesis que
   sobreviva. El embudo tiene que poder dispararse entero.
3. **Recablear la app**: el pedido pasa a ser la puerta de entrada, y el
   interruptor deja de estar apagado por default.

El paso 3 es una semana. Los pasos 1 y 2 son los que deciden si vale la pena.
