"""Archetyp `spring_clip` – Halteklammer / Federclip.

Briefing 6, Phase 2, #13. Offener C-Federclip, der über einen Rundstab oder
eine Plattenkante schnappt und durch Federkraft hält – anders als der
pipe_clip ohne Fuss/Schraublöcher, dafür mit Einführschrägen an der Mündung.
Der gehaltene Durchmesser läuft als BOHRUNG (HOLE) durch die Toleranz-Engine.

Koordinaten: Klemmachse = z, Mündung öffnet nach +y.
"""

from __future__ import annotations

from build123d import Box, Cylinder, Part, Pos
from pydantic import BaseModel, Field, model_validator

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register


class SpringClipParams(BaseModel):
    """Parameter Federclip (alle Masse in mm)."""

    grip_d: float = Field(..., ge=3.0, le=60.0, description="Gehaltenes Rund-⌀")
    opening: float = Field(
        default=0.65, ge=0.3, le=0.9,
        description="Mündungsweite als Anteil des Grip-⌀ (Schnappmass)",
    )
    thickness: float = Field(default=2.4, ge=1.2, le=6.0, description="Federwandstärke")
    width: float = Field(default=10.0, ge=4.0, le=60.0, description="Clipbreite entlang der Achse")
    fit: FitClass = Field(default=FitClass.SNUG, description="Passung am gehaltenen Teil")

    @model_validator(mode="after")
    def _check(self) -> "SpringClipParams":
        if self.opening * self.grip_d < 1.0:
            raise ValueError("Mündung zu schmal (opening×grip_d ≥ 1 mm).")
        return self


def build(params: SpringClipParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()
    w = params.width
    t = params.thickness

    d_eff = effective_dim(params.grip_d, FeatureType.HOLE, params.fit, profile)
    r_i = d_eff / 2
    r_o = r_i + t

    # C-Ring: Aussen- minus Innenzylinder, Mündung als Schlitz nach +y.
    body = Cylinder(r_o, w) - Cylinder(r_i, w + 0.2)
    opening_w = params.opening * d_eff
    body -= Pos(0, r_o, 0) * Box(opening_w, 2 * r_o, w + 0.2)

    # Einführschrägen: zwei nach aussen gestellte Lippen an der Mündung,
    # die das Aufschnappen führen. Als kleine Zylinder an den Mündungsecken.
    lip_r = t * 0.9
    lip_x = opening_w / 2 + lip_r * 0.3
    lip_y = (r_o ** 2 - lip_x ** 2) ** 0.5 if lip_x < r_o else 0.0
    for sx in (-1, 1):
        body += Pos(sx * lip_x, lip_y, 0) * Cylinder(lip_r, w)
    # Innenkontur wieder freistellen, damit die Lippen nur nach aussen leiten.
    body -= Cylinder(r_i, w + 0.2)

    return Part() + body if not isinstance(body, Part) else body


def dimensions(
    params: SpringClipParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    r_i = effective_dim(params.grip_d, FeatureType.HOLE, params.fit, profile) / 2
    r_o = r_i + params.thickness
    w = params.width
    return [
        # Grip-⌀ als horizontale Sehne durch die Mitte (Mündung liegt oben).
        DimensionSpec(
            param="grip_d", kind="diameter",
            p1=(-r_i, 0, w / 2), p2=(r_i, 0, w / 2), offset_dir=(0, 0, 1),
        ),
        DimensionSpec(
            param="width",
            p1=(-r_o, 0, -w / 2), p2=(-r_o, 0, w / 2), offset_dir=(-1, 0, 0),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="spring_clip",
        params_model=SpringClipParams,
        build=build,
        dimensions=dimensions,
        title_de="Halteklammer / Federclip",
        description_de="Offener C-Federclip mit Einführschrägen; schnappt über Stab oder Kante.",
        print_rec={
            "material": "PETG (federt dauerhaft); PLA bricht bei Wechsellast",
            "orientation_de": "Liegend drucken, Achse senkrecht zum Bett – Schichtlinien quer zur Federrichtung.",
            "infill": "40–60 %, 3 Perimeter",
        },
    )
)
