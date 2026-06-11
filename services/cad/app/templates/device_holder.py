"""Archetyp `device_holder` – Gerätehalterung universal (U-Schale).

Briefing 6, Phase 1, #6. Wandmontierte Schale: Rückplatte, Boden, vordere
Lippe, Seitenwände. Objektbreite und -tiefe laufen als SLOT (default
sliding – das Gerät soll sich entnehmen lassen) durch die Toleranz-Engine.

Koordinaten: x = Breite (zentriert), y = von der Wand weg, z = Höhe.
"""

from __future__ import annotations

from build123d import Box, Cylinder, Part, Pos, Rot
from pydantic import BaseModel, Field, model_validator

from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register


class DeviceHolderParams(BaseModel):
    """Parameter Gerätehalterung (alle Masse in mm)."""

    device_w: float = Field(..., ge=10.0, le=300.0, description="Objektbreite")
    device_d: float = Field(..., ge=3.0, le=120.0, description="Objekttiefe/-dicke")
    lip_height: float = Field(default=12.0, ge=4.0, le=80.0, description="Höhe der vorderen Lippe")
    back_height: float = Field(default=30.0, ge=10.0, le=200.0, description="Höhe der Rückplatte")
    wall: float = Field(default=3.0, ge=2.0, le=8.0, description="Wandstärke")
    wall_mount: bool = Field(default=True, description="Schraublöcher in der Rückplatte")
    screw_d: float = Field(default=4.0, ge=2.0, le=8.0, description="Schrauben-⌀")
    fit: FitClass = Field(default=FitClass.SLIDING, description="Passung des Geräts in der Schale")

    @model_validator(mode="after")
    def _check_screw_space(self) -> "DeviceHolderParams":
        if self.wall_mount and self.back_height < 4 * self.screw_d:
            raise ValueError("back_height muss ≥ 4×screw_d sein (Platz fürs Schraubloch).")
        return self


def build(params: DeviceHolderParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()
    wall = params.wall

    w_eff = effective_dim(params.device_w, FeatureType.SLOT, params.fit, profile)
    d_eff = effective_dim(params.device_d, FeatureType.SLOT, params.fit, profile)

    width = w_eff + 2 * wall
    depth = wall + d_eff + wall
    front_h = wall + params.lip_height
    back_h = params.back_height

    body = Pos(0, depth / 2, wall / 2) * Box(width, depth, wall)            # Boden
    body += Pos(0, wall / 2, back_h / 2) * Box(width, wall, back_h)        # Rückplatte
    body += Pos(0, wall + d_eff + wall / 2, front_h / 2) * Box(width, wall, front_h)  # Lippe
    for sx in (-1, 1):                                                     # Seitenwände
        body += Pos(sx * (width / 2 - wall / 2), depth / 2, front_h / 2) * Box(wall, depth, front_h)

    if params.wall_mount:
        screw_eff = effective_dim(params.screw_d, FeatureType.HOLE, FitClass.LOOSE, profile)
        hole_z = back_h - 2 * params.screw_d
        xs = [0.0] if params.device_w + 2 * wall < 50 else [-width / 4, width / 4]
        for x in xs:
            # Bohrlänge knapp über Plattendicke, um Lippe/Boden nicht zu treffen.
            body -= Pos(x, wall / 2, hole_z) * Rot(X=90) * Cylinder(screw_eff / 2, wall + 0.2)

    return body


TEMPLATE = register(
    Template(
        archetype="device_holder",
        params_model=DeviceHolderParams,
        build=build,
        title_de="Gerätehalterung",
        description_de="U-Schale mit Rückplatte, Lippe und Wandmontage.",
    )
)
