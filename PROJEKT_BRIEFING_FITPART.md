# Projekt-Briefing: "FitPart" (Arbeitstitel)
## Passgenaue 3D-Druck-Funktionsteile aus Foto + geführter Messung

**Stand:** 11. Juni 2026 · Erstellt als Grundlage für die Entwicklung mit Claude Code

---

## 1. Vision & Ein-Satz-Pitch

> **"Fotografiere dein Problem, beantworte 2–3 Fragen, drucke das passende Teil."**

Eine Web-App (PWA), die aus einem Smartphone-Foto plus 2–3 geführten Messungen ein
parametrisches, druckfertiges Funktionsteil (Halterung, Clip, Adapter, Ersatzteil)
generiert – mit Toleranz-Engine, die das individuelle Drucker/Material-Verhalten
des Nutzers kennt und kompensiert.

**Zielgruppe:** Besitzer von Consumer-3D-Druckern (Bambu, Prusa, Creality) ohne
CAD-Kenntnisse. Sekundär: Maker, die schneller zum Funktionsteil wollen.

---

## 2. Marktlage & Wettbewerb (Recherche Juni 2026)

### 2.1 Markt
- Consumer-3D-Printing-Markt: ~$4,8 Mrd. (2025) → prognostiziert $14,3 Mrd. bis 2034
- Über 1 Mio. verkaufte Desktop-Drucker allein in Q1 2025 (+15 % YoY)
- **Schmerzpunkt:** ~35 % der Erstnutzer geben ihren Drucker innerhalb von
  6 Monaten auf – Hauptgrund Usability. Diese Leute besitzen Hardware,
  können aber nichts Eigenes erstellen.
- Repair/Funktionsteile gelten medial als DER Kaufgrund für Drucker
  (Brackets, Mounts, Adapter, Ersatzclips).

### 2.2 Wettbewerber-Matrix

| Anbieter | Ansatz | Output | Passgenauigkeit | Preis | Lücke |
|---|---|---|---|---|---|
| **Meshy 6** (in MakerWorld integriert, März 2026) | Foto → Mesh | STL/3MF, Multi-Color | keine (rät Geometrie) | Free / Pro $20 / Max $60 | Deko, keine Funktion |
| **Tripo / Hunyuan 3.1** (auch in MakerLab) | Foto → Mesh | STL/3MF | keine | ähnlich Meshy | dito |
| **AdamCAD** | Text → parametrisches CAD | CAD | mittel, Engineering-Fokus | Pro $17.99/Mt. | kein Foto-Workflow, keine Toleranz-Engine |
| **Zoo.dev** | Text → CAD (KCL, dev-first) | STEP etc. | mittel | Free Tier 1.205 Credits | Entwickler-Tool, kein Consumer-UX |
| **Backflip AI** | 3D-Scan → parametrisches CAD | STEP/SLDPRT | hoch | k.A. (Industrie) | braucht 3D-Scanner, Industriefokus |
| **SculptChat** | Foto/Text → Mesh, wirbt mit Funktionsteilen | STL | mesh-basiert, keine echte Parametrik | Freemium | kein Toleranz-System, klein |
| **PrintPal** | Parametrische Generatoren (Bins, Organizer) + AI-Mesh | STL | nur vordefinierte Generatoren | Free 10/Mt., Pro/Studio | keine Foto→Teil-Pipeline |
| **Leo AI** | Enterprise Text-to-CAD, PLM-Anbindung | Assemblies | hoch | Enterprise | nicht Consumer |

### 2.3 Die unbesetzte Lücke
**Niemand kombiniert:** Foto-Input → parametrisches (nicht Mesh!) Funktionsteil →
Toleranz-/Passungs-Intelligenz pro Drucker → Consumer-UX. Die Deko-Schiene ist
von Bambu+Meshy besetzt (faktisch gratis), die Engineering-Schiene von
finanzierten Playern. Der "Passungs-Spezialist" für Endkunden ist frei.

### 2.4 Strategische Warnung
- MakerWorld/MakerLab ankert Deko-Generierung bei "gratis" (2 Credits/Export,
  Credits via Plattform-Punkte verdienbar). → Differenzierung NUR über
  Funktionswert ("es passt"), nie über Generierungsvolumen.
