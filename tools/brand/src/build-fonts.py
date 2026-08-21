#!/usr/bin/env python3
"""
Genera las tipografías estáticas que se empaquetan con la app.

React Native no expone los ejes de una variable font: no se puede pedir
"Fraunces con WONK en 0" desde un estilo. Hay que fijar los ejes acá y
empaquetar cortes estáticos.

Esto además es lo que hace cumplir la decisión de visual-language.md §5:
SOFT=0 y WONK=0 para que Fraunces se lea contemporánea y no anticuada. Si los
ejes se fijan en el archivo, nadie puede volver a activarlos por accidente
desde una pantalla.

Requiere: pip install fonttools brotli
Fuentes:  https://github.com/google/fonts (OFL)

  curl -sSL -o /tmp/Fraunces.ttf \\
    'https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf'
  curl -sSL -o /tmp/InstrumentSans.ttf \\
    'https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/InstrumentSans%5Bwdth%2Cwght%5D.ttf'

Uso:
  python3 tools/brand/src/build-fonts.py /tmp/Fraunces.ttf /tmp/InstrumentSans.ttf

Salida: apps/mobile/assets/fonts/*.ttf

Los .ttf resultantes están commiteados: son parte del bundle de la app y no
pueden depender de que alguien corra este script.
"""

import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "apps" / "mobile" / "assets" / "fonts"

# opsz 72: el serif solo se usa de 24px para arriba (la regla de
# visual-language.md §5 es serif nunca por debajo de 24, sans nunca por encima
# de 20), así que el tamaño óptico se fija en el rango de display.
#
# Un solo corte de serif. Se generó también un Fraunces Medium y se comparó
# contra el Regular en el specimen: a 24px el Regular aguanta y el Medium pesa
# de más, así que el Medium se descartó. Un archivo menos en el bundle y un
# token menos que usar mal.
CUTS = [
    ("fraunces", "Fraunces-Regular.ttf", "Fraunces", "Regular",
     {"wght": 400, "opsz": 72, "SOFT": 0, "WONK": 0}),
    ("instrument", "InstrumentSans-Regular.ttf", "Instrument Sans", "Regular",
     {"wght": 400, "wdth": 100}),
    ("instrument", "InstrumentSans-Medium.ttf", "Instrument Sans", "Medium",
     {"wght": 500, "wdth": 100}),
    # ADR-031. Los mismos ejes que ya usa el logotipo (`MESH` en Fraunces wght
    # 600, opsz 144) — no una coincidencia conveniente, sino la forma más
    # barata de ganar peso editorial sin crear una segunda "voz" tipográfica.
    # Va SOLO al rol `display` (40px): el veredicto sobre Medium a 24px
    # (`title`/`titleLg`) ya se probó y sigue siendo válido a ese tamaño.
    ("fraunces", "Fraunces-SemiBold.ttf", "Fraunces", "SemiBold",
     {"wght": 600, "opsz": 144, "SOFT": 0, "WONK": 0}),
    # ADR-031. Etiqueta de los botones primarios y las pestañas activas, en
    # el mismo tamaño `label` (13px) que ya usa `sansMedium` — cambia el peso,
    # no la escala. `wdth: 100` a propósito: el eje de ancho de Instrument
    # Sans va de 75 a 100 (ver fvar), pero condensar a 13px arriesga
    # legibilidad y la ADR no lo verificó a ojo; la energía "bold" se consigue
    # con peso, no con ancho forzado.
    ("instrument", "InstrumentSans-Bold.ttf", "Instrument Sans", "Bold",
     {"wght": 700, "wdth": 100}),
]


def rename(font: TTFont, family: str, style: str) -> None:
    """
    Reescribe la tabla de nombres a mano.

    `updateFontNames=True` de fontTools deriva los nombres de la tabla STAT, y
    Fraunces no declara un Axis Value para wght 500. Se escriben a mano los
    cuatro nameID que importan para que cada corte tenga identidad propia y no
    colisione con los otros al instalarse.
    """
    full = f"{family} {style}"
    postscript = f"{family.replace(' ', '')}-{style}"
    for name_id, value in (
        (1, family),
        (2, style),
        (4, full),
        (6, postscript),
        (16, family),
        (17, style),
    ):
        font["name"].setName(value, name_id, 3, 1, 0x409)  # Windows / Unicode
        font["name"].setName(value, name_id, 1, 0, 0)  # Macintosh / Roman


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2

    sources = {"fraunces": sys.argv[1], "instrument": sys.argv[2]}
    OUT.mkdir(parents=True, exist_ok=True)

    for family, filename, name, style, axes in CUTS:
        font = instantiateVariableFont(TTFont(sources[family]), axes, inplace=False)
        rename(font, name, style)
        path = OUT / filename
        font.save(path)
        size_kb = path.stat().st_size / 1024
        axis_text = " ".join(f"{k}={v}" for k, v in axes.items())
        print(f"✓ assets/fonts/{filename:<32} {size_kb:6.1f} KB   {axis_text}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
