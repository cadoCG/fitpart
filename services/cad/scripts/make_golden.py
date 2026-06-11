"""Regeneriert die goldenen Referenzen (JSON-Properties + STL) aller Archetypen.

Nur bewusst ausführen, wenn sich eine Template-Geometrie absichtlich ändert:
    .venv/bin/python scripts/make_golden.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.export import ExportFormat, export_part  # noqa: E402
from app.templates.base import REGISTRY  # noqa: E402
from tests.conftest import GOLDEN_DIR, part_properties  # noqa: E402

# Referenz-Parameter pro Archetyp (entsprechen den UI-Defaults).
GOLDEN_PARAMS: dict[str, dict] = {
    "spacer": {"inner_d": 5.0, "outer_d": 10.0, "height": 8.0, "fit": "sliding"},
    "wall_hook": {"hook_depth": 8.0, "width": 20.0, "back_height": 50.0},
    "l_bracket": {"leg_a": 60.0, "leg_b": 60.0, "width": 25.0},
    "pipe_clip": {"pipe_d": 20.0},
    "cable_clip": {"cable_d": 6.0, "channels": 2},
    "device_holder": {"device_w": 70.0, "device_d": 12.0},
    # Coupon-Golden ohne Beschriftung → schriftart-unabhängig deterministisch.
    "calibration_coupon": {"labels": False},
}


def main() -> None:
    GOLDEN_DIR.mkdir(exist_ok=True)
    for archetype, raw in GOLDEN_PARAMS.items():
        template = REGISTRY[archetype]
        params = template.validate_params(raw)
        part = template.build(params, None)
        golden = {"params": raw, "properties": part_properties(part)}
        (GOLDEN_DIR / f"{archetype}.json").write_text(
            json.dumps(golden, indent=2) + "\n"
        )
        (GOLDEN_DIR / f"{archetype}.stl").write_bytes(
            export_part(part, ExportFormat.STL)
        )
        print(f"{archetype:14s} {golden['properties']}")


if __name__ == "__main__":
    main()
