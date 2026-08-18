# Tests de integración

Contra una instancia local de Supabase, con la **anon key** — o sea, exactamente
las credenciales que la app lleva en el bundle.

## Por qué no corren con `npm run check`

Necesitan una base levantada. Un test que falla porque falta el entorno enseña a
ignorar los tests que fallan, y ese hábito es peor que no tener el test.

Se corren aparte, y en CI corren en el job `database`, después de aplicar las
migraciones y cargar el contenido fixture:

```bash
supabase start
npm run content:fixtures
npm run seed -w @mesh/seed -- --publish
npm run test:integration
```

## Qué cubren que las otras capas no

`supabase/tests/` verifica las políticas desde adentro de Postgres.
`apps/mobile/src/**/*.test.tsx` verifica las pantallas con la red mockeada.

Entre las dos queda un hueco: **un `grant` correcto y un PostgREST mal
configurado se ven igual desde adentro de Postgres.** Estos tests recorren el
camino completo —JWT, PostgREST, RLS, RPC— y ahí encontraron el bug del índice
único sobre expresión, que hacía fallar el upsert de matches con 42P10 mientras
el SQL se veía impecable.
