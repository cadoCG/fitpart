"""Pytest-Fixtures und Geometrie-Hilfsfunktionen."""

from __future__ import annotations

from pathlib import Path

from build123d import Part

GOLDEN_DIR = Path(__file__).parent / "golden"


def part_properties(part: Part) -> dict[str, float]:
    """Stabile geometrische Kennzahlen für golden-Vergleiche.

    Roh-STL-Bytes sind über Plattformen hinweg nicht bit-stabil; Volumen,
    Fläche und Bounding-Box sind es (im Rahmen einer Toleranz).
    """
    bb = part.bounding_box()
    return {
        "volume": round(part.volume, 3),
        "area": round(part.area, 3),
        "size_x": round(bb.size.X, 3),
        "size_y": round(bb.size.Y, 3),
        "size_z": round(bb.size.Z, 3),
    }


def assert_close(actual: dict, golden: dict, rel: float = 1e-3) -> None:
    for key, gold in golden.items():
        act = actual[key]
        tol = max(abs(gold) * rel, 1e-3)
        assert abs(act - gold) <= tol, f"{key}: {act} != {gold} (±{tol})"
