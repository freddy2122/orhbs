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

### Comptes DRH départementaux (1 par département)

| Identifiant | Exemple |
|-------------|---------|
| `drh.littoral` | DRH Littoral |
| `drh.oueme` | DRH Ouémé |
| `drh.borgou` | DRH Borgou |
| `dds.borgou` | DDS Borgou (équivalent validateur dept.) |
| … | `drh.{code_departement}` pour les 12 départements |

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
python manage.py seed_rhs_data  # 12 dépts, 24 zones, 26 structures, déclarations
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

### Étape 6 — Publication publique (à venir)

Les stats validées nationalement alimenteront automatiquement le site public (chiffres clés, cartes, publications). **Actuellement le site public affiche des états vides** en attendant le module CMS et l'API publique.

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
| CMS (actualités, publications) | ✅ Opérationnel | API cms/publications |
| API publique (sans auth) | ⏳ À faire | Stats agrégées anonymisées |
| Indicateurs NHWA (OMS) | ⏳ À faire | Calcul automatique |
| Projections / simulation RH | ✅ Opérationnel | API reports (évolution 5 ans) |
| DHIS2 / Fonction Publique | ⏳ Non connecté | Passerelles futures |
| Annuaire Ordres professionnels | ⏳ Vide | Import Ordre des médecins |
| Cartographie publique | ✅ Opérationnel | Page publique + API |
| Audit & monitoring | ✅ Opérationnel | API admin/audit + monitoring |
| Générateur graphiques | ✅ Opérationnel | API reports (modèles personnalisés) |
| Module mobilité / affectations | ✅ Opérationnel | API admin/mouvements |
| Export Excel/PDF | ✅ Opérationnel | API export (agents, déclarations) |
| Alertes email automatiques | ✅ Opérationnel | API alerts + config |
| Mode hors ligne | ✅ Opérationnel | API offline (sync) |
| Sauvegardes automatiques | ✅ Opérationnel | API monitoring/backup |
| Pyramide des âges | ✅ Opérationnel | API reports (indicateur pyramide) |
| Alertes structures sans médecin | ✅ Opérationnel | API alerts/advanced |
| Déséquilibres genre | ✅ Opérationnel | API alerts/advanced |

---

## Ce qu'il reste à faire

### Priorité haute

1. **API publique read-only** — exposer stats agrégées `valide_national` sans authentification pour le site public
2. **Référentiel structures complet** — import des ~485 structures officielles (au-delà du seed démo)
3. **Calcul NHWA** — 78 indicateurs OMS à partir des déclarations validées
4. **Passerelle DHIS2** — synchronisation effectifs agrégés SNIS
5. **Annuaire conformité** — import registre Ordre National des Médecins
6. **API Swagger publique** — documentation développeurs

### Priorité moyenne

7. **Interface frontend pour le CMS** — pages admin pour gérer publications et catégories
8. **Interface frontend pour les rapports** — sélecteur de modèles et génération interactive
9. **Interface frontend pour l'audit** — tableau de bord des logs d'audit
10. **Interface frontend pour le monitoring** — dashboard de santé système

### Priorité basse

11. **Export PDF rapports** — génération PDF avec templates (nécessite librairie PDF)
12. **Export carte PNG/PDF** — nécessite installation html2canvas/jsPDF
13. **Tâche cron pour sauvegardes** — configuration automatique des backups quotidiens
14. **Tâche cron pour alertes email** — envoi automatique des alertes programmées

---

## Déploiement

| Composant | Cible | Fichier config |
|-----------|-------|----------------|
| Backend | Render | `render.yaml`, `backend/build.sh` |
| Frontend | Vercel | `frontend/vercel.json` |
| Base | PostgreSQL managé | Variable `DATABASE_URL` |

Variables d'environnement :

```bash
# Backend
DATABASE_URL=postgres://...
SECRET_KEY=...
CORS_ALLOWED_ORIGINS=https://votre-frontend.vercel.app

# Frontend
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

# Tests backend (si configurés)
python manage.py test

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
