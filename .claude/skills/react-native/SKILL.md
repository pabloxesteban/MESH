---
name: react-native
description: Convenciones de Expo y React Native para MESH — capas, estado, gestos, imágenes, listas y obtención de datos. Usala al escribir o revisar cualquier cosa en apps/mobile.
---

# React Native / Expo

## Propósito

Mantener el cliente rápido, en capas, y aburrido de leer.

## Cuándo usarla

Cualquier cambio en `apps/mobile/`. Especialmente el mazo, las transiciones, la
carga de imágenes y la obtención de datos.

## Capas

```
screens/         rutas de expo-router — solo composición
features/<x>/    components · hooks · queries.ts (único lugar donde se llama a supabase-js)
design-system/   tokens y componentes
data/            cliente supabase, query client, cola offline, mapeo de errores
analytics/       track()
i18n/            es-AR de origen
```

Impuesto por lint: `screens/` no puede importar `@supabase/supabase-js`; nada
fuera de `design-system/` puede contener un valor de diseño crudo;
`packages/domain` no puede importar react, react-native ni supabase.

## Estado

| Tipo | Herramienta |
|---|---|
| Datos de servidor | TanStack Query |
| Por frame / gesto | Shared values de Reanimated — **nunca** estado de React |
| Sesión entre pantallas | Un store chico de Zustand |
| Persistencia | MMKV |
| Tokens de sesión | Solo `expo-secure-store` |

## Gestos

- `react-native-gesture-handler` + worklets de Reanimated. Si React re-renderiza
  durante un arrastre, es un bug.
- Umbrales sensibles a la velocidad: un envión rápido más allá del 25% del ancho
  compromete; un arrastre lento necesita 45%; un arrastre detenido vuelve por
  resorte.
- La dirección del descarte sigue al envión.
- El háptico se dispara en el punto de compromiso, no al soltar.
- Todo gesto tiene un botón equivalente y una `accessibilityAction`.

## Imágenes

- `expo-image`, siempre. Placeholder blurhash desde `media_assets`, `contentFit`
  explícito, `recyclingKey` en listas recicladas.
- Pedí el tamaño derivado correcto: grillas `sm`, mazo `md`, vista completa `lg`.
- Precargá las 3 imágenes siguientes del mazo en `md`.
- Reservá el espacio con las dimensiones guardadas — sin salto de layout.

## Listas

FlashList con un `estimatedItemSize` real. Paginación por cursor, nunca `OFFSET`.
`keyExtractor` estable. Memoizá el contenido de fila por id.

## Obtención de datos

- Las queries viven en `features/<x>/queries.ts` y en ningún otro lado.
- Las claves de query son arrays estructurados, exportados desde la feature.
- Nunca filtres por id de usuario en una consulta del cliente por *seguridad* —
  de eso se encarga RLS. Un filtro de cliente es solo por corrección.
- Las mutaciones son idempotentes donde la red puede reintentarlas (las
  interacciones son upserts sobre `(user_id, portfolio_item_id)`).
- Las actualizaciones optimistas siempre vienen con un rollback.

## Errores y estados

Toda superficie remota: carga, vacío, error + reintentar (y degradado para
descubrimiento). Los errores se mapean en `data/errors.ts` a offline / servidor /
no encontrado / permiso. Los strings crudos de Supabase o Postgres nunca llegan a
una persona ni a un evento de analytics.

## Ejemplo

```tsx
// features/discovery/queries.ts
export const discoveryKeys = {
  feed: (categoryId: string) => ['discovery', 'feed', categoryId] as const,
}

export function useDiscoveryFeed(categoryId: string) {
  return useInfiniteQuery({
    queryKey: discoveryKeys.feed(categoryId),
    queryFn: ({ pageParam }) =>
      supabase.rpc('get_discovery_feed', {
        p_category: categoryId, p_limit: 20, p_cursor: pageParam ?? null,
      }).throwOnError(),
    getNextPageParam: (last) => last.data?.at(-1)?.cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  })
}
```

## Anti-patrones

`useState` dentro de un handler de gesto · `Animated` (API vieja) donde
corresponde Reanimated · Fetch dentro de un archivo de pantalla · `FlatList` para
una grilla larga de media · Imágenes sin `recyclingKey` · Paginación con
`OFFSET` · Trabajo de red bloqueante antes del primer frame · Cadenas de
`useEffect` que provocan un segundo render al montar · Guardar tokens en
AsyncStorage o MMKV · `useMemo` prematuro sin medición.

## Checklist de calidad

- [ ] Ninguna violación de capas (el lint pasa)
- [ ] Los cuatro estados implementados
- [ ] El gesto tiene equivalente de botón + acción de accesibilidad
- [ ] Las imágenes usan el tamaño derivado correcto y un `recyclingKey`
- [ ] Un round trip para la pantalla
- [ ] Mutaciones idempotentes, actualizaciones optimistas con rollback
- [ ] Probado en un dispositivo real si toca gestos o imágenes
