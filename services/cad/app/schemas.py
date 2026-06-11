"""API-Request/Response-Modelle für den CAD-Service."""

from __future__ import annotations

from pydantic import BaseModel, Field

from .export import ExportFormat
from .tolerance import ToleranceProfile
from .validate import ValidationResult


class GenerateRequest(BaseModel):
    archetype: str = Field(..., examples=["spacer"])
    params: dict = Field(..., description="Template-Parameter (roh, werden validiert)")
    tolerance_profile: ToleranceProfile = Field(default_factory=ToleranceProfile)
    format: ExportFormat = ExportFormat.STL


class TemplateInfo(BaseModel):
    archetype: str
    title_de: str
    description_de: str
    params_schema: dict


class ValidateResponse(BaseModel):
    archetype: str
    validation: ValidationResult


class LaddersResponse(BaseModel):
    """Leiter-Stufen + Referenzmasse für die Kalibrier-UI."""

    hole_mm: list[float]
    shaft_mm: list[float]
    slot_mm: list[float]
    reference_pin_mm: float
    reference_tab_mm: float
