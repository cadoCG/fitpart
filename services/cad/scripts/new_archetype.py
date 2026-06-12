"""Scaffold für einen neuen Archetyp (ADR-002: Template-Authoring beschleunigen).

Erzeugt das *Skelett* über alle Dateien, die ein Archetyp braucht, damit ein
neuer Typ ein Tages-Job ist statt ein Wochen-Job. Die eigentliche Geometrie
schreibt weiterhin ein Mensch (Eiserne Regel 1) – `build()` ist ein gültiger
Platzhalter-Quader mit TODO.

Erzeugt direkt:
  - services/cad/app/templates/<name>.py     (Pydantic-Modell + build-Stub)
  - services/cad/tests/test_<name>.py         (Smoke + Manifold)
  - packages/shared/src/archetypes/<name>.ts  (Zod-Spiegel)
  - docs/archetypes/<name>.md                 (Spez-Skelett)

Druckt fertige Snippets für die 6 handgepflegten Registries (Import/Enum/
Registry/UI/i18n/golden), die bewusst NICHT automatisch editiert werden.

Beispiel:
  python scripts/new_archetype.py corner_brace \\
    --title "Eckverbinder" --desc "Verbindet zwei Bretter über Eck." \\
    --field leg:slider:20:200 --field thickness:slider:2.4:12 \\
    --field screw_d:slider:2:8:0.5 --field fit:fit \\
    --crit leg --crit screw_d
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from string import Template

REPO = Path(__file__).resolve().parents[3]
CAD = REPO / "services" / "cad"


def camel(name: str) -> str:
    return "".join(p.capitalize() for p in name.split("_"))


def parse_field(spec: str) -> dict:
    """`key:slider:min:max[:step]` | `key:int:min:max` | `key:fit` |
    `key:bool` | `key:select:a|b|c`."""
    parts = spec.split(":")
    key, kind = parts[0], parts[1]
    f: dict = {"key": key, "kind": kind}
    if kind in ("slider", "int"):
        f["min"], f["max"] = float(parts[2]), float(parts[3])
        if kind == "slider" and len(parts) > 4:
            f["step"] = float(parts[4])
    elif kind == "select":
        f["options"] = parts[2].split("|")
    elif kind not in ("fit", "bool"):
        raise SystemExit(f"Unbekannte Feld-Art: {kind}")
    return f


def num(x: float) -> str:
    """3 -> '3', 0.5 -> '0.5' (kein '3.0' im generierten Code)."""
    return str(int(x)) if float(x).is_integer() else str(x)


# ---- Python-Template ---------------------------------------------------------

def py_field(f: dict) -> str:
    k = f["key"]
    if f["kind"] in ("slider", "int"):
        ty = "float" if f["kind"] == "slider" else "int"
        return (
            f'    {k}: {ty} = Field(..., ge={num(f["min"])}, le={num(f["max"])}, '
            f'description="TODO {k}")'
        )
    if f["kind"] == "fit":
        return f'    {k}: FitClass = Field(default=FitClass.SLIDING, description="Passung")'
    if f["kind"] == "bool":
        return f'    {k}: bool = Field(default=False, description="TODO {k}")'
    if f["kind"] == "select":
        opts = ", ".join(f'"{o}"' for o in f["options"])
        return f'    {k}: Literal[{opts}] = Field(default="{f["options"][0]}", description="TODO {k}")'
    raise AssertionError


_PY_BODY = Template('''

def build(params: ${Cls}Params, profile: ToleranceProfile | None = None) -> Part:
    """TODO: echte Geometrie für `${name}`. Platzhalter = gültiger Quader.

    Passungsrelevante Masse durch effective_dim(..., FeatureType.HOLE/SHAFT/
    SLOT, params.fit, profile) laufen lassen – nie hartkodierte Zuschläge
    (Eiserne Regel 3). Min. Wandstärke 0,8 mm, Bohrungen >= 2 mm (Regel 4).
    """
    profile = profile or ToleranceProfile()
    part = Box(20, 20, 10)  # TODO ersetzen
    return Part() + part if not isinstance(part, Part) else part


TEMPLATE = register(
    Template(
        archetype="${name}",
        params_model=${Cls}Params,
        build=build,
        title_de="${title}",
        description_de="${desc}",
        print_rec={
            "material": "TODO",
            "orientation_de": "TODO",
            "infill": "TODO",
        },
    )
)
''')


def py_module(name: str, title: str, desc: str, fields: list[dict]) -> str:
    cls = camel(name)
    needs_literal = any(f["kind"] == "select" for f in fields)
    needs_fit = any(f["kind"] == "fit" for f in fields)
    # Bewusst minimal halten (kein F401): FeatureType/effective_dim erst
    # importieren, wenn build() sie nutzt – der TODO in build() weist darauf hin.
    tol = "FitClass, ToleranceProfile" if needs_fit else "ToleranceProfile"
    imports = ["from __future__ import annotations", ""]
    if needs_literal:
        imports += ["from typing import Literal", ""]
    imports += [
        "from build123d import Box, Part",
        "from pydantic import BaseModel, Field",
        "",
        f"from ..tolerance import {tol}",
        "from .base import Template, register",
    ]
    head = (
        f'"""Archetyp `{name}` – {title}.\n\n{desc}\n\n'
        f"Skelett von scripts/new_archetype.py – build() und Ranges anpassen.\n"
        f'"""\n\n'
        + "\n".join(imports)
        + f"\n\n\nclass {cls}Params(BaseModel):\n"
        f'    """Validierte Parameter für {title} (alle Masse in mm)."""\n\n'
        + "\n".join(py_field(f) for f in fields)
        + "\n\n    # TODO: @model_validator(mode='after') für Kreuz-Constraints"
        " (z. B. Wandstärke).\n"
    )
    return head + _PY_BODY.substitute(Cls=cls, name=name, title=title, desc=desc)


