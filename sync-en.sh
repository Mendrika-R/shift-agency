#!/usr/bin/env bash
# Sync the English copy from the canonical French source.
# Usage: ./sync-en.sh
#
# index.html is the source of truth. en/index.html is regenerated from it
# with <html lang="en"> for SEO. The runtime applies the i18n dictionary
# at load time based on the URL path (/ → fr, /en/ → en).

set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f index.html ]]; then
  echo "error: index.html not found" >&2
  exit 1
fi

mkdir -p en
cp index.html en/index.html

# macOS / BSD vs GNU sed
if sed --version >/dev/null 2>&1; then
  SED=(sed -i)
else
  SED=(sed -i '')
fi

"${SED[@]}" 's|<html class="dark" lang="fr">|<html class="dark" lang="en">|' en/index.html

echo "synced: index.html → en/index.html"
