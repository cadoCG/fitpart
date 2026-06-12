"""Bemassungs-Anker für die 3D-Vorschau (Phase 2 der Modell-Bemassung).

Jedes Template kann eine `dimensions(params, profile)`-Funktion registrieren,
die pro editierbarem Parameter einen Anker liefert: die gemessene Strecke
(p1→p2, direkt auf der Geometrie) plus die Richtung, in der die Masslinie
nach aussen versetzt wird. Das Frontend zeichnet daraus Masslinie, Hilfs-
linien und ein Eingabefeld am Modell.

Die Anker rechnen mit denselben effektiven (toleranzierten) Massen wie
build(), damit sie exakt auf den Mesh-Flächen sitzen; angezeigt und editiert
wird im Frontend immer das Nennmass. Damit bleibt die Geometrie-Hoheit beim
Template (Eiserne Regel 1) – das Frontend kennt keine Bauteil-Mathematik.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

Vec3 = tuple[float, float, float]


class DimensionSpec(BaseModel):
    """Ein bemassbarer Parameter am 3D-Modell (Koordinaten des Templates)."""

    param: str
    kind: Literal["linear", "diameter"] = "linear"
    p1: Vec3
    p2: Vec3
    offset_dir: Vec3
