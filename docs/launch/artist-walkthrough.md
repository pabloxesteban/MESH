# Recorrida con los artistas

**Estado: no se puede hacer todavía, y es un bloqueante de publicación.**

## Por qué existe este documento

`docs/product/content-policy.md` dice que ningún artista se carga sin
consentimiento fechado. Esta recorrida es el paso siguiente: que cada artista
**vea su propio perfil dentro de la app** y lo apruebe, antes de que lo vea
cualquier otra persona.

No es una formalidad. Un perfil puede tener todo el consentimiento del mundo y
aun así mostrar una foto que el artista ya no usa, un precio viejo o un estilo
mal etiquetado. El consentimiento cubre "podés mostrar mi obra"; la recorrida
cubre "esto que estás mostrando es lo que yo mostraría".

## Por qué no se hizo

**No hay artistas reales cargados.** Los tres que existen son fixtures
sintéticos (`is_fixture: true`), y no hay ninguna persona detrás de ellos a
quien recorrerle nada. Conseguir artistas reales requiere hablar con personas
reales y obtener su consentimiento — no es algo que se pueda resolver desde el
repositorio.

## El procedimiento, para cuando haya artistas

Para **cada** artista, antes de publicar:

1. **Cargar sin publicar.** `npm run content:seed -- --only <slug>`, sin
   `--publish`. El perfil existe en la base y no aparece en Inicio ni en
   Explorar para nadie.
2. **Mostrarle el perfil en un teléfono**, no una captura. Una captura no deja
   ver cómo se recorta la obra en la grilla ni cómo se lee el nombre.
3. **Recorrer, en voz alta, campo por campo:**
   - ¿Es tu nombre como querés que aparezca?
   - ¿Estas son las piezas que mostrarías? ¿Falta alguna que sí mostrarías?
   - ¿Los estilos son los tuyos, y en ese orden?
   - ¿El rango de precio es el de hoy? *(Se muestra con la fecha en que lo
     declaró. Si está viejo, lo actualizamos o lo sacamos.)*
   - ¿La disponibilidad es la de hoy?
   - ¿El contacto es donde querés que te escriban?
4. **Mostrarle cómo llega un mensaje.** Abrir la pantalla de contacto y leerle
   el mensaje que le va a llegar. Es lo que más sorprende, y es mejor que
   sorprenda ahora.
5. **Decirle cómo salir.** En voz alta, no en un PDF: "si querés que saquemos
   tu perfil, nos escribís y lo sacamos ese mismo día". Alguien que sabe cómo
   irse acepta con más confianza.
6. **Anotar la aprobación**, con fecha, en `content/artists/<slug>/consent.md`.
7. **Recién ahí, publicar.** `npm run content:seed -- --only <slug> --publish`,
   que además escribe el `audit_event`.

   **El `--only` no es opcional.** Sin él, `--publish` publica a todo el
   catálogo cargado, y eso incluye a cualquiera que esté despublicado a
   propósito — alguien que pidió salir unos días vuelve a la app sin que nadie
   lo haya decidido. Ver `rollback.md`, caso 2.

## Lo que descalifica un perfil

Cualquiera de estas cosas lo saca de la tanda, sin negociación:

- El artista duda de alguna pieza.
- El precio o la disponibilidad no se pueden confirmar hoy.
- El artista no quiere que se muestre su WhatsApp (se usa solo Instagram, o no
  se publica).
- El artista pide "ya veremos después". Un consentimiento tibio no es
  consentimiento.
