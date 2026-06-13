"""Tests des Archetyps `furniture_glide` (Möbelgleiter/Fusskappe)."""

from __future__ import annotations

import math

import pytest

from app.templates.furniture_glide import FurnitureGlideParams, build
from app.tolerance import ToleranceProfile
from app.validate import validate_part


def _p(**ov) -> FurnitureGlideParams:
    base = dict(leg_w=22.0)
    base.update(ov)
    return FurnitureGlideParams(**base)


@pytest.mark.parametrize("shape", ["round", "square"])
@pytest.mark.parametrize("mount", ["outer", "inner"])
def test_manifold_all_modes(shape, mount):
    assert validate_part(build(_p(shape=shape, mount=mount))).passed


def test_outer_round_volume_analytic():
    p = _p(shape="round", mount="outer", wall=2.4, height=18.0)
    leg = 22.0 + 0.15  # snug HOLE
    r_o = leg / 2 + 2.4
    expected = math.pi * r_o**2 * 18.0 - math.pi * (leg / 2) ** 2 * (18.0 - 2.4)
    assert build(p).volume == pytest.approx(expected, rel=1e-3)


def test_outer_looser_fit_bigger():
    # Kavität und Aussenwand wachsen mit der Passung mit.
    snug = build(_p(mount="outer", fit="snug"))
    loose = build(_p(mount="outer", fit="loose"))
    assert loose.bounding_box().size.X > snug.bounding_box().size.X


def test_inner_looser_fit_less_material():
    snug = build(_p(mount="inner", fit="snug"))
    loose = build(_p(mount="inner", fit="loose"))
    assert loose.volume < snug.volume  # dünnerer Zapfen


def test_square_more_than_round():
    assert build(_p(shape="square")).volume > build(_p(shape="round")).volume


def test_calibrated_manifold():
    prof = ToleranceProfile(hole_offset_mm=0.15, shaft_offset_mm=0.1, calibrated=True)
    assert validate_part(build(_p(mount="inner"), prof)).passed
