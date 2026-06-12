# fit_feedback-Loop ("Hat's gepasst?")

Briefing 8 + Phase 2: Jeder Download protokolliert ein Teil (`parts`-Tabelle,
Migration `20260612140000_parts_fit_feedback.sql`), ~48 h später wird nach der
Passung gefragt. Verdict + Toleranz-Snapshot ist das Lernsignal der
Toleranz-Engine ("welche Toleranz funktioniert real auf welchem Drucker").

## Datenfluss

1. **Download** (`/create`) → `POST /api/parts` → RPC `record_part()` →
   Zeile in `parts` (user_id aus Session, anon = NULL). Der zurückgegebene
   `feedback_token` (uuid-Capability) wandert in localStorage
   (`fitpart.pendingFeedback.v1`).
2. **In-App-Einstieg**: `FeedbackPrompt` auf `/create` zeigt nach ≥ 48 h die
   Karte "Hat's gepasst?" – deckt auch anonyme Nutzer ab.
3. **Mail-Einstieg** (angemeldete Nutzer): n8n liest die View `feedback_due`
   und verschickt den Link `https://fitpart.app/feedback/<token>`.
4. **Antwort**: Verdict (`fits` / `too_tight` / `too_loose` / `not_printed`),
   bei zu eng/zu locker Schweregrad (0,1 / 0,3 mm → `offset_hint_mm`),
   optional Kommentar → RPC `submit_fit_feedback()` (Token = Capability,
   kein Login nötig). Erneutes Absenden überschreibt.

## n8n-Flow (einmalig einrichten)

Cron (z. B. stündlich), Supabase-Credentials = **service_role**:

1. `select * from feedback_due;` (View filtert: angemeldet, > 48 h, kein
   Feedback, keine Mail verschickt).
2. Pro Zeile Mail senden: Betreff "Hat dein {{archetype}} gepasst?",
   Link `https://fitpart.app/feedback/{{feedback_token}}`.
3. Versand markieren:
   `update parts set reminder_sent_at = now() where id = '{{id}}';`

## Auswertung (Dashboard / service_role)

```sql
-- Trefferquote pro Archetyp
select archetype, status, count(*) from parts
where status <> 'generated' group by 1, 2 order by 1;

-- Mittlerer Korrekturbedarf bei Fehlpassung (Vorzeichen: too_tight = Bohrung
-- zu klein → positiver Offset nötig)
select archetype,
       avg((fit_feedback->>'offset_hint_mm')::numeric) as avg_hint_mm
from parts
where status in ('too_tight', 'too_loose') group by 1;
```
