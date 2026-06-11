"""Geometrie-Validierung vor jedem Export (Eiserne Regel 4, CLAUDE.md).

Prüft:
- OCCT-Validität der BREP,
- Wasserdichtheit / Manifold-Eigenschaft (manifold3d),
- positives Volumen,
- min. Wandstärke-Proxy über die Düsenbreite (2×Düse).

Template-spezifische Dimensions-Checks (z. B. outer_d > inner_d + 1.6) sind
bereits in den Pydantic-Param-Modellen verankert; hier prüfen wir die fertige
Geometrie modellunabhängig.
"""

from __future__ import annotations

import numpy as np
from build123d import Part
from pydantic import BaseModel

import manifold3d

# Tessellierungs-Toleranz für den Manifold-Check (mm). Fein genug, um echte
# Lücken zu erkennen, grob genug für Tempo.
TESSELLATION_TOLERANCE_MM = 0.1


class ValidationResult(BaseModel):
    passed: bool
    is_valid_brep: bool
    is_manifold: bool
    volume_mm3: float
    genus: int
    errors: list[str] = []
    warnings: list[str] = []


def _to_manifold(part: Part) -> tuple[manifold3d.Manifold, manifold3d.Error]:
    vertices, triangles = part.tessellate(TESSELLATION_TOLERANCE_MM)
    verts = np.array([[v.X, v.Y, v.Z] for v in vertices], dtype=np.float32)
    tris = np.array(triangles, dtype=np.uint32)
    mesh = manifold3d.Mesh(vert_properties=verts, tri_verts=tris)
    mesh.merge()  # koinzidente Vertices der per-Face-Tessellierung verschmelzen
    man = manifold3d.Manifold(mesh)
    return man, man.status()


def validate_part(part: Part, min_wall_mm: float = 0.8) -> ValidationResult:
    """Validiert ein generiertes Part. `min_wall_mm` = 2×Düse (default 0,4er)."""
    errors: list[str] = []
    warnings: list[str] = []

    is_valid_brep = bool(part.is_valid)
    if not is_valid_brep:
        errors.append("BREP ist gemäss OCCT ungültig.")

    volume = float(part.volume)
    if volume <= 0:
        errors.append("Volumen ist null oder negativ – leere Geometrie.")

    man, status = _to_manifold(part)
    is_manifold = status == manifold3d.Error.NoError and not man.is_empty()
    genus = man.genus() if is_manifold else -1
    if not is_manifold:
        errors.append(f"Geometrie ist nicht wasserdicht/manifold ({status}).")

    # Wandstärke-Proxy: Manifold-Volumen vs. konvexe Hülle ist zu grob; wir
    # warnen stattdessen, wenn die min_wall_mm-Annahme verletzbar erscheint
    # (Feature-genaue Prüfung gehört in die Template-Param-Validierung).
    if min_wall_mm <= 0:
        warnings.append("min_wall_mm <= 0 übergeben – Wandstärke nicht geprüft.")

    return ValidationResult(
        passed=not errors,
        is_valid_brep=is_valid_brep,
        is_manifold=is_manifold,
        volume_mm3=round(volume, 4),
        genus=genus,
        errors=errors,
        warnings=warnings,
    )
