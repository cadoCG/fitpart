# Archetyp: drawer_handle

- **Titel:** Schubladengriff
- **Beschreibung:** Bügelgriff mit zwei Posten im genormten Lochabstand und
  einer Griffstange dazwischen; Schraublöcher vertikal durch die Posten.
- **Kritische Masse:** hole_spacing

## Parameter

| Key | Art | Bereich | Passungsrelevant? |
| --- | --- | --- | --- |
| `hole_spacing` | slider | 32–256 | ja (muss zu bestehenden Löchern passen) |
| `grip_d` | slider | 8–30 | nein |
| `height` | slider | 18–70 | nein |
| `overhang` | slider | 0–60 | nein |
| `screw_d` | slider | 3–6 | nein (HOLE loose) |

## Geometrie

Zwei Posten (Höhe height) bei ±hole_spacing/2, Griffstange (Achse x) über den
Posten, Länge = hole_spacing + 2×overhang. Vertikale Schraub-Clearance je
Posten. Kreuz-Constraint: grip_d ≥ screw_d + 3,2 mm.

## Druckempfehlung

PLA reicht; PETG für mehr Zähigkeit. Liegend drucken (Griff flach). 40–60 %
Infill, 3–4 Perimeter (Zugbelastung).
