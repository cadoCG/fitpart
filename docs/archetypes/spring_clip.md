# Archetyp: spring_clip

- **Titel:** Halteklammer / Federclip
- **Beschreibung:** Offener C-Federclip, der über einen Rundstab oder eine
  Kante schnappt und durch Federkraft hält – ohne Fuss/Schraublöcher, mit
  Einführschrägen an der Mündung.
- **Kritische Masse:** grip_d

## Parameter

| Key | Art | Bereich | Passungsrelevant? |
| --- | --- | --- | --- |
| `grip_d` | slider | 3–60 | ja – HOLE (gehaltenes Rund-⌀) |
| `opening` | slider | 0,3–0,9 | nein (Mündungsanteil) |
| `thickness` | slider | 1,2–6 | nein |
| `width` | slider | 4–60 | nein |
| `fit` | fit | – | default snug |

## Geometrie

C-Ring (Aussen- minus Innenzylinder), Mündung als Schlitz nach +y, zwei nach
aussen gestellte Einführlippen an den Mündungsecken. Kreuz-Constraint:
opening×grip_d ≥ 1 mm.

## Druckempfehlung

PETG (federt dauerhaft); PLA bricht bei Wechsellast. Liegend drucken, Achse
senkrecht zum Bett. 40–60 % Infill, 3 Perimeter.
