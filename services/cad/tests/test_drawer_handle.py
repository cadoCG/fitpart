"""Tests des Archetyps `drawer_handle` (Schubladengriff)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.templates.drawer_handle import DrawerHandleParams, build, dimensions
from app.tolerance import ToleranceProfile
from app.validate import validate_part


def _p(**ov) -> DrawerHandleParams:
    base = dict(hole_spacing=96.0)
    base.update(ov)
    return DrawerHandleParams(**base)


def test_manifold():
    assert validate_part(build(_p())).passed


def test_wider_spacing_more_material():
    # Längere Griffstange (hole_spacing + 2×overhang).
    assert build(_p(hole_spacing=160)).volume > build(_p(hole_spacing=96)).volume


def test_thin_grip_rejected():
    with pytest.raises(ValidationError):
        _p(grip_d=8.0, screw_d=6.0)  # grip_d < screw_d + 3,2


def test_calibrated_manifold():
    prof = ToleranceProfile(hole_offset_mm=0.15, calibrated=True)
    assert validate_part(build(_p(), prof)).passed


def test_dims_cover_spacing():
    assert "hole_spacing" in {d.param for d in dimensions(_p())}


def test_holes_present():
    # Mit Schraublöchern weniger Volumen als ein massiver Vergleichskörper:
    solid_proxy = build(_p(screw_d=3.0))
    drilled = build(_p(screw_d=6.0))
    assert drilled.volume < solid_proxy.volume
