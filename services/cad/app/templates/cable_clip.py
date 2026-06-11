"""Archetyp `cable_clip` – Kabelclip / Kabelführung.

Briefing 6, Phase 1, #4. Block mit 1–4 parallelen, oben offenen
Kabelkanälen (Schnapplippen). Montage per Schraube (Lasche) oder Klebepad
(flacher Boden). Der Kanal läuft als HOLE (default snug) durch die
Toleranz-Engine.

Koordinaten: Kabel laufen entlang y, Kanäle nebeneinander in x, z = Höhe.
"""

from __future__ import annotations

from enum import Enum

from build123d import Box, Cylinder, Part, Pos, Rot
from pydantic import BaseModel, Field

from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register


class MountType(str, Enum):
    SCREW = "screw"  # Schraublasche
    PAD = "pad"      # Klebepad (flacher Boden)


class CableClipParams(BaseModel):
    """Parameter Kabelclip (alle Masse in mm)."""

    cable_d: float = Field(..., ge=1.5, le=25.0, description="Kabel-⌀")
    channels: int = Field(default=1, ge=1, le=4, description="Anzahl Kanäle")
    depth: float = Field(default=10.0, ge=4.0, le=40.0, description="Cliptiefe entlang des Kabels")
    wall: float = Field(default=2.0, ge=1.6, le=6.0, description="Wandstärke")
    mount: MountType = Field(default=MountType.SCREW, description="Montageart")
    screw_d: float = Field(default=3.5, ge=2.0, le=6.0, description="Schrauben-⌀ (bei mount=screw)")
    fit: FitClass = Field(default=FitClass.SNUG, description="Passung des Kabels im Kanal")


def build(params: CableClipParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()

    d_eff = effective_dim(params.cable_d, FeatureType.HOLE, params.fit, profile)
    wall = params.wall
    n = params.channels
    depth = params.depth

    base_t = wall
    pitch = d_eff + wall
    length = n * d_eff + (n + 1) * wall
    height = base_t + d_eff + wall

    body = Pos(0, 0, height / 2) * Box(length, depth, height)

    # Schnapp-Öffnung: schmaler als der Kanal, Lippen mind. ~0,8 mm je Seite.
    slot_w = max(0.6 * d_eff, d_eff - 1.6)
    for i in range(n):
        cx = -length / 2 + wall + d_eff / 2 + i * pitch
        cz = base_t + d_eff / 2
        body -= Pos(cx, 0, cz) * Rot(X=90) * Cylinder(d_eff / 2, depth + 2)
        slot_h = d_eff / 2 + wall + 1
        body -= Pos(cx, 0, cz + slot_h / 2) * Box(slot_w, depth + 2, slot_h)

    if params.mount is MountType.SCREW:
        screw_eff = effective_dim(params.screw_d, FeatureType.HOLE, FitClass.LOOSE, profile)
        tab_l = 3 * params.screw_d
        tab_cx = length / 2 + tab_l / 2
        body += Pos(tab_cx, 0, base_t / 2) * Box(tab_l, depth, base_t)
        body -= Pos(tab_cx, 0, base_t / 2) * Cylinder(screw_eff / 2, 4 * base_t)

    return body


TEMPLATE = register(
    Template(
        archetype="cable_clip",
        params_model=CableClipParams,
        build=build,
        title_de="Kabelclip",
        description_de="1–4 parallele Schnappkanäle; Montage per Schraube oder Klebepad.",
        print_rec={
            "material": "PETG oder PLA",
            "orientation_de": "Liegend auf der Rückseite drucken.",
            "infill": "30 %, 2–3 Perimeter",
        },
    )
)
