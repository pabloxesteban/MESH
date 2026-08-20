# Consentimiento — Mínimo

**Este es un artista fixture.** No existe ninguna persona detrás de este
registro, así que no hay consentimiento humano que registrar: hay una
declaración de que el registro es sintético.

- Tipo: fixture de desarrollo
- Creado: 2026-08-20
- Nombre: no se lee como el de una persona. Es una etiqueta, y así lo exige la
  regla 4 de `content/artists/README.md`.
- Bio, precio y disponibilidad: escritos para que la pantalla tenga algo
  verosímil que mostrar. **No describen a nadie.** No hay ninguna persona a la
  que le puedan atribuirse.
- Imágenes: placeholders abstractos generados por `npm run content:fixtures`.
  Ninguna es una fotografía de un tatuaje real, de nadie.
- Carga a producción: **rechazada**. `assertNoFixturesInProduction()` corta la
  corrida si alguna fila tiene `is_fixture: true`.

El archivo existe igual porque el validador exige un registro de consentimiento
fechado para todo directorio de `content/artists/`. Un fixture no es una
excepción a esa regla: es un caso donde la respuesta honesta es "sintético".
