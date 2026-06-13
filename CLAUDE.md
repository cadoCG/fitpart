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
- [x] Vision-Endpoint (/api/analyze: Foto → Claude Structured Output →
      AnalyzeResult, Zod-validiert) + MeasureWizard in /create (Foto-Upload
      mit Client-Downscale, Archetyp-Vorschlag + Alternativen, geführte
      Messung der CRITICAL_DIMS aus packages/shared, Fragen statisch via
      i18n). Braucht ANTHROPIC_API_KEY in apps/web/.env.local.
- [x] 3MF-Export mit Druckempfehlung: print_rec pro Template (Material/
      Ausrichtung/Infill, landet als 3MF-Metadaten), Empfehlungs-Panel +
      3MF/STL-Download in /create, Vision-Hinweis wird durchgereicht
- [x] Rate-Limit auf /api/analyze (in-memory sliding window pro IP,
      5/min + 30/h; bei Skalierung auf Redis/Upstash umziehen)
- [x] Supabase Auth (Magic Link via @supabase/ssr: Browser-/Server-Client,
      Middleware-Session-Refresh mit getClaims, /login, /auth/callback
      (PKCE), AccountBar in /create)
- [x] Drucker-Profile CRUD: Tabelle printer_profiles (RLS owner-Policies,
      Least-Privilege-Grants – Migrationen in supabase/migrations/),
      /profiles-Seite (aktiv/umbenennen/löschen), /calibrate speichert
      angemeldet in die Cloud, localStorage bleibt anonymer Fallback.
      Hinweis: 20260611190044 wurde leer gepusht, Inhalt steckt in
      20260611190318_tighten_grants_v2.
- [x] Deploy (12.06.2026, Ende-zu-Ende verifiziert): Web auf Vercel
      (fitpart.app, Env: CAD_SERVICE_URL + CAD_SHARED_SECRET), CAD-Container
      auf Hostinger-VPS unter /opt/fitpart (docker compose, Loopback-Bind),
      nginx-Reverse-Proxy cad.fitpart.app mit TLS (certbot) + Rate-Limit-Zone
      in /etc/nginx/conf.d/cad-rate-limit.conf. Secret liegt in
      /opt/fitpart/infra/.env. VPS-Pull nur nötig, wenn services/cad/ ändert.

**Phase 1 (MVP) ist damit komplett.**

**Phase 2 (begonnen):**
- [x] fit_feedback-Loop: Tabelle parts + RPCs (record_part,
      submit_fit_feedback, get_part_for_feedback) + View feedback_due für
      n8n (Migration 20260612140000), /api/parts + /api/feedback,
      FeedbackPrompt auf /create (48 h, localStorage – deckt anon ab),
      /feedback/[token] für den Mail-Link. Betrieb/n8n: docs/feedback-loop.md.
      ACHTUNG: Migration muss noch gepusht werden (supabase db push braucht
      SUPABASE_DB_PASSWORD) und der n8n-Flow eingerichtet.
- [x] Archetypen knob (Drehknopf, D-Welle) + adapter_ring (Reduzierhülse,
      einziger Archetyp mit zwei Fit-Feldern fit_outer/fit_inner) – je
      Template + Zod-Spiegel + Tests + golden + Spez + Vision-Prompt.
- [x] 6 weitere Phase-2-Archetypen (Reparatur-Cluster, Briefing 6):
      furniture_glide (Kappe/Zapfen, rund/quadratisch), snap_lid (Schnapp-
      deckel), hinge (Filament-Pin-Scharnier – zwei DISJUNKTE Solids, je
      Template + Tests + golden + Spez + Zod + UI + i18n + Vision),
      end_cap (rund/quadr./rechteckig), drawer_handle (Lochabstand),
      spring_clip (C-Federclip). Damit 14 wählbare Archetypen (+ Coupon).
      151 CAD-Tests grün.
- [ ] Beta-Launch (Reddit/Foren), Analytics
- [ ] Stripe (Free/Maker/Pro + Pay-per-Part), TWINT

Goldene Referenzen regenerieren (nur bei bewusster Geometrie-Änderung):
`services/cad/.venv/bin/python services/cad/scripts/make_golden.py`
