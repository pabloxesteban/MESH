---
name: performance
description: Presupuestos y técnicas de performance para MESH — arranque, gestos, imágenes, consultas, memoria. Usala cuando una superficie se sienta lenta, antes de un release, o al tocar el camino de descubrimiento o de perfil.
---

# Performance

## Propósito

Que MESH se sienta rápido en un teléfono real de gama media, sobre una red móvil
en Buenos Aires — no en un simulador sobre una laptop.

## Cuándo usarla

Cualquier cosa del camino de descubrimiento o de perfil. Al agregar una
dependencia. Antes de un release. Cada vez que algo se siente lento.

## Presupuestos

Medidos en un **Android real de gama media**, **build de release**, registrados
con el nombre del dispositivo. Un número no registrado no es una medición.

| Presupuesto | Objetivo |
|---|---|
| Arranque en frío → primera obra pintada | < 2,5s en 4G |
| Gesto del mazo | 60fps sostenidos, 20 swipes, cero caídas |
| Abrir perfil → hero pintado | < 800ms con caché caliente |
| Round trips por pantalla | 1 |
| Memoria después de 100 tarjetas | plana |

## Dónde se va el tiempo, en orden

1. **Bytes de imagen** — ~95% del payload del mazo. Verificá qué tamaño derivado
   se pide realmente en cada superficie (`sm` grillas / `md` mazo / `lg` completa).
   Es el chequeo de mayor palanca y regresiona en silencio.
2. **Round trips** — uno por pantalla. Tres queries significa que falta un RPC.
3. **Decodificación y layout** — blurhash + dimensiones guardadas reservan el
   espacio antes de decodificar, eliminando el salto de layout.
4. **Tráfico de puente durante los gestos** — cualquier actualización de estado de
   React por frame es un bug.
5. **Trabajo de arranque** — nada bloquea el primer frame.

## Técnicas

- `expo-image` con caché de disco, blurhash, `contentFit` explícito y
  `recyclingKey` en listas recicladas.
- Precargar las 3 imágenes siguientes del mazo en `md`; el hero del primer match
  en `lg` cuando se renderiza la lista.
- FlashList con un `estimatedItemSize` real.
- Paginación por cursor — nunca `OFFSET`.
- Gestos en worklets de Reanimated, nunca en estado de React.
- Como mucho 3 tarjetas del mazo montadas; memoizar el contenido por id.
- Las tipografías y la pantalla de intro viajan en el bundle.

## Cómo investigar

- Log de red a lo largo de una sesión de mazo: qué tamaño, cuántos bytes por
  tarjeta, ¿se dispara el prefetch?, ¿el caché de disco acierta en la segunda
  pasada?
- `explain analyze` sobre el RPC del feed, la query de perfil y la de matches
  **con los predicados de RLS aplicados** — las subconsultas `EXISTS` de las
  políticas son parte del plan.
- Tiempos de frame durante un swipe sostenido, en dispositivo.
- Memoria sobre 100 tarjetas — ¿está `recyclingKey`?, ¿se desmontan las tarjetas?
- Traza de arranque y tamaño de bundle después de agregar cualquier dependencia.

## Reglas

- **Medí antes de optimizar.** La intuición sobre performance de React Native
  suele estar equivocada.
- Nunca "optimices" sacando un estado de carga, vacío o error.
- Nunca degrades la calidad de imagen por debajo de lo que la obra merece — este
  es un producto sobre mirar el trabajo de otras personas. Buscá los bytes en otro
  lado.
- Toda propuesta de caché declara su invalidación de entrada.
- Toda dependencia nueva declara su costo de arranque.

## Anti-patrones

Paginación con `OFFSET` · Imágenes sin `recyclingKey` · `FlatList` para una
grilla de media, o `FlashList` sin un `estimatedItemSize` real · Traer un
portfolio entero para cuatro miniaturas · Cadenas de `useEffect` que causan un
segundo render al montar · Red bloqueante antes del primer frame · `useMemo`
prematuro · Declarar el mazo terminado sin un dispositivo real.

## Checklist de calidad

- [ ] Tamaño derivado correcto en cada superficie
- [ ] Un round trip por pantalla
- [ ] `recyclingKey` seteado; memoria plana sobre 100 tarjetas
- [ ] El gesto corre en el hilo de UI; 60fps verificados en dispositivo
- [ ] Planes de consulta chequeados con RLS aplicado
- [ ] Presupuestos medidos y registrados con el nombre del dispositivo
- [ ] Ningún estado eliminado en nombre de la velocidad
