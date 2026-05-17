# Guide de déploiement — Chatbot RAG Velos

## Prérequis comptes
- Cloudflare (gratuit) : https://dash.cloudflare.com
- Qdrant Cloud (gratuit) : https://cloud.qdrant.io
- OpenRouter (gratuit) : https://openrouter.io
- n8n Cloud (gratuit) : https://app.n8n.io

---

## Étape 1 — Cloudflare Worker

### Installer Wrangler et déployer
```bash
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
```
→ Note l'URL affichée : `https://shift-chatbot.workers.dev`

### Configurer les secrets
```bash
wrangler secret put OPENROUTER_API_KEY
# Valeur : clé OpenRouter obtenue à l'étape 4

wrangler secret put QDRANT_URL
# Valeur : https://TON_CLUSTER.qdrant.io

wrangler secret put QDRANT_API_KEY
# Valeur : clé API Qdrant

wrangler secret put N8N_LEAD_WEBHOOK
# Valeur : URL webhook n8n (obtenue à l'étape 5)

wrangler secret put INGEST_SECRET
# Valeur : une chaîne aléatoire, ex: openssl rand -hex 16

wrangler secret put ALLOWED_ORIGIN
# Valeur : https://ton-domaine.com
```

---

## Étape 2 — Qdrant Cloud

### Créer le cluster
1. https://cloud.qdrant.io → Create cluster → Free Tier
2. Note l'URL et la clé API

### Créer la collection
```bash
curl -X PUT https://TON_CLUSTER.qdrant.io/collections/shift_knowledge \
  -H "api-key: TON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"vectors":{"size":768,"distance":"Cosine"}}'
```

---

## Étape 3 — Ingestion de la base de connaissance

```bash
WORKER_URL=https://shift-chatbot.workers.dev \
INGEST_SECRET=ton_ingest_secret \
QDRANT_URL=https://TON_CLUSTER.qdrant.io \
QDRANT_API_KEY=ta_cle_qdrant \
node scripts/ingest.js
```
Résultat attendu : `Total inserted: 20 / 20 chunks.`

---

## Étape 4 — OpenRouter

1. https://openrouter.io → Sign up → API Keys → Create key
2. Modèle utilisé : `meta-llama/llama-3.3-70b-instruct:free` (gratuit, rate limited)
3. Mettre la clé : `wrangler secret put OPENROUTER_API_KEY`

---

## Étape 5 — n8n Cloud

1. https://app.n8n.io → New workflow → Import → `n8n/lead-workflow.json`
2. Configurer les credentials Gmail et Google Sheets dans n8n
3. Créer un Google Sheet avec les colonnes : Date, Nom, Contact, Projet, Langue, Session
4. Remplacer `REMPLACER_PAR_SPREADSHEET_ID` par l'ID de ton sheet
5. Activer le workflow → noter l'URL du webhook production
6. `wrangler secret put N8N_LEAD_WEBHOOK` avec cette URL

### Workflow d'ingestion docx (optionnel)
1. Importer `n8n/ingest-workflow.json`
2. Remplacer `REMPLACER_PAR_WORKER_URL` par l'URL du Worker
3. Remplacer `REMPLACER_PAR_INGEST_SECRET` par le secret d'ingestion

---

## Étape 6 — Mettre à jour chatbot.js avec l'URL réelle

Dans `chatbot.js`, ligne 4, remplacer si nécessaire :
```javascript
var WORKER_URL = 'https://shift-chatbot.workers.dev';
```
Par l'URL exacte retournée par `wrangler deploy` (si différente).

Redéployer le site sur Hostinger.

---

## Étape 7 — Ajouter un document docx ultérieurement

```bash
curl -X POST https://TON_N8N.app.n8n.io/webhook/velos-ingest \
  -F "data=@offres_commerciales_agence.docx" \
  -F "lang=fr" \
  -F "source=offres_commerciales"
```

---

## Vérification finale

1. Ouvrir le site dans le navigateur
2. Cliquer sur le bouton vert bas-droite
3. Poser : "Quels sont vos tarifs web ?"
4. Vérifier que la réponse cite les vrais tarifs (500€, 1500€, 2500€)
5. Envoyer un lead test → vérifier Gmail et Google Sheets
