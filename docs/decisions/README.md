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
| [015](ADR-015-social-sign-in.md) | Entrar con Google **vincula** la identidad al usuario anónimo; nunca crea uno nuevo | **Aceptado** |
| [016](ADR-016-saved-items.md) | Guardar obra con un corazón; revierte el descarte de ADR-003 | Enmendado por ADR-017 |
| [017](ADR-017-saved-ranking.md) | Ranking de lo más guardado y avisos al artista; **enmienda ADR-016** y acota el innegociable 3 | **Aceptado** |
