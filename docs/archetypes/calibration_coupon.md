# Archetyp: `calibration_coupon` (Kalibrier-Coupon)

Briefing 7.1 – der USP/Moat. Einmaliges Testteil zum Vermessen des Drucker- +
Materialverhaltens. **Sonderfall:** druckt bewusst auf Nennmass; `build`
ignoriert das `ToleranceProfile` (es ist die Messreferenz selbst). Erscheint
NICHT in der `/create`-Archetyp-Auswahl, sondern nur im CalibrationFlow.

## Geometrie
Grundplatte mit drei Leitern (Draufsicht, Stufen entlang x, Reihen entlang y):

- **Loch-Leiter:** Durchgangsbohrungen ⌀ 4,8 / 4,9 / 5,0 / 5,1 / 5,2 / 5,4 / 5,6
- **Zapfen-Leiter:** stehende Zapfen ⌀ 4,6 / 4,8 / 5,0 / 5,2 + 5,00-mm-Referenzbohrung
- **Nut-Leiter:** Durchgangsschlitze 2,0 / 2,2 / 2,4 + 2,00-mm-Referenzsteg

Masszahlen werden eingraviert/embossiert (defensiv: fällt die Schriftart aus,
wird ohne Beschriftung weitergebaut). Genus 11 (7+1 Bohrungen + 3 Nuten).

## Parameter (`CalibrationCouponParams`)

| Param | Range | Beschreibung |
|---|---|---|
| `plate_thickness` | 2–6 (def. 3) | Plattendicke |
| `peg_height` | 3–12 (def. 6) | Höhe Zapfen/Steg |
| `col_pitch` | 7–12 (def. 8.5) | Spaltenabstand |
| `labels` | bool (def. true) | Masszahlen eingravieren |
| `nozzle_mm` | >0 (def. 0.4) | Düse (Stegbreiten-Proxy) |

## Kalibrier-Logik (`app/calibration.py`)
Referenz: 5,00-mm-Prüfstift/M5 (Loch + Zapfen), 2,00-mm-Steg (Nut). Der Nutzer
meldet die satt sitzende Stufe; daraus:

- `hole_offset = snug_hole − 5,00`  (Bohrung schrumpft → positiv → Nennmass anheben)
- `shaft_offset = 5,00 − snug_shaft` (Zapfen wächst → positiv → Nennmass senken)
- `slot_offset = snug_slot − 2,00`

Diese Offsets fliessen featureweise in `tolerance.effective_dim`. Ergebnis wird
als `ToleranceProfile` gespeichert (vorläufig localStorage, später Supabase
`printer_profiles`).

## API
- `GET /calibration/ladders` – Leiter-Stufen + Referenzmasse für die UI
- `POST /calibration/profile` – `CalibrationInput` → `ToleranceProfile`
