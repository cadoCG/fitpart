# Archetyp: `cable_clip` (Kabelclip / Kabelführung)

Phase 1, #4. Block mit 1–4 parallelen, oben offenen Schnappkanälen.

## Parameter (`CableClipParams`)

| Param | Range | Feature | Beschreibung |
|---|---|---|---|
| `cable_d` | 1.5–25 | HOLE (`fit`, default snug) | Kabel-⌀ |
| `channels` | 1–4 (def. 1) | – | Anzahl Kanäle |
| `depth` | 4–40 (def. 10) | – | Cliptiefe entlang Kabel |
| `wall` | 1.6–6 (def. 2) | – | Wandstärke / Stege |
| `mount` | screw \| pad (def. screw) | – | Schraublasche oder Klebepad (flacher Boden) |
| `screw_d` | 2–6 (def. 3.5) | HOLE (loose) | Schrauben-⌀ (nur mount=screw) |

Schnapp-Öffnung: `max(0.6×⌀, ⌀−1.6)` – Lippen bleiben ≥ ~0,8 mm druckbar.

## critical_dims
`cable_d`.

## derived_dims
`channels`, `depth`, `wall`, `mount`.
