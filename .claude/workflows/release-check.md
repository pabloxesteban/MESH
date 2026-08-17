# Workflow — Chequeo de release

Correr antes de cualquier build que vaya a ver una persona real o un artista
real.

## 1. Producto — `product-critic`, `ux-product-designer`

- [ ] Todos los criterios de aceptación de `docs/product/product-spec.md` §13
      verificados a mano, no supuestos
- [ ] Ningún callejón sin salida de UX: toda pantalla tiene una acción hacia
      adelante desde todos sus estados
- [ ] Ningún dark pattern en ningún lado — ni racha, ni punto, ni insignia, ni
      escasez falsa, ni urgencia falsa, ni límite artificial, ni notificación
      carnada
- [ ] Nada en ninguna pantalla es inventado ni inferido más allá de lo que
      sostienen los datos
- [ ] "¿Una persona real usaría esto? ¿Por qué volvería?" respondido con
      honestidad, por escrito

## 2. Corrección — `qa-engineer`

- [ ] Chequeo de tipos, lint y todos los tests unitarios en verde
- [ ] Todos los fixtures de matching pasan sin haber sido rebasados
- [ ] Test de garantía de RLS y todos los tests cruzados en verde
- [ ] Los seis flujos E2E en verde — incluidos el flujo 4 (solo botones) y el
      flujo 5 (offline)
- [ ] Cobertura de estados de componentes completa en las superficies tocadas

## 3. Seguridad — `security-reviewer`

Correr `security-review.md` completo. Cada ítem, cada vez.
- [ ] Ningún hallazgo alto ni crítico abierto
- [ ] `npm audit` limpio en alto/crítico
- [ ] Escaneo de secretos del bundle en verde
- [ ] Modelo de amenazas releído contra todo lo nuevo desde el último release

## 4. Performance — `performance-engineer`

En un Android real de gama media, build de release. Registrá el nombre del
dispositivo.
- [ ] Arranque en frío → primera obra < 2,5s en 4G
- [ ] Mazo a 60fps sostenidos en 20 swipes
- [ ] Hero del perfil < 800ms en caliente
- [ ] Un round trip por pantalla, verificado en el log de red
- [ ] Tamaño derivado de imagen correcto en cada superficie
- [ ] Memoria plana sobre 100 tarjetas del mazo

## 5. Contenido — `content-engineer`

- [ ] Todo artista tiene un registro de consentimiento fechado
- [ ] **Cero filas fixture** en la base de producción
- [ ] Todo profesional publicado tiene al menos un canal de contacto que funciona
- [ ] Los datos de disponibilidad están frescos (<45 días) o ausentes
- [ ] Los precios llevan fecha `priced_at`, o están ausentes
- [ ] Cada artista vio su propio perfil y lo aprobó
- [ ] El procedimiento de retiro se probó de punta a punta al menos una vez

## 6. Analytics — `product-architect`

- [ ] Cada evento del catálogo se dispara exactamente una vez en la corrida E2E
- [ ] Ningún texto libre en ninguna propiedad
- [ ] El opt-out genuinamente no encola ni envía nada

## 7. Mecánica del release

- [ ] Los metadatos de tienda y las declaraciones de privacidad coinciden con lo
      que la app efectivamente recolecta
- [ ] Migraciones aplicadas a producción en orden y verificadas
- [ ] Plan de rollback escrito: build anterior, y cómo revertir una migración
- [ ] Versión subida; ADRs y documentación al día

## 8. Firma

Escribí una nota de release corta: qué cambió, qué se midió (con números y el
dispositivo), qué está roto y se conoce, y qué vamos a observar después del
lanzamiento. Una medición no registrada no cuenta como medición.
