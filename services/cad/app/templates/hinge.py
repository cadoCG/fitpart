"""Archetyp `hinge` – Filament-Pin-Scharnier.

Briefing 6, Phase 2, #10. Zwei flache Blätter mit alternierenden Knöcheln
auf gemeinsamer Achse; ein durchgesteckter Stift (abgelängtes Filament oder
ein Rundstab) hält sie zusammen. Gedruckt wird flach (beide Blätter in einer
Ebene); der Stift wird nach dem Druck eingeschoben.

Modell: zwei **getrennte** Solids (Blatt A / Blatt B). Sie berühren sich
nirgends – überall bleibt radiale (cl_rad) bzw. axiale (cl_ax) Luft, damit
das Scharnier dreht und die Geometrie sauber manifold bleibt. Die
Stiftbohrung läuft als BOHRUNG (HOLE, default sliding) durch die
Toleranz-Engine.

Koordinaten: Stiftachse = x (zentriert), Blattebene = z≈0, Blatt A nach +y,
Blatt B nach -y.
"""

from __future__ import annotations

from build123d import Box, Cylinder, Part, Pos, Rot
from pydantic import BaseModel, Field, model_validator

from ..dimensions import DimensionSpec
from ..tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim
from .base import Template, register

# Bewegungsspalte zwischen den beiden Blättern.
CL_RAD_MM = 0.5  # radial (Knöchel des einen ↔ Blatt des anderen)
CL_AX_MM = 0.4   # axial (benachbarte Knöchel entlang der Achse)


class HingeParams(BaseModel):
    """Parameter Scharnier (alle Masse in mm)."""

    length: float = Field(..., ge=20.0, le=200.0, description="Scharnierlänge entlang der Achse")
    leaf_w: float = Field(default=15.0, ge=8.0, le=80.0, description="Blattbreite ab der Achse")
    thickness: float = Field(default=2.5, ge=1.6, le=6.0, description="Blattdicke / Knöchelwand")
    pin_d: float = Field(..., ge=2.0, le=8.0, description="Stift-/Pin-⌀")
    knuckles: int = Field(default=5, ge=3, le=9, description="Anzahl Knöchel (ungerade)")
    screw_d: float = Field(default=3.0, ge=2.0, le=6.0, description="Schrauben-⌀ je Blatt")
    fit: FitClass = Field(default=FitClass.SLIDING, description="Passung des Stifts (muss drehen)")

    @model_validator(mode="after")
    def _check(self) -> "HingeParams":
        if self.knuckles % 2 == 0:
            raise ValueError("knuckles muss ungerade sein (Blatt A trägt das erste und letzte).")
        seg = self.length / self.knuckles
        if seg - CL_AX_MM < self.thickness:
            raise ValueError("Zu viele Knöchel für die Länge (Segment < Blattdicke).")
        if self.leaf_w <= CL_RAD_MM + 2 * self.screw_d:
            raise ValueError("leaf_w zu schmal für Schraubloch + Bewegungsspalt.")
        return self


def build(params: HingeParams, profile: ToleranceProfile | None = None) -> Part:
    profile = profile or ToleranceProfile()
    L = params.length
    t = params.thickness
    n = params.knuckles
    leaf_w = params.leaf_w

    pin_eff = effective_dim(params.pin_d, FeatureType.HOLE, params.fit, profile)
    r_knuckle = pin_eff / 2 + t  # Knöchelwand = Blattdicke
    seg = L / n
    knuckle_len = seg - CL_AX_MM
    g = CL_RAD_MM  # Plattenspalt an der Achse (y=0)

    screw_eff = effective_dim(params.screw_d, FeatureType.HOLE, FitClass.LOOSE, profile)
    y_screw = r_knuckle + 0.6 * leaf_w
    pin_hole = Rot(Y=90) * Cylinder(pin_eff / 2, L + 0.2)

    def leaf(sign: int, knuckle_even: bool) -> Part:
        """Ein fertig gebohrtes Blatt (eigene Stift- und Schraublöcher).
        sign=+1 → Blatt A (+y, gerade Knöchel), sign=-1 → Blatt B (-y)."""
        # Durchgehende Platte auf der eigenen Seite, mit Spalt g an der Achse.
        y_lo, y_hi = g, r_knuckle + leaf_w
        plate = Pos(0, sign * (y_lo + y_hi) / 2, 0) * Box(L, y_hi - y_lo, t)
        part = Part() + plate

        for i in range(n):
            is_even = i % 2 == 0
            cx = -L / 2 + seg * (i + 0.5)
            if is_even == knuckle_even:
                # Eigener Knöckel: voller Zylinder um die Achse.
                part += Pos(cx, 0, 0) * Rot(Y=90) * Cylinder(r_knuckle, knuckle_len)
            else:
                # Fremder Knöckel: Platteninneres ausnehmen (Bewegungsfreiheit).
                notch = Box(seg, r_knuckle + g + 0.4, t + 0.4)
                part -= Pos(cx, sign * (r_knuckle + g + 0.4) / 2 - sign * 0.2, 0) * notch

        # Bohrungen pro Blatt setzen, solange es ein einzelner Solid ist –
        # ein Cut über den disjunkten Verbund liefert sonst eine ShapeList.
        part -= pin_hole
        for sx in (-1, 1):
            part -= Pos(sx * L * 0.28, sign * y_screw, 0) * Cylinder(screw_eff / 2, t + 0.4)
        return part

    leaf_a = leaf(+1, knuckle_even=True)
    leaf_b = leaf(-1, knuckle_even=False)
    return Part() + leaf_a + leaf_b


def dimensions(
    params: HingeParams, profile: ToleranceProfile | None = None
) -> list[DimensionSpec]:
    """Bemassungs-Anker (gleiche effektive Masse wie build())."""
    L = params.length
    pin_eff = effective_dim(params.pin_d, FeatureType.HOLE, params.fit, profile)
    r_knuckle = pin_eff / 2 + params.thickness
    y_edge = r_knuckle + params.leaf_w
    return [
        DimensionSpec(
            param="length",
            p1=(-L / 2, y_edge, 0), p2=(L / 2, y_edge, 0), offset_dir=(0, 1, 0),
        ),
        DimensionSpec(
            param="leaf_w",
            p1=(L / 2, r_knuckle, 0), p2=(L / 2, y_edge, 0), offset_dir=(1, 0, 0),
        ),
        # Stift-⌀ an der Stirnseite (Bohrungsöffnung).
        DimensionSpec(
            param="pin_d", kind="diameter",
            p1=(-L / 2, -pin_eff / 2, 0), p2=(-L / 2, pin_eff / 2, 0),
            offset_dir=(-1, 0, 0),
        ),
    ]


TEMPLATE = register(
    Template(
        archetype="hinge",
        params_model=HingeParams,
        build=build,
        dimensions=dimensions,
        title_de="Scharnier (Filament-Pin)",
        description_de="Zwei Blätter mit alternierenden Knöcheln; Stift wird eingeschoben.",
        print_rec={
            "material": "PETG (zäh, gute Gleitpaarung); Stift aus Filament/Rundstab",
            "orientation_de": "Flach drucken, beide Blätter offen in einer Ebene – Knöchel ohne Stützen.",
            "infill": "40–60 %, 3 Perimeter",
        },
    )
)
