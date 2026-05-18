# Guide de déploiement — Chatbot RAG Velos

> Stack : Cloudflare Worker + Vectorize + Workers AI · OpenRouter · n8n

---

## Architecture

```
index.html → chatbot.js → Worker (shift-chatbot.velos.workers.dev)
                               ├── /chat   → Vectorize (RAG) + OpenRouter (LLM)
                               ├── /ingest → Vectorize (ingestion knowledge)
                               └── /lead   → n8n webhook (capture lead)
```

---

## Étape 1 — Déployer le Worker Cloudflare

### Via Cloudflare MCP (recommandé — depuis Claude Code)
Le MCP Cloudflare est configuré dans ce projet. Après redémarrage de Claude Code
avec le token, les commandes de déploiement s'exécutent directement depuis
l'assistant.

### Via Wrangler CLI (alternative)
```bash
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
```
→ URL : `https://shift-chatbot.velos.workers.dev`

---

## Étape 2 — Créer l'index Vectorize

```bash
cd worker
wrangler vectorize create shift-knowledge --dimensions=768 --metric=cosine
```

Ou via le MCP Cloudflare directement depuis Claude Code.

---

## Étape 3 — Configurer les secrets Worker

```bash
cd worker
wrangler secret put OPENROUTER_API_KEY   # clé OpenRouter
wrangler secret put N8N_LEAD_WEBHOOK     # URL webhook n8n
wrangler secret put INGEST_SECRET        # secret aléatoire: openssl rand -hex 16
wrangler secret put ALLOWED_ORIGIN       # https://velos.agency
```

---

## Étape 4 — OpenRouter

1. https://openrouter.io → API Keys → Create key
2. Modèle : `meta-llama/llama-3.3-70b-instruct:free` (gratuit)
3. `wrangler secret put OPENROUTER_API_KEY`

---

## Étape 5 — Ingestion de la base de connaissance

Les fichiers sources sont dans `worker/knowledge/fr.json` et `worker/knowledge/en.json`.

### Configuration (une seule fois)
Copier le gabarit et renseigner le secret :
```bash
cp .env.example .env
# puis éditer .env : renseigner INGEST_SECRET (identique au secret du Worker)
```

### Réindexer (à chaque modification de la base de connaissance)
```bash
./scripts/reindex.sh            # ré-ingère les chunks (upsert)
./scripts/reindex.sh --deploy   # redéploie le Worker, puis ré-ingère
./scripts/reindex.sh --fresh    # recrée l'index Vectorize à vide, puis ré-ingère
```
Résultat attendu : `Done. Total inserted: 22 / 22 chunks.`

Les IDs des vecteurs sont déterministes (`lang-source-chunk_index`) : une
ré-ingestion **écrase** la version précédente de chaque chunk, sans créer de
doublon. Utiliser `--fresh` uniquement après un changement du nombre ou de la
structure des chunks.

---

## Étape 6 — n8n Cloud (capture leads)

1. https://app.n8n.io → New workflow → Import → `n8n/lead-workflow.json`
2. Configurer credentials Gmail + Google Sheets
3. Créer un Google Sheet : colonnes Date, Nom, Contact, Projet, Langue, Session
4. Remplacer `REMPLACER_PAR_SPREADSHEET_ID` par l'ID du sheet
5. Activer le workflow → copier l'URL webhook production
6. `wrangler secret put N8N_LEAD_WEBHOOK` avec cette URL

### Ingestion depuis docx (optionnel)
1. Importer `n8n/ingest-workflow.json` dans n8n
2. Remplacer `REMPLACER_PAR_WORKER_URL` et `REMPLACER_PAR_INGEST_SECRET`

---

## Étape 7 — Vérification finale

1. Ouvrir le site dans le navigateur
2. Cliquer sur le bouton vert bas-droite
3. Poser : "Quels sont vos tarifs web ?"
4. Vérifier que la réponse cite les vrais tarifs (500€, 1500€, 2500€)
5. Envoyer un lead test → vérifier Gmail et Google Sheets

---

## État du déploiement

| Composant | Statut |
|---|---|
| Worker code | ✅ Déployé (`shift-chatbot.velos.workers.dev`) |
| wrangler.toml | ✅ Configuré (`shift-knowledge`, binding AI + VECTORIZE) |
| Cloudflare MCP | ✅ Configuré (token injecté, redémarrage requis) |
| Index Vectorize | ✅ Créé (`shift-knowledge`) |
| Secrets Worker | ✅ Configurés |
| Ingestion knowledge | ⏳ Lancer `./scripts/reindex.sh --fresh` |
| n8n lead webhook | ⏳ À configurer |
| Frontend chatbot.js | ✅ Intégré dans index.html |
