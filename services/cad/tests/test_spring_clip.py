"""Tests des Archetyps `spring_clip` (Halteklammer/Federclip)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.templates.spring_clip import SpringClipParams, build, dimensions
from app.tolerance import ToleranceProfile
from app.validate import validate_part


def _p(**ov) -> SpringClipParams:
    base = dict(grip_d=12.0)
    base.update(ov)
    return SpringClipParams(**base)


def test_manifold():
    r = validate_part(build(_p()))
    assert r.passed and r.is_manifold


def test_fit_changes_bore():
    # Lockerere Passung → grössere Bohrung → grösserer Aussenring → grössere
    # Bounding-Box in y (r_o = r_i + thickness).
    press = build(_p(fit="press"))
    loose = build(_p(fit="loose"))
    assert loose.bounding_box().size.Y > press.bounding_box().size.Y


def test_narrow_mouth_rejected():
    with pytest.raises(ValidationError):
        _p(grip_d=3.0, opening=0.3)  # opening×grip_d < 1 mm


def test_wider_clip_more_material():
    assert build(_p(width=30)).volume > build(_p(width=10)).volume


def test_calibrated_manifold():
    prof = ToleranceProfile(hole_offset_mm=0.15, calibrated=True)
    assert validate_part(build(_p(), prof)).passed


def test_dims_cover_grip():
    assert "grip_d" in {d.param for d in dimensions(_p())}
