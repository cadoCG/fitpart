# Archetyp: end_cap

- **Titel:** Endkappe Rohr/Profil
- **Beschreibung:** Geschlossene Kappe über ein Rohr-/Profilende
  (Schutz/Optik/Standfuss), rund, quadratisch oder rechteckig.
- **Kritische Masse:** outer_w

## Parameter

| Key | Art | Bereich | Passungsrelevant? |
| --- | --- | --- | --- |
| `outer_w` | slider | 8–120 | ja – HOLE (über dem Profil) |
| `outer_d` | slider | 8–120 | ja – HOLE (nur rechteckig) |
| `wall` | slider | 1,6–6 | nein |
| `depth` | slider | 6–80 | nein |
| `shape` | select | round/square/rect | nein |
| `fit` | fit | – | default snug |

## Geometrie

Aussenkörper (Profil + 2×wall) minus Kavität (HOLE, Tiefe depth) von unten,
geschlossene Stirn oben (Dicke wall). Rund/quadratisch nutzen outer_w,
rechteckig zusätzlich outer_d.

## Druckempfehlung

PETG oder PLA; TPU wenn rutschfest. Geschlossene Stirn aufs Bett, Öffnung
oben – keine Stützen. 20–30 % Infill, 3 Perimeter.
