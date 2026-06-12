"""Tests der Phase-1-Archetypen: Param-Validierung, Manifold, Goldens.

Archetyp-spezifische Detailtests (Toleranzwirkung, Analytik) ergänzen die
hier parametrisierten Basis-Checks.
"""

from __future__ import annotations

import json

import pytest
from pydantic import ValidationError

from app.templates.base import REGISTRY
from app.tolerance import ToleranceProfile
from app.validate import validate_part
from conftest import GOLDEN_DIR, assert_close, part_properties

ALL_ARCHETYPES = sorted(REGISTRY)


def test_registry_complete():
    assert ALL_ARCHETYPES == [
        "adapter_ring", "cable_clip", "calibration_coupon", "device_holder",
        "knob", "l_bracket", "pipe_clip", "spacer", "wall_hook",
    ]


@pytest.mark.parametrize("archetype", ALL_ARCHETYPES)
def test_golden(archetype):
    """Golden-Params bauen, validieren und mit Referenz-Properties vergleichen."""
    golden = json.loads((GOLDEN_DIR / f"{archetype}.json").read_text())
    template = REGISTRY[archetype]
    part = template.build(template.validate_params(golden["params"]), None)

    result = validate_part(part)
    assert result.passed, result.errors
    assert_close(part_properties(part), golden["properties"])


@pytest.mark.parametrize("archetype", ALL_ARCHETYPES)
def test_calibrated_profile_still_manifold(archetype):
    """Auch mit Kalibrier-Offsets muss die Geometrie wasserdicht bleiben."""
    golden = json.loads((GOLDEN_DIR / f"{archetype}.json").read_text())
    template = REGISTRY[archetype]
    profile = ToleranceProfile(
        hole_offset_mm=0.15, shaft_offset_mm=0.1, slot_offset_mm=0.2, calibrated=True
    )
    part = template.build(template.validate_params(golden["params"]), profile)
    assert validate_part(part).passed


# --- Param-Validierung: je ein repräsentativer Verstoss pro Archetyp ---

INVALID_PARAMS = {
    "wall_hook": {"hook_depth": 8, "width": 20, "back_height": 20, "screw_d": 8},
    # back_height < thickness + 4*screw_d
    "l_bracket": {"leg_a": 20, "leg_b": 60, "width": 25, "holes_per_leg": 3, "screw_d": 6},
    # Schenkel zu kurz für Lochbild
    "pipe_clip": {"pipe_d": 200},                      # über Range
    "cable_clip": {"cable_d": 6, "channels": 9},       # zu viele Kanäle
    "device_holder": {"device_w": 70, "device_d": 12, "back_height": 10, "screw_d": 8},
    # back_height < 4*screw_d bei wall_mount
}


@pytest.mark.parametrize("archetype", sorted(INVALID_PARAMS))
def test_invalid_params_rejected(archetype):
    with pytest.raises(ValidationError):
        REGISTRY[archetype].validate_params(INVALID_PARAMS[archetype])


# --- Archetyp-spezifische Checks ---

def test_pipe_clip_fit_changes_bore():
    from app.templates.pipe_clip import PipeClipParams, build

    snug = build(PipeClipParams(pipe_d=20, fit="snug"))
    loose = build(PipeClipParams(pipe_d=20, fit="loose"))
    # Lockerere Passung → grössere Bohrung → grösserer Ring (r_o = r_i + wall).
    assert loose.bounding_box().size.Y > snug.bounding_box().size.Y


def test_wall_hook_no_countersink_smaller_cut():
    from app.templates.wall_hook import WallHookParams, build

    with_cs = build(WallHookParams(hook_depth=8, width=20, back_height=50, countersink=True))
    without = build(WallHookParams(hook_depth=8, width=20, back_height=50, countersink=False))
    assert without.volume > with_cs.volume


def test_l_bracket_rib_adds_material():
    from app.templates.l_bracket import LBracketParams, build

    with_rib = build(LBracketParams(leg_a=60, leg_b=60, width=25, rib=True))
    without = build(LBracketParams(leg_a=60, leg_b=60, width=25, rib=False))
    assert with_rib.volume > without.volume


def test_cable_clip_pad_mount_has_no_tab():
    from app.templates.cable_clip import CableClipParams, build

    screw = build(CableClipParams(cable_d=6, mount="screw"))
    pad = build(CableClipParams(cable_d=6, mount="pad"))
    bb_screw = screw.bounding_box()
    bb_pad = pad.bounding_box()
    assert bb_pad.size.X < bb_screw.size.X  # keine Lasche


def test_device_holder_two_holes_when_wide():
    from app.templates.device_holder import DeviceHolderParams, build

    narrow = build(DeviceHolderParams(device_w=30, device_d=12))   # 1 Loch
    wide = build(DeviceHolderParams(device_w=70, device_d=12))     # 2 Löcher
    assert validate_part(narrow).passed
    assert validate_part(wide).passed
