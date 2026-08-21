# ADR-030 — La primera vez que se abre MESH

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** product-architect

## Contexto

Tres cosas que MESH hacía distinto de cualquier otra app, y ninguna de las tres
por una buena razón. Salieron juntas porque son la misma pregunta: **qué pasa
las primeras dos pantallas**.

1. **La primera pantalla preguntaba la edad.** Antes del nombre del producto,
   antes de una sola foto. Nadie hace eso, y no hacía falta: lo que impone la
   regla es `schedule_appointment()` del lado de la base, no una pantalla.
2. **La ubicación no se preguntaba nunca de frente.** La preferencia arrancaba
   en "mi ubicación" sin permiso concedido, y en Inicio aparecía un cartel
   pidiéndolo. El cartel volvía **en cada sesión** hasta que alguien cediera.
3. **El orden de la grilla estaba clavado.** `md5(user_id || professional_id)`
   es una mezcla estable por persona: cada uno ve un orden distinto del de al
   lado, sí, pero **siempre el mismo**, para siempre.

## Decisión

### 1. La edad se pregunta al crear la cuenta

Sale de la puerta de entrada y entra al formulario de alta, como una casilla que
hay que marcar para poder crear la cuenta —por correo o por Google, las dos
puertas—. Sigue sin pedirse la fecha de nacimiento, y sigue sin guardarse el
"no": [ADR-025](ADR-025-age-gate.md) no cambia en nada de eso.

**No queda ningún hueco**, y eso es lo que hace que se pueda sacar del arranque:

- Quien crea cuenta lo declara ahí.
- Quien usa la app sin cuenta lo declara desde **Perfil**, donde el control ya
  existía y aparece solo si falta.
- Quien no lo declaró nunca y va a recibir un turno: la base lo rechaza con
  `M0018`, y el artista lee que esa persona todavía no confirmó.

La pantalla `AgeScreen` se borró. No es código muerto que se deja "por si
acaso": lo que la reemplaza cubre los tres caminos.

### 2. La ubicación se pregunta una sola vez, al arrancar

Un paso de onboarding, **después** de la pregunta de intención —pedir un permiso
antes de que alguien entienda para qué es la app es pedirlo a ciegas— con dos
botones del mismo peso: *Usar mi ubicación* y *Ahora no*.

Tres reglas:

- **"Ahora no" es una respuesta, no una postergación.** Se marca que ya se
  preguntó y no se pregunta nunca más. El cartel de Inicio se borró.
- **No promete nada.** No dice "para una mejor experiencia": dice qué cambia,
  que es el orden de la lista y los kilómetros de cada tarjeta.
- **Se puede cambiar de idea**, desde el encabezado de Inicio, que ya era el
  lugar donde decía desde dónde se está midiendo ([D-012](../design/MESH-DESIGN-DECISIONS.md)).

No se espera la respuesta del sistema operativo para seguir: ese diálogo lo
dibuja el sistema por encima, y quedarse con un botón cargando debajo es una
pantalla trabada. Si al final se niega, el encabezado lo dice.

### 3. El orden se remezcla en cada sesión, dentro de la cercanía

Dos cambios que se necesitan mutuamente.

**En la base**, la mezcla la siembra el cliente con una semilla que dura lo que
dura la sesión, en vez del hash fijo por usuario. Ningún artista queda clavado
arriba; y mientras estás adentro el orden **no se mueve**, porque la semilla es
la misma en toda la sesión. Una lista que se rebaraja sola mientras la mirás es
peor que una clavada.

**En el dominio**, `sortByProximity` ordena por **anillo** de distancia y no por
el kilómetro exacto: 2 km, 5 km, 10 km, 20 km, y más lejos. Sin esto la mezcla
no serviría de nada — con distancias exactas nadie empata nunca, y quien esté
cien metros más cerca se queda con el primer puesto de por vida por una
diferencia que nadie vive.

Lo que **no** cambia: la cercanía sigue mandando entre anillos, y sigue sin
filtrar a nadie. Quien está lejos aparece igual, más abajo. La tarjeta sigue
mostrando la distancia **real**, no la del anillo.

## Alternativas descartadas

- **Azar puro, ignorando la distancia.** Es lo primero que se pidió. Se descartó
  porque deja sin sentido al permiso de ubicación que pide la decisión 2 de esta
  misma ADR, y porque Inicio existe para contestar *quién tatúa cerca mío*: con
  orden azaroso contesta *quién hay*, que es lo que ya hace Explorar.
- **Remezclar en cada consulta** en vez de por sesión. Reordena la lista cuando
  volvés de un perfil.
- **Bandas por el número que muestra la tarjeta.** `roundDistanceKm` redondea a
  100 metros abajo de 10 km; a esa resolución tampoco empata casi nadie.

## Consecuencias

**Se gana:** un arranque que se parece al de cualquier app —pregunta lo que
necesita, cuando lo necesita— y un catálogo donde el primer puesto rota.

**Se resigna:** el orden ya no es reproducible entre sesiones, así que un
reporte de "el tercero de la lista está mal" no se puede seguir por posición.
Se sigue por slug, que es lo que se debería haber hecho siempre.

**Se acepta** que quien diga "ahora no" a la ubicación no vuelva a ver el
pedido nunca. Es el punto: un pedido que vuelve es un pedido que se aprende a
ignorar, y el encabezado de Inicio deja la puerta abierta sin insistir.
