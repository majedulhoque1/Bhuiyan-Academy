#!/usr/bin/env python3
"""Embed src/data/portal-seed.json as js/portal-seed.js (fetch is unreliable on file://)."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
data = json.loads((root / "src/data/portal-seed.json").read_text(encoding="utf-8-sig"))
out = "window.BA_SEED = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
(root / "js/portal-seed.js").write_text(out, encoding="utf-8", newline="\n")
print("wrote js/portal-seed.js (%d bytes)" % len(out))
