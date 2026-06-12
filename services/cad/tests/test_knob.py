"""Tests des Archetyps `knob` (Drehknopf, D-Welle)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.templates.knob import KnobParams, build, dimensions
from app.tolerance import ToleranceProfile
from app.validate import validate_part


def _params(**overrides) -> KnobParams:
    base = dict(shaft_d=6.0, d_flat=4.5, knob_d=25.0)
    base.update(overrides)
    return KnobParams(**base)


def test_build_is_manifold():
    result = validate_part(build(_params()))
    assert result.passed, result.errors
    assert result.is_manifold


def test_flat_adds_material():
    """D-Abflachung lässt Material in der Bohrung stehen → mehr Volumen."""
    with_flat = build(_params(d_flat=4.5))
    round_bore = build(_params(d_flat=6.0))
    assert with_flat.volume > round_bore.volume


def test_round_bore_volume_analytic():
    """Ohne Abflachung und ohne Rillen ist das Volumen analytisch prüfbar."""
    import math

    p = _params(d_flat=6.0, ribs=0, height=15.0)
    part = build(p)
    d_eff = 6.0 + 0.15  # snug-Default
    expected = (
        math.pi * (p.knob_d / 2) ** 2 * p.height
        - math.pi * (d_eff / 2) ** 2 * (p.height - 3.0)
    )
    assert part.volume == pytest.approx(expected, rel=1e-3)


def test_more_ribs_less_volume():
    assert build(_params(ribs=24)).volume < build(_params(ribs=6)).volume


def test_loose_fit_bigger_bore():
    snug = build(_params(fit="snug"))
    loose = build(_params(fit="loose"))
    assert loose.volume < snug.volume


def test_calibrated_profile_manifold():
    profile = ToleranceProfile(hole_offset_mm=0.15, calibrated=True)
    assert validate_part(build(_params(), profile)).passed


def test_dimensions_cover_critical_dims():
    params = {d.param for d in dimensions(_params())}
    assert {"shaft_d", "knob_d", "height"} <= params


def test_invalid_flat_rejected():
    with pytest.raises(ValidationError):
        _params(d_flat=2.0)  # < 0,5×shaft_d
    with pytest.raises(ValidationError):
        _params(d_flat=7.0)  # > shaft_d


def test_thin_wall_rejected():
    with pytest.raises(ValidationError):
        _params(shaft_d=10.0, d_flat=8.0, knob_d=12.0)
