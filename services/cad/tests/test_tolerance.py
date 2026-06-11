"""Tests der Toleranz-Engine."""

from __future__ import annotations

import pytest

from app.tolerance import (
    DEFAULT_CLEARANCE_MM,
    FeatureType,
    FitClass,
    ToleranceProfile,
    effective_dim,
)


def test_hole_grows_with_looser_fit():
    nominal = 5.0
    press = effective_dim(nominal, FeatureType.HOLE, FitClass.PRESS)
    loose = effective_dim(nominal, FeatureType.HOLE, FitClass.LOOSE)
    assert press == pytest.approx(5.05)
    assert loose == pytest.approx(5.40)
    assert loose > press > nominal


def test_shaft_shrinks_with_looser_fit():
    nominal = 5.0
    snug = effective_dim(nominal, FeatureType.SHAFT, FitClass.SNUG)
    loose = effective_dim(nominal, FeatureType.SHAFT, FitClass.LOOSE)
    assert snug == pytest.approx(4.85)
    assert loose == pytest.approx(4.60)
    assert loose < snug < nominal


def test_user_offset_applied_per_feature():
    profile = ToleranceProfile(hole_offset_mm=0.1, shaft_offset_mm=0.2)
    hole = effective_dim(5.0, FeatureType.HOLE, FitClass.SLIDING, profile)
    shaft = effective_dim(5.0, FeatureType.SHAFT, FitClass.SLIDING, profile)
    assert hole == pytest.approx(5.0 + 0.25 + 0.1)
    assert shaft == pytest.approx(5.0 - (0.25 + 0.2))


def test_all_fit_classes_have_clearance():
    assert set(DEFAULT_CLEARANCE_MM) == set(FitClass)
    assert all(c > 0 for c in DEFAULT_CLEARANCE_MM.values())
