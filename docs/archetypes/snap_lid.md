# Archetyp: snap_lid

- **Titel:** Schnappdeckel
- **Beschreibung:** Runder Deckel mit Deckplatte, abwärts gerichteter Schürze
  und innenliegender Schnapplippe, die unter den Behälterrand greift.
- **Kritische Masse:** rim_d

## Parameter

| Key | Art | Bereich | Passungsrelevant? |
| --- | --- | --- | --- |
| `rim_d` | slider | 15–200 | ja – HOLE (über dem Behälterrand) |
| `wall` | slider | 1,6–6 | nein |
| `skirt_h` | slider | 5–40 | nein |
| `top_t` | slider | 1,2–6 | nein |
| `fit` | fit | – | default snug |

## Geometrie

Deckplatte (Dicke top_t) + Schürzenring (Innen-⌀ = rim_d als HOLE) +
Schnapp-Wulst (0,6 mm nach innen) nahe der Schürzenunterkante.

## Druckempfehlung

PP (flexibel, schnapp-ermüdungsfest) oder PETG. Deckplatte unten aufs Bett.
100 % bei dünner Deckplatte, sonst 3 Perimeter.
