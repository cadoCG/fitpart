"""Archetyp `pipe_clip` – Rohr-/Stangenclip (C-Clip).

Briefing 6, Phase 1, #3. C-förmiger Schnappclip um ein Rohr, mit Fussplatte
und zwei vertikalen Schraublöchern. Die Bohrung um das Rohr läuft als HOLE
(default snug – der Clip soll klemmen) durch die Toleranz-Engine.

Koordinaten: Rohrachse = z, Fuss bei -y, Öffnung bei +y.
"""

from __future__ import annotations

from build123d import Box, Cylinder, Part, Pos, Rot
from pydantic import BaseModel, Field

from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register


class PipeClipParams(BaseModel):
    """Parameter Rohrclip (alle Masse in mm)."""

    pipe_d: float = Field(..., ge=3.0, le=120.0, description="Rohr-⌀ (aussen)")
    width: float = Field(default=10.0, ge=5.0, le=100.0, description="Clipbreite entlang des Rohrs")
    wall: float = Field(default=2.4, ge=1.6, le=10.0, description="Wandstärke des Rings")
    opening_ratio: float = Field(
        default=0.72, ge=0.4, le=0.95,
        description="Öffnungsweite als Anteil des Rohr-⌀ (Schnappmass)",
    )
    screw_d: float = Field(default=4.0, ge=2.0, le=8.0, description="Schrauben-⌀ Fussplatte")
    fit: FitClass = Field(default=FitClass.SNUG, description="Passung um das Rohr")


def build(params: PipeClipParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()

    d_eff = effective_dim(params.pipe_d, FeatureType.HOLE, params.fit, profile)
    r_i = d_eff / 2
    r_o = r_i + params.wall
    w = params.width
    foot_t = params.wall * 1.5
    foot_len = 2 * r_o + 6 * params.screw_d

    ring = Cylinder(r_o, w)
    # Fussplatte: Oberkante exakt auf Bohrungs-Unterkante (-r_i); die
    # anschliessende Bohrungs-Subtraktion glättet den Übergang.
    foot_h = foot_t + params.wall
    foot = Pos(0, -r_i - foot_h / 2 + params.wall, 0) * Box(foot_len, foot_h, w)

    body = ring + foot
    body -= Cylinder(r_i, w + 2)
    # C-Öffnung: vertikaler Schlitz von der Mitte nach oben.
    opening_w = params.opening_ratio * d_eff
    body -= Pos(0, r_o, 0) * Box(opening_w, 2 * r_o, w + 2)

    # Zwei vertikale Schraublöcher (Achse y) beidseits des Rohrs.
    screw_eff = effective_dim(params.screw_d, FeatureType.HOLE, FitClass.LOOSE, profile)
    hole_x = r_o + 1.5 * params.screw_d
    foot_mid_y = -r_i - foot_h / 2 + params.wall
    for sx in (-1, 1):
        body -= (
            Pos(sx * hole_x, foot_mid_y, 0)
            * Rot(X=90)
            * Cylinder(screw_eff / 2, 3 * foot_h)
        )

    return body


TEMPLATE = register(
    Template(
        archetype="pipe_clip",
        params_model=PipeClipParams,
        build=build,
        title_de="Rohr-/Stangenclip",
        description_de="C-Schnappclip mit Fussplatte und zwei Schraublöchern.",
        print_rec={
            "material": "PETG (federt beim Aufklipsen; PLA bricht)",
            "orientation_de": "Liegend drucken mit Öffnung zur Seite – Schichtlinien quer zur Klemmrichtung.",
            "infill": "30–50 %, 3 Perimeter",
        },
    )
)
