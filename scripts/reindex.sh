#!/usr/bin/env bash
#
# Réindexe la base de connaissances du chatbot dans Cloudflare Vectorize.
# À lancer après chaque modification de worker/knowledge/{fr,en}.json
# ou du system prompt du Worker.
#
# Usage:
#   ./scripts/reindex.sh                 # ré-ingère les chunks (upsert)
#   ./scripts/reindex.sh --deploy        # redéploie le Worker puis ré-ingère
#   ./scripts/reindex.sh --fresh         # recrée l'index Vectorize de zéro, puis ré-ingère
#   ./scripts/reindex.sh --deploy --fresh
#
# Config : crée un fichier .env à la racine du repo (voir .env.example) avec
#   WORKER_URL=...
#   INGEST_SECRET=...

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

INDEX_NAME="shift-knowledge"
DO_DEPLOY=false
DO_FRESH=false

for arg in "$@"; do
  case "$arg" in
    --deploy) DO_DEPLOY=true ;;
    --fresh)  DO_FRESH=true ;;
    *) echo "Argument inconnu : $arg" >&2; exit 1 ;;
  esac
done

# --- Charge .env si présent ---
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${INGEST_SECRET:-}" ]]; then
  echo "ERREUR : INGEST_SECRET manquant. Renseigne-le dans .env (voir .env.example)." >&2
  exit 1
fi

# --- Valide les fichiers de connaissances ---
echo "Validation des fichiers de connaissances..."
node -e "JSON.parse(require('fs').readFileSync('worker/knowledge/fr.json')); \
         JSON.parse(require('fs').readFileSync('worker/knowledge/en.json'));" \
  || { echo "ERREUR : JSON invalide dans worker/knowledge/." >&2; exit 1; }
echo "  JSON OK"

# --- Redéploie le Worker si demandé ---
if [[ "$DO_DEPLOY" == true ]]; then
  echo "Déploiement du Worker..."
  ( cd worker && npx wrangler deploy )
fi

# --- Recrée l'index Vectorize si demandé ---
if [[ "$DO_FRESH" == true ]]; then
  echo "Recréation de l'index Vectorize '$INDEX_NAME' (vide les anciens vecteurs)..."
  ( cd worker && npx wrangler vectorize delete "$INDEX_NAME" ) || true
  ( cd worker && npx wrangler vectorize create "$INDEX_NAME" --dimensions=768 --metric=cosine )
fi

# --- Ré-ingestion ---
echo "Ré-ingestion des chunks dans Vectorize..."
node scripts/ingest.js

echo "Terminé."
