# Velos — Stratégie GTM, refonte site & plan de lancement

> Conversation de travail — 17 mai 2026
> Contexte : Velos, agence digitale (3 personnes), bascule positionnement vers automatisation + IA, cible France/Québec, objectif premier client signé.

---

## Session 2026-05-17 — Chatbot RAG

- Conception et implémentation du chatbot IA bilingue FR/EN
- Architecture : Cloudflare Worker (RAG) + Qdrant + OpenRouter Llama 3.3 70B + n8n
- Widget panel latéral, design Hyper-Digital Brutalism, streaming SSE
- Base de connaissance : 20 chunks réels du site (10 FR + 10 EN)
- Lead capture après 3 échanges → n8n → Gmail + Google Sheets
- Déploiement différé (comptes à créer : Cloudflare, Qdrant, OpenRouter, n8n)
- Fichiers : `chatbot.js`, `worker/`, `scripts/ingest.js`, `n8n/`, `docs/chatbot-deploy.md`

---

## Sommaire

1. [Repo gtm-agents : analyse et plugins utiles](#1-repo-gtm-agents)
2. [Décisions de cadrage](#2-décisions-de-cadrage)
3. [Secteur cible n°1 : agences immobilières](#3-secteur-cible-agences-immobilières)
4. [Refonte du site velos.agency](#4-refonte-du-site-velosagency)
5. [Pricing — 3 packs IA/automatisation](#5-pricing--3-packs-iaautomatisation)
6. [Planning de contenu LinkedIn + Instagram — 30 jours](#6-planning-de-contenu-30-jours)
7. [Prochaines étapes](#7-prochaines-étapes)

---

## 1. Repo gtm-agents

**Source** : `github.com/gtmagents/gtm-agents`

Collection de **67 plugins et 92 agents spécialisés pour Claude Code**, couvrant tout le cycle GTM : sales-prospecting, sales-pipeline, content-marketing, email-marketing, copywriting, social-media, account-management, sales-coaching, etc. Chaque "plugin" est un dossier de skills markdown (méthodologies, frameworks, prompts) que Claude Code charge dans son contexte au besoin. Gratuit, MIT, vit dans `~/.claude/plugins/`.

### Vraie utilité pour Velos

Ce repo ne va pas trouver de clients. Il va faire gagner du temps sur la **production des assets commerciaux et marketing** — goulot d'étranglement principal vu qu'aucun des 3 cofondateurs n'est commercial pur.

### Plugins à installer (sélectif, pas tout)

1. **`sales-prospecting`** — 5 skills : cold outreach, social selling, lead qualification, discovery calls, objection handling. Devient le "manuel de prospection" de Velos.
2. **`copywriting`** — Notamment `cold-email-personalization` et `offer-testing`. 50-100 emails/séquences à écrire dans les 3 prochains mois.
3. **`content-marketing`** — Études de cas, articles LinkedIn, preuve sociale.
4. **`email-marketing`** — Séquences de nurturing post-`linkedin-lead-gen`.
5. **`sales-enablement`** — Battlecards et playbooks. Aligne les 3 cofondateurs sur les objections types.
6. **`account-management`** — Pour structurer QBR et upsell vers retainers (objectif 50%+ MRR).

### Articulation avec les skills existants

Skills custom déjà installés :
- `linkedin-lead-gen` — sourcing + enrichissement Clay
- `linkedin-content-agent` — création posts/carrousels
- `monthly-labs-pptx` — livrables Novity Labs
- `market-watch` / `it-watch` — veille

Les plugins gtm-agents complètent sur la **conversion** (lead → RDV → signature). Skills actuels sourcent et publient. Plugins ajoutent les frameworks de séquence multi-touch.

### Piège à éviter

Installer les 67 plugins "au cas où" pollue le contexte Claude Code. Logique progressive disclosure : charger seulement les skills pertinents au moment du besoin.

---

## 2. Décisions de cadrage

### Sur le site
- **Mettre en valeur** : la rapidité et les offres
- **Ne pas mentionner** : les personnes de l'équipe, Madagascar (le mentionner uniquement lors des échanges directs avec le prospect si besoin)
- **Cible** : France / Québec en premier
- **Affichage des prix** : direct sur le site, pas de comparaison ni référence
- **Chiffres** : ronds (1 500, 3 500, 7 000, 250)

### Sur le kit commercial
- Besoin d'un **planning de publication de contenu** (carrousels, posts) pour LinkedIn et Instagram
- Possibilité d'ajouter d'autres canaux si pertinent

### Sur les preuves
- Pas encore de projet client au nom de Velos
- Stratégie : créer des **démos sous différents formats** à partir des workflows qu'on veut vendre

---

## 3. Secteur cible : agences immobilières

### Classement final des cibles

| Secteur | Volume marché | Capacité à payer | Cycle décision | Récep. IA | Concurrence | Score |
|---|---|---|---|---|---|---|
| **Agences immobilières indépendantes** | Énorme | 3-15k€ facile | 1-3 sem. | Forte | Faible | **9/10** |
| Cabinets d'experts-comptables | Énorme | 5-20k€ | 4-8 sem. | Moyenne | Saturée | 6/10 |
| Agences de communication/marketing | Moyen | 2-8k€ | 2-4 sem. | Très forte | TRÈS saturée | 5/10 |
| Cabinets d'avocats | Moyen | 5-20k€ | 6-12 sem. | Faible | Faible | 4/10 |

### Pourquoi l'immobilier gagne

- Volume de leads massif = douleur quotidienne réelle = paie pour automatiser
- WhatsApp/SMS/email = 90% du flux commercial → exactement le stack Velos
- Mandataires solo et petites agences (2-10 négociateurs) prennent leurs décisions en 1 semaine, signent vite
- Très peu d'agences IA visent ce segment sérieusement (tout le monde court derrière le SaaS)
- Cas d'usage hyper-démontrables : qualification de lead 24/7, relance automatique, génération de description de bien, matching acheteur/vendeur

### Cible secondaire (après 3 premières signatures immo)

**Agences de communication/marketing.** Saturé mais effet bouche-à-oreille fort si livraison propre.

### À éviter au début

Restaurants/hôtellerie (paie pas), associations (paie pas), avocats (cycle trop long pour 6 mois de runway), e-commerce DTC (saturé d'agences spécialisées).

---

## 4. Refonte du site velos.agency

### Diagnostic du site actuel

Solide sur l'ADN mais 3 problèmes pour la nouvelle vision :

1. Le hero parle de "business en ligne" = positionnement agence web classique. Aucun mot sur l'IA ou l'automatisation.
2. Les services sont 100% web (Vitrine, E-Commerce, SaaS, Autre). L'automatisation est planquée en "extension".
3. Mobile Money + WhatsApp Africa-flavored dans les extensions = crame l'illusion France/Québec en 3 secondes.

### Hero (à remplacer)

> **Vos workflows installés.**
> **En 14 jours.**
>
> Automatisations IA, bots conversationnels, intégrations métier.
> On installe, on teste avec vous, on garantit que ça tourne.
>
> [Voir les offres] [Lancer mon projet]
>
> `14 jours` Déploiement standard · `−40%` vs agence classique · `0€` coûts cachés

### Les 3 chiffres (à remplacer "48h / 3× / 0€")

> `14 j` Installation complète
> `24/7` Disponibilité de vos workflows
> `0€` Surprises en cours de projet

### Section "L'Avantage" — réécriture 2/3 des piliers

**Garder** : "Vitesse d'exécution inégalée"

**Remplacer pilier 2** :
> **Installation, pas démo**
> On ne vous vend pas un PoC qui plante en production. Chaque workflow livré est testé par notre QA et tourne en conditions réelles avant qu'on vous remette les clés.

**Remplacer pilier 3** :
> **Prix affichés. Délais contractuels.**
> Pas de devis fleuve, pas de "ça dépend". Les offres sont publiées. Si on rate les délais, c'est nous qui payons la pénalité.

### Section "Nos Services" — refonte complète

Inversion de la logique : **l'automatisation devient le service principal**, le web devient secondaire.

**Service 1 — `bolt` Automatisations & IA** *(nouveau, en premier)*
> Workflows métier installés en quelques jours. Bots qui qualifient, automatisations qui exécutent, intégrations qui fonctionnent en production.

**Service 2 — `chat` Bots conversationnels IA** *(nouveau)*
> Agents WhatsApp, web et email qui qualifient vos prospects 24/7. Posent les bonnes questions, route vers le bon contact, notifient en temps réel.

**Service 3 — `hub` Intégrations & Pipelines de données** *(nouveau)*
> Vos outils enfin connectés. Synchronisation bidirectionnelle CRM, ERP, marketing automation, comptabilité. Plus de double saisie.

**Service 4 — `storefront` Sites & E-commerce** *(fusion des 3 anciens, version condensée)*
> Sites vitrines, e-commerce et applications web sur-mesure. Quand l'automatisation a besoin d'une interface, on la livre aussi.

### À supprimer du site

- Section "Extensions Architecturales" (Mobile Money / WhatsApp Afrique / CRM) — ou déplacer sur page Madagascar dédiée si tu veux garder ce business
- Toute mention "Mobile Money", "opérateurs africains"
- Le footer "Africa" si présent
- Bascule EN qui mène vers une version africaine
- Tout langage qui sent l'export tropicalisé

### Simulateur — modifications

- **Étape 1** : remplacer "objectif plateforme" par "Quel est votre besoin principal ?" avec les 4 nouveaux services
- Reste du simulateur conservé, mise à jour des recommandations finales pour pointer vers les nouveaux packs

---

## 5. Pricing — 3 packs IA/automatisation

Calibrés pour France/Québec TPE-PME, marge confortable.

### Pack Connect — 1 500€
*Unique, déploiement 7-10j*

- 1 workflow d'automatisation au choix
- 1 intégration entre 2 outils existants
- Hébergement n8n 3 mois inclus
- Documentation + 1h de formation
- *Idéal pour : automatiser une tâche répétitive qui coûte du temps*

### Pack Commerce — 3 500€ — **RECOMMANDÉ**
*Unique, déploiement 14j*

- Bot conversationnel IA (WhatsApp ou web)
- Qualification automatique des leads
- Notifications temps réel équipe
- Synchronisation CRM
- Hébergement 6 mois inclus
- *Idéal pour : ne plus rater un seul prospect*

### Pack Système — 7 000€
*Unique, déploiement 21j*

- 3 workflows d'automatisation intégrés
- Bot IA multicanal (WhatsApp + email + web)
- Tableau de bord de pilotage
- Intégration sur-mesure 3 outils
- Hébergement 12 mois inclus + monitoring
- *Idéal pour : industrialiser tout un pan opérationnel*

### Sur-mesure — sur devis

(L'actuel Enterprise reste)

### Maintenance & Évolution — à partir de 250€/mois

> Monitoring, mises à jour, ajustements mineurs, support prioritaire. Engagement 6 mois.

**Crucial pour construire le MRR vers le 50% visé.**

---

## 6. Planning de contenu 30 jours

### Stratégie de fond

Pas de preuve sociale client → stratégie **"montrer qu'on construit + démontrer la valeur"**. Les démos internes deviennent le contenu principal.

### Cadence cible

- **LinkedIn** : 4 posts/semaine (mar, mer, jeu, ven à 8h)
- **Instagram** : 3 posts/semaine + 1 reel (lun, mer, ven)
- **Carrousels** : 1/semaine sur LinkedIn (jeudi = pic portée B2B)

### Les 4 piliers de contenu

1. **Démos workflow (40%)** : workflow Velos en action sur un cas immo
2. **Pédagogie IA pour non-tech (30%)** : démystification, réponses aux objections
3. **Coulisses / construction (20%)** : on construit Velos en public
4. **Provocation positionnement (10%)** : ton brutal Velos, on tape sur les pratiques de l'industrie

### Calendrier 4 semaines (LinkedIn)

#### Semaine 1 — "On démarre, voilà pourquoi"

- **Mar** : Post manifesto "Pourquoi on lance Velos : les agences IA vous prennent 15k€ pour un chatbot qu'on installe en 3 jours" (provocation)
- **Mer** : Démo vidéo 60s "Un bot WhatsApp qui qualifie un lead immo en 4 questions"
- **Jeu** : **Carrousel** "5 tâches qu'un négociateur immo répète 200x/mois (et comment les automatiser)"
- **Ven** : Post pédagogique "C'est quoi un workflow d'automatisation, expliqué sans jargon"

#### Semaine 2 — "Les cas d'usage immo"

- **Mar** : Démo "Génération automatique de descriptions de biens à partir d'une fiche"
- **Mer** : Post coulisses "On a passé 6h à débugger une intégration Jestimmo cette semaine, voici ce qu'on a appris"
- **Jeu** : **Carrousel** "Le parcours d'un lead immobilier en 2026 : 70% se perdent avant le rappel. Voici où."
- **Ven** : Post objection "*'L'IA c'est trop tôt pour mon agence'* — 3 chiffres qui prouvent le contraire"

#### Semaine 3 — "Démonstration de force"

- **Mar** : **Carrousel** "On a construit en 14 jours ce que Sinch facture 25k€. Voici le workflow exact."
- **Mer** : Démo "Relance automatique post-visite : 0 à 3 messages selon le comportement du prospect"
- **Jeu** : Post pédagogique "WhatsApp vs SMS vs Email en immobilier : les chiffres de réponse réels"
- **Ven** : Post manifesto "Pourquoi on affiche nos prix" (renforce la transparence)

#### Semaine 4 — "L'offre + appel à l'action"

- **Mar** : Démo "Tableau de bord pilotage agence immo en temps réel"
- **Mer** : Témoignage PM "Voici ce que j'aurais voulu avoir quand j'étais en agence"
- **Jeu** : **Carrousel** "Velos : nos 3 packs, leurs prix, leurs délais. C'est public."
- **Ven** : Post "On prend 3 nouveaux clients immobilier en juin. Voilà comment on les choisit."

### Instagram — adaptation

- Carrousels LinkedIn → carrousels IG (max 10 slides, plus visuel)
- Démos vidéos → reels verticaux 30-60s
- Posts texte → visuel typographique (Velos brand : orange + noir + Montserrat)
- Stories quotidiennes : work in progress, sondages, AMA

### Outils de production

- Skill existant `linkedin-content-agent` (ton Velos)
- + Plugin `content-marketing` + `copywriting` de gtm-agents (frameworks de carrousels qui convertissent)

---

## 7. Prochaines étapes

### Ordre d'exécution

1. **Validation/ajustement** : secteur immo, 4 services, 3 packs + prix ronds, ton du planning éditorial
2. **Textes finaux du site** : rédaction parfaite en français, prête à coller dans le code, par section, format clair pour intégration dev en 2-3h
3. **Conception des démos** : 3-4 workflows immo à filmer/screenshooter pour alimenter le contenu et constituer une "library" de preuves
4. **Kit prospection** : séquence email + scripts LinkedIn + page d'objections internes

### Installation Claude Code

- Ajouter `sales-prospecting` + `copywriting` (étape 1 minimale)
- Plus tard : `content-marketing`, `email-marketing`, `sales-enablement`, `account-management`

### Décisions actées

- ✅ Secteur prioritaire : agences immobilières indépendantes France/Québec
- ✅ Site : refonte ciblée 80% existant conservé, automatisation devient service principal
- ✅ Prix ronds : 1 500€ / 3 500€ / 7 000€ / 250€ MRR
- ✅ Aucune mention Madagascar sur le site public
- ✅ Pas de section équipe — focus sur les offres
- ✅ Démos internes = contenu principal (pas de case studies clients pour l'instant)

---

## 8. Implémentation site — session 2026-05-17

**Commit :** `b33467c` · `feat: add AI/automation offer with adaptive simulator`

### Ce qui a été livré

- **Section #automation** ajoutée entre Services Web et Tarifs (3 cartes : Workflows, Bots conversationnels, Intégrations & Pipelines)
- **Extensions Architecturales supprimées** (Mobile Money, WhatsApp Afrique — conflit de positionnement France/Québec)
- **Pricing refactorisé** en 2 sous-blocs visuels :
  - Services Web (Starter 500€ / Business 1 500€ / Premium 2 500€ / Sur-mesure)
  - Automatisation & IA (Connect 1 500€ / Commerce 3 500€ / Système 7 000€ / Sur-mesure)
  - Bande retainer : Velos Keep 50€/mois (web) + Velos Care 150€/mois (IA)
- **Simulateur enrichi** : étape 0 ajoutée (routage flux web/IA/les deux), step-1 adaptatif, étape accompagnement filtrée par flux
- **Navigation** : lien AUTOMATION ajouté (desktop + burger)
- **Process étape 03** renommée "Cadrage & Déploiement"
- **Bug fix** : clés i18n `simLabels.objectif` complétées pour les options IA et mixtes

### Vérifications faites

- ✅ 0 erreur JS console
- ✅ Section automation visible et stylée
- ✅ Pricing IA (Connect/Commerce/Système) fonctionnel
- ✅ Simulateur : flux IA → "Bot Conversationnel" → recommande Commerce 3 500€ 14j
- ✅ Étape accompagnement IA n'affiche que Velos Care (pas Keep)

### Prochaine étape site

- Décider du sort de `/en/index.html` (sync ou désactivation temporaire du switch langue)
