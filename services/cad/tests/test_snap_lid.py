"""Tests des Archetyps `snap_lid` (Schnappdeckel)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.templates.snap_lid import SnapLidParams, build, dimensions
from app.tolerance import ToleranceProfile
from app.validate import validate_part


def _p(**ov) -> SnapLidParams:
    base = dict(rim_d=60.0)
    base.update(ov)
    return SnapLidParams(**base)


def test_manifold():
    r = validate_part(build(_p()))
    assert r.passed and r.is_manifold


def test_looser_fit_bigger_skirt():
    # Innen-⌀ und Aussenrand (r_out = r_in + wall) wachsen mit der Passung.
    assert build(_p(fit="loose")).bounding_box().size.X > build(_p(fit="snug")).bounding_box().size.X


def test_bigger_rim_more_material():
    assert build(_p(rim_d=120)).volume > build(_p(rim_d=60)).volume


def test_calibrated_manifold():
    prof = ToleranceProfile(hole_offset_mm=0.2, calibrated=True)
    assert validate_part(build(_p(), prof)).passed


def test_dims_cover_rim():
    assert "rim_d" in {d.param for d in dimensions(_p())}


def test_wall_below_minimum_rejected():
    with pytest.raises(ValidationError):
        _p(wall=1.0)  # wall ge 1.6
