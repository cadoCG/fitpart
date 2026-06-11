"""Toleranz-Engine: Passungsklassen + featureweise User-Offsets.

Eiserne Regel 3 (CLAUDE.md): Jede passungsrelevante Masse läuft durch dieses
Modul. Templates kodieren NIE Zuschläge hart.

Formel (Briefing 7.2):
    effektiv = nennmass + richtung * (klasse_zuschlag + user_offset[feature_typ])

`richtung` ergibt sich aus dem Feature-Typ: eine Bohrung (HOLE) wird für eine
lockerere Passung *grösser*, ein Zapfen (SHAFT) *kleiner*. So bleibt die
Bedienlogik ("looser = mehr Spiel") für alle Feature-Typen konsistent.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class FitClass(str, Enum):
    """Passungsklasse – wie satt das Gegenstück sitzen soll."""

    PRESS = "press"      # Presspassung, praktisch kein Spiel
    SNUG = "snug"        # saugend / leicht stramm
    SLIDING = "sliding"  # gleitend, von Hand beweglich
    LOOSE = "loose"      # locker, garantiert frei


class FeatureType(str, Enum):
    """Geometrie-Feature, dessen Passung kompensiert wird."""

    HOLE = "hole"    # Innenmass (Bohrung) – wächst für mehr Spiel
    SHAFT = "shaft"  # Aussenmass (Zapfen/Welle) – schrumpft für mehr Spiel
    SLOT = "slot"    # Nut/Schlitz – wächst für mehr Spiel


# Konservative FDM-Erfahrungswerte (Briefing 7.2), gültig ohne Kalibrierung.
DEFAULT_CLEARANCE_MM: dict[FitClass, float] = {
    FitClass.PRESS: 0.05,
    FitClass.SNUG: 0.15,
    FitClass.SLIDING: 0.25,
    FitClass.LOOSE: 0.40,
}

# Richtung des Zuschlags je Feature-Typ.
_DIRECTION: dict[FeatureType, int] = {
    FeatureType.HOLE: +1,
    FeatureType.SHAFT: -1,
    FeatureType.SLOT: +1,
}


class ToleranceProfile(BaseModel):
    """Drucker/Material-spezifische Offsets aus dem Kalibrier-Coupon.

    Spiegelt `printer_profiles` in Supabase. Ohne Kalibrierung alle 0.
    """

    nozzle_mm: float = Field(default=0.4, gt=0)
    hole_offset_mm: float = 0.0
    shaft_offset_mm: float = 0.0
    slot_offset_mm: float = 0.0
    calibrated: bool = False

    def _user_offset(self, feature: FeatureType) -> float:
        return {
            FeatureType.HOLE: self.hole_offset_mm,
            FeatureType.SHAFT: self.shaft_offset_mm,
            FeatureType.SLOT: self.slot_offset_mm,
        }[feature]


def effective_dim(
    nominal_mm: float,
    feature: FeatureType,
    fit: FitClass,
    profile: ToleranceProfile | None = None,
) -> float:
    """Berechnet das effektive (zu druckende) Mass für ein Feature.

    `nominal_mm` ist das Soll-Mass des Gegenstücks (z. B. Schrauben-⌀ 5,0).
    Rückgabe ist das Mass, das die Geometrie tatsächlich bekommt.
    """
    profile = profile or ToleranceProfile()
    clearance = DEFAULT_CLEARANCE_MM[fit] + profile._user_offset(feature)
    return nominal_mm + _DIRECTION[feature] * clearance
