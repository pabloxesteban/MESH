#!/usr/bin/env python3
"""
Genera el logotipo MESH en curvas desde la variable font Fraunces.

Por qué en curvas y no con <text>: un SVG con `font-family` depende de que
Fraunces esté instalada en la máquina que lo abre. En cualquier otra se
renderiza con una fuente de fallback y deja de ser el logotipo. Un logotipo
tiene que verse igual en todos lados o no es un logotipo.

Ejes: SOFT=0, WONK=0 para que Fraunces se lea contemporánea y no anticuada
(ver docs/design/visual-language.md §5), opsz alto porque el logotipo siempre
se usa grande, y wght 600 para que aguante junto al símbolo.

Requiere: pip install fonttools brotli
Fuente:   https://github.com/google/fonts/tree/main/ofl/fraunces (OFL)
Uso:      python3 tools/brand/src/build-wordmark.py <ruta-a-Fraunces.ttf>

Salida:   brand/logo/mesh-wordmark.svg
          brand/logo/mesh-lockup.svg
          brand/logo/mesh-lockup-stacked.svg

Es una generación puntual: los SVG resultantes son los entregables y están
commiteados. Este script queda para poder rehacerlos si cambia la tipografía.
"""

import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "brand" / "logo"

WORD = "MESH"
TRACKING_EM = 0.12  # ver docs/design/visual-language.md §3

SYMBOL_W, SYMBOL_H = 112.0, 94.0

# El símbolo va MÁS ALTO que la altura de mayúsculas, y bien separado.
#
# Con el símbolo a la altura de mayúsculas y poca separación, el lockup se lee
# "MMESH": la marca es una M y queda pegada a la M del logotipo. Se resuelve
# haciendo que el símbolo no se pueda confundir con una letra —más grande que
# las mayúsculas— y dándole aire. Verificado comparando las dos versiones, no
# supuesto.
SYMBOL_CAP_RATIO = 1.35
LOCKUP_GAP = 90.0
STACKED_SYMBOL_CAP_RATIO = 1.7
STACKED_GAP = 46.0

NL = "\n      "


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    font = instantiateVariableFont(
        TTFont(sys.argv[1]),
        {"wght": 600, "opsz": 144, "SOFT": 0, "WONK": 0},
        inplace=False,
    )

    upem = font["head"].unitsPerEm
    cap = font["OS/2"].sCapHeight
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()

    # Se normaliza para que la altura de mayúsculas sea 100 unidades, así el
    # logotipo y el símbolo se combinan sin números mágicos.
    scale = 100.0 / cap
    tracking = TRACKING_EM * upem * scale

    paths = []
    x = 0.0
    for char in WORD:
        glyph = glyphs[cmap[ord(char)]]
        pen = SVGPathPen(glyphs)
        # y invertida: en las fuentes crece hacia arriba, en SVG hacia abajo.
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, x, 100.0)))
        paths.append(pen.getCommands())
        x += glyph.width * scale + tracking

    word_width = x - tracking  # el tracking del último carácter no cuenta

    write_wordmark(paths, word_width)
    write_lockup(paths, word_width)
    write_lockup_stacked(paths, word_width)
    return 0


def symbol_strokes() -> str:
    symbol = (OUT / "mesh-symbol.svg").read_text()
    return NL.join(line.strip() for line in symbol.splitlines() if "<path" in line)


def write_wordmark(paths: list[str], width: float) -> None:
    body = NL.join(f'<path d="{d}" />' for d in paths)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.1f} 100" role="img" aria-label="MESH">
  <title>MESH</title>
  <!--
    Logotipo MESH — Fraunces en curvas (wght 600, opsz 144, SOFT 0, WONK 0),
    mayúsculas, tracking +{TRACKING_EM:g}em.

    Está en curvas a propósito: con font-family dependería de que Fraunces esté
    instalada donde se abra el archivo, y en cualquier otra máquina dejaría de
    ser el logotipo.

    Coordenadas normalizadas a altura de mayúsculas = 100.
    Regenerar con tools/brand/src/build-wordmark.py.
  -->
  <g fill="currentColor">
      {body}
  </g>
</svg>
"""
    (OUT / "mesh-wordmark.svg").write_text(svg)
    print(f"✓ brand/logo/mesh-wordmark.svg        ({width:.1f} × 100)")


def write_lockup(paths: list[str], word_width: float) -> None:
    symbol_h = 100.0 * SYMBOL_CAP_RATIO
    symbol_scale = symbol_h / SYMBOL_H
    symbol_w = SYMBOL_W * symbol_scale

    word_x = symbol_w + LOCKUP_GAP
    word_y = (symbol_h - 100.0) / 2
    total_w = word_x + word_width

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.1f} {symbol_h:.1f}" role="img" aria-label="MESH">
  <title>MESH</title>
  <!--
    Lockup MESH horizontal — símbolo + logotipo.

    El símbolo va a {SYMBOL_CAP_RATIO:g}× la altura de mayúsculas, no a 1×, y con
    separación amplia. Con el símbolo a la altura de mayúsculas y poco aire, el
    lockup se lee "MMESH": la marca es una M y queda pegada a la M del
    logotipo. Que el símbolo sea más alto que las mayúsculas es lo que lo saca
    de la lectura como letra.

    Ancho mínimo: 220px. Por debajo, usar el símbolo solo.
    Área de resguardo: la altura de la M en todos los lados.

    Regenerar con tools/brand/src/build-wordmark.py.
  -->
  <g fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"
     transform="scale({symbol_scale:.5f})">
      {symbol_strokes()}
  </g>
  <g fill="currentColor" transform="translate({word_x:.2f} {word_y:.2f})">
      {NL.join(f'<path d="{d}" />' for d in paths)}
  </g>
</svg>
"""
    (OUT / "mesh-lockup.svg").write_text(svg)
    print(f"✓ brand/logo/mesh-lockup.svg          ({total_w:.1f} × {symbol_h:.1f})")


def write_lockup_stacked(paths: list[str], word_width: float) -> None:
    symbol_h = 100.0 * STACKED_SYMBOL_CAP_RATIO
    symbol_scale = symbol_h / SYMBOL_H
    symbol_w = SYMBOL_W * symbol_scale

    total_w = max(symbol_w, word_width)
    total_h = symbol_h + STACKED_GAP + 100.0

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.1f} {total_h:.1f}" role="img" aria-label="MESH">
  <title>MESH</title>
  <!--
    Lockup MESH apilado — para contextos cuadrados: splash, ficha de tienda,
    avatar, portada.

    Regenerar con tools/brand/src/build-wordmark.py.
  -->
  <g fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"
     transform="translate({(total_w - symbol_w) / 2:.2f} 0) scale({symbol_scale:.5f})">
      {symbol_strokes()}
  </g>
  <g fill="currentColor" transform="translate({(total_w - word_width) / 2:.2f} {symbol_h + STACKED_GAP:.2f})">
      {NL.join(f'<path d="{d}" />' for d in paths)}
  </g>
</svg>
"""
    (OUT / "mesh-lockup-stacked.svg").write_text(svg)
    print(f"✓ brand/logo/mesh-lockup-stacked.svg  ({total_w:.1f} × {total_h:.1f})")


if __name__ == "__main__":
    raise SystemExit(main())
