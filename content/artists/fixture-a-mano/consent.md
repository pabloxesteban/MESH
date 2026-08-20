# Consentimiento — Milena Ostrovsky (perfil de prueba)

**Este es un artista fixture.** No existe ninguna persona detrás de este
registro, así que no hay consentimiento humano que registrar: hay una
declaración de que el registro es sintético.

- Tipo: fixture de desarrollo
- Creado: 2026-08-18
- Imágenes: **6 fotografías de banco**, de Pixabay, bajo la Pixabay Content
  License, que permite este uso sin atribución. `photos.yaml` guarda de cada
  una su id, su autor y la página de origen — el registro está igual, aunque la
  licencia no lo exija.

  **Estas fotos no son la obra de este perfil, y no son la obra de nadie de
  MESH.** Son tatuajes reales fotografiados por terceros, elegidos para que la
  grilla se pueda mirar con algo que se parezca a un tatuaje en vez de a una
  forma geométrica. Que el perfil sea inconfundiblemente ficticio —nombre que
  no es el de una persona, insignia en toda pantalla, contacto bloqueado, y
  producción rechazada— es lo que hace que esto no sea atribuirle obra ajena a
  nadie.

  Autores de las fotos: BiancaVanDijk, HIROSHIXD, Mylene2401, StockSnap, mahniccaio.

  Se bajan con `npm run content:photos` y no se versionan. Si alguna deja de
  estar en el origen, `npm run content:fixtures` le dibuja el placeholder
  abstracto de siempre.
- Carga a producción: **rechazada**. `assertNoFixturesInProduction()` corta la
  corrida si alguna fila tiene `is_fixture: true`.

El archivo existe igual porque el validador exige un registro de consentimiento
fechado para todo directorio de `content/artists/`. Un fixture no es una
excepción a esa regla: es un caso donde la respuesta honesta es "sintético".
