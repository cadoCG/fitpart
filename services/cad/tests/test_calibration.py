"""Tests der Kalibrier-Engine und des Coupon-Templates."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.calibration import (
    REFERENCE_PIN_MM,
    REFERENCE_TAB_MM,
    CalibrationInput,
    compute_profile,
)
from app.templates.calibration_coupon import CalibrationCouponParams, build
from app.tolerance import FeatureType, FitClass, effective_dim
from app.validate import validate_part


def test_perfect_printer_has_zero_offsets():
    # Referenzmasse sitzen exakt auf ihren Nennstufen → keine Kompensation.
    profile = compute_profile(
        CalibrationInput(snug_hole_mm=5.0, snug_shaft_mm=5.0, snug_slot_mm=2.0)
    )
    assert profile.hole_offset_mm == 0.0
    assert profile.shaft_offset_mm == 0.0
    assert profile.slot_offset_mm == 0.0
    assert profile.calibrated is True


def test_undersized_holes_give_positive_hole_offset():
    # Bohrungen drucken zu klein → 5-mm-Stift passt erst in nominell 5,2-mm-Loch.
    profile = compute_profile(CalibrationInput(snug_hole_mm=5.2))
    assert profile.hole_offset_mm == pytest.approx(0.2)
    # Kompensation: gewünschte 5-mm-Bohrung wird grösser gedruckt.
    eff = effective_dim(5.0, FeatureType.HOLE, FitClass.PRESS, profile)
    assert eff > 5.0


def test_oversized_pegs_give_positive_shaft_offset():
    # Zapfen drucken zu gross → nominell 4,8-mm-Zapfen passt in 5-mm-Referenz.
    profile = compute_profile(CalibrationInput(snug_shaft_mm=4.8))
    assert profile.shaft_offset_mm == pytest.approx(0.2)
    # Kompensation: gewünschter 5-mm-Zapfen wird kleiner gedruckt.
    eff = effective_dim(5.0, FeatureType.SHAFT, FitClass.PRESS, profile)
    assert eff < 5.0


def test_slot_offset():
    profile = compute_profile(CalibrationInput(snug_slot_mm=2.4))
    assert profile.slot_offset_mm == pytest.approx(0.4)


def test_partial_calibration_keeps_others_zero():
    profile = compute_profile(CalibrationInput(snug_hole_mm=5.1))
    assert profile.hole_offset_mm == pytest.approx(0.1)
    assert profile.shaft_offset_mm == 0.0
    assert profile.slot_offset_mm == 0.0


def test_none_input_is_uncalibrated():
    profile = compute_profile(CalibrationInput())
    assert profile.calibrated is False
    assert (profile.hole_offset_mm, profile.shaft_offset_mm, profile.slot_offset_mm) == (0, 0, 0)


def test_off_ladder_value_rejected():
    with pytest.raises(ValidationError):
        CalibrationInput(snug_hole_mm=5.05)  # nicht auf der Loch-Leiter
    with pytest.raises(ValidationError):
        CalibrationInput(snug_shaft_mm=4.7)  # nicht auf der Zapfen-Leiter


def test_reference_constants():
    assert REFERENCE_PIN_MM == 5.0
    assert REFERENCE_TAB_MM == 2.0


def test_coupon_builds_manifold_with_and_without_labels():
    for labels in (False, True):
        result = validate_part(build(CalibrationCouponParams(labels=labels)))
        assert result.passed, result.errors
        # 7 Löcher + 1 Referenzbohrung + 3 Nuten = 11 Durchbrüche.
        assert result.genus == 11


def test_coupon_ignores_tolerance_profile():
    from app.tolerance import ToleranceProfile

    plain = build(CalibrationCouponParams(labels=False))
    with_profile = build(
        CalibrationCouponParams(labels=False),
        ToleranceProfile(hole_offset_mm=0.5, shaft_offset_mm=0.5, slot_offset_mm=0.5),
    )
    # Coupon ist die Messreferenz → Profil darf die Geometrie nicht verändern.
    assert plain.volume == pytest.approx(with_profile.volume)
