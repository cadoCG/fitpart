"""Archetyp `furniture_glide` – Möbelgleiter / Fusskappe.

Briefing 6, Phase 2, #8. Kappe für ein Möbel-/Stuhlbein, rund oder
quadratisch, in zwei Montagearten:

- `outer` (default): Kappe wird über das Bein gestülpt – die Kavität ist eine
  BOHRUNG (HOLE) um das Bein, der geschlossene Boden ist die Gleitfläche.
- `inner`: Zapfen wird in ein hohles Bein gesteckt – der Zapfen ist ein
  ZAPFEN (SHAFT) im Beinrohr, eine Bundscheibe bildet die Gleitfläche.

Koordinaten: Beinachse = z, Gleitfläche unten (-z), Öffnung/Zapfen oben (+z).
"""

from __future__ import annotations

from enum import Enum

from build123d import Box, Cylinder, Part, Pos
from pydantic import BaseModel, Field

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register


class GlideShape(str, Enum):
    ROUND = "round"
    SQUARE = "square"


class GlideMount(str, Enum):
    OUTER = "outer"  # Kappe über das Bein
    INNER = "inner"  # Zapfen ins hohle Bein


class FurnitureGlideParams(BaseModel):
    """Parameter Möbelgleiter (alle Masse in mm)."""

    leg_w: float = Field(..., ge=5.0, le=80.0, description="Bein-Mass (⌀ rund / Kantenlänge quadratisch)")
    wall: float = Field(default=2.4, ge=1.6, le=6.0, description="Wand-/Gleitstärke")
    height: float = Field(default=18.0, ge=6.0, le=60.0, description="Kappen-/Zapfenhöhe")
    shape: GlideShape = Field(default=GlideShape.ROUND, description="Querschnitt")
    mount: GlideMount = Field(default=GlideMount.OUTER, description="Über das Bein oder ins Bein")
    fit: FitClass = Field(default=FitClass.SNUG, description="Passung am Bein")


def _prism(shape: GlideShape, across: float, height: float) -> Part:
    """Zentrierter Körper: Zylinder (rund) oder Box (quadratisch)."""
    if shape is GlideShape.ROUND:
        return Cylinder(across / 2, height)
    return Box(across, across, height)


def build(params: FurnitureGlideParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()
    wall = params.wall
    h = params.height

    if params.mount is GlideMount.OUTER:
        # Kappe über das Bein: Kavität = HOLE um das Bein.
        leg_eff = effective_dim(params.leg_w, FeatureType.HOLE, params.fit, profile)
        outer = _prism(params.shape, leg_eff + 2 * wall, h)
        cavity_h = h - wall
        cavity = _prism(params.shape, leg_eff, cavity_h)
        # Kavität von oben, Boden bleibt als Gleitfläche (Dicke wall).
        body = outer - Pos(0, 0, h / 2 - cavity_h / 2) * cavity
        return Part() + body if not isinstance(body, Part) else body

    # Zapfen ins hohle Bein: Zapfen = SHAFT, Bundscheibe als Gleitfläche.
    peg_eff = effective_dim(params.leg_w, FeatureType.SHAFT, params.fit, profile)
    flange = _prism(params.shape, peg_eff + 2 * wall, wall)
    peg = _prism(params.shape, peg_eff, h)
    body = (
        Pos(0, 0, -h / 2 + wall / 2) * flange
        + Pos(0, 0, wall / 2) * peg
    )
    return Part() + body if not isinstance(body, Part) else body


def dimensions(
    params: FurnitureGlideParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    h = params.height
    kind = "diameter" if params.shape is GlideShape.ROUND else "linear"
    if params.mount is GlideMount.OUTER:
        a = effective_dim(params.leg_w, FeatureType.HOLE, params.fit, profile) / 2
    else:
        a = effective_dim(params.leg_w, FeatureType.SHAFT, params.fit, profile) / 2
    return [
        # Bein-Mass an der Öffnung (oben).
        DimensionSpec(
            param="leg_w", kind=kind,
            p1=(-a, 0, h / 2), p2=(a, 0, h / 2), offset_dir=(0, 0, 1),
        ),
        DimensionSpec(
            param="height",
            p1=(a + params.wall, 0, -h / 2), p2=(a + params.wall, 0, h / 2),
            offset_dir=(1, 0, 0),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="furniture_glide",
        params_model=FurnitureGlideParams,
        build=build,
        dimensions=dimensions,
        title_de="Möbelgleiter / Fusskappe",
        description_de="Kappe über das Bein oder Zapfen ins hohle Bein; rund oder quadratisch.",
        print_rec={
            "material": "TPU (leise, rutschfest) oder PETG; PLA für harte Böden",
            "orientation_de": "Stehend drucken, Gleitfläche aufs Druckbett – glatte Unterseite.",
            "infill": "40–60 %, 3 Perimeter",
        },
    )
)
