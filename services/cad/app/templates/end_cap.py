"""Archetyp `end_cap` – Endkappe für Rohr / Profil.

Briefing 6, Phase 2, #11. Geschlossene Kappe, die über ein Rohr- oder
Profilende gestülpt wird (Schutz/Optik/Standfuss), rund, quadratisch oder
rechteckig. Die Kavität sitzt als BOHRUNG (HOLE) über dem Profil-Aussenmass.

Koordinaten: Profilachse = z, geschlossene Stirn oben (+z), Öffnung unten (-z).
"""

from __future__ import annotations

from enum import Enum

from build123d import Box, Cylinder, Part, Pos
from pydantic import BaseModel, Field, model_validator

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register


class CapShape(str, Enum):
    ROUND = "round"
    SQUARE = "square"
    RECT = "rect"


class EndCapParams(BaseModel):
    """Parameter Endkappe (alle Masse in mm)."""

    outer_w: float = Field(..., ge=8.0, le=120.0, description="Profil-Aussenmass (⌀ rund / Breite)")
    outer_d: float = Field(default=20.0, ge=8.0, le=120.0, description="Profiltiefe (nur rechteckig)")
    wall: float = Field(default=2.0, ge=1.6, le=6.0, description="Wandstärke")
    depth: float = Field(default=20.0, ge=6.0, le=80.0, description="Einstecktiefe")
    shape: CapShape = Field(default=CapShape.ROUND, description="Querschnitt")
    fit: FitClass = Field(default=FitClass.SNUG, description="Passung über dem Profil")

    @model_validator(mode="after")
    def _check(self) -> "EndCapParams":
        if self.shape is CapShape.RECT and abs(self.outer_w - self.outer_d) < 0.5:
            # Faktisch quadratisch – nicht verboten, aber square ist gemeint.
            pass
        return self


def _footprint(shape: CapShape, w: float, d: float, height: float) -> Part:
    if shape is CapShape.ROUND:
        return Cylinder(w / 2, height)
    if shape is CapShape.SQUARE:
        return Box(w, w, height)
    return Box(w, d, height)


def build(params: EndCapParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()
    wall = params.wall
    h = params.depth + wall  # Einstecktiefe + geschlossene Stirn

    w_eff = effective_dim(params.outer_w, FeatureType.HOLE, params.fit, profile)
    d_eff = effective_dim(params.outer_d, FeatureType.HOLE, params.fit, profile)

    outer = _footprint(params.shape, w_eff + 2 * wall, d_eff + 2 * wall, h)
    cavity = _footprint(params.shape, w_eff, d_eff, params.depth)
    # Kavität von unten, Stirn (Dicke wall) bleibt oben geschlossen.
    body = outer - Pos(0, 0, -h / 2 + params.depth / 2) * cavity
    return Part() + body if not isinstance(body, Part) else body


def dimensions(
    params: EndCapParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    wall = params.wall
    h = params.depth + wall
    w_eff = effective_dim(params.outer_w, FeatureType.HOLE, params.fit, profile)
    a = w_eff / 2
    kind = "diameter" if params.shape is CapShape.ROUND else "linear"
    return [
        DimensionSpec(
            param="outer_w", kind=kind,
            p1=(-a, 0, -h / 2), p2=(a, 0, -h / 2), offset_dir=(0, 0, -1),
        ),
        DimensionSpec(
            param="depth",
            p1=(a + wall, 0, -h / 2), p2=(a + wall, 0, h / 2 - wall),
            offset_dir=(1, 0, 0),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="end_cap",
        params_model=EndCapParams,
        build=build,
        dimensions=dimensions,
        title_de="Endkappe Rohr/Profil",
        description_de="Geschlossene Kappe über ein Rohr-/Profilende; rund, quadratisch oder rechteckig.",
        print_rec={
            "material": "PETG oder PLA; TPU wenn rutschfest gewünscht",
            "orientation_de": "Mit der geschlossenen Stirn aufs Bett – Öffnung nach oben, keine Stützen.",
            "infill": "20–30 %, 3 Perimeter",
        },
    )
)
