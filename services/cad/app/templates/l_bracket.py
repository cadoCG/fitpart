"""Archetyp `l_bracket` – L-Winkel / Regalträger.

Briefing 6, Phase 1, #2. Zwei rechtwinklige Schenkel mit Lochbild,
optional eine dreieckige Verrippung in der Mitte. Schraublöcher sind
Durchgangslöcher (HOLE, loose).

Koordinaten: x = horizontaler Schenkel, z = vertikaler Schenkel, y = Breite.
"""

from __future__ import annotations

from build123d import Box, Cylinder, Part, Polyline, Pos, Rot, extrude, make_face
from pydantic import BaseModel, Field, model_validator

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register


class LBracketParams(BaseModel):
    """Parameter L-Winkel (alle Masse in mm)."""

    leg_a: float = Field(..., ge=20.0, le=300.0, description="Länge horizontaler Schenkel")
    leg_b: float = Field(..., ge=20.0, le=300.0, description="Länge vertikaler Schenkel")
    width: float = Field(..., ge=10.0, le=150.0, description="Breite")
    thickness: float = Field(default=4.0, ge=2.4, le=15.0, description="Materialdicke")
    rib: bool = Field(default=True, description="Dreiecksverrippung")
    screw_d: float = Field(default=4.0, ge=2.0, le=10.0, description="Schrauben-⌀")
    holes_per_leg: int = Field(default=2, ge=1, le=3, description="Löcher pro Schenkel")

    @model_validator(mode="after")
    def _check_hole_space(self) -> "LBracketParams":
        usable_a = self.leg_a - self.thickness
        usable_b = self.leg_b - self.thickness
        need = self.holes_per_leg * 4 * self.screw_d
        if usable_a < need or usable_b < need:
            raise ValueError(
                f"Schenkel zu kurz für {self.holes_per_leg} Löcher à ⌀{self.screw_d}: "
                f"nutzbar muss ≥ {need} mm sein."
            )
        return self


def build(params: LBracketParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()
    a, b, t, w = params.leg_a, params.leg_b, params.thickness, params.width

    body = Pos(a / 2, w / 2, t / 2) * Box(a, w, t)
    body += Pos(t / 2, w / 2, b / 2) * Box(t, w, b)

    if params.rib:
        # Dreiecks-Gusset in der Breitenmitte, 55 % der nutzbaren Schenkellänge.
        ra = t + 0.55 * (a - t)
        rb = t + 0.55 * (b - t)
        rib_t = min(t, w / 3)
        tri = make_face(Polyline((t, t), (ra, t), (t, rb), close=True))
        # XY-Profil in die XZ-Ebene kippen und in der Breite zentrieren.
        body += Pos(0, w / 2 + rib_t / 2, 0) * Rot(X=90) * extrude(tri, amount=rib_t)

    # Lochbild: gleichmässig über den nutzbaren Schenkel verteilt.
    screw_eff = effective_dim(params.screw_d, FeatureType.HOLE, FitClass.LOOSE, profile)
    n = params.holes_per_leg
    for i in range(n):
        frac = (i + 1) / (n + 1)
        x = t + (a - t) * frac
        body -= Pos(x, w / 2, t / 2) * Cylinder(screw_eff / 2, 4 * t)
        z = t + (b - t) * frac
        body -= Pos(t / 2, w / 2, z) * Rot(Y=90) * Cylinder(screw_eff / 2, 4 * t)

    return body


def dimensions(
    params: LBracketParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    a, b, t, w = params.leg_a, params.leg_b, params.thickness, params.width
    screw_r = effective_dim(params.screw_d, FeatureType.HOLE, FitClass.LOOSE, profile) / 2
    # Erstes Loch auf dem horizontalen Schenkel (wie in build()).
    x1 = t + (a - t) / (params.holes_per_leg + 1)
    return [
        DimensionSpec(
            param="leg_a",
            p1=(0, 0, 0), p2=(a, 0, 0), offset_dir=(0, -1, 0),
        ),
        DimensionSpec(
            param="leg_b",
            p1=(0, w, 0), p2=(0, w, b), offset_dir=(0, 1, 0),
        ),
        DimensionSpec(
            param="width",
            p1=(a, 0, 0), p2=(a, w, 0), offset_dir=(1, 0, 0),
        ),
        DimensionSpec(
            param="screw_d", kind="diameter",
            p1=(x1 - screw_r, w / 2, t), p2=(x1 + screw_r, w / 2, t),
            offset_dir=(0, 0, 1),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="l_bracket",
        params_model=LBracketParams,
        build=build,
        dimensions=dimensions,
        title_de="L-Winkel / Regalträger",
        description_de="Rechtwinkliger Träger mit Lochbild und optionaler Verrippung.",
        print_rec={
            "material": "PETG",
            "orientation_de": "Liegend auf der Seitenfläche drucken – Schichten parallel zur Lastebene.",
            "infill": "40 % oder mehr, 4 Perimeter; bei Regallast Verrippung aktivieren",
        },
    )
)
