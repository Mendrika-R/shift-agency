#!/usr/bin/env bash
#
# Réindexe la base de connaissances du chatbot dans Cloudflare Vectorize.
# À lancer après chaque modification de worker/knowledge/{fr,en}.json
# ou du system prompt du Worker.
#
# Usage:
#   ./scripts/reindex.sh                      # prod : ré-ingère les chunks (upsert)
#   ./scripts/reindex.sh --deploy             # prod : redéploie le Worker puis ré-ingère
#   ./scripts/reindex.sh --fresh              # prod : recrée l'index Vectorize puis ré-ingère
#   ./scripts/reindex.sh --env preprod        # preprod : ré-ingère
#   ./scripts/reindex.sh --env preprod --deploy --fresh
#
# Config : crée un fichier .env à la racine du repo (voir .env.example) avec
#   WORKER_URL / INGEST_SECRET                (prod)
#   WORKER_URL_PREPROD / INGEST_SECRET_PREPROD (preprod)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV="prod"
DO_DEPLOY=false
DO_FRESH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deploy)  DO_DEPLOY=true ;;
    --fresh)   DO_FRESH=true ;;
    --env)     ENV="${2:-}"; shift ;;
    --env=*)   ENV="${1#--env=}" ;;
    *) echo "Argument inconnu : $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ "$ENV" != "prod" && "$ENV" != "preprod" ]]; then
  echo "ERREUR : --env doit valoir 'prod' ou 'preprod' (reçu : '$ENV')." >&2
  exit 1
fi

# --- Charge .env si présent ---
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# --- Sélectionne la cible selon l'environnement ---
if [[ "$ENV" == "preprod" ]]; then
  INDEX_NAME="shift-knowledge-preprod"
  WRANGLER_ENV=(--env preprod)
  WORKER_URL="${WORKER_URL_PREPROD:-}"
  INGEST_SECRET="${INGEST_SECRET_PREPROD:-}"
else
  INDEX_NAME="shift-knowledge"
  WRANGLER_ENV=()
fi
export WORKER_URL INGEST_SECRET

echo "Environnement : $ENV (index : $INDEX_NAME)"

if [[ -z "${INGEST_SECRET:-}" ]]; then
  echo "ERREUR : secret d'ingestion manquant pour '$ENV'. Renseigne-le dans .env (voir .env.example)." >&2
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
  echo "Déploiement du Worker ($ENV)..."
  ( cd worker && npx wrangler deploy "${WRANGLER_ENV[@]}" )
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
