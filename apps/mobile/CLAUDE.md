# apps/mobile

Cliente Expo + React Native de MESH. Leé primero `CLAUDE.md` de la raíz.

## Expo cambia seguido

Consultá la documentación **versionada** de la SDK que está fijada en
`package.json` (hoy SDK 57) antes de escribir código:
https://docs.expo.dev/versions/v57.0.0/

Las respuestas de memoria sobre APIs de Expo suelen estar una o dos SDK
atrasadas. Verificá contra los docs de la versión fijada.

## Capas

```
app/             rutas de expo-router. Solo composición — sin lógica, sin queries.
src/
  design-system/ tokens y componentes. El único lugar con valores hex.
  features/<x>/  components · hooks · queries.ts
  data/          cliente supabase, query client, cola offline, mapeo de errores
  analytics/     track()
  i18n/          es-AR de origen
```

## Lo que rompe el lint

Estas tres reglas están en `eslint.config.mjs` de la raíz y fallan el build, no
la revisión. Ver ADR-008.

1. Un color hex, espaciado numérico, tamaño de fuente o duración fuera de
   `src/design-system/`.
2. Un import de `@supabase/*` dentro de `app/`. Las consultas van en
   `features/<x>/queries.ts`.
3. Un import de react / react-native / expo / supabase dentro de
   `packages/domain`.

## Antes de dar una pantalla por terminada

Los cuatro estados (carga, vacío, error + reintentar, éxito), un botón
equivalente con etiqueta para cada gesto a ≥44pt, una acción hacia adelante desde
todos los estados, los dos temas, y el tamaño de tipografía accesible más grande
sin recortes. Ver `.claude/workflows/ui-review.md`.
