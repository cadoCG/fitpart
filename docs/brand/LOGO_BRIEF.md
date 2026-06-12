# FitPart – Logo-Briefing für KI-Agent

> Zweck: Diese Datei ist die vollständige Vorlage für einen Bild-/Design-KI-Agenten
> (z. B. Image-Generator oder Vektor-Logo-Tool), damit ein Logo entsteht, das zum
> Produkt **und** zum Ziel-UI (Design-Handoff `design_handoff_zielui`) passt.
> Quelle der visuellen Sprache: `DESIGN_SYSTEM.md` + `tokens/colors.css`.

---

## 1. Das Produkt in einem Satz
**FitPart** ist eine Schweizer Web-App (mobile-first, PWA): Foto eines defekten
Befestigungs-/Ersatzteils aufnehmen → KI erkennt den Bauteil-Typ → 2–3 geführte
Messungen → druckfertige 3D-Datei (3MF/STL) inkl. Druckempfehlung. USP ist die
**Toleranz-Engine**: ein einmalig gedruckter Kalibrier-Coupon lehrt FitPart das
Schrumpf-/Toleranzverhalten von Drucker + Material, das danach automatisch
kompensiert wird. Der Kern ist also **passgenaue Präzision** («it fits»).

## 2. Markenpersönlichkeit (das Gefühl, das das Logo tragen muss)
- **«Swiss Engineering trifft Consumer-App»** — präzis, vertrauenswürdig,
  technisch-handwerklich, aber zugänglich.
- **Nicht**: verspielt, Gamer-bunt, verschnörkelt, retro, cartoonartig, 3D-glänzend,
  Verlaufs-lastig, Maskottchen.
- Werte, die mitschwingen sollen: **Messen, Passung, Mass, Werkstatt, Reparatur,
  Präzision, Vertrauen.**
- Zielgruppe: Heimwerker, Maker, Reparatur-Enthusiasten (Deutschschweiz).

## 3. Name & Schreibweise
- Wortmarke: **FitPart** (ein Wort, Binnenmajuskel-«P»).
- Provisorische Lösung im Ziel-UI: Archivo Bold, **«Fit» in Mess-Orange**,
  «Part» in Tintenschwarz. Diese Aufteilung darf als Ausgangspunkt dienen,
  ist aber nicht zwingend.
- Bedeutungsanker: «Fit» = es passt / die Passung. Das ist das konzeptionelle
  Herz — ein gutes Logo visualisiert «passt exakt».

## 4. Visuelle Foundations (direkt aus dem Ziel-UI übernommen)
Das Logo muss neben diesen UI-Konstanten bestehen, ohne zu kollidieren:

| Element | Wert | Bedeutung fürs Logo |
|---|---|---|
| **Akzentfarbe** | Mess-Orange `#df5c0c` (`--orange-500`) | **Die** Markenfarbe. Sparsam, präzis, nie als Verlauf. |
| Akzent dunkel | `#bc4a06` (`--orange-600`) | erlaubte zweite Orange-Stufe (Hover/Tiefe) |
| Akzent hell (Dark Mode) | `#e87a28` (`--orange-400`) | Logo-Variante auf dunklem Grund |
| Tinte / Text | `#15171c` (`--gray-900`) | Wortmarke, Outline auf Hell |
| Seite hell | `#fbfbfc` (`--gray-25`) | heller Hintergrund |
| Seite dunkel | `#0c0d10` (`--gray-950`) | dunkler Hintergrund |
| **Display-Font** | **Archivo** (Bold, Tracking −0.025em) | Wortmarke baut auf Archivo auf |
| Mono-Font | IBM Plex Mono (tabular) | nur für Masszahlen — Logo-Detail-Akzent möglich |
| Linien | 1 px, scharf; Stroke 1.5–2 px (Lucide-Stil) | Logo lieber linienbasiert als flächig-massiv |
| Radien | Kontrollen 6–8 px, Karten 12 px | leicht gerundet, **nie vollrund**, nie scharfkantig-hart |
| Motiv | Millimeterpapier-Raster (8 px minor / 40 px major) | optionaler konzeptioneller Aufhänger |
| Animation/Stil | entschieden, ruhig, keine Glows/Bounces | flaches, klares Design |

