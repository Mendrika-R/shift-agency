#!/usr/bin/env python3
"""Subset Material Symbols Outlined to the icons actually used on the site.

The page renders icons by *ligature* (e.g. <span ...>check_circle</span>), so we
must subset by the icon-name text and keep layout features (GSUB). Subsetting by
codepoint would silently produce blank icons.

Steps: download the full variable font, instance the axes to a single static
style (FILL=0, wght=400, GRAD=0, opsz=24 — the only style the site uses), then
subset to the icon names below. Result is committed so all envs are identical.

Usage: python3 scripts/subset-icons.py
"""
import io
import os
import sys
import re
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "assets", "fonts", "material-symbols-subset.woff2")

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

CSS_URL = ("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:"
           "opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200")

# Every icon name used on the site: static <span> ligatures + icons injected
# dynamically via JS (opt.icon / makeSimCard / the .sim-check 'check').
ICONS = [
    "architecture", "arrow_back", "arrow_forward", "arrow_right", "bolt",
    "build", "calendar_today", "category", "chat", "check", "check_circle",
    "close", "grid_view", "handyman", "help_outline", "hub",
    "keyboard_arrow_down", "language", "layers", "menu", "monitoring",
    "my_location", "settings_suggest", "shopping_cart", "storefront",
    "terminal", "trending_up", "tune", "verified",
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return r.read()


def main():
    css = fetch(CSS_URL).decode("utf-8")
    src = re.search(r"url\((https://[^)]+\.woff2)\)", css).group(1)
    print("source variable font: %s" % src)
    raw = fetch(src)
    print("downloaded full font: %d bytes" % len(raw))

    font = TTFont(io.BytesIO(raw))
    # Pin every axis to the single style the site renders.
    instantiateVariableFont(
        font, {"FILL": 0, "wght": 400, "GRAD": 0, "opsz": 24}, inplace=True
    )

    # Every icon name is spelled from the same alphabet, so normal ligature
    # *component* closure would mark all ~3700 icons reachable. Instead we
    # resolve the exact ligature glyph for each wanted icon, then subset with
    # layout_closure disabled so only those icon glyphs survive.
    wanted = set(ICONS)

    def glyph_to_char(name):
        # Icon-name ligature components are literal glyph names: single-letter
        # glyphs map to themselves, 'underscore' -> '_'. Anything else (digits,
        # punctuation) isn't used by our icon names, so return None to skip.
        if name == "underscore":
            return "_"
        if len(name) == 1 and name.isalpha():
            return name
        return None

    icon_glyphs = set()
    found = set()
    gsub = font["GSUB"].table
    for lookup in gsub.LookupList.Lookup:
        for sub in lookup.SubTable:
            # Unwrap extension lookups (LookupType 7) around LigatureSubst.
            sub = getattr(sub, "ExtSubTable", sub)
            ligs = getattr(sub, "ligatures", None)
            if not ligs:
                continue
            for first, lig_list in ligs.items():
                for lig in lig_list:
                    chars = [glyph_to_char(g) for g in [first] + list(lig.Component)]
                    if None in chars:
                        continue
                    word = "".join(chars)
                    if word in wanted:
                        icon_glyphs.add(lig.LigGlyph)
                        found.add(word)
    missing = wanted - found
    if missing:
        raise SystemExit("ERROR: ligature not found for icons: %s" % sorted(missing))
    print("resolved %d icon ligatures" % len(icon_glyphs))

    options = subset.Options()
    options.flavor = "woff2"
    options.glyph_names = False
    options.recalc_bounds = True
    options.layout_closure = False  # keep only the icon glyphs we name explicitly
    subsetter = subset.Subsetter(options=options)
    # text = the letters/underscore needed to type the names; glyphs = the icons.
    subsetter.populate(text=" ".join(ICONS), glyphs=sorted(icon_glyphs))
    subsetter.subset(font)
    font.save(OUT)
    print("wrote %s (%d bytes) for %d icons" %
          (OUT, os.path.getsize(OUT), len(ICONS)))


if __name__ == "__main__":
    sys.exit(main())
