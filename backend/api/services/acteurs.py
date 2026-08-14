from datetime import date, timedelta
from typing import Optional

from django.db.models import Sum
from django.db.models.functions import Coalesce

from api.models import AgentSante, CampagneCollecte, DeclarationRHS, ImportFichier, UserProfile
from api.permissions import declarations_queryset_for_user, get_user_profile, structures_queryset_for_user
from api.services.stats import get_active_campagne


def _agents_queryset_for_user(user, campagne: Optional[CampagneCollecte] = None):
    qs = AgentSante.objects.filter(actif=True).select_related(
        "structure",
        "structure__departement",
        "structure__zone_sanitaire",
    )
    if campagne:
        qs = qs.filter(campagne=campagne)
    profile = get_user_profile(user)
    if not profile:
        return qs.none()
    if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
        return qs.filter(structure_id=profile.structure_id)
    if profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
        return qs.filter(structure__departement_id=profile.departement_id)
    return qs


def _operational_declarations(user, campagne: Optional[CampagneCollecte] = None):
    campagne = campagne or get_active_campagne()
    if not campagne:
        return DeclarationRHS.objects.none()
    return (
        declarations_queryset_for_user(user)
        .filter(campagne=campagne)
        .exclude(statut=DeclarationRHS.Statut.BROUILLON)
        .select_related(
            "structure",
            "structure__departement",
            "structure__zone_sanitaire",
            "campagne",
        )
    )


def _priorite(postes_vacants: int, departs_6: int) -> str:
    if postes_vacants >= 5 or departs_6 >= 3:
        return "Haute"
    if postes_vacants >= 2 or departs_6 >= 1:
        return "Moyenne"
    return "Basse"


