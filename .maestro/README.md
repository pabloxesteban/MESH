# Flujos E2E (Maestro)

Los seis flujos de `docs/testing/test-strategy.md` §6, escritos para
[Maestro](https://maestro.mobile.dev).

## Estado: escritos, **no ejecutados**

Estos flujos necesitan un simulador de iOS o un emulador de Android con la app
instalada. El entorno donde se construyó MESH no tiene ninguno de los dos, así
que **nunca corrieron**. Están acá porque escribirlos obliga a decidir qué
significa que un flujo esté bien, y esa decisión es la mitad del valor — pero un
flujo que no corrió no es una garantía, es una intención.

Antes de darlos por buenos hay que correrlos en un dispositivo real:

```bash
maestro test .maestro/01-primer-arranque-a-contacto.yaml
```

Lo que sí está verificado en este repositorio, y cubre buena parte del mismo
terreno:

- `tests/integration/` — recorridos completos contra la base local con la anon
  key: sesión anónima, feed, paginación, interacciones idempotentes, gusto,
  aislamiento entre usuarios, matching y cuotas. **17 tests, ejecutados.**
- `supabase/tests/` — 71 tests de pgTAP.
- `apps/mobile/src/**/*.test.tsx` — los estados de cada pantalla, incluidos
  vacío y error, en los dos temas.

Lo que **solo** el E2E puede cubrir, y por eso sigue pendiente: que los gestos
funcionen con un dedo real, que el modo avión encole de verdad, que el traspaso
a WhatsApp abra la app, y que la navegación entre pantallas no pierda estado.
