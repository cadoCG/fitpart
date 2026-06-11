"""Kalibrier-Engine: Coupon-Antworten → featureweise Drucker-Offsets.

Briefing 7.1 (USP/Moat). Der Nutzer druckt den Kalibrier-Coupon und tippt in
der App an, welche Leiter-Stufe mit der 5,00-mm-Referenz (Prüfstift/M5) bzw.
dem 2,00-mm-Referenzsteg satt ("snug") sitzt. Daraus leiten wir ab, wie stark
der Drucker Bohrungen/Zapfen/Nuten featureweise verzieht, und speichern die
Kompensation als `ToleranceProfile`.

Logik (am Beispiel Bohrung):
- Ist die snug sitzende Bohrung nominell *grösser* als 5,00 mm, druckt der
  Drucker Bohrungen *zu klein* → wir müssen das Nennmass anheben.
- `hole_offset = snug_hole_d − 5,00`. Dieser Offset wird in tolerance.py additiv
  auf das Bohrungs-Nennmass angewandt (HOLE-Richtung +1) und kompensiert so die
  Schrumpfung.

Für Zapfen (SHAFT-Richtung −1) ist das Vorzeichen gespiegelt:
`shaft_offset = 5,00 − snug_shaft_d`. Für Nuten wie für Bohrungen.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

from .tolerance import ToleranceProfile

# Referenzmasse des Coupons (mm).
REFERENCE_PIN_MM = 5.00   # Prüfstift / M5-Schraube für Loch- und Zapfen-Leiter
REFERENCE_TAB_MM = 2.00   # Referenzsteg für die Nut-Leiter

# Leiter-Stufen (Briefing 7.1). Müssen mit dem Coupon-Template übereinstimmen.
HOLE_LADDER_MM: tuple[float, ...] = (4.8, 4.9, 5.0, 5.1, 5.2, 5.4, 5.6)
SHAFT_LADDER_MM: tuple[float, ...] = (4.6, 4.8, 5.0, 5.2)
SLOT_LADDER_MM: tuple[float, ...] = (2.0, 2.2, 2.4)


class CalibrationInput(BaseModel):
    """Was der Nutzer am gedruckten Coupon abliest.

    Jeder Wert ist das *Nennmass* der Leiter-Stufe, die satt sitzt. `None`
    bedeutet "nicht kalibriert / übersprungen" → Offset bleibt 0.
    """

    snug_hole_mm: float | None = Field(default=None)
    snug_shaft_mm: float | None = Field(default=None)
    snug_slot_mm: float | None = Field(default=None)
    nozzle_mm: float = Field(default=0.4, gt=0)

    @model_validator(mode="after")
    def _check_on_ladder(self) -> "CalibrationInput":
        for value, ladder, name in (
            (self.snug_hole_mm, HOLE_LADDER_MM, "snug_hole_mm"),
            (self.snug_shaft_mm, SHAFT_LADDER_MM, "snug_shaft_mm"),
            (self.snug_slot_mm, SLOT_LADDER_MM, "snug_slot_mm"),
        ):
            if value is not None and not any(abs(value - s) < 1e-6 for s in ladder):
                raise ValueError(
                    f"{name}={value} ist keine gültige Leiter-Stufe ({ladder})."
                )
        return self


def compute_profile(data: CalibrationInput, *, calibrated_name: str | None = None) -> ToleranceProfile:
    """Leitet aus den Coupon-Antworten ein kompensierendes ToleranceProfile ab."""
    hole_offset = (
        round(data.snug_hole_mm - REFERENCE_PIN_MM, 3)
        if data.snug_hole_mm is not None
        else 0.0
    )
    shaft_offset = (
        round(REFERENCE_PIN_MM - data.snug_shaft_mm, 3)
        if data.snug_shaft_mm is not None
        else 0.0
    )
    slot_offset = (
        round(data.snug_slot_mm - REFERENCE_TAB_MM, 3)
        if data.snug_slot_mm is not None
        else 0.0
    )
    any_set = any(
        v is not None
        for v in (data.snug_hole_mm, data.snug_shaft_mm, data.snug_slot_mm)
    )
    return ToleranceProfile(
        nozzle_mm=data.nozzle_mm,
        hole_offset_mm=hole_offset,
        shaft_offset_mm=shaft_offset,
        slot_offset_mm=slot_offset,
        calibrated=any_set,
    )
