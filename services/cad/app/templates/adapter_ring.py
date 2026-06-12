"""Archetyp `adapter_ring` – Adapterring / Reduzierhülse.

Briefing 6, Phase 2, #14. Hülse, die aussen in eine Aufnahme gesteckt wird
und innen ein dünneres Gegenstück aufnimmt (Schlauch → Staubsaugerstutzen,
Rohr-Reduktion, Wellen-Adapter). Optionaler Anschlagbund oben als
Einsteck-Stopp.

Zwei unabhängige Passungen:
- aussen ist ein ZAPFEN (SHAFT) in der Aufnahme → `fit_outer`
- innen ist eine BOHRUNG (HOLE) um das Gegenstück → `fit_inner`

Koordinaten: Achse = z (zentriert), Bund am oberen Ende (+z).
"""

from __future__ import annotations

from build123d import Cylinder, Part, Pos
from pydantic import BaseModel, Field, model_validator

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register

# Ringwand mind. 2×Düse pro Seite, plus Reserve für die beidseitige
# Toleranz-Luft (aussen schrumpft, innen wächst).
MIN_DIAMETER_GAP_MM = 4.0
# Anschlagbund: Überstand pro Seite / Dicke.
COLLAR_LIP_MM = 3.0
COLLAR_T_MM = 3.0


class AdapterRingParams(BaseModel):
    """Validierte Parameter für die Reduzierhülse (alle Masse in mm)."""

    outer_d: float = Field(..., ge=6.0, le=120.0, description="Aussen-⌀ (Aufnahme)")
    inner_d: float = Field(..., ge=2.0, le=110.0, description="Innen-⌀ (Gegenstück)")
    height: float = Field(default=20.0, ge=5.0, le=120.0, description="Hülsenlänge")
    collar: bool = Field(default=False, description="Anschlagbund am oberen Ende")
    fit_outer: FitClass = Field(default=FitClass.SNUG, description="Passung aussen (Zapfen)")
    fit_inner: FitClass = Field(default=FitClass.SNUG, description="Passung innen (Bohrung)")

    @model_validator(mode="after")
    def _check_wall(self) -> "AdapterRingParams":
        if self.outer_d - self.inner_d < MIN_DIAMETER_GAP_MM:
            raise ValueError(
                f"outer_d ({self.outer_d}) muss ≥ inner_d + {MIN_DIAMETER_GAP_MM} "
                f"({self.inner_d + MIN_DIAMETER_GAP_MM}) sein – Ringwand zu dünn."
            )
        return self


def build(params: AdapterRingParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()

    h = params.height
    d_out = effective_dim(params.outer_d, FeatureType.SHAFT, params.fit_outer, profile)
    d_in = effective_dim(params.inner_d, FeatureType.HOLE, params.fit_inner, profile)

    body = Cylinder(d_out / 2, h)
    if params.collar:
        body += Pos(0, 0, h / 2 - COLLAR_T_MM / 2) * Cylinder(
            d_out / 2 + COLLAR_LIP_MM, COLLAR_T_MM
        )
    body -= Cylinder(d_in / 2, h + 2)

    return Part() + body if not isinstance(body, Part) else body


def dimensions(
    params: AdapterRingParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    r_o = effective_dim(params.outer_d, FeatureType.SHAFT, params.fit_outer, profile) / 2
    r_i = effective_dim(params.inner_d, FeatureType.HOLE, params.fit_inner, profile) / 2
    h2 = params.height / 2
    return [
        # Aussen-⌀ unten (bundfrei), Innen-⌀ oben an der Öffnung.
        DimensionSpec(
            param="outer_d", kind="diameter",
            p1=(-r_o, 0, -h2), p2=(r_o, 0, -h2), offset_dir=(0, 0, -1),
        ),
        DimensionSpec(
            param="inner_d", kind="diameter",
            p1=(-r_i, 0, h2), p2=(r_i, 0, h2), offset_dir=(0, 0, 1),
        ),
        DimensionSpec(
            param="height",
            p1=(r_o, 0, -h2), p2=(r_o, 0, h2), offset_dir=(1, 0, 0),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="adapter_ring",
        params_model=AdapterRingParams,
        build=build,
        dimensions=dimensions,
        title_de="Adapterring / Reduzierhülse",
        description_de="Hülse: aussen in die Aufnahme, innen fürs Gegenstück.",
        print_rec={
            "material": "PETG (zäh, leicht nachgiebig beim Einstecken)",
            "orientation_de": "Stehend drucken (Achse vertikal) – beide Durchmesser bleiben rund.",
            "infill": "Dünnwandig: 4 Perimeter, Infill unkritisch",
        },
    )
)
