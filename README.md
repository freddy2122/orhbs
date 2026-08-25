# ORHS Bénin — Observatoire des Ressources Humaines en Santé

Plateforme nationale de gestion, collecte, validation et diffusion des données sur les ressources humaines en santé (RHS) au Bénin.

**Stack :** React + TypeScript + Tailwind (frontend) · Django 4.2 + DRF + PostgreSQL (backend)

---

## Sommaire

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Comptes et rôles](#comptes-et-rôles)
5. [Parcours par acteur](#parcours-par-acteur)
6. [Comment alimenter les données](#comment-alimenter-les-données)
7. [API principales](#api-principales)
8. [Site public vs espace privé](#site-public-vs-espace-privé)
9. [État des modules](#état-des-modules)
10. [Ce qu'il reste à faire](#ce-quil-reste-à-faire)
11. [Déploiement](#déploiement)

---

## Vue d'ensemble

L'ORHS Bénin couvre deux espaces :

| Espace | URL | Public |
|--------|-----|--------|
| **Site institutionnel** | `/` | Grand public, chercheurs, partenaires |
| **Espace privé (dashboard)** | `/espace-prive` → `/dashboard` | Agents MS, DRH, collecteurs, coordination |

### Chaîne de valeur des données

```
Collecte (structure) → Soumission → Validation départementale (DRH/DDS)
    → Validation nationale (ORHS) → Statistiques officielles → Publication publique
```

Seules les déclarations au statut **`valide_national`** alimentent les statistiques officielles (`/api/stats/*`).

---

## Architecture

```
orhsb/
├── backend/                 # API Django REST
│   ├── api/
│   │   ├── models.py        # UserProfile, Structure, DeclarationRHS, AgentSante…
│   │   ├── services/        # stats, excel_import, acteurs
│   │   └── views_*.py       # auth, stats, collecte, acteurs
│   └── manage.py
├── frontend/                # React + Vite
│   └── src/
│       ├── pages/           # Site public + dashboards
│       ├── pages/dashboard/actors/  # Espace acteurs RH
│       └── lib/             # api-client, stats-api, collecte-api, acteurs-api
├── render.yaml              # Déploiement backend (Render)
└── frontend/vercel.json     # Déploiement frontend (Vercel)
```

### Hiérarchie territoriale

```
Département (12)
  └── Zone sanitaire (24)
        └── Structure sanitaire (CHU, HZ, CS, CSCOM…)
              └── DeclarationRHS (par campagne)
              └── AgentSante (fiches individuelles)
```

### RBAC — 7 rôles + périmètre

| Rôle | Périmètre possible | Rôle métier |
|------|-------------------|-------------|
| `admin` | National | Administration technique |
| `coordination` | National | Secrétariat permanent ORHS |
| `analyste` | National | Statistiques et rapports |
| `validateur` | National / Départemental | DRH, DDS — contrôle qualité |
| `collecteur` | Structure / Départemental | Point focal — saisie |
| `decideur` | National | Lecture exécutive (Ministre, DG) |
| `partenaire` | National | Chercheurs, ONG — lecture restreinte |

Le **périmètre** (`national` / `departemental` / `structure`) filtre automatiquement toutes les requêtes API.

---

## Installation

### Prérequis

- Python 3.9+
- Node.js 18+
- PostgreSQL 14+ (local ou Docker)

### Base de données

```bash
# Exemple Homebrew macOS
brew services start postgresql@18
createdb orhsb
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # DATABASE_URL, SECRET_KEY, CORS…
python manage.py migrate
python manage.py seed_orhsb      # Comptes + départements
python manage.py seed_rhs_data   # Structures, déclarations, agents démo
python manage.py runserver
```

API : [http://127.0.0.1:8000/api/health/](http://127.0.0.1:8000/api/health/)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://127.0.0.1:8000
npm run dev
```

Application : [http://localhost:5173](http://localhost:5173)

**Mot de passe par défaut (tous comptes seed) :** `Orhsb2026!`

---

## Comptes et rôles

### Comptes nationaux

| Identifiant | Rôle | Tableau de bord par défaut |
|-------------|------|---------------------------|
| `coordination` | Coordination ORHS | Vue exécutive |
| `validateur` | Validateur national | Validation |
| `analyste` | Analyste | Analyse |
| `collecteur.chu-mel` | Collecteur (CHU-MEL) | Collecte |
| `decideur` | Décideur | Vue exécutive |
| `admin` | Administrateur | Administration |

### Comptes DRH départementaux (les 12 départements)

| Identifiant | Département |
|-------------|-------------|
| `drh.alibori` | Alibori |
| `drh.atacora` | Atacora |
| `drh.atlantique` | Atlantique |
| `drh.borgou` | Borgou |
| `drh.collines` | Collines |
| `drh.couffo` | Couffo |
| `drh.donga` | Donga |
| `drh.littoral` | Littoral |
| `drh.mono` | Mono |
| `drh.oueme` | Ouémé |
| `drh.plateau` | Plateau |
| `drh.zou` | Zou |

Compte DDS supplémentaire : `dds.borgou` (même rôle / périmètre Borgou).

Connexion : **`/espace-prive`** → redirection automatique vers le dashboard du rôle.

---

## Parcours par acteur

### 1. Collecteur (point focal structure)

**Ex. :** `collecteur.chu-mel`

1. Se connecter → **Collecte & saisie**
2. Choisir sa structure et la campagne active
3. **Option A — Saisie en ligne :** remplir effectifs, 17 catégories professionnelles, planification
4. **Option B — Import Excel :** télécharger le modèle, remplir les fiches agents, importer
5. **Soumettre** la déclaration → statut `soumis`

L'import Excel recalcule automatiquement les totaux de la déclaration structure.

**Espace acteurs accessible :** Personnel, Cartographie, Compétences (données filtrées sur sa structure).

---

### 2. Validateur / DRH départemental

**Ex. :** `drh.littoral`, `dds.borgou`

1. Se connecter → **Validation & qualité**
2. Voir uniquement les déclarations de **son département**
3. **Approuver** (validation départementale) ou **Rejeter** avec commentaire
4. Les déclarations `valide_departement` remontent à la coordination pour validation nationale

**Espace acteurs :** Planification, Cartographie, Personnel, Compétences (périmètre départemental).

---

### 3. Coordination ORHS (national)

**Ex. :** `coordination`

1. **Vue exécutive** — KPI nationaux (données `valide_national` uniquement)
2. **Validation** — validation nationale des déclarations `valide_departement`
3. **Analyse** — graphiques par département et zone sanitaire
4. **Espace acteurs** — tous les modules
5. **Interopérabilité** — import Excel, suivi des sources

---

### 4. Analyste / Statisticien

**Ex. :** `analyste`

- Tableaux de bord analytiques (`/dashboard/analyse`)
- Export et rapports (modules NHWA, projections — en développement)
- Espace acteurs : Personnel, Compétences, Cartographie

---

### 5. Décideur

**Ex. :** `decideur`

- Lecture seule : vue exécutive, KPI, alertes
- Pas de saisie ni validation

---

### 6. Partenaire accrédité

**Ex. :** `partenaire.who`

- Analyse et compétences (lecture)
- Pas d'accès collecte/validation

---

## Comment alimenter les données

### Étape 1 — Initialiser le référentiel

```bash
python manage.py seed_orhsb     # Départements, comptes, 2 structures
python manage.py seed_rhs_data  # 12 dépts, 34 zones, HZ/CS/CSCOM/DDS/CHU
```

En production : importer le référentiel complet des structures via Django Admin ou script dédié.

### Étape 2 — Campagne de collecte

Une campagne active est définie en base (`CampagneCollecte`, ex. « Collecte annuelle RHS 2026 »).  
Une seule campagne peut être `active=True` à la fois.

### Étape 3 — Déclarations par structure

Chaque structure soumet **une déclaration RHS** par campagne :

| Champ | Description |
|-------|-------------|
| Effectifs | Total, femmes/hommes |
| 17 catégories pro | Médecins, infirmiers, sages-femmes… |
| Planification | Postes budgétés, vacants, départs retraite 6/12 mois |
| Observations | Commentaires DRH |

### Étape 4 — Fiches agents (optionnel mais recommandé)

Import Excel (`/api/collecte/import-excel/`) ou saisie unitaire :

- Matricule, identité, profession, diplôme, contrat
- Alimente : **Personnel**, **Compétences**, **alertes retraite**

### Étape 5 — Validation

```
brouillon → soumis → valide_departement → valide_national
                  ↘ rejete → correction → soumis
```

### Étape 6 — Publication publique

Les stats au statut `valide_national` sont exposées sans authentification (`/api/public/stats/*`).  
Le CMS alimente publications, actualités, agenda, FAQ, textes juridiques, formations et annuaire des ordres. Tant qu'aucun contenu n'est publié, le site affiche un état vide explicite.

---

## API principales

### Authentification (JWT)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login/` | `{ username, password }` → tokens |
| GET | `/api/auth/me/` | Profil + rôle + périmètre |

### Statistiques officielles (auth requise)

| Endpoint | Données |
|----------|---------|
| `GET /api/stats/national/` | KPI nationaux (`valide_national`) |
| `GET /api/stats/departements/` | Stats 12 départements |
| `GET /api/stats/zones/?departement=` | Par zone sanitaire |
| `GET /api/stats/structures/` | Par structure |

### API publique (sans authentification)

| Endpoint | Description |
|----------|-------------|
| `GET /api/public/stats/national/` | KPI nationaux validés |
| `GET /api/public/stats/departements/` | Stats par département |
| `GET /api/public/publications/` | Catalogue publié |
| `GET /api/public/contenus/?type=` | Actualités, agenda, FAQ, textes, formations |
| `GET /api/public/annuaire/` | Annuaire des Ordres (si alimenté) |
| `POST /api/public/newsletter/` | Inscription newsletter |
| `GET /api/docs/` | Documentation Swagger |
| `GET /api/schema/` | Schéma OpenAPI |

### Collecte

| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/collecte/declarations/` | CRUD déclarations |
| `POST /api/collecte/declarations/{id}/submit/` | Soumission |
| `POST /api/collecte/declarations/{id}/validate/` | Validation dept/national |
| `GET /api/collecte/agents/` | Liste agents (filtres RBAC) |
| `GET /api/collecte/template-excel/` | Modèle import |
| `POST /api/collecte/import-excel/` | Import agents |

### Espace acteurs

| Endpoint | Description |
|----------|-------------|
| `GET /api/acteurs/planification/` | Besoins recrutement + retraites |
| `GET /api/acteurs/cartographie/` | Effectifs par structure |
| `GET /api/acteurs/competences/` | Diplômes et spécialisations |
| `GET /api/acteurs/interoperabilite/` | Sources et historique imports |

---

## Site public vs espace privé

### Site public (`/`)

Pages institutionnelles (mission, partenaires, navigation) conservées.  
**Toutes les données dynamiques** (actualités, publications, chiffres clés, cartographie, annuaire, opportunités) affichent un **état vide explicite** tant qu'aucun contenu n'est publié via CMS ou API publique.

Messages typiques :
- « Aucune actualité disponible »
- « Aucune publication »
- « Aucun indicateur national publié »
- « Aucune structure dans l'annuaire »

### Espace privé (`/dashboard`)

Données **100 % API PostgreSQL** — pas de mock.  
Si la base est vide ou non validée, les tableaux affichent **0** et un message clair.

---

## État des modules

| Module | Statut | Source de données |
|--------|--------|-------------------|
| Auth JWT + RBAC | ✅ Opérationnel | PostgreSQL |
| Collecte & déclarations | ✅ Opérationnel | API |
| Import Excel agents | ✅ Opérationnel | openpyxl |
| Validation dept/national | ✅ Opérationnel | API |
| Stats nationales/dépt/zones | ✅ Opérationnel | Déclarations validées |
| Dashboard exécutif | ✅ Opérationnel | API stats |
| Dashboard validation | ✅ Opérationnel | API |
| Dashboard collecte | ✅ Opérationnel | API |
| Espace acteurs (5 modules) | ✅ Opérationnel | API acteurs |
| Alertes cloche | ✅ Opérationnel | API (par rôle) |
| Admin UI (CRUD users) | ✅ Opérationnel | API admin/users |
| CMS (actualités, publications) | ✅ Opérationnel | API cms/publications + cms/contenus |
| API publique (sans auth) | ✅ Opérationnel | `/api/public/*` |
| Indicateurs NHWA (OMS) | ⏳ Partiel | Ratios de densité uniquement |
| Projections / simulation RH | ✅ Opérationnel | API reports (évolution 5 ans) |
| DHIS2 / Fonction Publique | ⏳ Non connecté | Passerelles futures |
| Annuaire Ordres professionnels | ✅ Prêt (vide) | API publique + CMS, en attente d'import officiel |
| Cartographie publique | ✅ Opérationnel | Page publique + API |
| Audit & monitoring | ✅ Opérationnel | API + UI admin |
| Générateur graphiques | ✅ Opérationnel | API reports (modèles personnalisés) |
| Module mobilité / affectations | ✅ Opérationnel | API admin/mouvements |
| Export Excel/PDF | ✅ Opérationnel | API export (agents, déclarations, rapports) |
| Alertes email automatiques | ✅ Opérationnel | API alerts + config (SMTP en prod) |
| Mode hors ligne | ✅ Opérationnel | API offline (sync) |
| Sauvegardes automatiques | ✅ Opérationnel | Cron `run_scheduled_jobs` + bouton admin |
| Documentation API | ✅ Opérationnel | `/api/docs/` (Swagger) |
| Pyramide des âges | ✅ Opérationnel | API reports (indicateur pyramide) |
| Alertes structures sans médecin | ✅ Opérationnel | API alerts/advanced |
| Déséquilibres genre | ✅ Opérationnel | API alerts/advanced |

---

## Ce qu'il reste à faire

### Données métier (hors développement)

1. **Référentiel structures complet** — import des ~485 structures officielles (au-delà du seed démo)
2. **Import annuaire Ordre des médecins** — le module est prêt, les inscriptions officielles manquent
3. **SMTP de production** — renseigner `EMAIL_HOST` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` sur Render

### Chantiers fonctionnels restants

4. **Calcul NHWA** — 78 indicateurs OMS (seuls les ratios de densité sont calculés)
5. **Passerelle DHIS2 / Fonction publique / SNIS** — non commencée
6. **Carte au niveau commune** — pas de modèle Commune ; le zoom s'arrête aux zones sanitaires
7. **Export carte PDF dédié** — le PNG SVG est disponible ; le PDF utilise l'impression navigateur

---

## Déploiement (test en ligne)

Le projet est prévu pour **GitHub Actions (CI)** + **Render (API + PostgreSQL)** + **Vercel (frontend)**.

**Base de données : PostgreSQL**, pas MySQL. Sur l’écran Render « Create a new… », choisissez :

1. **Postgres** — base de données (pas Key Value / Redis, pas MySQL)
2. **Web Services** — API Django (`backend/`)
3. Plus tard : frontend sur **Vercel** (ou Render Static Sites)

Le CD Render se branche sur GitHub : chaque push sur `main` qui passe le CI peut être déployé automatiquement.

| Composant | Cible | Fichier config |
|-----------|-------|----------------|
| CI | GitHub Actions | `.github/workflows/ci.yml` |
| Backend | Render Web Service | `render.yaml`, `backend/build.sh` |
| Frontend | Vercel | `frontend/vercel.json` |
| Base | Render Postgres | Variable `DATABASE_URL` |

Variables d'environnement :

```bash
# Backend (Render)
DATABASE_URL=postgres://...
DJANGO_SECRET_KEY=...
CORS_ALLOWED_ORIGINS=https://votre-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://votre-frontend.vercel.app
FRONTEND_PUBLIC_URL=https://votre-frontend.vercel.app

# Frontend (Vercel)
VITE_API_URL=https://votre-backend.onrender.com
```

---

## Commandes utiles

```bash
# ⚠️ IMPORTANT : Les commandes seed sont pour le DÉVELOPPEMENT uniquement
# Elles créent des données de démonstration qui ne doivent PAS être utilisées en production
# En production, les données doivent être saisies par les acteurs réels via l'interface

# Réinitialiser données de démonstration (développement uniquement)
python manage.py seed_orhsb
python manage.py seed_rhs_data

# Créer un superutilisateur Django
python manage.py createsuperuser

# Tests backend
python manage.py test

# Documentation API
# http://localhost:8000/api/docs/

# Alertes email + sauvegarde planifiée
python manage.py run_scheduled_jobs --dry-run
# Crontab quotidien (6h) : python manage.py run_scheduled_jobs

# Build production frontend
cd frontend && npm run build
```

## Données et périmètres utilisateurs

### Filtrage par périmètre
Chaque utilisateur ne voit que les données de son périmètre configuré :
- **National** : voit toutes les données nationales
- **Départemental** : voit uniquement les données de son département
- **Structure** : voit uniquement les données de sa structure

### EmptyState
Si aucune donnée n'existe pour le périmètre d'un utilisateur, un message explicite est affiché :
- "Aucune structure dans votre périmètre" - pour les collecteurs
- "Aucune déclaration dans votre périmètre" - pour les validateurs
- "Aucune donnée disponible" - pour les statistiques

### Données de seed
Les commandes `seed_orhsb` et `seed_rhs_data` créent des données de démonstration pour :
- Tester l'interface pendant le développement
- Former les utilisateurs sur l'application
- Démontrer les fonctionnalités

**En production, ces données ne doivent pas être utilisées.** Les données réelles proviennent uniquement des saisies des utilisateurs (collecteurs, DRH, etc.).

---

## Principe affichage des données

> **Aucune donnée codée en dur dans l'interface.**  
> Tout contenu statistique ou éditorial provient de PostgreSQL ou affiche un état vide explicite (`EmptyState`).

Les **seeds** (`seed_orhsb`, `seed_rhs_data`) servent uniquement au **développement local** pour tester les parcours. En production, seules les données saisies et validées par les acteurs réels sont affichées.

---

## Contact & support

Pour les problèmes d'accès à l'espace privé, contacter l'administrateur ORHS Bénin ou le secrétariat permanent du Ministère de la Santé.

---

*Documentation mise à jour — plateforme ORHS Bénin, Observatoire des Ressources Humaines en Santé.*
