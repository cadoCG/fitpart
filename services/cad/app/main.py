"""FitPart CAD-Service – FastAPI.

Endpoints:
- GET  /health           Liveness
- GET  /templates        Liste aller registrierten Archetypen + Param-Schema
- POST /generate         {archetype, params, tolerance_profile, format} → Datei-Bytes
- POST /validate         {archetype, params, ...} → ValidationResult (kein Export)

Eiserne Regel 4 (CLAUDE.md): vor jedem Export wird validiert. /generate gibt
422 zurück, wenn die Geometrie die Validierung nicht besteht.
"""

from __future__ import annotations

import io
import json

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from . import __version__
from .export import CONTENT_TYPES, export_part
from .schemas import GenerateRequest, TemplateInfo, ValidateResponse
from .templates import REGISTRY
from .templates.base import get_template
from .validate import validate_part

app = FastAPI(
    title="FitPart CAD-Service",
    version=__version__,
    summary="Parametrische Funktionsteil-Generierung (build123d, Template-first)",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__, "templates": str(len(REGISTRY))}


@app.get("/templates", response_model=list[TemplateInfo])
def list_templates() -> list[TemplateInfo]:
    return [
        TemplateInfo(
            archetype=t.archetype,
            title_de=t.title_de,
            description_de=t.description_de,
            params_schema=t.json_schema(),
        )
        for t in sorted(REGISTRY.values(), key=lambda t: t.archetype)
    ]


def _build(req: GenerateRequest):
    """Gemeinsamer Pfad: Template auflösen, Params validieren, Geometrie bauen."""
    try:
        template = get_template(req.archetype)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    try:
        params = template.validate_params(req.params)
    except ValidationError as exc:
        # exc.errors() kann nicht-serialisierbare ctx-Objekte enthalten;
        # exc.json() liefert eine JSON-sichere Repräsentation.
        raise HTTPException(status_code=422, detail=json.loads(exc.json())) from exc

    min_wall = 2 * req.tolerance_profile.nozzle_mm
    part = template.build(params, req.tolerance_profile)
    return template, part, min_wall


@app.post("/validate", response_model=ValidateResponse)
def validate(req: GenerateRequest) -> ValidateResponse:
    template, part, min_wall = _build(req)
    result = validate_part(part, min_wall_mm=min_wall)
    return ValidateResponse(archetype=template.archetype, validation=result)


@app.post("/generate")
def generate(req: GenerateRequest) -> StreamingResponse:
    template, part, min_wall = _build(req)

    result = validate_part(part, min_wall_mm=min_wall)
    if not result.passed:
        raise HTTPException(
            status_code=422,
            detail={"message": "Validierung fehlgeschlagen", "errors": result.errors},
        )

    recommendation = {
        "generator": "fitpart-cad",
        "archetype": template.archetype,
        "note_de": "Wandstärke geprüft. Empfohlenes Material gemäss Archetyp.",
    }
    data = export_part(part, req.format, print_recommendation=recommendation)

    filename = f"{template.archetype}.{req.format.value}"
    return StreamingResponse(
        io.BytesIO(data),
        media_type=CONTENT_TYPES[req.format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
