"""Tests des Archetyps `hinge` (Filament-Pin-Scharnier)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.templates.hinge import HingeParams, build, dimensions
from app.tolerance import ToleranceProfile
from app.validate import validate_part


def _p(**ov) -> HingeParams:
    base = dict(length=40.0, pin_d=3.0)
    base.update(ov)
    return HingeParams(**base)


def test_manifold():
    r = validate_part(build(_p()))
    assert r.passed and r.is_manifold


def test_two_separate_leaves():
    # Zwei Blätter, nur über den (separaten) Stift verbunden → 2 disjunkte Solids.
    assert len(build(_p()).solids()) == 2


@pytest.mark.parametrize("knuckles", [3, 5, 7, 9])
def test_odd_knuckles_manifold(knuckles):
    assert validate_part(build(_p(knuckles=knuckles))).passed


def test_even_knuckles_rejected():
    with pytest.raises(ValidationError):
        _p(knuckles=4)


def test_looser_pin_bigger_knuckle():
    # Stiftbohrung und Knöchel (r = pin/2 + t) wachsen mit der Passung.
    assert build(_p(fit="loose")).bounding_box().size.Z > build(_p(fit="snug")).bounding_box().size.Z


def test_thin_leaf_rejected():
    with pytest.raises(ValidationError):
        _p(leaf_w=8.0, screw_d=6.0)  # leaf_w ≤ CL_RAD + 2×screw_d


def test_too_many_knuckles_rejected():
    with pytest.raises(ValidationError):
        _p(length=20.0, knuckles=9, thickness=4.0)  # Segment < Blattdicke


def test_calibrated_manifold():
    prof = ToleranceProfile(hole_offset_mm=0.15, calibrated=True)
    assert validate_part(build(_p(), prof)).passed


def test_dims_cover_critical():
    assert {"length", "pin_d"} <= {d.param for d in dimensions(_p())}
