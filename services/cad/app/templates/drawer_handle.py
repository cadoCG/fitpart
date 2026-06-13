"""Archetyp `drawer_handle` – Schubladengriff / Möbelgriff.

Briefing 6, Phase 2, #12. Bügelgriff mit zwei Posten im genormten
Lochabstand und einer Griffstange dazwischen. Die Schraublöcher laufen
vertikal durch die Posten (Montage von der Innenseite der Front).

Koordinaten: Lochreihe entlang x (zentriert), Griff steht in z von der
Front (z=0) ab, y = Tiefe der Stange.
"""

from __future__ import annotations

from build123d import Box, Cylinder, Part, Pos, Rot
from pydantic import BaseModel, Field, model_validator

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register


class DrawerHandleParams(BaseModel):
    """Parameter Schubladengriff (alle Masse in mm)."""

    hole_spacing: float = Field(..., ge=32.0, le=256.0, description="Lochabstand der Schrauben")
    grip_d: float = Field(default=12.0, ge=8.0, le=30.0, description="Stärke von Posten/Stange")
    height: float = Field(default=30.0, ge=18.0, le=70.0, description="Griffhöhe (Abstand zur Front)")
    overhang: float = Field(default=15.0, ge=0.0, le=60.0, description="Überstand der Stange je Seite")
    screw_d: float = Field(default=4.0, ge=3.0, le=6.0, description="Schrauben-⌀ (M4 üblich)")

    @model_validator(mode="after")
    def _check(self) -> "DrawerHandleParams":
        if self.grip_d < self.screw_d + 3.2:
            raise ValueError("grip_d zu dünn für das Schraubloch (mind. screw_d + 3,2 mm).")
        return self


def build(params: DrawerHandleParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()
    r = params.grip_d / 2
    half = params.hole_spacing / 2
    h = params.height
    bar_len = params.hole_spacing + 2 * params.overhang

    body = Part()
    # Zwei Posten von der Front (z=0) nach oben.
    for sx in (-1, 1):
        body += Pos(sx * half, 0, h / 2) * Cylinder(r, h)
    # Griffstange waagerecht über den Posten (Achse x).
    body += Pos(0, 0, h) * Rot(Y=90) * Cylinder(r, bar_len)

    # Schraublöcher vertikal durch die Posten (von z=0 aus, Sackloch knapp
    # unter die Stange). Clearance-Bohrung (HOLE, loose).
    screw_eff = effective_dim(params.screw_d, FeatureType.HOLE, FitClass.LOOSE, profile)
    bore_h = h + r
    for sx in (-1, 1):
        body -= Pos(sx * half, 0, bore_h / 2 - 0.1) * Cylinder(screw_eff / 2, bore_h)

    return body


def dimensions(
    params: DrawerHandleParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    half = params.hole_spacing / 2
    h = params.height
    r = params.grip_d / 2
    return [
        # Lochabstand zwischen den Postenachsen, Masslinie auf Frontniveau.
        DimensionSpec(
            param="hole_spacing",
            p1=(-half, 0, 0), p2=(half, 0, 0), offset_dir=(0, 0, -1),
        ),
        DimensionSpec(
            param="height",
            p1=(half + r, 0, 0), p2=(half + r, 0, h), offset_dir=(1, 0, 0),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="drawer_handle",
        params_model=DrawerHandleParams,
        build=build,
        dimensions=dimensions,
        title_de="Schubladengriff",
        description_de="Bügelgriff mit genormtem Lochabstand und Griffstange.",
        print_rec={
            "material": "PLA reicht; PETG für mehr Zähigkeit",
            "orientation_de": "Liegend drucken (Griff flach), Schraublöcher waagerecht – oder stehend mit Stützen.",
            "infill": "40–60 %, 3–4 Perimeter (Belastung beim Ziehen)",
        },
    )
)
