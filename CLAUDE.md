# FitPart – Kontext für Claude Code

## Was wir bauen
Web-App: Foto eines Befestigungs-/Ersatzteil-Problems → Vision-LLM erkennt
Archetyp → geführte Messung kritischer Masse → parametrisches Teil via
build123d-Template → Toleranz-Offsets pro Drucker/Material → STL/3MF/STEP.
Vollständiges Briefing: docs/BRIEFING.md (IMMER zuerst lesen).

## Eiserne Regeln
1. Das LLM schreibt NIE Geometrie-Code zur Laufzeit. Nur Klassifikation +
   Parameter-Mapping auf Templates in services/cad/app/templates/.
2. Jedes Template hat: Pydantic-Param-Modell mit Ranges, Unit-Tests,
   goldenes Referenz-STL in tests/golden/.
3. Jede Masse, die eine Passung beeinflusst, läuft durch tolerance.py
   (Passungsklasse + User-Offset). Nie hartkodierte Zuschläge in Templates.
4. Validierung vor jedem Export: manifold, min. Wandstärke 2×Düse (0,8 mm
   bei 0,4er Düse), Bohrungen ≥ 2 mm.
5. Supabase: neue Tabellen brauchen explizite GRANTs (Breaking Change 2026).
   RLS auf allen Tabellen, user_id-Policies.
6. Frontend deutsch-first (de-CH), i18n-Struktur von Anfang an (next-intl).

## Stack
Next.js App Router + TS + Tailwind + react-three-fiber · Supabase (Auth/DB/
Storage) · Stripe+TWINT · Python 3.12 + FastAPI + build123d + manifold3d +
lib3mf · Docker auf Hostinger VPS hinter nginx · Claude API für Vision.

## Repo-Struktur
- `apps/web` – Next.js (App Router, TS, Tailwind, react-three-fiber)
- `services/cad` – Python FastAPI + build123d (Templates, Toleranz, Validierung, Export)
- `packages/shared` – geteilte Typen / JSON-Schemas der Archetypen
- `infra` – docker-compose + nginx-Snippets
- `docs` – Briefing, ADRs, Archetyp-Spezifikationen

## Befehle
- Web: `pnpm dev` / `pnpm test` / `pnpm lint`
- CAD: `cd services/cad && uvicorn app.main:app --reload` / `pytest`
- CAD (venv): `services/cad/.venv/bin/python -m pytest services/cad/tests`
- Beide: `docker compose -f infra/docker-compose.yml up`

## Aktueller Stand / Nächste Schritte
→ siehe docs/ADR/ und GitHub Issues. MVP-Scope: Phase 1 (Abschnitt 12 im
Briefing) – 6 Archetypen, Kalibrier-Coupon, kein Payment.

**Stand jetzt (Phase 0):**
- [x] Monorepo-Scaffold (pnpm workspaces)
- [x] CAD-Service: FastAPI-Skeleton, build123d, Template `spacer`, tolerance.py,
      validate.py, export.py (STL/3MF/STEP), Tests, Dockerfile
- [x] ADR-001 (Template-first)
- [x] Next.js-Skeleton: /create mit STL-Viewer (react-three-fiber, Bounds,
      OrbitControls), Param-Slider mit debounced Live-Regenerate,
      /api/cad/generate-Proxy, next-intl (de-CH), PWA-Manifest
- [x] Ende-zu-Ende-Smoke-Test: Params → STL ansehen → Download
- [x] Alle 6 Phase-1-Archetypen: spacer, wall_hook, l_bracket, pipe_clip,
      cable_clip, device_holder (je Pydantic-Template + Zod-Spiegel + Tests +
      golden + Spez in docs/archetypes/); /create mit Archetyp-Auswahl
- [x] Kalibrier-Coupon-Template + CalibrationFlow-UI: calibration_coupon
      (Loch-/Zapfen-/Nut-Leiter, eingravierte Masse), calibration.py
      (Offset-Berechnung), /calibration/ladders + /calibration/profile,
      /calibrate-Seite, Profil in localStorage → wird in /create angewandt
- [ ] Supabase Auth (braucht Projekt-Credentials)
- [ ] Vision-Endpoint (/api/analyze) + MeasureWizard
- [ ] Drucker-Profile CRUD (Supabase, ersetzt localStorage)

Goldene Referenzen regenerieren (nur bei bewusster Geometrie-Änderung):
`services/cad/.venv/bin/python services/cad/scripts/make_golden.py`
