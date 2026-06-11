"""Archetyp `wall_hook` – Wandhaken (J-Profil).

Briefing 6, Phase 1, #1. J-Profil: Rückplatte an der Wand, unterer Arm,
vordere Lippe. Der Hakenspalt (`hook_depth`) nimmt das gehängte Objekt auf
und läuft als SLOT durch die Toleranz-Engine; das Schraubloch als HOLE
(immer loose – Durchgangsloch).

Koordinaten: x = von der Wand weg, y = nach oben, z = Breite.
"""

from __future__ import annotations

from build123d import Cone, Cylinder, Part, Polyline, Pos, Rot, extrude, make_face
from pydantic import BaseModel, Field, model_validator

from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register


class WallHookParams(BaseModel):
    """Parameter Wandhaken (alle Masse in mm)."""

    hook_depth: float = Field(..., gt=2.0, le=80.0, description="Hakenspalt (Dicke des gehängten Objekts)")
    width: float = Field(..., ge=8.0, le=100.0, description="Hakenbreite")
    thickness: float = Field(default=4.0, ge=2.4, le=12.0, description="Wandstärke des Profils")
    back_height: float = Field(..., ge=20.0, le=200.0, description="Höhe der Rückplatte")
    lip_height: float = Field(default=12.0, ge=4.0, le=80.0, description="Höhe der vorderen Lippe")
    screw_d: float = Field(default=4.0, ge=2.0, le=8.0, description="Schrauben-⌀ (z. B. 4 für M4)")
    countersink: bool = Field(default=True, description="Senkung für Senkkopfschraube")
    fit: FitClass = Field(default=FitClass.SLIDING, description="Passung des Hakenspalts")

    @model_validator(mode="after")
    def _check_geometry(self) -> "WallHookParams":
        if self.back_height < self.thickness + 4 * self.screw_d:
            raise ValueError(
                "back_height muss ≥ thickness + 4×screw_d sein, "
                "damit das Schraubloch Platz hat."
            )
        return self


def build(params: WallHookParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()
    t = params.thickness
    g = effective_dim(params.hook_depth, FeatureType.SLOT, params.fit, profile)
    lip = params.lip_height
    h = params.back_height
    w = params.width

    # J-Profil in XY (x von der Wand weg, y nach oben), Extrusion in z.
    pts = [
        (0, 0), (0, h), (t, h), (t, t),
        (t + g, t), (t + g, t + lip),
        (t + g + t, t + lip), (t + g + t, 0),
    ]
    body = extrude(make_face(Polyline(*pts, close=True)), amount=w)

    # Schraubloch horizontal (Achse x) durch die Rückplatte.
    screw_eff = effective_dim(params.screw_d, FeatureType.HOLE, FitClass.LOOSE, profile)
    hole_y = h - 2 * params.screw_d
    body -= Pos(t / 2, hole_y, w / 2) * Rot(Y=90) * Cylinder(screw_eff / 2, 4 * t)

    if params.countersink:
        # 90°-Senkung (Kopf-⌀ = 2×Schraube) auf der wandabgewandten Seite (x=t).
        cs_h = screw_eff / 2
        body -= (
            Pos(t - cs_h / 2, hole_y, w / 2)
            * Rot(Y=90)
            * Cone(bottom_radius=screw_eff / 2, top_radius=screw_eff, height=cs_h)
        )

    return body


TEMPLATE = register(
    Template(
        archetype="wall_hook",
        params_model=WallHookParams,
        build=build,
        title_de="Wandhaken",
        description_de="J-Profil-Haken mit Rückplatte, Schraubloch und Senkung.",
    )
)
