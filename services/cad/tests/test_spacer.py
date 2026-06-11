"""Tests des Archetyps `spacer` inkl. golden-Vergleich."""

from __future__ import annotations

import json
import math

import pytest
from pydantic import ValidationError

from app.templates.spacer import SpacerParams, build
from app.tolerance import FitClass, ToleranceProfile
from app.validate import validate_part
from conftest import GOLDEN_DIR, assert_close, part_properties


def test_params_reject_thin_wall():
    with pytest.raises(ValidationError):
        SpacerParams(inner_d=5.0, outer_d=6.0, height=8.0)  # 6 <= 5 + 1.6


def test_params_reject_out_of_range():
    with pytest.raises(ValidationError):
        SpacerParams(inner_d=0.5, outer_d=10.0, height=8.0)  # inner_d <= 1
    with pytest.raises(ValidationError):
        SpacerParams(inner_d=5.0, outer_d=10.0, height=0.0)  # height <= 0.4


def test_build_volume_matches_analytic():
    # Ohne Toleranz-Offset entspricht das Volumen dem Hohlzylinder über das
    # effektive (sliding) Bohrungsmass.
    params = SpacerParams(inner_d=5.0, outer_d=10.0, height=8.0, fit=FitClass.SLIDING)
    part = build(params)
    bore_d = 5.0 + 0.25  # sliding clearance
    expected = math.pi * ((params.outer_d / 2) ** 2 - (bore_d / 2) ** 2) * params.height
    assert part.volume == pytest.approx(expected, rel=1e-3)


def test_build_is_manifold():
    params = SpacerParams(inner_d=5.0, outer_d=10.0, height=8.0)
    result = validate_part(build(params), min_wall_mm=0.8)
    assert result.passed
    assert result.is_manifold
    assert result.genus == 1  # Hohlzylinder = ein Durchgangsloch


def test_tolerance_changes_bore():
    base = build(SpacerParams(inner_d=5.0, outer_d=10.0, height=8.0))
    bigger_offset = build(
        SpacerParams(inner_d=5.0, outer_d=10.0, height=8.0),
        ToleranceProfile(hole_offset_mm=0.3),
    )
    # Grössere Bohrung → weniger Material → kleineres Volumen.
    assert bigger_offset.volume < base.volume


def test_golden_spacer():
    golden = json.loads((GOLDEN_DIR / "spacer.json").read_text())
    params = SpacerParams(**golden["params"])
    props = part_properties(build(params))
    assert_close(props, golden["properties"])