- Bambu könnte die Nische später selbst besetzen → Geschwindigkeit + Daten-Moat
  (Kalibrier-Profile) sind die Verteidigung.

---

## 3. Technische Validierung (Kernergebnis)

### 3.1 Was NICHT funktioniert
- **Foto + Referenzobjekt (Münze/Karte):** ±1–5 mm Genauigkeit (Single-View-
  Metrology ±5 mm; selbst Lehrbuch-Setups ~2,5 mm Fehler). Fehlerquellen:
  Perspektive, Linsenverzerrung, Parallaxe (Referenz und Objekt müssen in
  derselben Ebene liegen – bei 3D-Teilen nie erfüllt).
- **iPhone LiDAR:** ±1 cm, erst ab ~10 cm Objektgrösse brauchbar. Für kleine
  Teile ungeeignet.
- **Benötigt für FDM-Passungen:** ±0,2–0,5 mm (Drucker streut selbst ±0,2 mm).
- **Fazit:** Foto allein ist Faktor 5–10 zu ungenau. "Passgenau aus einem Foto"
  ist 2026 technisch unseriös – genau deshalb ist die Nische frei.

### 3.2 Der validierte Hybrid-Workflow (= Produktkonzept)
1. **Foto liefert Topologie, nicht Masse:** Vision-LLM erkennt Archetyp,
   Features (Bohrungen, Schlitze, Schnapphaken) und Proportionen.
2. **Geführte Messung:** App identifiziert die 2–3 KRITISCHEN Masse und fragt
   gezielt nach (Messschieber-Eingabe). Unkritische Masse werden aus
   Proportionen geschätzt.
3. **Parametrik statt Mesh:** Korrektur kostet nichts – Slider +0,3 mm,
   neu generieren in <2 s, neu drucken.
4. **Kalibrier-Coupon (USP/Moat):** Einmaliger Testdruck (Loch-/Zapfen-Leiter
   4,8–5,6 mm in 0,1-mm-Schritten). Nutzer tippt an, was passt → App kennt
   das Schrumpf-/Toleranzverhalten von Drucker+Material und kompensiert
   featureweise automatisch (Bohrung, Welle, Nut separat).
5. Optional (später): Foto auf Karopapier, Tele aus Distanz → reduziert
   Perspektivfehler für flache Teile; SAM-2-Segmentierung für Grobmasse.

---

## 4. Pricing-Modell

| Plan | Preis | Inhalt |
|---|---|---|
| **Free** | 0 | 2–3 Teile/Monat, nur STL, 1 Drucker-Profil. Funnel wegen MakerWorld-Gratis-Anker. |
| **Maker** | ~CHF 12/Mt. | Unbegrenzte Iterationen, 3MF-Export mit Druckprofil, Kalibrier-Profile, Teile-Historie. (Knapp unter AdamCAD $17.99.) |
| **Pro** | ~CHF 29/Mt. | + STEP-Export (Fusion-/CAD-User), mehrere Drucker-Profile, private Bibliothek, API. |
| **Pay-per-Part** | CHF 3–5 | Einzelteil ohne Abo. Wichtig: Repair ist episodisch. Value-Framing: "CHF 4 statt CHF 60 Ersatzteil/Neugerät". |

- Benchmark-Korridor Solo-Maker: $15–20/Mt. (Meshy Pro $20, AdamCAD $17.99,
  Meshy Median-Vertrag $435/Jahr).
- Stripe + TWINT (Setup aus Invox wiederverwendbar).
- Später B2B: Repair-Cafés, Hauswartungen, Print-Farmen, Fachhändler.

---

## 5. Architektur & Tech-Stack

**Prinzip: maximale Wiederverwendung der bestehenden Cado-Infrastruktur.**

| Schicht | Technologie | Anmerkung |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript, PWA | Vercel-Deploy wie gewohnt |
| 3D-Preview | three.js / react-three-fiber + @react-three/drei | STL/GLB-Viewer, Parameter-Slider |
| Auth/DB/Storage | Supabase | Achtung: explizite GRANTs für neue Tabellen (Breaking Change Okt 2026) |
| Billing | Stripe (Abo + Credit-Packs) + TWINT | Pattern aus Invox |
| Vision/Extraktion | Claude API (Vision + Structured Outputs / Tool Use) | Kosten: Rappen pro Aufruf |
| CAD-Engine | Python 3.12 + **build123d** (oder CadQuery), FastAPI, Docker | OCCT-basiert, parametrisch, kein GPU |
| Validierung | manifold3d (Wasserdichtheit), eigene Checks (Wandstärke, Überhang) | |
| Export | STL, 3MF (lib3mf, mit Druckempfehlungen), STEP (Pro) | |
| Hosting CAD-Service | Hostinger VPS, Docker hinter nginx (SSL) | Pattern wie Mustang/KoSIT-Validator (Invox) |
| Mail/Automation | n8n auf VPS | Onboarding, Kalibrier-Reminder |

