# Deploy-Runbook – Phase-2-Start (Commit b2c2377)

Reihenfolge wichtig: **CAD-Service zuerst** (das Frontend ruft die neuen
Templates auf), **dann Migration**, **dann Vercel**.

## 1. CAD-Service auf dem VPS aktualisieren

Diesmal MUSS der VPS pullen – `services/cad/` hat sich geändert
(7 → **9 Templates**: neu `knob` + `adapter_ring`).

```bash
ssh <vps>
cd /opt/fitpart
git pull origin main            # holt b2c2377
docker compose -f infra/docker-compose.yml up -d --build cad
```

Verifizieren (muss `"templates":"9"` zeigen):

```bash
curl -s http://127.0.0.1:8000/health
# → {"status":"ok","version":"0.0.0","templates":"9"}

# Öffentlich über nginx + TLS + Shared-Secret (Secret aus infra/.env):
SECRET=$(grep CAD_SHARED_SECRET /opt/fitpart/infra/.env | cut -d= -f2)
curl -s -H "X-CAD-Secret: $SECRET" https://cad.fitpart.app/templates \
  | tr ',' '\n' | grep -E 'knob|adapter_ring'
```

nginx/TLS/Rate-Limit bleiben unverändert – kein Eingriff nötig.

## 2. Supabase-Migration anwenden

Migration `20260612140000_parts_fit_feedback.sql` (Tabelle `parts`, RPCs,
View `feedback_due`). CLI ist verlinkt (Projekt FitPart) und verbunden.

```bash
cd ~/Developer/fitpart       # lokal, nicht auf dem VPS
supabase db push
```

Kontrolle:

```bash
supabase migration list      # 20260612140000 muss links UND rechts stehen
```

> Hinweis: `supabase db push` schreibt direkt in die Produktions-DB – bewusst
> ein manueller Schritt. Ohne diese Migration funktioniert die ganze App
> weiter; nur das Feedback-Speichern (`/api/parts`, `/api/feedback`) liefe ins
> Leere (degradiert sauber, kein Crash).

## 3. Vercel deployen

Push auf `main` ist erfolgt → Vercel baut automatisch. Falls kein Auto-Deploy:
im Vercel-Dashboard das letzte Deployment **Redeploy**. Keine neuen Env-Vars
nötig (CAD_SERVICE_URL / CAD_SHARED_SECRET / Supabase-Keys stehen schon).

## 4. Ende-zu-Ende-Smoke-Test (Produktion)

```bash
# Neue Archetypen durch die ganze Kette (Vercel → cad.fitpart.app):
curl -s -X POST https://www.fitpart.app/api/cad/generate \
  -H "Content-Type: application/json" \
  -d '{"archetype":"knob","params":{"shaft_d":6,"d_flat":4.5,"knob_d":25},"format":"3mf"}' \
  -o /tmp/knob.3mf -w "knob: HTTP %{http_code}, %{size_download} bytes\n"

curl -s -X POST https://www.fitpart.app/api/cad/generate \
  -H "Content-Type: application/json" \
  -d '{"archetype":"adapter_ring","params":{"outer_d":32,"inner_d":25,"collar":true},"format":"stl"}' \
  -o /tmp/ring.stl -w "adapter_ring: HTTP %{http_code}, %{size_download} bytes\n"
```

Im Browser auf https://www.fitpart.app/create:
- Bauteil-Typ-Dropdown zeigt **Drehknopf (D-Welle)** + **Adapterring / Reduzierhülse**
- Adapterring hat **zwei** Passungs-Felder (aussen/innen)
- 3D-Bemassung + Download funktionieren

Feedback-Loop (nur nach Schritt 2):
- nach einem Download in localStorage `fitpart.pendingFeedback.v1` prüfen
- `/feedback/<gültiger-token>` zeigt das "Hat's gepasst?"-Formular

## 5. Danach: n8n-Flow

48-h-Mail einrichten – siehe [feedback-loop.md](feedback-loop.md). Optional;
der In-App-Prompt auf /create läuft auch ohne n8n.
```
