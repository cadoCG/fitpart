# ADR-002: Long-Tail datengetrieben – Closed-template-first bleibt

- **Status:** Akzeptiert
- **Datum:** 2026-06-12
- **Kontext:** Folgt aus ADR-001; Produktstrategie-Frage „Sollen Nutzer alles
  hochladen und beliebige Teile generieren?“

## Kontext

Heute ist die Pipeline bewusst geschlossen: Foto → Claude klassifiziert in
**genau einen von N Archetypen** (`ArchetypeEnum`) → geführte Messung →
handgeschriebenes Template → validierter Export. Das `enum` zwingt jedes Foto in
einen bekannten Typ – auch wenn keiner wirklich passt.

Naheliegender Wunsch: „Nutzer laden alles hoch, wir erzeugen beliebige Teile.“
Das bedeutet **offene Geometrie-Generierung** und steht im direkten Widerspruch
zu ADR-001 und zum eigentlichen Produktwert (garantiert manifold, druckbar,
passgenau). Es ist ausserdem ein physisches Haftungsthema: ein tragendes Teil,
das unter Last bricht, ist kein „nur Software-Bug“.

## Entscheidung

**Wir öffnen die Generierung nicht.** Stattdessen:

1. **Kern bleibt closed-template-first** (ADR-001). Die Garantie ist der
   Burggraben.
2. **Abdeckung skaliert über mehr Templates**, nicht über offene Codegen.
   Welche Templates als nächstes entstehen, wird **datengetrieben** priorisiert
   – nicht geraten.
3. **„Kein passender Treffer“-Pfad statt Falsch-Klassifikation.** Liegt
   `archetype_confidence` unter `ARCHETYPE_CONFIDENCE_THRESHOLD`, wird der User
   nicht in eine womöglich falsche Vorlage gezwungen. Er beschreibt das
   gewünschte Teil (Foto-Mitsenden optional, Opt-in) → landet in
   `part_requests`. Das ist gleichzeitig das Nachfrage-Signal für die Roadmap.
4. **Template-Authoring wird beschleunigt** (`scripts/new_archetype.py`):
   ein neuer Archetyp soll ein Tages-Job sein, kein Wochen-Job – das macht
   „mehr Templates“ erst wirtschaftlich.
5. **Offene Generierung bleibt Phase 3+** (ADR-001, „später“): nur als
   sandboxed, validierungs-gezwungener, klar als *experimentell/ungeprüft*
   gekennzeichneter Tier – und **erst dann, wenn die `part_requests`-Daten
   zeigen, dass der Long-Tail gross und wirtschaftlich genug ist.**

## Konsequenzen

**Positiv**
- Kein Verwässern der „passgenau + druckbar“-Garantie.
- Ehrliche UX statt Schein-Confidence bei schlechtem Treffer.
- Die Roadmap (welcher Archetyp lohnt sich?) wird gemessen, nicht geraten.
- Kein Monate-Umbau (Sandbox/Job-Queue/Haftung) vor Product-Market-Fit.

**Negativ / Trade-offs**
- Long-Tail-Teile sind kurzfristig nicht bedienbar → bewusst akzeptiert, mit
  Warteliste als Ventil + optionaler E-Mail-Benachrichtigung.
- `part_requests` braucht später eine Review-/Auswertungs-Oberfläche
  (vorerst via Supabase-Dashboard; service_role-only-Lesezugriff).

## Schwelle

`ARCHETYPE_CONFIDENCE_THRESHOLD = 0.6` (packages/shared/src/analyze.ts).
Startwert; anhand der Quote „no-match vs. später doch passend gewählt“
nachjustieren, sobald Nutzungsdaten vorliegen.
