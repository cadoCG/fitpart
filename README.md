# FitPart 🛠️

> **"Fotografiere dein Problem, beantworte 2–3 Fragen, drucke das passende Teil."**

Web-App (PWA), die aus einem Smartphone-Foto plus geführter Messung ein
parametrisches, druckfertiges 3D-Funktionsteil generiert – mit Toleranz-Engine,
die das Drucker/Material-Verhalten des Nutzers kennt und kompensiert.

Vollständiges Briefing: [`docs/BRIEFING.md`](docs/BRIEFING.md) ·
Architekturentscheid: [`docs/ADR/ADR-001-template-first.md`](docs/ADR/ADR-001-template-first.md)

## Monorepo

```
apps/web          Next.js PWA (App Router, TS, Tailwind, react-three-fiber)  – ✅ Phase 0
services/cad      Python FastAPI + build123d (Templates, Toleranz, Export)   – ✅ Phase 0
packages/shared   Geteilte Zod-Schemas / Typen (Archetyp-Params, Toleranz)   – ✅
infra             docker-compose + nginx (VPS-Reverse-Proxy)                 – ✅
docs              Briefing, ADRs, Archetyp-Spezifikationen
```

## Schnellstart

```bash
# 1. CAD-Service
cd services/cad
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest tests -p no:warnings   # 16 Tests
.venv/bin/uvicorn app.main:app --reload           # http://localhost:8000/docs

# 2. Web-App (zweites Terminal, Repo-Root)
pnpm install
pnpm dev                                          # http://localhost:3000/create
```

CAD-Service alternativ via Docker: `docker compose -f infra/docker-compose.yml up`

## Stand

**Phase 0 (Fundament)** und die **Phase-1-Archetypen** sind umgesetzt und
Ende-zu-Ende verifiziert: CAD-Service mit allen 6 MVP-Archetypen
(Distanzhülse, Wandhaken, L-Winkel, Rohrclip, Kabelclip, Gerätehalterung),
Toleranz-Engine, manifold-Validierung, STL/3MF/STEP-Export, 39 Tests +
goldene Referenzteile, Dockerfile – plus Next.js-App mit `/create`
(Archetyp-Auswahl, dynamisches Formular aus geteilten UI-Metadaten,
debounced Live-Regenerate, react-three-fiber-STL-Viewer, Download).
Nächste Schritte: Vision-Endpoint + MeasureWizard, Kalibrier-Coupon,
Supabase Auth (siehe `CLAUDE.md`).
