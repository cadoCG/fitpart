"""Template-Basis: Registry + Protokoll für parametrische Archetypen."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Type

from build123d import Part
from pydantic import BaseModel

from ..tolerance import ToleranceProfile

# build(params, profile) -> Part
BuildFn = Callable[[BaseModel, ToleranceProfile], Part]


@dataclass(frozen=True)
class Template:
    """Ein registrierter Archetyp."""

    archetype: str
    params_model: Type[BaseModel]
    build: BuildFn
    title_de: str
    description_de: str
    # Druckempfehlung (Material, Ausrichtung, Infill, …) – landet als
    # Metadaten im 3MF-Export und ist pro Archetyp kuratiert.
    print_rec: dict[str, str] = field(default_factory=dict)

    def validate_params(self, raw: dict) -> BaseModel:
        """Roh-Parameter (vom LLM/Frontend) gegen das Pydantic-Modell prüfen."""
        return self.params_model.model_validate(raw)

    def json_schema(self) -> dict:
        return self.params_model.model_json_schema()


REGISTRY: dict[str, Template] = {}


def register(template: Template) -> Template:
    if template.archetype in REGISTRY:
        raise ValueError(f"Archetype '{template.archetype}' bereits registriert")
    REGISTRY[template.archetype] = template
    return template


def get_template(archetype: str) -> Template:
    try:
        return REGISTRY[archetype]
    except KeyError as exc:
        known = ", ".join(sorted(REGISTRY)) or "(keine)"
        raise KeyError(
            f"Unbekannter Archetyp '{archetype}'. Bekannt: {known}"
        ) from exc
