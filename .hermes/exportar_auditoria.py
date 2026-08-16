#!/usr/bin/env python3
"""
Exportador de auditoría del dataset de la Sopa de Letras (JuegaHipHop).

Vuelca todas las fichas de conocimiento a un markdown legible,
respetando el MISMO orden y dedup que src/data/index.ts:
  allWords = [...generatedWords, ...baseWords, ...extraWords] (gana el primero)

Uso:
  python .hermes/exportar_auditoria.py            # todas las categorías
  python .hermes/exportar_auditoria.py chile      # solo una categoría (id)

Salida: .hermes/auditoria-dataset-sopa.md  (o auditoria-<cat>.md)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = {
    "generated": ROOT / "src" / "data" / "words.generated.ts",
    "legacy": ROOT / "src" / "data" / "words.ts",
    "extra": ROOT / "src" / "data" / "words-extra.ts",
}
CATS = {
    "breaking": ("Breakin'", "💃"),
    "mcing": ("MC", "🎤"),
    "djing": ("DJ", "🎧"),
    "graffiti": ("Graffiti", "🎨"),
    "cultura": ("Cultura Hip Hop", "🧠"),
    "historia": ("Historia del Hip Hop", "📜"),
    "beatbox": ("Beatbox", "🎵"),
    "produccion": ("Producción Musical", "🔧"),
    "chile": ("Hip Hop Chileno", "🇨🇱"),
}

ENTRY = re.compile(
    r"\{ word:\s*([\"'])(?P<word>.*?)\1,\s*category:\s*([\"'])(?P<cat>.*?)\3,"
    r"\s*difficulty:\s*([\"'])(?P<diff>.*?)\5,\s*knowledge:\s*\{(?P<know>.*?)\}\s*\}",
    re.DOTALL,
)


def field(know: str, name: str) -> str | None:
    m = re.search(rf"{name}:\s*([\"'])(.*?)\1\s*(?=,|}}|$)", know, re.DOTALL)
    return m.group(2).strip() if m else None


def related(know: str) -> list[str]:
    m = re.search(r"related:\s*\[(.*?)\]", know, re.DOTALL)
    if not m:
        return []
    return re.findall(r"([\"'])(.*?)\1", m.group(1)) and [
        x[1] for x in re.findall(r"([\"'])(.*?)\1", m.group(1))
    ]


def parse(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    out = []
    for m in ENTRY.finditer(text):
        know = m.group("know")
        out.append(
            {
                "word": m.group("word"),
                "cat": m.group("cat"),
                "diff": m.group("diff"),
                "title": field(know, "title") or "",
                "description": field(know, "description") or "",
                "importance": field(know, "importance") or "",
                "funFact": field(know, "funFact") or "",
                "related": related(know),
            }
        )
    return out


def main() -> None:
    only = sys.argv[1] if len(sys.argv) > 1 else None
    all_entries: list[dict] = []
    seen: set[str] = set()
    for src in ("generated", "legacy", "extra"):
        for e in parse(FILES[src]):
            key = e["word"].upper()
            if key in seen:
                continue
            seen.add(key)
            e["src"] = src
            all_entries.append(e)

    if only:
        entries = [e for e in all_entries if e["cat"] == only]
        out_path = ROOT / ".hermes" / f"auditoria-{only}.md"
    else:
        entries = all_entries
        out_path = ROOT / ".hermes" / "auditoria-dataset-sopa.md"

    by_cat: dict[str, list[dict]] = {}
    for e in entries:
        by_cat.setdefault(e["cat"], []).append(e)

    lines = [
        "# Auditoría del dataset — Sopa de Letras (JuegaHipHop)",
        "",
        f"Generado: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"Total de fichas: **{len(entries)}** (de {len(all_entries)} únicas en todo el dataset)",
        "",
        "Orden: alfabético por palabra. `src` = generated (Enciclopedia HH, manda) / legacy / extra.",
        "",
    ]
    for cat_id in ("breaking", "mcing", "djing", "graffiti", "cultura", "historia", "beatbox", "produccion", "chile"):
        if cat_id not in by_cat:
            continue
        icon, name = CATS.get(cat_id, ("?", cat_id))
        cat_entries = sorted(by_cat[cat_id], key=lambda e: e["word"])
        lines += [f"## {icon} {name} ({len(cat_entries)})", ""]
        for e in cat_entries:
            lines += [
                f"### {e['word']} — {e['title']}",
                f"*difficulty: {e['diff']} · src: {e['src']}*",
                "",
                f"**Descripción:** {e['description']}",
                "",
                f"**Importancia:** {e['importance']}",
                "",
            ]
            if e["funFact"]:
                lines += [f"**Dato curioso:** {e['funFact']}", ""]
            if e["related"]:
                lines += [f"**Relacionadas:** {', '.join(e['related'])}", ""]
            lines += ["---", ""]
        lines += [""]

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"OK → {out_path}")
    print(f"Fichas: {len(entries)} | Por categoría: " + ", ".join(f"{k}={len(v)}" for k, v in sorted(by_cat.items())))


if __name__ == "__main__":
    main()
