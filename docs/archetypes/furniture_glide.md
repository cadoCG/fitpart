# Archetyp: furniture_glide

- **Titel:** Möbelgleiter / Fusskappe
- **Beschreibung:** Kappe über ein Möbel-/Stuhlbein (rund/quadratisch) oder
  Zapfen in ein hohles Bein. Geschlossener Boden = Gleitfläche.
- **Kritische Masse:** leg_w, height

## Parameter

| Key | Art | Bereich | Passungsrelevant? |
| --- | --- | --- | --- |
| `leg_w` | slider | 5–80 | ja – HOLE (outer) bzw. SHAFT (inner) |
| `wall` | slider | 1,6–6 | nein |
| `height` | slider | 6–60 | nein |
| `shape` | select | round/square | nein |
| `mount` | select | outer/inner | nein |
| `fit` | fit | – | default snug |

## Geometrie

`outer`: Aussenkörper minus Kavität (HOLE) von oben, Boden bleibt als
Gleitfläche. `inner`: Bundscheibe (Gleitfläche) + Zapfen (SHAFT) nach oben.
Rund = Zylinder, quadratisch = Box.

## Druckempfehlung

TPU (leise/rutschfest) oder PETG; PLA für harte Böden. Stehend mit
Gleitfläche aufs Bett. 40–60 % Infill, 3 Perimeter.
