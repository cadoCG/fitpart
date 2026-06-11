"""Archetyp `calibration_coupon` – Kalibrier-Coupon (Briefing 7.1).

Ein druckbares Testteil mit drei Leitern (Loch / Zapfen / Nut), das der Nutzer
einmalig druckt, um das Schrumpf-/Toleranzverhalten seines Druckers + Materials
zu vermessen. Ergebnis fliesst über calibration.compute_profile in das
ToleranceProfile.

WICHTIG: Der Coupon druckt bewusst auf NENNMASS – hier wird KEINE Toleranz
angewandt (es ist die Messreferenz selbst). `build` ignoriert `profile`.

Layout (Draufsicht): Grundplatte in XY, Features in drei Reihen entlang y,
Stufen entlang x. Masszahlen werden eingraviert (defensive: fällt eine
Schriftart aus, wird ohne Beschriftung weitergebaut).
"""

from __future__ import annotations

from build123d import Box, Cylinder, Part, Pos, Rot, Text, extrude
from pydantic import BaseModel, Field

from ..calibration import (
    HOLE_LADDER_MM,
    REFERENCE_PIN_MM,
    REFERENCE_TAB_MM,
    SHAFT_LADDER_MM,
    SLOT_LADDER_MM,
)
from ..tolerance import ToleranceProfile
from .base import Template, register


class CalibrationCouponParams(BaseModel):
    """Parameter des Kalibrier-Coupons (Geometrie ist weitgehend fixiert)."""

    plate_thickness: float = Field(default=3.0, ge=2.0, le=6.0, description="Plattendicke")
    peg_height: float = Field(default=6.0, ge=3.0, le=12.0, description="Höhe der Zapfen")
    col_pitch: float = Field(default=8.5, ge=7.0, le=12.0, description="Spaltenabstand")
    labels: bool = Field(default=True, description="Masszahlen eingravieren")
    nozzle_mm: float = Field(default=0.4, gt=0, description="Düse (Stegbreiten-Proxy)")


def _label(value: float, size: float = 3.0):
    """Eingraviertes/embossiertes Textplättchen (0,6 mm), zentriert in XY."""
    text = f"{value:g}"
    return extrude(Text(text, font_size=size), amount=0.6)


def build(params: CalibrationCouponParams, profile: ToleranceProfile | None = None) -> Part:
    t = params.plate_thickness
    pitch = params.col_pitch
    margin = 5.0
    row_gap = 13.0

    ncols = len(HOLE_LADDER_MM)  # breiteste Reihe bestimmt die Plattenlänge
    plate_len = 2 * margin + (ncols - 1) * pitch + max(HOLE_LADDER_MM)
    plate_wid = 2 * margin + 2 * row_gap + 8.0

    # Reihen-y (Plattenursprung in der Ecke): Loch, Zapfen, Nut.
    y_hole = margin + 4.0
    y_shaft = y_hole + row_gap
    y_slot = y_shaft + row_gap

    plate = Pos(plate_len / 2, plate_wid / 2, t / 2) * Box(plate_len, plate_wid, t)
    body = plate
    labels: list = []

    def col_x(i: int) -> float:
        return margin + max(HOLE_LADDER_MM) / 2 + i * pitch

    # --- Loch-Leiter: Durchgangsbohrungen auf Nennmass ---
    for i, d in enumerate(HOLE_LADDER_MM):
        body -= Pos(col_x(i), y_hole, t / 2) * Cylinder(d / 2, t + 2)
        if params.labels:
            labels.append(Pos(col_x(i), y_hole - 5.5, t) * _label(d))

    # --- Zapfen-Leiter: stehende Zapfen + 5,00-mm-Referenzbohrung ---
    for i, d in enumerate(SHAFT_LADDER_MM):
        body += Pos(col_x(i), y_shaft, t + params.peg_height / 2) * Cylinder(d / 2, params.peg_height)
        if params.labels:
            labels.append(Pos(col_x(i), y_shaft - 5.5, t) * _label(d))
    ref_i = len(SHAFT_LADDER_MM)
    body -= Pos(col_x(ref_i), y_shaft, t / 2) * Cylinder(REFERENCE_PIN_MM / 2, t + 2)
    if params.labels:
        labels.append(Pos(col_x(ref_i), y_shaft - 5.5, t) * _label(REFERENCE_PIN_MM))

    # --- Nut-Leiter: Durchgangsschlitze + 2,00-mm-Referenzsteg ---
    slot_len = 7.0
    for i, w in enumerate(SLOT_LADDER_MM):
        body -= Pos(col_x(i), y_slot, t / 2) * Box(w, slot_len, t + 2)
        if params.labels:
            labels.append(Pos(col_x(i), y_slot - 5.5, t) * _label(w))
    # Referenzsteg: stehende 2,00-mm-Wand zum Einpassen der Nuten.
    steg_i = len(SLOT_LADDER_MM)
    body += Pos(col_x(steg_i), y_slot, t + params.peg_height / 2) * Box(
        REFERENCE_TAB_MM, slot_len, params.peg_height
    )
    if params.labels:
        labels.append(Pos(col_x(steg_i), y_slot - 5.5, t) * _label(REFERENCE_TAB_MM))

    if params.labels and labels:
        try:
            engraved = labels[0]
            for lbl in labels[1:]:
                engraved += lbl
            body += engraved  # embossiert (steht 0,6 mm über der Platte)
        except Exception:  # pragma: no cover - Schriftart-Ausfall tolerieren
            pass

    return body


TEMPLATE = register(
    Template(
        archetype="calibration_coupon",
        params_model=CalibrationCouponParams,
        build=build,
        title_de="Kalibrier-Coupon",
        description_de="Loch-/Zapfen-/Nut-Leiter zum Vermessen des Druckers.",
        print_rec={
            "material": "Gleiches Material wie die späteren Teile – das Profil gilt pro Drucker + Material.",
            "orientation_de": "Flach aufs Bett, 0,2-mm-Schichten, keine Stützen.",
            "infill": "Slicer-Default",
        },
    )
)