**Kostenvorteil:** Konkurrenz zahlt GPU-Inferenz pro Mesh-Generierung. Hier:
1 LLM-Call (Rappen) + CPU-CAD-Berechnung (<1 s, gratis) → unbegrenzte
Iterationen sind wirtschaftlich anbietbar.

### 5.1 Pipeline

```
Foto-Upload (Next.js PWA)
   │
   ▼
Vision-LLM (Claude, Structured Output)
   │  → JSON: { archetype, features[], estimated_dims[],
   │            critical_dims[], confidence_per_dim }
   ▼
Geführte Mess-Abfrage (nur Masse mit confidence < threshold)
   │  → Nutzer misst mit Messschieber, tippt Werte ein
   ▼
Toleranz-Engine
   │  → wendet Kalibrier-Offsets (Drucker+Material) featureweise an
   ▼
CAD-Service (FastAPI + build123d, Docker auf VPS)
   │  → Template-Funktion(params) → BREP
   ▼
Validierung (manifold, Wandstärken ≥ 2×Düse, Überhang-Heuristik)
   │
   ▼
Export: STL + 3MF (+ STEP bei Pro) + Druckempfehlung
   │
   ▼
three.js-Preview mit Parameter-Slidern → Re-Generate <2 s
```

### 5.2 Kern-Architekturentscheidung: Template-first

**Das LLM schreibt NIE Geometrie-Code.** Es macht nur Klassifikation +
Parameter-Mapping auf handgeschriebene, getestete parametrische Templates.

- Eliminiert Halluzination im kritischen Pfad (gleiche Lektion wie beim
  AlgoGuard-Injector: deterministischer Code statt LLM-Generierung).
- Jedes Template: Python-Funktion `build(params: PydanticModel) -> Part`
  mit validierten Parameter-Ranges, Unit-Tests, goldenen Referenz-STLs.
- Freiform-LLM→build123d-Codegen nur als späterer Fallback (Phase 3+),
  sandboxed, mit Validierungs-Retry-Loop und manueller Review-Queue.

---

## 6. Archetypen-Katalog (priorisiert)

### Phase 1 – MVP-Cluster "Halten & Befestigen" (6 Templates)
1. **Wandhaken** (J-Profil, param: Hakentiefe, Breite, Wandstärke, Schraubloch ⌀, Senkung)
2. **L-Winkel / Regalträger** (param: Schenkellängen, Dicke, Verrippung ja/nein, Lochbild)
3. **Rohr-/Stangenclip** (C-Clip, param: ⌀ innen, Klemmspalt, Breite, Fuss mit Loch)
4. **Kabelclip / Kabelführung** (param: Kabel-⌀, Anzahl Kanäle, Montage: Schraube/Klebepad)
5. **Distanzhülse / Spacer** (param: ⌀ innen, ⌀ aussen, Höhe – trivial, aber meistgebraucht)
6. **Gerätehalterung universal** (U-Schale, param: Objektbreite/-tiefe, Lippenhöhe, Wandmontage)

### Phase 2 – "Ersetzen & Reparieren" (8 Templates)
7. Drehknopf (D-Welle/Rändel, param: Wellen-⌀, D-Mass, Knopf-⌀, Griffrillen)
8. Möbelgleiter/Fusskappe (rund/quadratisch, innen/aussen gesteckt)
9. Schnappdeckel / Behälterdeckel (param: ⌀/Rechteck, Schnapplippe)
10. Scharnier-Ersatz (Filament-Pin-Scharnier)
11. Endkappe Rohr/Profil (rund, quadratisch, rechteckig)
12. Schubladengriff / Möbelgriff (Lochabstand-parametrisch)
13. Halteklammer / Federclip (param: Klemmweite, Federweg)
14. Adapterring / Reduzierhülse (⌀ aussen → ⌀ innen, z. B. Schlauch/Staubsauger)

