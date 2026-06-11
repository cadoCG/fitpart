# Archetyp: `l_bracket` (L-Winkel / Regalträger)

Phase 1, #2. Zwei rechtwinklige Schenkel, Lochbild, optionale Dreiecksverrippung.

## Parameter (`LBracketParams`)

| Param | Range | Feature | Beschreibung |
|---|---|---|---|
| `leg_a` | 20–300 | – | Länge horizontaler Schenkel |
| `leg_b` | 20–300 | – | Länge vertikaler Schenkel |
| `width` | 10–150 | – | Breite |
| `thickness` | 2.4–15 (def. 4) | – | Materialdicke |
| `rib` | bool (def. true) | – | Gusset, 55 % der Schenkellänge, Dicke min(t, w/3) |
| `screw_d` | 2–10 (def. 4) | HOLE (loose) | Schrauben-⌀ |
| `holes_per_leg` | 1–3 (def. 2) | – | Lochbild, gleichmässig verteilt |

**Constraint:** nutzbarer Schenkel (`leg − thickness`) ≥ `holes_per_leg × 4 × screw_d`.

## critical_dims
`leg_a`/`leg_b` (Auflagemasse), `screw_d`.

## derived_dims
`width`, `thickness`, `holes_per_leg`.
