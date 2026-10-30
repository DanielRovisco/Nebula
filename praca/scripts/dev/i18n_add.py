#!/usr/bin/env python3
"""Deep-merge a {"pt": {...}, "en": {...}} JSON document (stdin) into messages/pt.json and messages/en.json."""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2] / "messages"
add = json.load(sys.stdin)
def merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict): merge(a[k], v)
        else: a[k] = v
for lang in ("pt", "en"):
    p = root / f"{lang}.json"
    d = json.loads(p.read_text())
    merge(d, add[lang])
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
print("merged")