### Phase 3 – "Gehäuse & Organisation" (8+ Templates)
15. Elektronik-Gehäuse (param: Innenmasse, PCB-Standoffs, Kabeldurchführung, Deckel-Schnapp)
16. Gridfinity-kompatible Bins (param: Grid-Units, Höhe, Unterteilungen)
17. Schubladen-Organizer (param: Aussenmasse, Fächer-Matrix)
18. Wand-Halterung für Werkzeug (Konturschale)
19. Tablet-/Handy-Ständer (param: Gerätedicke, Winkel)
20. SSD/Festplatten-Halter, 21. Filament-Spulenhalter, 22. Batteriehalter (AA/AAA/18650) …

**Regel:** Jeder Archetyp definiert seine `critical_dims` (müssen gemessen
werden) vs. `derived_dims` (aus Foto-Proportionen geschätzt, Slider-korrigierbar).

---

## 7. Toleranz-Engine (Spezifikation)

### 7.1 Kalibrier-Coupon
- Druckbares Testteil (~30 min, <10 g Filament):
  - Loch-Leiter: ⌀ 4,8 / 4,9 / 5,0 / 5,1 / 5,2 / 5,4 / 5,6 mm
  - Zapfen-Leiter: ⌀ 4,6 / 4,8 / 5,0 / 5,2 mm (Test gegen 5,0-mm-Referenzloch)
  - Nut-Leiter: 2,0 / 2,2 / 2,4 mm (für 2-mm-Referenzsteg)
- Beigelegter "Prüfstift": 5,00-mm-Referenzzapfen wird mitgedruckt; alternativ
  M5-Schraube als Haushaltsreferenz.
- Nutzer tippt in der App an: "Welches Loch sitzt saugend? Welches locker?"

### 7.2 Datenmodell-Logik
- Pro `(user, printer, material)` werden Offsets gespeichert:
  `hole_offset`, `shaft_offset`, `slot_offset` (mm, featureweise).
- Generierung: Template fordert Nennmass + Passungsklasse an
  (`press | snug | sliding | loose`), Engine rechnet:
  `effektiv = nennmass + klasse_zuschlag + user_offset[feature_typ]`
- Default-Zuschläge (ohne Kalibrierung): press +0,05 / snug +0,15 /
  sliding +0,25 / loose +0,40 mm – konservative FDM-Erfahrungswerte.

---

## 8. Supabase-Schema (Entwurf)

```sql
-- WICHTIG: ab Okt 2026 explizite GRANTs für neue Tabellen nötig!

create table profiles (
  id uuid primary key references auth.users,
  display_name text,
  plan text default 'free',        -- free | maker | pro
  credits int default 3,
  created_at timestamptz default now()
);

create table printer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text,                        -- "X1C Wohnzimmer"
  printer_model text,               -- "Bambu Lab X1C"
  nozzle_mm numeric default 0.4,
  material text,                    -- PLA | PETG | ABS | PA-CF ...
  hole_offset_mm numeric default 0,
  shaft_offset_mm numeric default 0,
  slot_offset_mm numeric default 0,
  calibrated boolean default false,
  created_at timestamptz default now()
);

create table parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  archetype text not null,          -- 'wall_hook', 'l_bracket', ...
  params jsonb not null,            -- validierte Template-Parameter
  photo_path text,                  -- Supabase Storage
  vision_result jsonb,              -- LLM-Rohanalyse
  printer_profile_id uuid references printer_profiles(id),
  status text default 'draft',      -- draft | generated | printed | fits | failed
  fit_feedback jsonb,               -- Lernsignal! "passte nicht, +0.2mm nötig"
  stl_path text, step_path text, threemf_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table generation_events (    -- Telemetrie & Abrechnung
  id uuid primary key default gen_random_uuid(),
  part_id uuid references parts(id),
  duration_ms int,
  validation_passed boolean,
  validation_errors jsonb,
  created_at timestamptz default now()
);
```

`fit_feedback` ist strategisch: aggregiert über alle Nutzer entsteht ein
Datensatz "welche Toleranz funktioniert real auf welchem Drucker/Material" –
der Moat, den kein Konkurrent hat.

