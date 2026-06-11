# Archetyp: `pipe_clip` (Rohr-/Stangenclip, C-Clip)

Phase 1, #3. C-Schnappclip mit Fussplatte und zwei vertikalen Schraublöchern.

## Parameter (`PipeClipParams`)

| Param | Range | Feature | Beschreibung |
|---|---|---|---|
| `pipe_d` | 3–120 | HOLE (`fit`, default snug) | Rohr-⌀ aussen (Clip soll klemmen) |
| `width` | 5–100 (def. 10) | – | Clipbreite entlang Rohr |
| `wall` | 1.6–10 (def. 2.4) | – | Ringwandstärke |
| `opening_ratio` | 0.4–0.95 (def. 0.72) | – | C-Öffnung als Anteil des eff. ⌀ (Schnappmass) |
| `screw_d` | 2–8 (def. 4) | HOLE (loose) | Schrauben-⌀ Fussplatte |

Fussplatte: Länge `2×r_aussen + 6×screw_d`, Dicke `1.5×wall`, Löcher beidseits
bei `±(r_aussen + 1.5×screw_d)`.

## critical_dims
`pipe_d` (Messschieber am Rohr).

## derived_dims
`width`, `wall`, `opening_ratio`.
