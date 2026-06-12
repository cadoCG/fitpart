"""Archetyp `knob` – Drehknopf für D-Welle.

Briefing 6, Phase 2, #7. Zylindrischer Knopf mit Griffrillen aussen und einer
blinden D-Wellen-Bohrung von unten (Poti, Encoder, Herdschalter, Möbelknopf).

- `shaft_d` ist der Wellen-⌀ und `d_flat` das D-Mass (Höhe der Welle über die
  Abflachung gemessen). Beide laufen als HOLE durch die Toleranz-Engine
  (default snug – der Knopf soll satt sitzen und nicht durchrutschen).
- `d_flat == shaft_d` bedeutet: keine Abflachung (runde Welle).

Koordinaten: Knopfachse = z (zentriert), Bohrung öffnet nach unten (-z),
Abflachungs-Fläche zeigt nach +y.
"""

from __future__ import annotations

import math

from build123d import Box, Cylinder, Part, Pos
from pydantic import BaseModel, Field, model_validator

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim

from .base import Template, register

# Geschlossene Decke über der blinden Bohrung.
TOP_WALL_MM = 3.0
# Restwand zwischen Bohrung und Rillengrund (inkl. Toleranz-Luft).
MIN_WALL_MM = 2.4


def _rib_radius(knob_d: float, ribs: int) -> float:
    """Radius der Rillen-Halbkreise: an die Teilung gekoppelt, gedeckelt."""
    if ribs <= 0:
        return 0.0
    spacing = math.pi * knob_d / ribs
    return min(2.0, 0.35 * spacing)


class KnobParams(BaseModel):
    """Validierte Parameter für den Drehknopf (alle Masse in mm)."""

    shaft_d: float = Field(..., ge=2.0, le=20.0, description="Wellen-⌀")
    d_flat: float = Field(
        ..., ge=1.0, le=20.0,
        description="D-Mass: Welle über die Abflachung gemessen (= shaft_d → rund)",
    )
    knob_d: float = Field(..., ge=10.0, le=80.0, description="Knopf-⌀")
    height: float = Field(default=15.0, ge=8.0, le=50.0, description="Knopfhöhe")
    ribs: int = Field(default=12, ge=0, le=36, description="Anzahl Griffrillen (0 = glatt)")
    fit: FitClass = Field(default=FitClass.SNUG, description="Passung auf der Welle")

    @model_validator(mode="after")
    def _check_geometry(self) -> "KnobParams":
        if not (0.5 * self.shaft_d <= self.d_flat <= self.shaft_d):
            raise ValueError(
                f"d_flat ({self.d_flat}) muss zwischen 0,5×shaft_d "
                f"({0.5 * self.shaft_d}) und shaft_d ({self.shaft_d}) liegen."
            )
        wall = (self.knob_d - self.shaft_d) / 2 - _rib_radius(self.knob_d, self.ribs)
        if wall < MIN_WALL_MM:
            raise ValueError(
                f"knob_d ({self.knob_d}) zu klein für shaft_d ({self.shaft_d}) – "
                f"Restwand {wall:.1f} mm < {MIN_WALL_MM} mm."
            )
        return self


def build(params: KnobParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()

    h = params.height
    r_knob = params.knob_d / 2
    d_eff = effective_dim(params.shaft_d, FeatureType.HOLE, params.fit, profile)
    # Abflachung: Abstand der Fläche von der Achse. Effektiv konsistent zum
    # Bohrungs-⌀ (beide über dieselbe HOLE-Luft, je hälftig pro Seite).
    flat_eff = (
        effective_dim(params.d_flat, FeatureType.HOLE, params.fit, profile)
        - d_eff / 2
    )

    body = Cylinder(r_knob, h)

    # Griffrillen: Halbkreis-Nuten parallel zur Achse, gleichmässig verteilt.
    rib_r = _rib_radius(params.knob_d, params.ribs)
    if rib_r > 0:
        for i in range(params.ribs):
            a = 2 * math.pi * i / params.ribs
            body -= Pos(r_knob * math.cos(a), r_knob * math.sin(a), 0) * Cylinder(
                rib_r, h + 2
            )

    # Blinde D-Bohrung von unten: Zylinder, dessen Segment jenseits der
    # Abflachungs-Ebene (y = flat_eff) stehen bleibt.
    bore_depth = h - TOP_WALL_MM
    bore = Cylinder(d_eff / 2, bore_depth)
    if flat_eff < d_eff / 2:  # nur abflachen, wenn d_flat < shaft_d wirkt
        bore -= Pos(0, flat_eff + d_eff / 2, 0) * Box(
            d_eff + 2, d_eff, bore_depth + 2
        )
    body -= Pos(0, 0, -h / 2 + bore_depth / 2) * bore

    return Part() + body if not isinstance(body, Part) else body


def dimensions(
    params: KnobParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    r_bore = effective_dim(params.shaft_d, FeatureType.HOLE, params.fit, profile) / 2
    r_knob = params.knob_d / 2
    h2 = params.height / 2
    return [
        # Wellen-⌀ an der Bohrungsöffnung (Unterseite); die Sehne liegt auf x,
        # die Abflachung (+y) stört dort nicht.
        DimensionSpec(
            param="shaft_d", kind="diameter",
            p1=(-r_bore, 0, -h2), p2=(r_bore, 0, -h2), offset_dir=(0, 0, -1),
        ),
        DimensionSpec(
            param="knob_d", kind="diameter",
            p1=(-r_knob, 0, h2), p2=(r_knob, 0, h2), offset_dir=(0, 0, 1),
        ),
        DimensionSpec(
            param="height",
            p1=(r_knob, 0, -h2), p2=(r_knob, 0, h2), offset_dir=(1, 0, 0),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="knob",
        params_model=KnobParams,
        build=build,
        dimensions=dimensions,
        title_de="Drehknopf (D-Welle)",
        description_de="Griffrillen-Knopf mit blinder D-Wellen-Bohrung.",
        print_rec={
            "material": "PETG oder PLA; ABS/ASA bei Hitze (Herd)",
            "orientation_de": "Stehend drucken, Bohrung nach oben – D-Form bleibt masshaltig, keine Stützen.",
            "infill": "25–40 %, 3 Perimeter",
        },
    )
)
