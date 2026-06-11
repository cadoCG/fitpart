"""Template-Registry. Jeder Archetyp registriert sich hier.

Eiserne Regel 1+2 (CLAUDE.md): handgeschriebene, getestete parametrische
Templates – das LLM mappt nur Parameter, generiert nie Geometrie.
"""

from __future__ import annotations

from .base import REGISTRY, Template, register
from . import spacer  # noqa: F401  (Import registriert das Template)

__all__ = ["REGISTRY", "Template", "register"]
