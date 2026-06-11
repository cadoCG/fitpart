# FitPart CAD-Service

FastAPI + build123d. Erzeugt aus Archetyp + validierten Parametern ein
parametrisches, druckfertiges Funktionsteil und exportiert STL/3MF/STEP.
**Template-first** (ADR-001): das LLM mappt nur Parameter, generiert nie
Geometrie.

## Lokal entwickeln

```bash
cd services/cad
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Tests (inkl. golden-Vergleich)
.venv/bin/python -m pytest tests -p no:warnings

# Server
.venv/bin/uvicorn app.main:app --reload
# → http://localhost:8000/docs  (OpenAPI/Swagger)
```

## Mit Docker

```bash
docker build -t fitpart-cad services/cad
docker run -p 8000:8000 fitpart-cad
# oder: docker compose -f infra/docker-compose.yml up
```

## API

| Methode | Pfad         | Zweck |
|---------|--------------|-------|
| GET     | `/health`    | Liveness |
| GET     | `/templates` | Archetypen + JSON-Param-Schema |
| POST    | `/validate`  | Geometrie validieren (kein Export) |
| POST    | `/generate`  | Datei generieren (STL/3MF/STEP) |

### Beispiel

```bash
curl -X POST http://localhost:8000/generate \
  -H 'Content-Type: application/json' \
  -d '{
        "archetype": "spacer",
        "params": {"inner_d": 5.0, "outer_d": 10.0, "height": 8.0, "fit": "sliding"},
        "tolerance_profile": {"nozzle_mm": 0.4, "hole_offset_mm": 0.0},
        "format": "stl"
      }' --output spacer.stl
```

## Neuen Archetyp hinzufügen

1. `app/templates/<name>.py`: `Params(BaseModel)` mit Ranges +
   `build(params, profile) -> Part` + `register(Template(...))`.
2. Import in `app/templates/__init__.py`.
3. Passungsrelevante Masse über `app.tolerance.effective_dim` führen.
4. Test in `tests/` + golden in `tests/golden/<name>.json` (via
   `part_properties`).
