#!/usr/bin/env python3
"""Download and self-host the site's web fonts.

Fetches Inter + JetBrains Mono (latin + latin-ext subsets) from Google Fonts,
saves the .woff2 files under assets/fonts/, and writes the matching @font-face
rules to assets/fonts/_text-fonts.css (later inlined into src/input.css).

Material Symbols is handled separately by subset-icons.py (it is subsetted to
the icons actually used). Run once; the resulting .woff2 are committed so that
local / preprod / main stay byte-identical.

Usage: python3 scripts/fetch-fonts.py
"""
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_DIR = os.path.join(HERE, "assets", "fonts")
CSS_OUT = os.path.join(FONTS_DIR, "_text-fonts.css")

# Modern Chrome UA so Google Fonts serves woff2.
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

FAMILIES = {
    "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
    "JetBrains Mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap",
}

# Only keep the subsets we need (French needs latin + latin-ext).
KEEP_SUBSETS = {"latin", "latin-ext"}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return r.read()


def slug(name):
    return name.lower().replace(" ", "-")


def main():
    os.makedirs(FONTS_DIR, exist_ok=True)
    css_blocks = []
    # Google Fonts emits: /* subset */\n @font-face { ... font-weight: N; src: url(...) ... }
    block_re = re.compile(
        r"/\*\s*(?P<subset>[\w-]+)\s*\*/\s*@font-face\s*\{(?P<body>[^}]*)\}",
        re.S,
    )
    for family, url in FAMILIES.items():
        css = fetch(url).decode("utf-8")
        for m in block_re.finditer(css):
            subset = m.group("subset")
            if subset not in KEEP_SUBSETS:
                continue
            body = m.group("body")
            weight = re.search(r"font-weight:\s*(\d+)", body).group(1)
            src = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
            urange = re.search(r"unicode-range:\s*([^;]+);", body).group(1).strip()
            fname = "%s-%s-%s.woff2" % (slug(family), weight, subset)
            data = fetch(src)
            with open(os.path.join(FONTS_DIR, fname), "wb") as f:
                f.write(data)
            print("saved %s (%d bytes)" % (fname, len(data)))
            css_blocks.append(
                "@font-face{font-family:'%s';font-style:normal;font-weight:%s;"
                "font-display:swap;src:url('/assets/fonts/%s') format('woff2');"
                "unicode-range:%s;}" % (family, weight, fname, urange)
            )
    with open(CSS_OUT, "w") as f:
        f.write("\n".join(css_blocks) + "\n")
    print("wrote %s (%d rules)" % (CSS_OUT, len(css_blocks)))


if __name__ == "__main__":
    sys.exit(main())