# ---- TypeScript-Spiegel ------------------------------------------------------

def ts_field(f: dict) -> str:
    k = f["key"]
    if f["kind"] == "slider":
        return f"    {k}: z.number().gte({num(f['min'])}).lte({num(f['max'])}),"
    if f["kind"] == "int":
        return f"    {k}: z.number().int().gte({num(f['min'])}).lte({num(f['max'])}),"
    if f["kind"] == "fit":
        return f"    {k}: FitClass.default(\"sliding\"),"
    if f["kind"] == "bool":
        return f"    {k}: z.boolean().default(false),"
    if f["kind"] == "select":
        opts = ", ".join(f'"{o}"' for o in f["options"])
        return f'    {k}: z.enum([{opts}]).default("{f["options"][0]}"),'
    raise AssertionError


def ts_mirror(name: str, title: str, fields: list[dict]) -> str:
    cls = camel(name)
    lines = ['import { z } from "zod";']
    if any(f["kind"] == "fit" for f in fields):
        lines.append('import { FitClass } from "../tolerance";')
    lines += [
        "",
        f"/** {title} – spiegelt app/templates/{name}.py:{cls}Params. */",
        f"export const {cls}Params = z.object({{",
        *[ts_field(f) for f in fields],
        "});",
        f"export type {cls}Params = z.infer<typeof {cls}Params>;",
        "",
    ]
    return "\n".join(lines)


# ---- Test + Doc --------------------------------------------------------------

def example_kwargs(fields: list[dict]) -> str:
    """Minimal gültige Kwargs (Pflicht-Numerik = Untergrenze)."""
    out = []
    for f in fields:
        if f["kind"] in ("slider", "int"):
            out.append(f"{f['key']}={num(f['min'])}")
    return ", ".join(out)


def test_module(name: str, fields: list[dict]) -> str:
    cls = camel(name)
    kw = example_kwargs(fields)
    return f'''"""Tests des Archetyps `{name}` – Skelett von new_archetype.py."""

from __future__ import annotations

from app.templates.{name} import {cls}Params, build
from app.validate import validate_part


def test_params_smoke():
    assert {cls}Params({kw}) is not None


def test_build_is_manifold():
    result = validate_part(build({cls}Params({kw})), min_wall_mm=0.8)
    assert result.passed
    assert result.is_manifold


# TODO: test_golden_{name} ergänzen, sobald build() echte Geometrie liefert und
# scripts/make_golden.py den Archetyp kennt; Volumen analytisch gegenprüfen.
'''


def doc_md(name: str, title: str, desc: str, fields: list[dict], crit: list[str]) -> str:
    rows = "\n".join(
        f"| `{f['key']}` | {f['kind']} | {f.get('min', '')}–{f.get('max', '')} | TODO |"
        for f in fields
    )
    return f"""# Archetyp: {name}

> Skelett von scripts/new_archetype.py – ausfüllen.

- **Titel:** {title}
- **Beschreibung:** {desc}
- **Kritische Masse (geführte Messung):** {", ".join(crit) or "TODO"}

## Parameter

| Key | Art | Bereich | Passungsrelevant? |
| --- | --- | --- | --- |
{rows}

## Geometrie

TODO: Aufbau, Passungs-Features (HOLE/SHAFT/SLOT), Wandstärken.

## Druckempfehlung

TODO: Material, Ausrichtung, Infill.
"""


# ---- Registry-Snippets (manuell einfügen) -----------------------------------

