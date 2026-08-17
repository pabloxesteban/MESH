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
| [007](ADR-007-navigation.md) | Expo Router, cuatro pestañas | Propuesto |
| [008](ADR-008-design-system.md) | Design system dentro de la app, impuesto por lint | Propuesto |