**Eiserne Stil-Regeln (aus dem Design-System abgeleitet):**
1. **Genau eine Akzentfarbe** (Mess-Orange). Kein zweites Buntspektrum.
2. **Keine Verläufe, keine Glows, kein Glanz, kein 3D-Bevel, kein Schlagschatten.**
3. Flach, geometrisch, präzis. Feine Linien statt schwere Flächen.
4. Muss in **1 Farbe** (nur schwarz / nur weiss) genauso funktionieren.
5. Muss als **16×16-px-Favicon** und als **Maskable-PWA-Icon** lesbar bleiben.
6. de-CH: falls Tagline, dann **ss statt ß**.

## 5. Konzept-Richtungen (dem Agenten zur Auswahl geben)
Bitte **3–5 Varianten** über mehrere dieser Richtungen erzeugen, nicht nur eine:

- **A — Bildmarke «Passung»:** zwei ineinandergreifende geometrische Formen
  (Zapfen + Loch, Nut + Feder, Puzzle-Negativraum), die exakt zusammenpassen.
  Eine Hälfte Orange, eine Tinte. Erzählt «it fits» ohne Worte.
- **B — Messwinkel / Bracket:** ein abstrahierter Messschieber-Backen, Winkel
  oder eckige Klammer `[ ]`, der ein Mass «greift». Verbindet Messen + Bauteil.
- **C — Buchstabe als Werkzeug:** das «F» (oder «FP»-Ligatur) aus einer
  Mess-/Winkelgeometrie gebaut; Schenkel als Messschenkel, evtl. eine
  Mass-Markierung (Tick) als Detail.
- **D — Raster-Anker:** ein Element, das auf dem Millimeterpapier-Raster
  «einrastet» — z. B. ein Punkt/Knoten auf Gitterlinien, der Präzision/Snap zeigt.
- **E — Reine Wortmarke:** Archivo Bold, «Fit» Orange / «Part» Tinte, ein
  einziges präzises Detail (z. B. das Punkt-i oder das «t» als Mass-Tick).

Bevorzugt: eine Lösung, die **Bildmarke + Wortmarke** kombiniert und auch
**solo als App-Icon** (nur Bildmarke) trägt.

## 6. Pflicht-Deliverables
- **Lockup horizontal** (Bildmarke + Wortmarke nebeneinander).
- **App-Icon / Bildmarke solo**, quadratisch, optisch zentriert; dazu eine
  **Maskable**-Fassung mit Safe-Zone (Motiv in den inneren ~80 %).
- **Monochrom-Set:** Vollschwarz auf Hell, Vollweiss auf Dunkel.
- **Format:** bevorzugt **SVG (Vektor)**; sonst transparente PNGs in
  1024 / 512 / 192 / 32 / 16 px. Logo darf den Rand nicht berühren (Schutzraum
  ≈ Höhe des «F»).
- **Hintergründe zum Prüfen:** `#fbfbfc` (hell) und `#0c0d10` (dunkel).

## 7. Negativ-Liste (was NICHT geliefert werden darf)
Maskottchen/Figuren · Werkzeug-Clipart (Schraubenschlüssel/Hammer/Zahnrad als
Klischee) · 3D-Render, Metallic, Chrome, Glas · Verläufe, Neon, Glow ·
Regenbogen-/Tech-Bunt · Skeuomorphismus · dünne Serifen, Script-/Handschrift ·
vollrunde «Bubble»-Logos · Stockfoto-Anmutung · KI-typischer Hochglanz-3D-Look.

## 8. Fertiger Generierungs-Prompt (copy-paste für Bild-/Logo-Agent)