---

## 9. Vision-LLM: Structured-Output-Schema (Entwurf)

```json
{
  "archetype": "wall_hook",
  "archetype_confidence": 0.92,
  "alternative_archetypes": ["pipe_clip"],
  "detected_features": [
    {"type": "hole", "purpose": "mounting_screw", "estimated_diameter_mm": 4.5,
     "confidence": 0.4},
    {"type": "hook_profile", "estimated_depth_mm": 25, "confidence": 0.6}
  ],
  "critical_dims_to_ask": [
    {"param": "hook_inner_depth", "question_de":
     "Wie dick ist das Objekt, das am Haken hängen soll? (mm)",
     "measure_hint_de": "Mit Messschieber an der dicksten Stelle messen."},
    {"param": "screw_diameter", "question_de":
     "Welche Schraube verwendest du? (Durchmesser in mm, z. B. 4 für M4)"}
  ],
  "derived_dims": {"width_mm": 20, "wall_thickness_mm": 4},
  "material_recommendation": {"indoor_light": "PLA", "load_bearing": "PETG",
   "outdoor_or_hot": "PETG/ASA"},
  "notes_de": "Foto zeigt gebrochenen Originalhaken; Bruchstelle deutet auf
   zu geringe Wandstärke hin – empfehle 5 mm statt Original ~3 mm."
}
```

Implementierung: Claude API mit Tool-Use/Structured Outputs, Schema als
Pydantic-Modell gespiegelt (Zod im Frontend).

---

## 10. Repo-Struktur (Vorschlag für Claude Code)

```
fitpart/
├── CLAUDE.md                  # Projekt-Kontext für Claude Code (s. Abschnitt 11)
├── docs/
│   ├── BRIEFING.md            # diese Datei
│   ├── ADR/                   # Architecture Decision Records
│   └── archetypes/            # 1 Spez-Datei pro Archetyp
├── apps/
│   └── web/                   # Next.js (App Router, TS, Tailwind)
│       ├── app/
│       ├── components/        # Viewer, MeasureWizard, SliderPanel, CalibrationFlow
│       └── lib/               # supabase client, zod-schemas, api client
├── services/
│   └── cad/                   # Python FastAPI + build123d
│       ├── app/
│       │   ├── main.py
│       │   ├── templates/     # wall_hook.py, l_bracket.py, ... (je build(params))
│       │   ├── tolerance.py   # Passungsklassen + Offset-Logik
│       │   ├── validate.py    # manifold, Wandstärke, Überhang
│       │   └── export.py      # STL/3MF/STEP
│       ├── tests/             # Param-Ranges + goldene STLs
│       └── Dockerfile
├── packages/
│   └── shared/                # geteilte Typen (Archetyp-Params als JSON Schema)
└── infra/
    ├── docker-compose.yml     # lokal: cad-service
    └── nginx/                 # VPS-Reverse-Proxy-Snippet (Muster Invox)
```

---

## 11. CLAUDE.md (Startinhalt – ins Repo-Root kopieren)

```markdown
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

## Befehle
- Web: pnpm dev / pnpm test / pnpm lint
- CAD: cd services/cad && uvicorn app.main:app --reload / pytest
- Beide: docker compose up

## Aktueller Stand / Nächste Schritte
→ siehe docs/ADR/ und GitHub Issues. MVP-Scope: Phase 1 (Abschnitt 12 im
Briefing) – 6 Archetypen, Kalibrier-Coupon, kein Payment.
```

---

## 12. Entwicklungs-Phasen

### Phase 0 – Fundament (Woche 1)
- [ ] Monorepo-Scaffold (pnpm workspaces), CLAUDE.md, ADR-001 (Template-first)
- [ ] CAD-Service: FastAPI-Skeleton, build123d, 1 Template (Distanzhülse –
      trivialster Archetyp), Validierung, STL-Export, Dockerfile, Tests
- [ ] Next.js-Skeleton: Supabase Auth, STL-Viewer (react-three-fiber)
- [ ] Ende-zu-Ende-Smoke-Test: Params eingeben → STL ansehen → Download