def planification_data(user, campagne: Optional[CampagneCollecte] = None):
    campagne = campagne or get_active_campagne()
    decls = _operational_declarations(user, campagne)

    zones: dict = {}
    for decl in decls:
        zone = decl.structure.zone_sanitaire
        if not zone:
            continue
        key = zone.code
        if key not in zones:
            zones[key] = {
                "zone": {"code": zone.code, "nom": zone.nom},
                "departement": {
                    "code": zone.departement.code,
                    "nom": zone.departement.nom,
                },
                "medecins": 0,
                "infirmiers": 0,
                "sages_femmes": 0,
                "postes_vacants": 0,
                "postes_budgetes": 0,
                "departs_retraite_6_mois": 0,
                "departs_retraite_12_mois": 0,
                "structures_count": 0,
            }
        row = zones[key]
        row["medecins"] += decl.medecins
        row["infirmiers"] += decl.infirmiers
        row["sages_femmes"] += decl.sages_femmes
        row["postes_vacants"] += decl.postes_vacants
        row["postes_budgetes"] += decl.postes_budgetes
        row["departs_retraite_6_mois"] += decl.departs_retraite_6_mois
        row["departs_retraite_12_mois"] += decl.departs_retraite_12_mois
        row["structures_count"] += 1

    besoins = []
    for row in zones.values():
        total_effectifs = row["medecins"] + row["infirmiers"] + row["sages_femmes"]
        vacants = row["postes_vacants"]
        if vacants > 0 and total_effectifs > 0:
            ratio_m = row["medecins"] / total_effectifs
            ratio_i = row["infirmiers"] / total_effectifs
            ratio_sf = row["sages_femmes"] / total_effectifs
            besoin_m = max(1, round(vacants * ratio_m)) if row["medecins"] else 0
            besoin_i = max(1, round(vacants * ratio_i)) if row["infirmiers"] else 0
            besoin_sf = max(1, round(vacants * ratio_sf)) if row["sages_femmes"] else 0
        else:
            besoin_m = max(0, vacants // 3)
            besoin_i = max(0, vacants // 3)
            besoin_sf = max(0, vacants - besoin_m - besoin_i)

        besoins.append(
            {
                **row,
                "besoin_medecins": besoin_m,
                "besoin_infirmiers": besoin_i,
                "besoin_sages_femmes": besoin_sf,
                "priorite": _priorite(vacants, row["departs_retraite_6_mois"]),
            }
        )

    besoins.sort(key=lambda x: x["postes_vacants"], reverse=True)

    today = date.today()
    limit_6 = today + timedelta(days=183)
    limit_12 = today + timedelta(days=365)

    retraites = []
    agents = _agents_queryset_for_user(user, campagne).filter(
        depart_retraite_prevu__isnull=False,
        depart_retraite_prevu__lte=limit_12,
    ).order_by("depart_retraite_prevu")

    for agent in agents:
        echeance = agent.depart_retraite_prevu
        horizon = "6 mois" if echeance <= limit_6 else "12 mois"
        retraites.append(
            {
                "id": agent.id,
                "agent": f"{agent.prenom} {agent.nom}",
                "matricule": agent.matricule,
                "profession": agent.profession,
                "structure": agent.structure.nom,
                "departement": agent.structure.departement.nom,
                "echeance": echeance.isoformat(),
                "horizon": horizon,
            }
        )

    return {
        "campagne": campagne,
        "besoins_recruitement": besoins,
        "alertes_retraite": retraites,
    }


def cartography_data(user, campagne: Optional[CampagneCollecte] = None):
    campagne = campagne or get_active_campagne()
    structures = structures_queryset_for_user(user).select_related(
        "departement",
        "zone_sanitaire",
    )
    decl_map = {
        d.structure_id: d
        for d in _operational_declarations(user, campagne)
    }

    rows = []
    for structure in structures.order_by("nom"):
        decl = decl_map.get(structure.id)
        if decl:
            techniciens = decl.techniciens_laboratoire + decl.techniciens_imagerie
            rows.append(
                {
                    "structure": {
                        "id": structure.id,
                        "code": structure.code,
                        "nom": structure.nom,
                        "type_structure": structure.type_structure,
                        "type_structure_label": structure.get_type_structure_display(),
                    },
                    "departement": {
                        "code": structure.departement.code,
                        "nom": structure.departement.nom,
                    },
                    "zone": (
                        {
                            "code": structure.zone_sanitaire.code,
                            "nom": structure.zone_sanitaire.nom,
                        }
                        if structure.zone_sanitaire
                        else None
                    ),
                    "effectif_total": decl.effectif_total,
                    "medecins": decl.medecins,
                    "infirmiers": decl.infirmiers,
                    "sages_femmes": decl.sages_femmes,
                    "pharmaciens": decl.pharmaciens,
                    "techniciens": techniciens,
                    "postes_vacants": decl.postes_vacants,
                    "postes_budgetes": decl.postes_budgetes,
                    "statut": decl.statut,
                    "statut_label": decl.get_statut_display(),
                    "a_declaration": True,
                }
            )
        else:
            rows.append(
                {
                    "structure": {
                        "id": structure.id,
                        "code": structure.code,
                        "nom": structure.nom,
                        "type_structure": structure.type_structure,
                        "type_structure_label": structure.get_type_structure_display(),
                    },
                    "departement": {
                        "code": structure.departement.code,
                        "nom": structure.departement.nom,
                    },
                    "zone": (
                        {
                            "code": structure.zone_sanitaire.code,
                            "nom": structure.zone_sanitaire.nom,
                        }
                        if structure.zone_sanitaire
                        else None
                    ),
                    "effectif_total": 0,
                    "medecins": 0,
                    "infirmiers": 0,
                    "sages_femmes": 0,
                    "pharmaciens": 0,
                    "techniciens": 0,
                    "postes_vacants": 0,
                    "postes_budgetes": 0,
                    "statut": None,
                    "statut_label": "Sans déclaration",
                    "a_declaration": False,
                }
            )

    result = {"campagne": campagne, "structures": rows}
    
    # Ajouter les données de densité de population si demandé
    include_density = True  # Par défaut pour la cartographie
    if include_density:
        result["population_density"] = _calculate_population_density()
    
    return result


def competences_data(user, campagne: Optional[CampagneCollecte] = None):
    campagne = campagne or get_active_campagne()
    agents = _agents_queryset_for_user(user, campagne).order_by("nom", "prenom")

    formations = []
    specialisations = []

    for agent in agents:
        if agent.diplome_principal or agent.ecole_formation:
            formations.append(
                {
                    "id": agent.id,
                    "agent": f"{agent.prenom} {agent.nom}",
                    "matricule": agent.matricule,
                    "diplome": agent.diplome_principal,
                    "ecole": agent.ecole_formation,
                    "annee": agent.annee_diplome,
                    "structure": agent.structure.nom,
                    "departement": agent.structure.departement.nom,
                }
            )
        if agent.specialite or (
            agent.profession and "spécialiste" in agent.profession.lower()
        ):
            specialisations.append(
                {
                    "id": agent.id,
                    "agent": f"{agent.prenom} {agent.nom}",
                    "matricule": agent.matricule,
                    "specialite": agent.specialite or agent.profession,
                    "profession": agent.profession,
                    "structure": agent.structure.nom,
                    "departement": agent.structure.departement.nom,
                }
            )

    return {
        "campagne": campagne,
        "formations": formations,
        "specialisations": specialisations,
    }


def interoperabilite_data(user):
    campagne = get_active_campagne()
    imports_qs = ImportFichier.objects.select_related("structure", "importe_par")
    if campagne:
        imports_qs = imports_qs.filter(campagne=campagne)
    imports = list(imports_qs.order_by("-created_at")[:25])

    agents_qs = _agents_queryset_for_user(user, campagne)
    total_agents = agents_qs.count()
    excel_agents = agents_qs.exclude(source_fichier="").exclude(
        source_fichier="seed_rhs_data"
    ).count()
    seed_agents = agents_qs.filter(source_fichier="seed_rhs_data").count()

    last_import = imports.first()
    import_ok = imports.filter(statut=ImportFichier.StatutImport.TERMINE).aggregate(
        total=Coalesce(Sum("lignes_ok"), 0)
    )["total"]

    sources = [
        {
            "id": "excel-orhs",
            "name": "Import Excel ORHS",
            "description": "Fiches agents importées via modèle Excel",
            "status": "connecté" if len(imports) > 0 else "en attente",
            "last_sync": last_import.created_at.isoformat() if last_import else None,
            "records": excel_agents or int(import_ok),
        },
        {
            "id": "seed",
            "name": "Données initialisées",
            "description": "Agents créés par les scripts de démonstration",
            "status": "connecté" if seed_agents else "en attente",
            "last_sync": None,
            "records": seed_agents,
        },
        {
            "id": "dhis2",
            "name": "DHIS2 / SNIS",
            "description": "Indicateurs sanitaires et effectifs agrégés",
            "status": "non connecté",
            "last_sync": None,
            "records": 0,
        },
        {
            "id": "fp",
            "name": "Solde Fonction Publique",
            "description": "Agents de l'État — secteur public",
            "status": "non connecté",
            "last_sync": None,
            "records": 0,
        },
        {
            "id": "eni",
            "name": "Écoles de santé (diplômés)",
            "description": "Import listes nouveaux diplômés",
            "status": "en attente",
            "last_sync": None,
            "records": 0,
        },
    ]

    historique = [
        {
            "id": imp.id,
            "nom_fichier": imp.nom_fichier,
            "statut": imp.statut,
            "lignes_total": imp.lignes_total,
            "lignes_ok": imp.lignes_ok,
            "lignes_erreur": imp.lignes_erreur,
            "structure": imp.structure.nom if imp.structure else None,
            "importe_par": imp.importe_par.get_full_name() if imp.importe_par else None,
            "created_at": imp.created_at.isoformat(),
        }
        for imp in imports
    ]

    return {
        "campagne": campagne,
        "sources": sources,
        "total_agents": total_agents,
        "historique_imports": historique,
    }
