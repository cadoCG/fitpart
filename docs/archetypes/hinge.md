# Archetyp: hinge

- **Titel:** Scharnier (Filament-Pin)
- **Beschreibung:** Zwei flache Blätter mit alternierenden Knöcheln auf
  gemeinsamer Achse; ein eingeschobener Stift (Filament/Rundstab) hält sie.
- **Kritische Masse:** length, pin_d

## Parameter

| Key | Art | Bereich | Passungsrelevant? |
| --- | --- | --- | --- |
| `length` | slider | 20–200 | nein |
| `leaf_w` | slider | 8–80 | nein |
| `thickness` | slider | 1,6–6 | nein |
| `pin_d` | slider | 2–8 | ja – HOLE (Stiftbohrung) |
| `knuckles` | int | 3–9 (ungerade) | nein |
| `screw_d` | slider | 2–6 | nein (HOLE loose) |
| `fit` | fit | – | default sliding (muss drehen) |

## Geometrie

Zwei **disjunkte** Solids (Blatt A/B). Knöchel alternieren entlang der Achse
(Blatt A trägt gerade, B ungerade Indizes), überall radial (0,5 mm) und axial
(0,4 mm) Luft. Durchgehende Stiftbohrung (HOLE), zwei Schraublöcher je Blatt.
Knöchel-Aussenradius = pin/2 + thickness.

## Druckempfehlung

PETG (zäh, gute Gleitpaarung), Stift aus Filament/Rundstab. Flach drucken,
beide Blätter offen in einer Ebene – keine Stützen. 40–60 % Infill.
