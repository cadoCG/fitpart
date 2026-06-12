"""Archetyp `spacer` – Distanzhülse / Spacer.

Trivialster, aber meistgebrauchter Archetyp (Briefing 6, Phase 1, #5):
ein Hohlzylinder, der als Abstandshalter über eine Schraube/Welle geschoben
wird.

- `inner_d` ist eine BOHRUNG (HOLE) → läuft durch die Toleranz-Engine.
- `outer_d`, `height` sind Aussenmasse ohne Passungsfunktion.
"""

from __future__ import annotations

from build123d import Axis, Cylinder, Part
from pydantic import BaseModel, Field, model_validator

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register

# Minimaler Ring-Wandquerschnitt: 2×Düse (0,8 mm bei 0,4er) auf jeder Seite
# → mind. 1,6 mm Differenz zwischen Aussen- und Innendurchmesser.
MIN_WALL_RING_MM = 1.6


class SpacerParams(BaseModel):
    """Validierte Parameter für die Distanzhülse (alle Masse in mm)."""

    inner_d: float = Field(..., gt=1.0, le=100.0, description="Innen-⌀ (Schraube/Welle)")
    outer_d: float = Field(..., gt=2.0, le=200.0, description="Aussen-⌀")
    height: float = Field(..., gt=0.4, le=300.0, description="Höhe")
    fit: FitClass = Field(
        default=FitClass.SLIDING,
        description="Passung der Bohrung über die Schraube/Welle",
    )

    @model_validator(mode="after")
    def _check_wall(self) -> "SpacerParams":
        if self.outer_d <= self.inner_d + MIN_WALL_RING_MM:
            raise ValueError(
                f"outer_d ({self.outer_d}) muss > inner_d + {MIN_WALL_RING_MM} "
                f"({self.inner_d + MIN_WALL_RING_MM}) sein – Wand zu dünn."
            )
        return self


def build(params: SpacerParams, profile: ToleranceProfile | None = None) -> Part:
    """Erzeugt die Distanzhülse als build123d-Part (zentriert auf Z=0)."""
    profile = profile or ToleranceProfile()

    bore_d = effective_dim(
        params.inner_d, FeatureType.HOLE, params.fit, profile
    )

    outer = Cylinder(radius=params.outer_d / 2, height=params.height)
    bore = Cylinder(radius=bore_d / 2, height=params.height)
    part = outer - bore
    # build123d-Boolean liefert ein Part; explizit casten für Typsicherheit.
    return Part() + part if not isinstance(part, Part) else part


def dimensions(
    params: SpacerParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    r_i = effective_dim(params.inner_d, FeatureType.HOLE, params.fit, profile) / 2
    r_o = params.outer_d / 2
    h2 = params.height / 2
    return [
        DimensionSpec(
            param="inner_d", kind="diameter",
            p1=(-r_i, 0, h2), p2=(r_i, 0, h2), offset_dir=(0, 0, 1),
        ),
        DimensionSpec(
            param="outer_d", kind="diameter",
            p1=(-r_o, 0, -h2), p2=(r_o, 0, -h2), offset_dir=(0, 0, -1),
        ),
        DimensionSpec(
            param="height",
            p1=(r_o, 0, -h2), p2=(r_o, 0, h2), offset_dir=(1, 0, 0),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="spacer",
        params_model=SpacerParams,
        build=build,
        dimensions=dimensions,
        title_de="Distanzhülse",
        description_de="Hohlzylinder als Abstandshalter über Schraube/Welle.",
        print_rec={
            "material": "PETG; PLA bei geringer Last",
            "orientation_de": "Stehend drucken (Bohrung vertikal), so bleibt das Loch rund.",
            "infill": "100 % oder 4+ Perimeter bei Druckbelastung",
        },
    )
)
