---
name: matching-system
description: Cómo MESH computa el gusto, puntúa profesionales y genera razones de match. Usala para cualquier cambio en packages/domain/src/taste o matching, o en cómo se presentan las recomendaciones.
---

# Sistema de matching

## Propósito

Recomendaciones honestas, explicables, reproducibles y testeables — la única
afirmación original de MESH.

## Cuándo usarla

Cualquier cambio en el motor de gusto, la función de puntaje, el ranking, las
razones, o en cómo se muestra la fuerza del match.

## La especificación de referencia

`docs/product/matching.md`. El código y la spec tienen que coincidir; si no
coinciden, es un bug en alguno de los dos. El razonamiento vive en
`docs/decisions/ADR-005-matching.md`.

## Reglas duras

1. **Determinístico.** Sin azar, sin reloj dentro del scoring, sin inferencia.
   Mismas entradas → mismo puntaje, mismo orden, mismas razones.
2. **Puro.** Sin base de datos, sin red, sin React.
3. **Versionado.** `TASTE_VERSION` / `MATCHING_VERSION` en cada fila persistida.
4. **Los componentes faltantes se omiten y los pesos se renormalizan** — nunca
   puntúan cero. Desconocido ≠ malo.
5. **La disponibilidad vieja (>45 días) es desconocida**, así que se omite del
   puntaje y de la pantalla.
6. **Las razones se derivan**: solo componentes que aportan ≥ 0,10 del puntaje,
   ordenados por aporte, máximo 3, del conjunto cerrado de plantillas. Sin
   fallback.
7. **Una razón nunca puede referenciar un componente omitido.**
8. **Nada por debajo de 0,40 se muestra**, aunque la lista quede vacía.
9. **Bandas, no porcentajes**, en la UI.
10. **La aversión nunca se muestra** como "no te gusta X".

## Los números

```
me gusta +1,0 · me gusta+guardado +1,5 · paso −0,25
raw_s = Σ (v_i × w_{i,s})           w suma 1 por pieza
t_s   = max(0,raw)  / (max(0,raw) + 3,0)
a_s   = max(0,−raw) / (max(0,−raw) + 3,0)
listo ⇔ n ≥ 12 Y ≥3 estilos con t_s ≥ 0,30

Style = clamp01( Σ(t_s·p_as)/Σt_s − 0,5·Σ(a_s·p_as)/Σa_s )   sobre los 6 estilos top
puntaje = Σ_conocidos(w_c · v_c) / Σ_conocidos(w_c)
pesos: estilo ,70 · ubicación ,15 · precio ,10 · disponibilidad ,05
bandas: ≥,75 Fuerte · ≥,55 Bueno · ≥,40 Posible · por debajo → no se muestra
mezcla de proyecto: t' = 0,75·proyecto + 0,25·gusto
```

## Al cambiar cualquiera de esos valores

1. Subí la constante de versión.
2. Actualizá `matching.md` incluyendo la **justificación**, no solo el número.
3. Recalculá y revisá los fixtures.
4. Invalidá los `taste_profiles` / `matches` cacheados de la versión vieja.

El ajuste silencioso está prohibido.

## Testing

La lista completa requerida está en `matching.md` §8. No es opcional. Basados en
propiedades: el puntaje siempre en `[0,1]`; agregar un me gusta nunca baja el
puntaje de un artista que coincide; las razones siempre son un subconjunto de los
componentes que aportan. Nunca evalúes la corrección del algoritmo visualmente.

## Anti-patrones

Ajustar pesos para que una demo se vea bien · Desempate con `Math.random()` ·
Decaimiento temporal sin vida media explícita ni snapshots · Señales de tiempo de
permanencia (hacen que MESH optimice por atención) · Puntuar como cero un
componente desconocido · Una plantilla de razón que halaga en vez de explicar ·
Hacer el feed de descubrimiento guiado por el gusto (la entrada del motor se
vuelve una función de su propia salida) · "Que un LLM escriba la explicación".

## Checklist de calidad

- [ ] Puro y determinístico (sin reloj, sin azar, sin IO)
- [ ] Versión subida si cambió algún número
- [ ] `matching.md` actualizado con la justificación
- [ ] Fixtures recalculados y revisados
- [ ] El test de renormalización por omisión sigue pasando
- [ ] Ninguna razón referencia un componente omitido
- [ ] Orden estable con la entrada permutada
- [ ] Los casos de arranque en frío y entrada vacía producen ceros, no `NaN`
