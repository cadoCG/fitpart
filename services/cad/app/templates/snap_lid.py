"""Archetyp `snap_lid` – Schnappdeckel / Behälterdeckel.

Briefing 6, Phase 2, #9. Runder Deckel mit Deckplatte, abwärts gerichteter
Schürze und innenliegender Schnapplippe (Wulst), die unter den Behälterrand
greift. Der Innendurchmesser der Schürze sitzt als BOHRUNG (HOLE) über dem
Behälter-Aussenrand.

Koordinaten: Deckelachse = z, Deckplatte oben (+z), Schürze nach unten (-z).
"""

from __future__ import annotations

from build123d import Cylinder, Part, Pos
from pydantic import BaseModel, Field, model_validator

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register

# Radialer Vorsprung der Schnapplippe (Wulst) nach innen.
SNAP_BEAD_MM = 0.6


class SnapLidParams(BaseModel):
    """Parameter Schnappdeckel (alle Masse in mm)."""

    rim_d: float = Field(..., ge=15.0, le=200.0, description="Behälter-Aussen-⌀ am Rand")
    wall: float = Field(default=2.0, ge=1.6, le=6.0, description="Schürzenwandstärke")
    skirt_h: float = Field(default=10.0, ge=5.0, le=40.0, description="Schürzenhöhe")
    top_t: float = Field(default=2.0, ge=1.2, le=6.0, description="Deckeldicke")
    fit: FitClass = Field(default=FitClass.SNUG, description="Passung über dem Behälterrand")

    @model_validator(mode="after")
    def _check_snap(self) -> "SnapLidParams":
        if self.skirt_h < 4 * SNAP_BEAD_MM:
            raise ValueError("skirt_h zu klein für die Schnapplippe.")
        return self


def build(params: SnapLidParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()
    wall = params.wall
    top_t = params.top_t
    skirt_h = params.skirt_h

    d_in = effective_dim(params.rim_d, FeatureType.HOLE, params.fit, profile)
    r_in = d_in / 2
    r_out = r_in + wall
    total_h = top_t + skirt_h

    # Deckplatte oben, Schürze als Ring nach unten.
    body = Pos(0, 0, total_h / 2 - top_t / 2) * Cylinder(r_out, top_t)
    skirt = Cylinder(r_out, skirt_h) - Cylinder(r_in, skirt_h + 0.1)
    body += Pos(0, 0, total_h / 2 - top_t - skirt_h / 2) * skirt

    # Schnapplippe: dünner Wulst nach innen, nahe der Schürzenunterkante.
    bead_z = total_h / 2 - top_t - skirt_h + 1.5 * SNAP_BEAD_MM
    bead = Cylinder(r_in + SNAP_BEAD_MM, 2 * SNAP_BEAD_MM) - Cylinder(
        r_in - SNAP_BEAD_MM, 2 * SNAP_BEAD_MM + 0.1
    )
    body += Pos(0, 0, bead_z) * bead

    return Part() + body if not isinstance(body, Part) else body


def dimensions(
    params: SnapLidParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    r_in = effective_dim(params.rim_d, FeatureType.HOLE, params.fit, profile) / 2
    r_out = r_in + params.wall
    total_h = params.top_t + params.skirt_h
    return [
        # Behälter-⌀ an der Schürzenunterkante (Öffnung).
        DimensionSpec(
            param="rim_d", kind="diameter",
            p1=(-r_in, 0, -total_h / 2), p2=(r_in, 0, -total_h / 2),
            offset_dir=(0, 0, -1),
        ),
        DimensionSpec(
            param="skirt_h",
            p1=(r_out, 0, -total_h / 2), p2=(r_out, 0, total_h / 2 - params.top_t),
            offset_dir=(1, 0, 0),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="snap_lid",
        params_model=SnapLidParams,
        build=build,
        dimensions=dimensions,
        title_de="Schnappdeckel",
        description_de="Runder Deckel mit Schürze und innenliegender Schnapplippe.",
        print_rec={
            "material": "PP (flexibel, Schnapp-Ermüdung) oder PETG",
            "orientation_de": "Deckplatte unten aufs Bett, Schürze nach oben – saubere Dichtfläche.",
            "infill": "100 % bei dünner Deckplatte, sonst 3 Perimeter",
        },
    )
)
