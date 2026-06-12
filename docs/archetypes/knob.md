# Archetyp: knob

- **Titel:** Drehknopf (D-Welle)
- **Beschreibung:** Zylindrischer Knopf mit Griffrillen und blinder
  D-Wellen-Bohrung von unten – Poti-/Encoder-Knopf, Herdschalter, Möbelknopf.
- **Kritische Masse (geführte Messung):** shaft_d, d_flat, knob_d

## Parameter

| Key | Art | Bereich | Passungsrelevant? |
| --- | --- | --- | --- |
| `shaft_d` | slider | 2–20 | ja – HOLE (Bohrung um die Welle) |
| `d_flat` | slider | 1–20 | ja – HOLE (Abflachungs-Ebene, konsistent zur Bohrung) |
| `knob_d` | slider | 10–80 | nein |
| `height` | slider | 8–50 | nein |
| `ribs` | int | 0–36 | nein (0 = glatt) |
| `fit` | fit | – | default `snug` (Knopf soll satt sitzen) |

## Geometrie

- Knopfachse = z (zentriert), Bohrung öffnet nach unten, Abflachung zeigt +y.
- `d_flat` ist das D-Mass: Welle über die Abflachung gemessen.
  `d_flat == shaft_d` ⇒ runde Welle ohne Abflachung.
- Blinde Bohrung: Tiefe = `height` − 3 mm (geschlossene Decke).
- Griffrillen: Halbkreis-Nuten (Radius an die Teilung gekoppelt, max. 2 mm)
  parallel zur Achse auf dem Umfang.
- Kreuz-Constraints: `0,5×shaft_d ≤ d_flat ≤ shaft_d`; Restwand zwischen
  Bohrung und Rillengrund ≥ 2,4 mm.

## Druckempfehlung

PETG oder PLA (ABS/ASA bei Hitze, z. B. Herd). Stehend drucken mit Bohrung
nach oben – D-Form bleibt masshaltig, keine Stützen. 25–40 % Infill,
3 Perimeter.
