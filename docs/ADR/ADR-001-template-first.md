# ADR-001: Template-first CAD-Generierung (LLM schreibt keinen Geometrie-Code)

- **Status:** Akzeptiert
- **Datum:** 2026-06-11
- **Kontext:** Briefing Abschnitt 5.2

## Kontext

FitPart erzeugt druckfertige, *passgenaue* Funktionsteile. Passgenauigkeit
(±0,2–0,5 mm bei FDM) ist der gesamte Produktwert. Ein LLM, das zur Laufzeit
Geometrie-Code (build123d/CadQuery) generiert, halluziniert im kritischen Pfad:
falsche Masse, nicht-wasserdichte Geometrie, unvalidierte Wandstärken.

## Entscheidung

Das LLM übernimmt **ausschliesslich Klassifikation und Parameter-Mapping**:

```
Foto → LLM → { archetype, params, critical_dims_to_ask } → Template.build(params) → BREP
```

Geometrie entsteht **nur** aus handgeschriebenen, getesteten parametrischen
Templates in `services/cad/app/templates/`. Jedes Template hat:

1. ein Pydantic-Param-Modell mit validierten Ranges,
2. eine reine Funktion `build(params) -> build123d.Part`,
3. Unit-Tests + ein goldenes Referenz-STL in `tests/golden/`.

Jede passungsrelevante Masse läuft durch `tolerance.py` (Passungsklasse +
User-Offset), nie hartkodiert im Template.

## Konsequenzen

**Positiv**
- Keine Halluzination im kritischen Pfad – deterministischer, getesteter Code.
- Unbegrenzte, billige Iterationen (1 CPU-Aufruf <1 s, kein GPU).
- Validierbar: manifold-Check, Wandstärke, Überhang vor jedem Export.
- Reproduzierbar (golden STLs) → Property-Tests über Param-Ranges.

**Negativ / Trade-offs**
- Abdeckung begrenzt durch Anzahl Templates → bewusster MVP-Scope (6 Archetypen).
- "Mein Teil ist nicht dabei" anfangs sicher → Wunsch-Archetyp-Button als Signal.

**Später (Phase 3+)**
- Freiform-LLM→build123d-Codegen nur als Fallback, sandboxed, mit
  Validierungs-Retry-Loop und manueller Review-Queue. Nie im kritischen Pfad.
