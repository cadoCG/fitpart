"""Tests der Bemassungs-Anker (dimensions() pro Template + /dimensions-API)."""

from __future__ import annotations

import math

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.templates.base import REGISTRY
from app.tolerance import FeatureType, FitClass, ToleranceProfile, effective_dim

client = TestClient(app)

# Referenz-Parameter (UI-Defaults, wie GOLDEN_PARAMS in make_golden.py).
DEFAULT_PARAMS: dict[str, dict] = {
    "spacer": {"inner_d": 5.0, "outer_d": 10.0, "height": 8.0},
    "wall_hook": {"hook_depth": 8.0, "width": 20.0, "back_height": 50.0},
    "l_bracket": {"leg_a": 60.0, "leg_b": 60.0, "width": 25.0},
    "pipe_clip": {"pipe_d": 20.0},
    "cable_clip": {"cable_d": 6.0, "channels": 2},
    "device_holder": {"device_w": 70.0, "device_d": 12.0},
}

DIMENSIONED = sorted(DEFAULT_PARAMS)


def _specs(archetype: str, profile: ToleranceProfile | None = None):
    template = REGISTRY[archetype]
    params = template.validate_params(DEFAULT_PARAMS[archetype])
    assert template.dimensions is not None
    return template.dimensions(params, profile), template


def _length(spec) -> float:
    return math.dist(spec.p1, spec.p2)


@pytest.mark.parametrize("archetype", DIMENSIONED)
def test_specs_are_wellformed(archetype: str):
    """Param existiert im Modell, Strecke > 0, Offset ⊥ Strecke und ≠ 0."""
    specs, template = _specs(archetype)
    assert specs, f"{archetype}: keine Anker"
    fields = set(template.params_model.model_fields)
    for s in specs:
        assert s.param in fields
        span = [b - a for a, b in zip(s.p1, s.p2)]
        assert _length(s) > 0
        assert math.hypot(*s.offset_dir) > 0
        dot = sum(d * o for d, o in zip(span, s.offset_dir))
        assert abs(dot) < 1e-9, f"{archetype}.{s.param}: Offset nicht senkrecht"


@pytest.mark.parametrize("archetype", DIMENSIONED)
def test_anchors_inside_bounding_box(archetype: str):
    """Anker liegen auf der Geometrie (innerhalb der Part-Bounding-Box)."""
    specs, template = _specs(archetype)
    params = template.params_model.model_validate(DEFAULT_PARAMS[archetype])
    bb = template.build(params, ToleranceProfile()).bounding_box()
    lo = (bb.min.X - 1e-6, bb.min.Y - 1e-6, bb.min.Z - 1e-6)
    hi = (bb.max.X + 1e-6, bb.max.Y + 1e-6, bb.max.Z + 1e-6)
    for s in specs:
        for p in (s.p1, s.p2):
            assert all(lo[i] <= p[i] <= hi[i] for i in range(3)), (
                f"{archetype}.{s.param}: {p} ausserhalb der Bounding-Box"
            )


def test_spot_values_match_effective_dims():
    """Streckenlängen entsprechen den effektiven Massen aus build()."""
    specs, _ = _specs("spacer")
    by = {s.param: s for s in specs}
    assert _length(by["height"]) == pytest.approx(8.0)
    assert _length(by["outer_d"]) == pytest.approx(10.0)
    assert _length(by["inner_d"]) == pytest.approx(
        effective_dim(5.0, FeatureType.HOLE, FitClass.SLIDING)
    )

    specs, _ = _specs("wall_hook")
    by = {s.param: s for s in specs}
    assert _length(by["hook_depth"]) == pytest.approx(
        effective_dim(8.0, FeatureType.SLOT, FitClass.SLIDING)
    )
    assert _length(by["back_height"]) == pytest.approx(50.0)

    specs, _ = _specs("device_holder")
    by = {s.param: s for s in specs}
    assert _length(by["device_w"]) == pytest.approx(
        effective_dim(70.0, FeatureType.SLOT, FitClass.SLIDING)
    )


def test_profile_offsets_shift_anchors():
    """Kalibrier-Offsets verschieben die Anker wie die Geometrie."""
    base, _ = _specs("spacer")
    offset, _ = _specs("spacer", ToleranceProfile(hole_offset_mm=0.3))
    by_b = {s.param: s for s in base}
    by_o = {s.param: s for s in offset}
    assert _length(by_o["inner_d"]) == pytest.approx(_length(by_b["inner_d"]) + 0.3)
    assert _length(by_o["outer_d"]) == pytest.approx(_length(by_b["outer_d"]))


def test_api_dimensions_spacer():
    r = client.post(
        "/dimensions",
        json={"archetype": "spacer", "params": DEFAULT_PARAMS["spacer"]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["archetype"] == "spacer"
    assert {d["param"] for d in body["dims"]} == {"inner_d", "outer_d", "height"}
    assert all(len(d["p1"]) == 3 and len(d["offset_dir"]) == 3 for d in body["dims"])


def test_api_dimensions_coupon_empty():
    """Coupon hat keine dimensions() → leere Liste, kein Fehler."""
    r = client.post(
        "/dimensions",
        json={"archetype": "calibration_coupon", "params": {"labels": False}},
    )
    assert r.status_code == 200
    assert r.json()["dims"] == []


def test_api_dimensions_unknown_archetype():
    r = client.post("/dimensions", json={"archetype": "nope", "params": {}})
    assert r.status_code == 404


def test_api_dimensions_invalid_params():
    r = client.post(
        "/dimensions",
        json={"archetype": "spacer", "params": {"inner_d": 5.0, "outer_d": 6.0, "height": 8.0}},
    )
    assert r.status_code == 422
