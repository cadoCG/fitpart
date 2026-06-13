"""Tests des Archetyps `end_cap` (Endkappe Rohr/Profil)."""

from __future__ import annotations

import math

import pytest

from app.templates.end_cap import EndCapParams, build, dimensions
from app.tolerance import ToleranceProfile
from app.validate import validate_part


def _p(**ov) -> EndCapParams:
    base = dict(outer_w=25.0)
    base.update(ov)
    return EndCapParams(**base)


@pytest.mark.parametrize("shape", ["round", "square", "rect"])
def test_manifold_all_shapes(shape):
    assert validate_part(build(_p(shape=shape))).passed


def test_round_volume_analytic():
    p = _p(shape="round", wall=2.0, depth=20.0)
    w = 25.0 + 0.15  # snug HOLE
    h = 20.0 + 2.0
    expected = math.pi * (w / 2 + 2.0) ** 2 * h - math.pi * (w / 2) ** 2 * 20.0
    assert build(p).volume == pytest.approx(expected, rel=1e-3)


def test_square_more_than_round():
    assert build(_p(shape="square")).volume > build(_p(shape="round")).volume


def test_looser_fit_bigger_cap():
    # Kavität UND Aussenwand (r_o = r_i + wall) wachsen mit der Passung.
    assert build(_p(fit="loose")).bounding_box().size.X > build(_p(fit="snug")).bounding_box().size.X


def test_calibrated_manifold():
    prof = ToleranceProfile(hole_offset_mm=0.15, calibrated=True)
    assert validate_part(build(_p(shape="rect", outer_d=18), prof)).passed


def test_dims_cover_outer_w():
    assert "outer_w" in {d.param for d in dimensions(_p())}