def ui_entry(name: str, fields: list[dict]) -> str:
    def meta(f: dict) -> str:
        k = f["key"]
        if f["kind"] == "slider":
            step = f', step: {num(f["step"])}' if "step" in f else ""
            return f'{{ key: "{k}", kind: "slider", min: {num(f["min"])}, max: {num(f["max"])}{step} }}'
        if f["kind"] == "int":
            return f'{{ key: "{k}", kind: "int", min: {num(f["min"])}, max: {num(f["max"])} }}'
        if f["kind"] == "fit":
            return f'{{ key: "{k}", kind: "fit" }}'
        if f["kind"] == "bool":
            return f'{{ key: "{k}", kind: "boolean" }}'
        if f["kind"] == "select":
            opts = ", ".join(f'"{o}"' for o in f["options"])
            return f'{{ key: "{k}", kind: "select", options: [{opts}] }}'
        raise AssertionError

    def default(f: dict) -> str:
        k = f["key"]
        if f["kind"] in ("slider", "int"):
            return f"{k}: {num(f['min'])}"
        if f["kind"] == "fit":
            return f'{k}: "sliding"'
        if f["kind"] == "bool":
            return f"{k}: false"
        if f["kind"] == "select":
            return f'{k}: "{f["options"][0]}"'
        raise AssertionError

    metas = ",\n      ".join(meta(f) for f in fields)
    defs = ", ".join(default(f) for f in fields)
    return (
        f"  {name}: {{\n    fields: [\n      {metas},\n    ],\n"
        f"    defaults: {{ {defs} }},\n  }},"
    )


def print_checklist(name: str, title: str, fields: list[dict], crit: list[str]) -> None:
    cls = camel(name)
    bar = "─" * 70
    print(f"\n{bar}\nManuell in die 6 handgepflegten Registries eintragen:\n{bar}")

    print(f"\n[1] services/cad/app/templates/__init__.py – Import ergänzen:")
    print(f"    from . import {name}  # noqa: F401")

    print(f"\n[2] packages/shared/src/analyze.ts – ArchetypeEnum erweitern:")
    print(f'    "{name}",')

    print(f"\n[3] packages/shared/src/index.ts:")
    print(f'    import {{ {cls}Params }} from "./archetypes/{name}";')
    print(f'    export * from "./archetypes/{name}";')
    print(f"    // in ARCHETYPE_SCHEMAS:  {name}: {cls}Params,")
    print(f'    // in CRITICAL_DIMS:      {name}: [{", ".join(repr(c) for c in crit)}],')

    print(f"\n[4] packages/shared/src/ui.ts – ARCHETYPE_UI-Eintrag:")
    print(ui_entry(name, fields))

    print(f"\n[5] apps/web/messages/de-CH.json:")
    print(f'    Create.archetypes.{name} = "{title}"')
    print(f"    Create.params.<key> für jeden neuen Param")
    for c in crit:
        print(f"    Measure.questions.{name}.{c} / Measure.hints.{name}.{c}")
    print(f"    Create.printRec.{name}.{{material,orientation,infill}}")

    print(f"\n[6] services/cad/scripts/make_golden.py – GOLDEN_PARAMS-Eintrag,")
    print(f"    dann golden regenerieren (nur bei fertiger Geometrie).")
    print(bar)


def write(path: Path, content: str) -> None:
    if path.exists():
        print(f"  übersprungen (existiert): {path.relative_to(REPO)}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    print(f"  erstellt: {path.relative_to(REPO)}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Scaffold für einen neuen Archetyp.")
    ap.add_argument("name", help="snake_case-Name, z. B. corner_brace")
    ap.add_argument("--title", required=True, help="Deutscher Titel")
    ap.add_argument("--desc", required=True, help="Kurzbeschreibung")
    ap.add_argument(
        "--field", action="append", default=[], dest="fields",
        help="key:slider:min:max[:step] | key:int:min:max | key:fit | key:bool | key:select:a|b",
    )
    ap.add_argument("--crit", action="append", default=[], help="Kritisches Mass (Mess-Schritt)")
    args = ap.parse_args()

    if not re.fullmatch(r"[a-z][a-z0-9_]*", args.name):
        raise SystemExit("name muss snake_case sein.")
    if not args.fields:
        raise SystemExit("mindestens ein --field angeben.")

    fields = [parse_field(s) for s in args.fields]
    keys = {f["key"] for f in fields}
    for c in args.crit:
        if c not in keys:
            raise SystemExit(f"--crit {c} ist kein definiertes --field.")

    print(f"Archetyp '{args.name}' ({camel(args.name)}Params):")
    write(CAD / "app" / "templates" / f"{args.name}.py",
          py_module(args.name, args.title, args.desc, fields))
    write(CAD / "tests" / f"test_{args.name}.py",
          test_module(args.name, fields))
    write(REPO / "packages" / "shared" / "src" / "archetypes" / f"{args.name}.ts",
          ts_mirror(args.name, args.title, fields))
    write(REPO / "docs" / "archetypes" / f"{args.name}.md",
          doc_md(args.name, args.title, args.desc, fields, args.crit))

    print_checklist(args.name, args.title, fields, args.crit)


if __name__ == "__main__":
    main()
