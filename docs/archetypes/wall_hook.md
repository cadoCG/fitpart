# Archetyp: `wall_hook` (Wandhaken, J-Profil)

Phase 1, #1. J-Profil: Rückplatte, unterer Arm, vordere Lippe.

## Parameter (`WallHookParams`)

| Param | Range | Feature | Beschreibung |
|---|---|---|---|
| `hook_depth` | 2–80 | SLOT (`fit`, default sliding) | Hakenspalt = Dicke des gehängten Objekts |
| `width` | 8–100 | – | Hakenbreite |
| `thickness` | 2.4–12 (def. 4) | – | Profilwandstärke |
| `back_height` | 20–200 | – | Höhe Rückplatte |
| `lip_height` | 4–80 (def. 12) | – | Höhe vordere Lippe |
| `screw_d` | 2–8 (def. 4) | HOLE (loose) | Schrauben-⌀ |
| `countersink` | bool (def. true) | – | 90°-Senkung, Kopf-⌀ = 2×Schraube |

**Constraint:** `back_height ≥ thickness + 4×screw_d` (Platz fürs Schraubloch).

## critical_dims
`hook_depth` (Dicke des Objekts), `screw_d`.

## derived_dims
`width`, `back_height`, `lip_height`, `thickness`.
