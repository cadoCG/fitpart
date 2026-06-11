"""Export generierter Parts nach STL / 3MF / STEP.

3MF trägt zusätzlich Druckempfehlungen als Metadaten (Material, Düse, Hinweis).
STEP ist dem Pro-Plan vorbehalten (Briefing 4), wird hier aber technisch
bereitgestellt – die Plan-Gating-Logik sitzt im Backend/Frontend.
"""

from __future__ import annotations

import tempfile
from enum import Enum
from pathlib import Path

from build123d import Mesher, Part, Unit, export_step, export_stl

# Tessellierungs-Toleranz für STL/3MF: 0,05 mm ist deutlich feiner als die
# FDM-Auflösung (~0,1 mm Düse), hält aber die Dateigrösse klein – die
# Default-Toleranz (0,001 mm) erzeugt für Textgravuren riesige Meshes.
EXPORT_TOLERANCE_MM = 0.05


class ExportFormat(str, Enum):
    STL = "stl"
    THREEMF = "3mf"
    STEP = "step"


CONTENT_TYPES: dict[ExportFormat, str] = {
    ExportFormat.STL: "model/stl",
    ExportFormat.THREEMF: "model/3mf",
    ExportFormat.STEP: "application/step",
}


def _read_bytes(path: Path) -> bytes:
    return path.read_bytes()


def export_part(
    part: Part,
    fmt: ExportFormat,
    *,
    print_recommendation: dict[str, str] | None = None,
) -> bytes:
    """Serialisiert ein Part in das gewünschte Format und gibt die Bytes zurück."""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / f"part.{fmt.value}"

        if fmt is ExportFormat.STL:
            export_stl(part, out, tolerance=EXPORT_TOLERANCE_MM)
        elif fmt is ExportFormat.STEP:
            export_step(part, out, unit=Unit.MM)
        elif fmt is ExportFormat.THREEMF:
            mesher = Mesher(unit=Unit.MM)
            mesher.add_shape(part)
            for key, value in (print_recommendation or {}).items():
                mesher.add_meta_data(
                    name_space="fitpart",
                    name=key,
                    value=str(value),
                    metadata_type="str",
                    must_preserve=True,
                )
            mesher.write(out)
        else:  # pragma: no cover - durch Enum abgedeckt
            raise ValueError(f"Unbekanntes Exportformat: {fmt}")

        return _read_bytes(out)
