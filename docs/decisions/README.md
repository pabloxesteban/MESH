# Registros de decisiones de arquitectura (ADRs)

Un ADR se escribe cuando una decisión es **difícil de revertir**, **discutida**,
o **sorprendente para alguien que llega nuevo**. No para cada elección.

Formato: Contexto · Problema · Opciones · Decisión · Por qué · Consecuencias.

El estado es uno de `Propuesto`, `Aceptado`, `Reemplazado por ADR-NNN`. Los ADRs
no se editan después de ser aceptados, salvo para cambiar el estado — una
decisión reemplazada es historia que vale la pena conservar.

Los nombres de archivo se mantienen en inglés porque son referenciados desde
todo el repositorio.

| # | Decisión | Estado |
|---|---|---|
| [001](ADR-001-stack-and-repo-structure.md) | Expo + Supabase; tres workspaces, no cinco paquetes | Propuesto |
| [002](ADR-002-authentication.md) | Auth anónima primero, upgrade cuando aporta valor | **Aceptado** |
| [003](ADR-003-domain-model.md) | Fusionar `ProfessionalProfile` en `professionals`; descartar `SavedItem`, mensajería y reseñas | Propuesto |
| [004](ADR-004-database-and-rls.md) | Postgres + RLS como única capa de autorización | Propuesto |
| [005](ADR-005-matching.md) | Puntaje determinístico; bandas en lugar de porcentajes | **Aceptado** |
| [006](ADR-006-media.md) | Storage con tamaños derivados y blurhash; sin binarios en Postgres | Propuesto |
| [007](ADR-007-navigation.md) | Expo Router, cuatro pestañas | Reemplazado en parte por ADR-014 |
| [008](ADR-008-design-system.md) | Design system dentro de la app, impuesto por lint | Propuesto |
| [009](ADR-009-almacenamiento-local.md) | `expo-sqlite/kv-store` en vez de MMKV, para no salir de Expo Go | **Aceptado** |
| [010](ADR-010-color-system.md) | El color es información: paleta generada en OKLCH, una familia por familia de estilo | **Aceptado** |
| [011](ADR-011-photo-classification.md) | La única IA del producto: clasificar la foto de referencia contra un vocabulario cerrado | **Aceptado** |
| [012](ADR-012-chat.md) | Chat propio adentro de MESH; revierte el descarte de mensajería de ADR-003 | **Aceptado** |
| [013](ADR-013-artist-self-signup.md) | Alta propia de artista desde la app; el catálogo deja de ser exclusivamente curado | **Aceptado** |
| [014](ADR-014-two-sided.md) | MESH tiene dos lados: mazo de búsquedas para el artista, con permiso explícito y sin contacto directo | **Aceptado** |
| [015](ADR-015-social-sign-in.md) | Entrar con Google o con Apple **vincula** la identidad al usuario anónimo; nunca crea uno nuevo | **Aceptado** |
| [016](ADR-016-saved-items.md) | Guardar obra con un corazón; revierte el descarte de ADR-003 | Enmendado por ADR-017 |
| [017](ADR-017-saved-ranking.md) | Ranking de lo más guardado y avisos al artista; **enmienda ADR-016** y acota el innegociable 3 | **Aceptado** |
| [018](ADR-018-availability.md) | Almanaque por reglas, no casilleros; el turno nace de un chat y "ocupado" lo garantiza Postgres | **Aceptado** |
| [019](ADR-019-reviews.md) | Reseñas colgadas de un turno que ocurrió; el artista no las escribe, no las edita y no sabe quién las dejó | **Aceptado** |
| [020](ADR-020-brief.md) | El brief como objeto central: rasgos como taxonomía, y el artista responde con un precio | **Aceptado** |
| [021](ADR-021-brief-assistant.md) | Un asistente que conversa para armar el pedido; **enmienda el innegociable 1** con siete reglas duras, y deja el chat humano intacto | **Aceptado** |
| [022](ADR-022-reply-habit.md) | Con qué frecuencia contesta un artista, en tres frases de las que una es mala | **Aceptado** |
| [023](ADR-023-moderation.md) | Denunciar y bloquear; el bloqueo se impone en la base y corta chat, propuestas y visibilidad | **Aceptado** |
| [024](ADR-024-account-deletion.md) | Borrar la cuenta desde la app: inmediato, completo, sin período de gracia | **Aceptado** |
| [025](ADR-025-age-gate.md) | Mayoría de edad declarada, sin fecha de nacimiento; la puerta vive en `schedule_appointment` | **Aceptado** |
| [026](ADR-026-observability.md) | Reportes de error sin id de nadie y logs estructurados; sin dependencia nueva, para no salir de Expo Go | **Aceptado** |
| [027](ADR-027-notifications.md) | Avisos sin texto libre: un tipo y una referencia, sin bandeja vacía y sin número | **Aceptado** |
| [028](ADR-028-account-export.md) | Llevarte lo tuyo antes de borrarlo: lo que escribiste vos, no lo que escribieron otros | **Aceptado** |
| [029](ADR-029-search-by-name.md) | Buscar a alguien por nombre: sin acentos, sin ordenar por cercanía, y a quien no subió obra también se lo encuentra | **Aceptado** |
| [030](ADR-030-first-run.md) | La primera vez que se abre MESH: la edad va al registro, la ubicación se pregunta una vez, y el orden se remezcla en cada sesión | **Aceptado** |
| [031](ADR-031-request-first.md) | El pedido es la puerta de entrada: Inicio abre con tu pedido, publicarlo termina en él, y que lo vean los artistas deja de tener default. **Enmienda D-010** | **Aceptado** |
