# Archetyp: `spacer` (Distanzhülse / Spacer)

Phase 1, MVP-Cluster "Halten & Befestigen" (Briefing 6, #5). Trivialster, aber
meistgebrauchter Archetyp – als erster Referenz-Archetyp implementiert.

## Geometrie
Hohlzylinder (Aussenzylinder − Bohrung), zentriert auf Z=0.

## Parameter (`SpacerParams`)

| Param     | Typ      | Range          | Feature | Beschreibung |
|-----------|----------|----------------|---------|--------------|
| `inner_d` | float mm | `1 < d ≤ 100`  | HOLE    | Innen-⌀ (Schraube/Welle) |
| `outer_d` | float mm | `2 < d ≤ 200`  | –       | Aussen-⌀ |
| `height`  | float mm | `0.4 < h ≤ 300`| –       | Höhe |
| `fit`     | enum     | press/snug/sliding/loose | – | Passung der Bohrung (default `sliding`) |

**Cross-Constraint:** `outer_d > inner_d + 1.6` (Ringwand ≥ 2×Düse je Seite).

## critical_dims (müssen gemessen werden)
- `inner_d` – Durchmesser der Schraube/Welle (Messschieber oder M-Schrauben-Preset).

## derived_dims (aus Foto/Defaults, Slider-korrigierbar)
- `outer_d`, `height`.

## Toleranz
`inner_d` läuft als HOLE durch `tolerance.effective_dim`:
`bore = inner_d + clearance(fit) + hole_offset`. Lockerere Passung → grössere
Bohrung.

## Validierung
manifold (Genus 1 erwartet), positives Volumen, OCCT-Validität, Ringwand
≥ 2×Düse (per Param-Constraint).

## Golden
`tests/golden/spacer.json` (Properties), `tests/golden/spacer.stl` (Referenz).
