# MESH

**Descubrí gente. Hacé que las ideas pasen.**

MESH te ayuda a encontrar a la persona indicada para hacer realidad una idea.

> "Sé lo que quiero, o sé lo que me gusta — pero no sé quién es la persona
> indicada para hacerlo."

Ese hueco es el producto. Pinterest te dice qué te gusta. Instagram te dice a
quién seguís. Airtasker te dice quién puede completar una tarea. Ninguno te dice
*quién es la persona indicada para eso que te gusta*.

MESH aprende tu gusto visual a partir de los trabajos con los que interactuás y
después te recomienda a la gente detrás de esos trabajos — y te explica por qué.

**Estado:** V1 en planificación. Este repositorio contiene por ahora la
especificación de producto, arquitectura, seguridad y diseño. Todavía no se
escribió código de aplicación. Ver [`docs/`](docs/) y
[`docs/decisions/`](docs/decisions/).

**Idioma:** la documentación está en español rioplatense. El código —tablas,
columnas, tokens, slugs, identificadores— está en inglés. Los strings de UI
tienen `es-AR` como locale de origen.

---

## La hipótesis que se está testeando

> La gente descubre tatuadores de manera más efectiva cuando MESH aprende su
> gusto visual y le recomienda profesionales en base a ese gusto.

V1 es un instrumento de validación, no una plataforma. Es deliberadamente:

- **Una sola categoría** — tatuajes
- **Un solo mercado** — Buenos Aires / CABA
- **Curado** — 8–15 artistas reales de una red existente, con consentimiento
- **Sin reservas ni pagos** — el contacto sucede en WhatsApp/Instagram

Si la hipótesis está equivocada, queremos saberlo en semanas con una app chica,
no en un año con un marketplace.

## El loop

```
DESCUBRIR → GUSTO → GENTE → MATCH → ACCIÓN
```

```
"Esto me gusta."
      ↓
"¿Quién hizo esto?"
      ↓
"Me gusta su trabajo."
      ↓
"Entiende mi gusto."
      ↓
"Esta persona puede ser la indicada."
      ↓
"Hagámoslo realidad."
```

## Por qué el matching es determinístico y no IA

Cada recomendación que hace MESH tiene que ser explicable a quien la recibe,
reproducible en un test y defendible cuando está equivocada. Un modelo que dice
"creemos que esto te va a encantar" es infalsable y, con 12 artistas, deshonesto.

MESH V1 usa una función de puntaje explícita, versionada y con tests unitarios
sobre un vector de gusto construido a partir de las propias decisiones de me
gusta / guardar / paso del usuario. Con las mismas entradas siempre produce la
misma salida y las mismas razones. Las razones que se le muestran a la persona
se generan *a partir de los términos que efectivamente aportaron al puntaje* —
nunca se escriben para que suenen bien.

Algoritmo completo: [`docs/product/matching.md`](docs/product/matching.md).

## Qué no es MESH

No es Tinder para freelancers. No es Pinterest para profesionales. No es
Airtasker con tarjetas más lindas. El swipe es un método de entrada, nada más —
y nunca es la única forma de hacer nada (ver
[accesibilidad](docs/design/design-system.md)).

MESH no tiene rachas, ni puntos, ni escasez falsa, ni urgencia falsa, ni
matches falsos, ni reseñas falsas, ni notificaciones fabricadas. El éxito se
mide por si la gente encuentra a alguien a quien valga la pena contactar — no
por tiempo en la app.

## Estructura del repositorio

```
apps/mobile/        Cliente Expo + React Native + TypeScript (el design system vive acá)
packages/domain/    TypeScript puro: taxonomía, tipos, esquemas Zod, motores de gusto y matching
tools/seed/         CLI de carga de contenido con service role (nunca se empaqueta en la app)
supabase/           Migraciones, políticas RLS, seed SQL, edge functions
content/artists/    Contenido curado de artistas, un archivo por artista, validado por esquema
docs/               Producto, diseño, arquitectura, seguridad, testing, decisiones
.claude/            Agentes, skills, comandos y workflows para Claude Code
```

Por qué esto y no más paquetes: ver
[ADR-001](docs/decisions/ADR-001-stack-and-repo-structure.md).

## Documentación

