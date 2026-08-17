# ADR-001 — Stack y estructura del repositorio

**Estado:** Propuesto · **Fecha:** 2026-08-17 · **Responsable:** product-architect

## Contexto

MESH V1 es un producto de validación, mobile-first, construido por una sola
persona, apuntando a iOS y Android en Buenos Aires, con un catálogo de 8–15
artistas y sin back-office. La velocidad de iteración y la baja carga operativa
importan más que la escala teórica.

## Problema

¿Qué stack de cliente, qué backend, y cuánta estructura de repositorio se
justifica antes de que algo de eso demuestre ser útil?

## Opciones

**Cliente**
- **A. Expo (managed) + React Native + TypeScript.** Un solo código, updates
  OTA, ecosistema fuerte de gestos y animación, sin necesidad de toolchain
  nativo en el día a día.
- **B. React Native bare.** Más control nativo, mucho más setup y mantenimiento
  para un proyecto de una persona.
- **C. Swift + Kotlin nativos.** La mejor sensación posible; dos códigos; no es
  viable para una persona testeando una hipótesis.
- **D. Flutter.** Excelente movimiento, pero un segundo lenguaje y menos
  solapamiento con el resto del stack.

**Backend**
- **A. Supabase.** Postgres, Auth, Storage, RLS, edge functions, desarrollo
  local vía Docker.
- **B. Firebase.** Rápido, pero un modelo de documentos pelea con una taxonomía
  genuinamente relacional, y las reglas de seguridad son menos expresivas que
  RLS.
- **C. API propia (Node/Postgres).** Control total, más un servidor que
  construir, desplegar, asegurar y operar.

**Repositorio**
- **A. Monorepo completo:** `apps/mobile`, `packages/design-system`,
  `packages/domain`, `packages/config`.
- **B. Una sola app, todo adentro.**
- **C. Workspaces mínimos:** `apps/mobile`, `packages/domain`, `tools/seed`.

## Decisión

**Expo + React Native + TypeScript**, **Supabase/Postgres**, y la **opción C**
para el repositorio:

```
apps/mobile/      App Expo; el design system vive en src/design-system/
packages/domain/  TS puro: taxonomía, tipos, esquemas Zod, gusto + matching
tools/seed/       CLI de contenido con service role
supabase/         Migraciones, funciones, seed de referencia
content/artists/  Contenido curado
```

Workspaces de npm. Sin Turbo, sin Nx.

## Por qué

El stack de gestos y animación de Expo (Reanimated 3 + Gesture Handler) es
exactamente lo que necesita el mazo de descubrimiento, y los updates OTA importan
desproporcionadamente para un producto que esperamos cambiar todas las semanas.
El costo —menos control nativo— no muerde en una app cuyo requisito más difícil
es un gesto de tarjeta fluido y carga rápida de imágenes.

Supabase nos da lo único que una API propia habría que construir para proveer:
**autorización por fila dentro de la base de datos**, para que un bug del cliente
no pueda transformarse en una filtración. Además elimina toda una superficie
operativa. Firebase se descartó porque Categoría → Estilo → Profesional →
PortfolioItem → Interacción es relacional, y modelarlo en documentos implicaría
mantener copias desnormalizadas de la taxonomía — exactamente lo que se pudre en
silencio.

Sobre la estructura: `packages/domain` se gana su lugar porque los motores de
gusto y matching, la taxonomía y los esquemas de contenido los consumen
genuinamente tres cosas (app, seeder, tests). `packages/design-system` no —
tiene un solo consumidor y está acoplado a React Native; extraerlo compra un
límite de imports que podemos obtener de una regla de lint.
`packages/config` serían dos archivos. La estructura que existe para parecer
profesional es un impuesto que paga todos los días la única persona que la
mantiene.

## Consecuencias

- Los módulos nativos fuera del ecosistema de config plugins de Expo requerirían
  un paso de prebuild. Aceptable; no hay ninguno planeado.
- Concentración de proveedor en Supabase. Mitigada por el hecho de que es
  Postgres — el esquema, las políticas y los datos son portables; solo Auth y
  Storage tienen forma de proveedor.
- `packages/domain` tiene que mantenerse libre de dependencias de React y
  Supabase. Impuesto por una regla de lint para que el límite sea real.
- Si alguna vez una app web necesita el design system, extraerlo es mover una
  carpeta — los tokens ya están aislados.
