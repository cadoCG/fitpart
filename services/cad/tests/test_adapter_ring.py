"""Tests des Archetyps `adapter_ring` (Reduzierhülse)."""

from __future__ import annotations

import math

import pytest
from pydantic import ValidationError

from app.templates.adapter_ring import AdapterRingParams, build, dimensions
from app.tolerance import ToleranceProfile
from app.validate import validate_part


def _params(**overrides) -> AdapterRingParams:
    base = dict(outer_d=32.0, inner_d=25.0)
    base.update(overrides)
    return AdapterRingParams(**base)


def test_build_is_manifold():
    result = validate_part(build(_params()))
    assert result.passed, result.errors
    assert result.is_manifold


def test_volume_analytic():
    """Reiner Rohrquerschnitt – Volumen exakt nachrechenbar."""
    p = _params(height=20.0)
    d_out = 32.0 - 0.15  # SHAFT schrumpft (snug)
    d_in = 25.0 + 0.15   # HOLE wächst (snug)
    expected = math.pi * ((d_out / 2) ** 2 - (d_in / 2) ** 2) * p.height
    assert build(p).volume == pytest.approx(expected, rel=1e-3)


def test_collar_adds_material():
    assert build(_params(collar=True)).volume > build(_params(collar=False)).volume


def test_independent_fits():
    """Aussen- und Innen-Passung wirken unabhängig in die richtige Richtung."""
    base = build(_params())
    looser_outer = build(_params(fit_outer="loose"))   # Zapfen schrumpft
    looser_inner = build(_params(fit_inner="loose"))   # Bohrung wächst
    assert looser_outer.volume < base.volume
    assert looser_inner.volume < base.volume
    press_inner = build(_params(fit_inner="press"))    # engere Bohrung
    assert press_inner.volume > base.volume


def test_calibrated_profile_manifold():
    profile = ToleranceProfile(
        hole_offset_mm=0.15, shaft_offset_mm=0.1, calibrated=True
    )
    assert validate_part(build(_params(collar=True), profile)).passed


def test_dimensions_cover_critical_dims():
    params = {d.param for d in dimensions(_params())}
    assert {"outer_d", "inner_d", "height"} <= params


def test_thin_wall_rejected():
    with pytest.raises(ValidationError):
        _params(outer_d=28.0, inner_d=25.0)
