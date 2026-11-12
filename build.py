#!/usr/bin/env python3
"""Bhuiyan Academy preview: static page builder.

    python build.py

Reads src/pages/*.html, wraps each in the partials from src/partials/ and writes
the result next to the project root (or into portal/ for portal pages).

Front-matter (first thing in a page file, an HTML comment of `key: value` lines):

    <!--
    title: Programmes
    description: One sentence for search and link previews.
    layout: site            site | portal | bare   (default: site)
    nav: programmes         which header / sidebar link is marked current
    scripts: forms.js       optional, comma separated, resolved under /js/
    portal_title: Results   portal layout only (topbar heading; defaults to title)
    -->

Output paths
    layout site / bare    src/pages/about.html          -> about.html
    layout portal         src/pages/portal-results.html -> portal/results.html
    404                   src/pages/404.html            -> 404.html

Placeholders (replaced everywhere, including page bodies)
    {{title}} {{full_title}} {{description}} {{scripts}} {{active}} {{portal_title}}
    {{year}} {{body_class}} {{layout_css}} {{layout_js}} {{view}} {{content}}
"""
import html
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGES = ROOT / "src" / "pages"
PARTS = ROOT / "src" / "partials"

DEFAULT_DESC = ("Bhuiyan Academy, Dhaka: a University of London Recognised "
                "Teaching Centre since 1989.")
FM_RE = re.compile(r"\A\s*<!--(.*?)-->\s*", re.S)
NAV_A_RE = re.compile(r'<a\b[^>]*\bdata-nav="([^"]+)"[^>]*>')
PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")
REF_RE = re.compile(r'\b(?:href|src)="(/[^"#?{]*)')


def read(path):
    return Path(path).read_text(encoding="utf-8-sig")


def write(path, text):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def parse_page(text):
    """Return (front-matter dict, body)."""
    m = FM_RE.match(text)
    fm = {}
    if not m:
        return fm, text
    for line in m.group(1).splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            fm[key.strip().lower()] = val.strip()
    return fm, text[m.end():]


def mark_current(fragment, nav):
    """Add is-current + aria-current to anchors whose data-nav equals nav."""
    if not nav:
        return fragment

    def fix(match):
        tag = match.group(0)
        if match.group(1) != nav:
            return tag
        if 'class="' in tag:
            tag = tag.replace('class="', 'class="is-current ', 1)
        else:
            tag = tag[:-1] + ' class="is-current">'
        return tag[:-1] + ' aria-current="page">'

    return NAV_A_RE.sub(fix, fragment)


def script_tags(spec):
    tags = []
    for item in [s.strip() for s in spec.split(",") if s.strip()]:
        src = item if item.startswith(("/", "http")) else "/js/" + item
        tags.append('<script defer src="%s"></script>' % src)
    return "\n".join(tags)


def build_page(src_file, parts):
    fm, body = parse_page(read(src_file))
    stem = src_file.stem
    layout = fm.get("layout", "site").lower()
    if layout not in ("site", "portal", "bare"):
        raise SystemExit("%s: unknown layout '%s'" % (src_file.name, layout))

    if layout == "portal":
        name = stem[len("portal-"):] if stem.startswith("portal-") else stem
        out = ROOT / "portal" / (name + ".html")
        default_nav = name
    elif layout == "bare" and stem.startswith("portal-"):
        # standalone portal page (the login): portal-index.html -> portal/index.html
        out = ROOT / "portal" / (stem[len("portal-"):] + ".html")
        default_nav = stem[len("portal-"):]
    else:
        out = ROOT / (stem + ".html")
        default_nav = stem
    nav = fm.get("nav", default_nav)
    standalone_portal = layout == "bare" and stem.startswith("portal-")

    title = fm.get("title", stem.replace("-", " ").capitalize())
    full_title = title if "Bhuiyan Academy" in title else title + " | Bhuiyan Academy"
    values = {
        "title": html.escape(title),
        "full_title": html.escape(full_title),
        "description": html.escape(fm.get("description", DEFAULT_DESC)),
        "scripts": script_tags(fm.get("scripts", "")),
        "active": nav,
        "portal_title": html.escape(fm.get("portal_title", title)),
        "year": str(date.today().year),
        "body_class": {"site": "site", "portal": "portal", "bare": "bare"}[layout]
                      + (" portal" if standalone_portal else ""),
        "layout_css": '<link rel="stylesheet" href="/css/%s.css">'
                      % ("portal" if (layout == "portal" or standalone_portal) else "site"),
        "layout_js": '<script defer src="/js/%s.js"></script>'
                     % ("portal" if (layout == "portal" or standalone_portal) else "site"),
        "view": "office" if nav.startswith("admin") else "student",
    }

    head = parts["head"]
    if layout == "site":
        doc = (head + mark_current(parts["header"], nav)
               + '<main id="main">\n' + body.strip() + "\n</main>\n"
               + parts["footer"] + "</body>\n</html>\n")
    elif layout == "portal":
        shell = mark_current(parts["portal-shell"], nav).replace("{{content}}", body.strip())
        doc = head + shell + "</body>\n</html>\n"
    else:
        doc = head + body.strip() + "\n</body>\n</html>\n"

    unknown = set()

    def sub(match):
        key = match.group(1)
        if key in values:
            return values[key]
        unknown.add(key)
        return match.group(0)

    doc = PLACEHOLDER_RE.sub(sub, doc)
    write(out, doc)
    return layout, out, src_file, unknown, doc


def missing_refs(doc):
    """Root-relative href/src targets that do not exist on disk yet."""
    missing = []
    for ref in sorted(set(REF_RE.findall(doc))):
        path = ref.rstrip("/") or "/"
        if path == "/":
            continue
        rel = path.lstrip("/")
        candidates = [ROOT / rel, ROOT / (rel + ".html"), ROOT / rel / "index.html"]
        if not any(c.exists() for c in candidates):
            missing.append(ref)
    return missing


def main():
    parts = {n: read(PARTS / (n + ".html")) for n in ("head", "header", "footer", "portal-shell")}
    sources = sorted(PAGES.glob("*.html"))
    if not sources:
        print("build: no pages in src/pages/")
    built, all_missing, warnings, docs = 0, {}, [], []
    for src_file in sources:
        layout, out, src, unknown, doc = build_page(src_file, parts)
        rel_out = out.relative_to(ROOT).as_posix()
        print("%-7s %-28s <- src/pages/%s" % (layout, rel_out, src.name))
        built += 1
        if unknown:
            warnings.append("%s: unknown placeholders %s" % (src.name, sorted(unknown)))
        if 'href="#"' in doc:
            warnings.append('%s: contains href="#" (use a real page or aria-disabled)' % src.name)
        docs.append((rel_out, doc))

    for rel_out, doc in docs:  # checked after every page exists on disk
        for ref in missing_refs(doc):
            all_missing.setdefault(ref, []).append(rel_out)

    write(ROOT / "vercel.json", json.dumps({"cleanUrls": True, "trailingSlash": False}, indent=2) + "\n")
    print("vercel  vercel.json")
    print("build: %d page(s) written." % built)
    for w in warnings:
        print("warn:", w)
    if all_missing:
        print("note: %d referenced path(s) not on disk yet:" % len(all_missing))
        for ref in sorted(all_missing)[:40]:
            print("   %-40s in %s" % (ref, ", ".join(sorted(set(all_missing[ref]))[:3])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
