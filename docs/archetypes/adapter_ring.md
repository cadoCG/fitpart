# Archetyp: adapter_ring

- **Titel:** Adapterring / Reduzierhülse
- **Beschreibung:** Hülse, die aussen in eine Aufnahme gesteckt wird und
  innen ein dünneres Gegenstück aufnimmt – Schlauch → Staubsaugerstutzen,
  Rohr-Reduktion, Wellen-Adapter.
- **Kritische Masse (geführte Messung):** outer_d, inner_d, height

## Parameter

| Key | Art | Bereich | Passungsrelevant? |
| --- | --- | --- | --- |
| `outer_d` | slider | 6–120 | ja – SHAFT (Zapfen in der Aufnahme) |
| `inner_d` | slider | 2–110 | ja – HOLE (Bohrung ums Gegenstück) |
| `height` | slider | 5–120 | nein |
| `collar` | bool | – | nein (Anschlagbund, +3 mm Lippe oben) |
| `fit_outer` | fit | – | default `snug` |
| `fit_inner` | fit | – | default `snug` |

## Geometrie

- Achse = z (zentriert), optionaler Bund am oberen Ende (3 mm dick,
  3 mm Überstand) als Einsteck-Stopp.
- Zwei unabhängige Passungen: aussen SHAFT (`fit_outer`), innen HOLE
  (`fit_inner`) – der einzige Archetyp mit zwei Fit-Feldern (UI-Labels
  `params.fit_outer`/`params.fit_inner`).
- Kreuz-Constraint: `outer_d ≥ inner_d + 4` (Ringwand ≥ 2×Düse pro Seite
  plus beidseitige Toleranz-Luft).

## Druckempfehlung

PETG (zäh, leicht nachgiebig beim Einstecken). Stehend drucken (Achse
vertikal), beide Durchmesser bleiben rund. Dünnwandig: 4 Perimeter,
Infill unkritisch.