| Área | Documento |
|---|---|
| Especificación de producto | [`docs/product/product-spec.md`](docs/product/product-spec.md) |
| Algoritmo de matching | [`docs/product/matching.md`](docs/product/matching.md) |
| Métricas y analytics | [`docs/product/metrics.md`](docs/product/metrics.md) |
| Lenguaje visual | [`docs/design/visual-language.md`](docs/design/visual-language.md) |
| Design system | [`docs/design/design-system.md`](docs/design/design-system.md) |
| Arquitectura del sistema | [`docs/architecture/system-architecture.md`](docs/architecture/system-architecture.md) |
| Modelo de datos y esquema | [`docs/architecture/data-model.md`](docs/architecture/data-model.md) |
| Navegación | [`docs/architecture/navigation.md`](docs/architecture/navigation.md) |
| Modelo de seguridad | [`docs/security/security-model.md`](docs/security/security-model.md) |
| Modelo de amenazas | [`docs/security/threat-model.md`](docs/security/threat-model.md) |
| Estrategia de testing | [`docs/testing/test-strategy.md`](docs/testing/test-strategy.md) |
| Política de contenido | [`docs/product/content-policy.md`](docs/product/content-policy.md) |
| Decisiones (ADRs) | [`docs/decisions/`](docs/decisions/) |
| Plan de construcción | [`docs/product/roadmap.md`](docs/product/roadmap.md) |

## Stack técnico, y por qué

| Capa | Elección | Por qué |
|---|---|---|
| Cliente | Expo (React Native) + TypeScript | Un solo código, updates OTA para un producto de validación, ecosistema maduro de gestos y animación (Reanimated + Gesture Handler) para el mazo de descubrimiento |
| Ruteo | Expo Router | Basado en archivos, rutas tipadas, deep links incluidos — hacen falta para `mesh://artist/:slug` |
| Backend | Supabase | Postgres + Auth + Storage + RLS en uno solo, sin servidor que operar en un proyecto de una persona |
| Base de datos | PostgreSQL | La taxonomía (categoría → estilo → profesional → obra) es genuinamente relacional; RLS da autorización por fila en la base, no en el código de la app |
| Matching | TypeScript plano en `packages/domain` | Determinístico, testeable por unidad, sin costo de inferencia, compartido por app, seeder y tests |
| Media | Supabase Storage + `expo-image` | Los binarios nunca van en Postgres; los placeholders blurhash y el caché en disco mantienen rápido el descubrimiento |

Fijar versiones se posterga deliberadamente al momento de implementar, para
instalar lo que sea actual y compatible en vez de lo que era actual cuando se
escribió esto.

## Postura de seguridad

Todas las tablas tienen Row Level Security habilitado y forzado, con políticas
explícitas. Un test verifica que no pueda existir ninguna tabla en `public` sin
RLS y sin al menos una política — no se puede publicar una tabla abierta por
accidente. La service-role key existe solo en `tools/seed` y nunca en el bundle
de Expo. Las imágenes de referencia que sube el usuario viven en un bucket
privado bajo rutas `{user_id}/` impuestas por políticas de storage.

Detalle: [`docs/security/security-model.md`](docs/security/security-model.md),
[`docs/security/threat-model.md`](docs/security/threat-model.md).

## Ética de contenido

Cada artista en MESH es una persona real que dio consentimiento explícito y
registrado para que aparezcan su nombre, su trabajo y sus datos de contacto.
Nada de scraping. Nada de reseñas, testimonios, disponibilidad, precios ni
estadísticas de reservas inventados. Los fixtures de desarrollo están marcados
con `is_fixture` en la base y señalizados visualmente en builds no productivos,
para que nunca se puedan confundir con personas reales.

Ver [`docs/product/content-policy.md`](docs/product/content-policy.md).

## Roadmap después de V1

1. Segundo mercado antes que segunda categoría — validar que el motor de gusto
   se transfiere a otra ciudad con el mismo vertical.
2. Autogestión para profesionales — reclamar tu perfil, administrar portfolio.
3. Conversaciones dentro de la app, cuando haya evidencia de que la gente quiere
   salir de WhatsApp.
4. Segunda categoría (fotografía es el análogo más cercano: portfolios visuales
   fuertes, elección guiada por estilo, demanda con forma de proyecto).
5. Reseñas y señales de confianza — solo cuando haya volumen real que las haga
   significativas.

---

MESH es un proyecto de producto personal. El nombre, la dirección de producto y
la red inicial de artistas son propios del autor.
