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
import os
from secrets import compare_digest

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import ValidationError

from . import __version__
from .calibration import (
    HOLE_LADDER_MM,
    REFERENCE_PIN_MM,
    REFERENCE_TAB_MM,
    SHAFT_LADDER_MM,
    SLOT_LADDER_MM,
    CalibrationInput,
    compute_profile,
)
from .export import CONTENT_TYPES, export_part
from .schemas import (
    DimensionsResponse,
    GenerateRequest,
    LaddersResponse,
    TemplateInfo,
    ValidateResponse,
)
from .templates import REGISTRY
from .templates.base import get_template
from .tolerance import ToleranceProfile
from .validate import validate_part

app = FastAPI(
    title="FitPart CAD-Service",
    version=__version__,
    summary="Parametrische Funktionsteil-Generierung (build123d, Template-first)",
)

# Optionaler Shared-Secret-Schutz (Härtung Vercel ↔ CAD). Ist CAD_SHARED_SECRET
# gesetzt, muss jeder Request ausser /health den Header X-CAD-Secret mit exakt
# diesem Wert tragen – sonst 401. Ohne gesetztes Secret: No-op (lokal/Tests).
CAD_SHARED_SECRET = os.environ.get("CAD_SHARED_SECRET", "")
_PUBLIC_PATHS = {"/health"}


@app.middleware("http")
async def require_shared_secret(request: Request, call_next):
    if CAD_SHARED_SECRET and request.url.path not in _PUBLIC_PATHS:
        provided = request.headers.get("x-cad-secret", "")
        if not compare_digest(provided, CAD_SHARED_SECRET):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)


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


@app.get("/calibration/ladders", response_model=LaddersResponse)
def calibration_ladders() -> LaddersResponse:
    """Leiter-Stufen + Referenzmasse, damit die UI die Auswahl rendern kann."""
    return LaddersResponse(
        hole_mm=list(HOLE_LADDER_MM),
        shaft_mm=list(SHAFT_LADDER_MM),
        slot_mm=list(SLOT_LADDER_MM),
        reference_pin_mm=REFERENCE_PIN_MM,
        reference_tab_mm=REFERENCE_TAB_MM,
    )


@app.post("/calibration/profile", response_model=ToleranceProfile)
def calibration_profile(data: CalibrationInput) -> ToleranceProfile:
    """Coupon-Antworten → kompensierendes ToleranceProfile (Single Source)."""
    return compute_profile(data)


def _resolve(req: GenerateRequest):
    """Template auflösen + Params validieren (404/422 als HTTP-Fehler)."""
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

    return template, params


def _build(req: GenerateRequest):
    """Gemeinsamer Pfad: Template auflösen, Params validieren, Geometrie bauen."""
    template, params = _resolve(req)
    min_wall = 2 * req.tolerance_profile.nozzle_mm
    part = template.build(params, req.tolerance_profile)
    return template, part, min_wall


@app.post("/dimensions", response_model=DimensionsResponse)
def dimensions(req: GenerateRequest) -> DimensionsResponse:
    """Bemassungs-Anker für die 3D-Vorschau – reine Param-Arithmetik,
    baut keine Geometrie (schnell genug für jeden Slider-Tick)."""
    template, params = _resolve(req)
    dims = (
        template.dimensions(params, req.tolerance_profile)
        if template.dimensions
        else []
    )
    return DimensionsResponse(archetype=template.archetype, dims=dims)


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
        **template.print_rec,
    }
    data = export_part(part, req.format, print_recommendation=recommendation)

    filename = f"{template.archetype}.{req.format.value}"
    return StreamingResponse(
        io.BytesIO(data),
        media_type=CONTENT_TYPES[req.format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
