# Archetyp: `device_holder` (Gerätehalterung universal, U-Schale)

Phase 1, #6. Wandmontierte Schale: Rückplatte, Boden, vordere Lippe, Seitenwände.

## Parameter (`DeviceHolderParams`)

| Param | Range | Feature | Beschreibung |
|---|---|---|---|
| `device_w` | 10–300 | SLOT (`fit`, default sliding) | Objektbreite |
| `device_d` | 3–120 | SLOT (`fit`, default sliding) | Objekttiefe/-dicke |
| `lip_height` | 4–80 (def. 12) | – | Höhe vordere Lippe (+Seitenwände) |
| `back_height` | 10–200 (def. 30) | – | Höhe Rückplatte |
| `wall` | 2–8 (def. 3) | – | Wandstärke |
| `wall_mount` | bool (def. true) | – | Schraublöcher in Rückplatte |
| `screw_d` | 2–8 (def. 4) | HOLE (loose) | Schrauben-⌀ |

Lochbild: 1 Loch zentriert bei Gesamtbreite < 50 mm, sonst 2 bei ±W/4.
**Constraint:** bei `wall_mount`: `back_height ≥ 4×screw_d`.

## critical_dims
`device_w`, `device_d` (Messschieber am Gerät).

## derived_dims
`lip_height`, `back_height`, `wall`.
