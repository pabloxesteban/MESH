# ADR-009 — Almacenamiento local: `expo-sqlite/kv-store`, no MMKV

**Estado:** Aceptado · **Fecha:** 2026-08-18 · **Reemplaza:** la línea de MMKV
de `system-architecture.md` §5

## Contexto

MESH guarda tres cosas localmente: la cola de interacciones que todavía no se
sincronizaron, el caché del vector de gusto y el buffer de analytics. Ninguna es
grande y ninguna se lee durante el primer frame.

`system-architecture.md` §5 eligió MMKV por ser síncrono y rápido. Es una buena
elección técnica y una mala elección de producto en este momento: **MMKV es un
módulo nativo que no viene en Expo Go**, así que usarlo obliga a un dev build.

## Decisión

Usar `expo-sqlite/kv-store`, detrás de una interfaz `KeyValueStore` propia
(`apps/mobile/src/data/kv.ts`).

## Por qué

Mientras MESH se pueda abrir escaneando un QR, mostrarle un cambio a alguien que
no es desarrollador cuesta segundos. Con un dev build cuesta una hora y una
cuenta de EAS. En una V1 que se está construyendo contra el gusto de una persona
concreta, esa diferencia decide cuántas veces se itera.

Lo que se pierde: la lectura síncrona. Se revisó qué la necesitaba y la respuesta
es nada — ninguno de los tres datos bloquea el arranque, y la cola de
interacciones se descarga en segundo plano.

## Contrapartidas

- Escrituras asíncronas: la cola tiene que tolerar que un `set` no haya
  terminado cuando llega el siguiente. Se resuelve serializando las escrituras
  de la cola, que además es lo correcto para no perder eventos.
- Menos rápido que MMKV. Irrelevante a este volumen: decenas de entradas, no
  decenas de miles.

## Cuándo revisitar

Si el buffer de analytics o la cola pasan de unos pocos miles de entradas, o si
aparece un dato que sí haya que leer antes del primer frame. Cambiar de motor es
reescribir `kv.ts` y nada más — esa es la razón por la que la interfaz existe.