### Phase 1 – MVP "Halten & Befestigen" (Woche 2–5)
- [ ] 6 Archetypen-Templates inkl. Tests + goldene STLs
- [ ] Vision-Endpoint: Foto → Claude → Structured Output → Archetyp-Vorschlag
- [ ] MeasureWizard-UI (geführte Fragen aus critical_dims_to_ask)
- [ ] Parameter-Slider mit Live-Regenerate (<2 s)
- [ ] Toleranz-Engine + Kalibrier-Coupon (Template + CalibrationFlow-UI)
- [ ] 3MF-Export mit Druckempfehlung; Drucker-Profile CRUD
- [ ] Deploy: Vercel + CAD-Container auf VPS (nginx-Subdomain, z. B.
      cad.fitpart.app), Rate-Limiting

### Phase 2 – Beta & Monetarisierung (Woche 6–9)
- [ ] Stripe (Free/Maker/Pro + Pay-per-Part), TWINT
- [ ] fit_feedback-Loop ("Hat's gepasst?" nach 48 h via n8n-Mail)
- [ ] 8 weitere Archetypen (Reparatur-Cluster)
- [ ] Beta-Launch: Reddit r/BambuLab, r/functionalprint, r/3Dprinting +
      deutschsprachige Foren/Discords; Landing mit Demo-Video
- [ ] Analytics (Plausible o. ä.), Conversion-Funnel

### Phase 3 – Ausbau (ab Woche 10)
- [ ] STEP-Export (Pro), Teile-Bibliothek, Sharing
- [ ] SAM-2-Grobmasse aus Foto (Referenzobjekt) als Komfort-Feature
- [ ] Freiform-Fallback (LLM→build123d sandboxed, Review-Queue)
- [ ] Gehäuse-/Gridfinity-Cluster; API; B2B-Pilot (Repair-Café)

---

## 13. Risiken & offene Punkte

| Risiko | Einschätzung | Mitigation |
|---|---|---|
| Bambu/MakerWorld baut Funktion nach | mittel/hoch, 12–24 Mt. Horizont | Geschwindigkeit, fit_feedback-Datenmoat, ggf. später Partnerschaft |
| Nutzer scheitern an Messschieber-Eingabe | mittel | Mess-Hilfe-Videos, M-Schrauben-/Münz-Presets, gute Defaults |
| Template-Abdeckung zu schmal ("mein Teil ist nicht dabei") | sicher anfangs | "Wunsch-Archetyp"-Button als Priorisierungs-Signal; Freiform-Fallback Phase 3 |
| Haftung (tragende Teile) | gering, aber real | AGB-Disclaimer, Lastklassen-Hinweise, keine sicherheitskritischen Archetypen (keine Kindersitz-/Kletter-Teile) |
| build123d/OCCT-Kantenfälle | gering | goldene STLs, Property-Tests über Param-Ranges |
| Namensfindung/Marke | offen | "FitPart" ist Arbeitstitel – Domain-/Markencheck nötig |

---

## 14. Erste Claude-Code-Prompts (Copy-Paste)

**Session 1 (Scaffold):**
> Lies docs/BRIEFING.md vollständig. Erstelle das Monorepo gemäss Abschnitt 10
> (pnpm workspaces). Implementiere zuerst services/cad: FastAPI + build123d
> mit dem Archetyp "spacer" (Distanzhülse: inner_d, outer_d, height; Ranges
> validieren: outer_d > inner_d + 1.6). Endpoint POST /generate
> {archetype, params, tolerance_profile} → STL-Bytes. Dazu validate.py
> (manifold3d-Check) und pytest mit goldenem STL. Dockerfile (python:3.12-slim).
> Erkläre mir danach, wie ich es lokal teste.

**Session 2 (Viewer):**
> Baue in apps/web eine Seite /create: Formular für spacer-Params (Zod-Schema
> aus packages/shared), Aufruf des CAD-Service, STL-Anzeige mit
> react-three-fiber (OrbitControls, neutrales Studio-Licht), Download-Button.
> Debounced Live-Regenerate bei Slider-Änderung.

**Session 3 (Vision):**
> Implementiere /api/analyze: Foto-Upload → Claude API (Vision, Structured
> Output gemäss Schema in Briefing Abschnitt 9) → Archetyp + Fragen.
> Baue den MeasureWizard, der critical_dims_to_ask als Schritt-für-Schritt-
> Dialog rendert und am Ende /generate aufruft.

---

*Ende des Briefings. Viel Erfolg beim Build! 🛠️*