> Design a flat, geometric vector logo for **"FitPart"**, a Swiss precision app
> that turns a photo of a broken part into a 3D-printable replacement with
> exact tolerances. Brand feel: **Swiss engineering meets a clean consumer app**
> — precise, trustworthy, technical-handcraft, approachable. Concept: **a perfect
> fit** (two interlocking geometric shapes / pin-into-hole / measured bracket).
> Single accent colour **Mess-Orange `#df5c0c`** plus ink black `#15171c` on an
> almost-white `#fbfbfc` background. Strictly **flat**: no gradients, no glow,
> no 3D bevel, no shadow, no metallic. Fine 1.5–2 px geometric strokes,
> slightly rounded corners (never fully round, never razor-sharp). Wordmark in a
> bold geometric grotesque similar to **Archivo Bold**, tight tracking, with
> "Fit" in orange and "Part" in ink. Must read at 16 px and as a square app icon.
> Optional motif: a faint millimetre-paper grid the mark snaps onto. Provide a
> horizontal lockup, a standalone icon mark, and a single-colour version.
> **Avoid:** mascots, wrench/gear/hammer clichés, 3D render, neon, rainbow,
> script fonts, bubble shapes, glossy AI look.

**Negativ-Prompt (falls unterstützt):**
> gradient, glow, 3D render, bevel, metallic, chrome, glass, drop shadow, neon,
> rainbow, mascot, cartoon, clipart wrench/gear/hammer, script font, serif,
> photo, glossy, busy, ornate.

## 9. Umgesetzt (Stand 2026-06-12)
Gewähltes Konzept: **A — «Passung»** (zwei ineinandergreifende Kreuz-Formen,
Orange + Tinte, dezenter Schweizer-Kreuz-Anklang). Als sauberes Vektor-Set gebaut:

- **React-Komponente** `apps/web/components/Logo.tsx` — `<Logo>` (Lockup) +
  `<LogoMark>` (nur Bildmarke). Inline-SVG, themed über Tokens `--accent` /
  `--text-primary` / `--surface-page` → **Dark Mode automatisch**. Im Header
  von `apps/web/app/page.tsx` eingesetzt.
- **Favicon**: `apps/web/app/icon.svg` (Next.js-Konvention).
- **Standalone-Assets** in `apps/web/public/brand/`: `fitpart-mark.svg`,
  `fitpart-mark-dark.svg`, `fitpart-lockup.svg`, `fitpart-lockup-dark.svg`,
  `fitpart-maskable.svg` (PWA, Safe-Zone).
- **Manifest** `apps/web/app/manifest.ts`: Icons (any + maskable) + Farben auf
  Tokens korrigiert (`#fbfbfc`).
- **Apple-Touch-Icon** `apps/web/app/apple-icon.tsx` (180×180 PNG via `next/og`).
- **OG-/Social-Image** `apps/web/app/opengraph-image.tsx` (1200×630) +
  `twitter-image.tsx` (re-export); OpenGraph/Twitter-Metadaten + `metadataBase`
  in `app/layout.tsx`.
- **Geteilte Geometrie** `apps/web/lib/brand.ts` (Pfade + Farben), genutzt von
  Logo-Komponente und allen `next/og`-Routen.
- Logo als Home-Link auch in `/create` und `/calibrate`.

Offen / optional: echte PNG-Raster (16/32/512 px) für sehr alte Clients (das
SVG-Favicon + die `next/og`-PNGs decken moderne Browser, iOS und Android ab);
ggf. Brand-Font Archivo in die OG-Routen laden (aktuell Default-Sans).

## 10. Prüf-Checkliste vor Abnahme
- [ ] Funktioniert in **nur Schwarz** und **nur Weiss**?
- [ ] Lesbar als **16-px-Favicon** und als **Maskable-Icon** (Safe-Zone)?
- [ ] Genau **eine** Akzentfarbe, **keine** Verläufe/Glows?
- [ ] Passt neben Archivo-Wortmarke und auf das mm-Raster des UI?
- [ ] Gleich gut auf `#fbfbfc` (hell) **und** `#0c0d10` (dunkel)?
- [ ] Trägt die Bildmarke das Konzept «**es passt / Präzision**» auch ohne Text?
- [ ] Frei von Klischee-Werkzeugen und Maskottchen?
