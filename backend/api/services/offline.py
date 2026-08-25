from datetime import datetime
from typing import Dict, List

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from api.models import (
    AgentSante,
    CampagneCollecte,
    DeclarationRHS,
    Structure,
    UserProfile,
)

DECLARATION_SYNC_FIELDS = (
    "effectif_total",
    "dont_femmes",
    "dont_hommes",
    "medecins",
    "medecins_generalistes",
    "medecins_specialistes",
    "infirmiers",
    "infirmiers_auxiliaires",
    "sages_femmes",
    "sages_femmes_auxiliaires",
    "pharmaciens",
    "techniciens_laboratoire",
    "techniciens_imagerie",
    "agents_sante_communautaire",
    "chirurgiens_dentistes",
    "kinesitherapeutes",
    "autres_paramedicaux",
    "administratifs",
    "agents_entretien",
    "autre_personnel",
    "postes_budgetes",
    "postes_pourvus",
    "postes_vacants",
    "departs_retraite_6_mois",
    "departs_retraite_12_mois",
    "observations",
)

PROTECTED_STATUTS = {
    DeclarationRHS.Statut.SOUMIS,
    DeclarationRHS.Statut.VALIDE_DEPARTEMENT,
    DeclarationRHS.Statut.VALIDE_NATIONAL,
}


class OfflineSyncManager:
    """Gestionnaire pour le mode hors ligne et synchronisation différée."""

    @staticmethod
    def prepare_offline_data(user):
        """Prépare les données nécessaires pour le travail hors ligne."""
        profile = getattr(user, "profile", None)
        if not profile:
            return None

        # Récupérer la campagne active
        campagne = CampagneCollecte.objects.filter(active=True).first()
        if not campagne:
            return None

        # Récupérer les structures accessibles
        structures = Structure.objects.filter(actif=True).select_related("departement", "zone_sanitaire")
        if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
            structures = structures.filter(id=profile.structure_id)
        elif profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
            structures = structures.filter(departement_id=profile.departement_id)

        # Récupérer les déclarations existantes
        declarations_qs = DeclarationRHS.objects.filter(campagne=campagne)
        if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id:
            declarations_qs = declarations_qs.filter(structure_id=profile.structure_id)
        elif profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement_id:
            declarations_qs = declarations_qs.filter(structure__departement_id=profile.departement_id)

        # Préparer les données
        offline_data = {
            "version": "1.0",
            "date_export": datetime.now().isoformat(),
            "user_id": user.id,
            "campagne": {
                "id": campagne.id,
                "code": campagne.code,
                "libelle": campagne.libelle,
                "annee": campagne.annee,
            },
            "structures": [
                {
                    "id": s.id,
                    "code": s.code,
                    "nom": s.nom,
                    "type_structure": s.type_structure,
                    "departement": {
                        "code": s.departement.code,
                        "nom": s.departement.nom,
                    } if s.departement else None,
                    "zone_sanitaire": {
                        "code": s.zone_sanitaire.code,
                        "nom": s.zone_sanitaire.nom,
                    } if s.zone_sanitaire else None,
                }
                for s in structures
            ],
            "declarations": [
                {
                    "id": d.id,
                    "structure_id": d.structure_id,
                    "statut": d.statut,
                    "effectif_total": d.effectif_total,
                    "dont_femmes": d.dont_femmes,
                    "dont_hommes": d.dont_hommes,
                    "medecins": d.medecins,
                    "medecins_generalistes": d.medecins_generalistes,
                    "medecins_specialistes": d.medecins_specialistes,
                    "infirmiers": d.infirmiers,
                    "infirmiers_auxiliaires": d.infirmiers_auxiliaires,
                    "sages_femmes": d.sages_femmes,
                    "sages_femmes_auxiliaires": d.sages_femmes_auxiliaires,
                    "pharmaciens": d.pharmaciens,
                    "techniciens_laboratoire": d.techniciens_laboratoire,
                    "techniciens_imagerie": d.techniciens_imagerie,
                    "agents_sante_communautaire": d.agents_sante_communautaire,
                    "chirurgiens_dentistes": d.chirurgiens_dentistes,
                    "kinesitherapeutes": d.kinesitherapeutes,
                    "autres_paramedicaux": d.autres_paramedicaux,
                    "administratifs": d.administratifs,
                    "agents_entretien": d.agents_entretien,
                    "autre_personnel": d.autre_personnel,
                    "postes_budgetes": d.postes_budgetes,
                    "postes_pourvus": d.postes_pourvus,
                    "postes_vacants": d.postes_vacants,
                    "departs_retraite_6_mois": d.departs_retraite_6_mois,
                    "departs_retraite_12_mois": d.departs_retraite_12_mois,
                    "observations": d.observations,
                    "updated_at": d.updated_at.isoformat(),
                }
                for d in declarations_qs
            ],
            "agents": [
                {
                    "id": a.id,
                    "structure_id": a.structure_id,
                    "matricule": a.matricule,
                    "nom": a.nom,
                    "prenom": a.prenom,
                    "sexe": a.sexe,
                    "profession": a.profession,
                    "poste_occupe": a.poste_occupe,
                    "statut_agent": a.statut_agent,
                }
                for a in AgentSante.objects.filter(
                    actif=True,
                    campagne=campagne,
                    structure_id__in=structures.values_list("id", flat=True),
                ).order_by("nom", "prenom")[:500]
            ],
            "champs_formulaire": OfflineSyncManager._get_formulaire_fields(),
        }

        return offline_data

    @staticmethod
    def _get_formulaire_fields():
        """Retourne la configuration des champs du formulaire."""
        from api.constants.rhs_fields import (
            DECLARATION_EFFECTIF_FIELDS,
            DECLARATION_PLANIFICATION_FIELDS,
            DECLARATION_PROFESSION_FIELDS,
            PROFESSIONS_SANTE,
        )

        return {
            "effectifs": [{"key": k, "label": label, "required": req} for k, label, req in DECLARATION_EFFECTIF_FIELDS],
            "professions": [{"key": k, "label": label, "required": req} for k, label, req in DECLARATION_PROFESSION_FIELDS],
            "planification": [{"key": k, "label": label, "required": req} for k, label, req in DECLARATION_PLANIFICATION_FIELDS],
            "professions_sante": PROFESSIONS_SANTE,
        }

    @staticmethod
    def sync_declaration(user, offline_declaration: Dict) -> Dict:
        """Synchronise une déclaration créée/modifiée hors ligne."""
        profile = getattr(user, "profile", None)
        if not profile:
            return {"success": False, "error": "Profil utilisateur introuvable"}

        # Vérifier la structure
        structure = Structure.objects.filter(id=offline_declaration.get("structure_id")).first()
        if not structure:
            return {"success": False, "error": "Structure introuvable"}

        # Vérifier les permissions
        if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id != structure.id:
            return {"success": False, "error": "Structure hors périmètre"}
        if (
            profile.scope == UserProfile.Scope.DEPARTEMENTAL
            and profile.departement_id != structure.departement_id
        ):
            return {"success": False, "error": "Structure hors périmètre"}

        # Récupérer ou créer la déclaration
        campagne = CampagneCollecte.objects.filter(active=True).first()
        if not campagne:
            return {"success": False, "error": "Aucune campagne active"}

        payload = {
            field: offline_declaration.get(field, 0 if field != "observations" else "")
            for field in DECLARATION_SYNC_FIELDS
        }
        if "dont_homes" in offline_declaration and not offline_declaration.get("dont_hommes"):
            payload["dont_hommes"] = offline_declaration.get("dont_homes", 0)

        existing = DeclarationRHS.objects.filter(campagne=campagne, structure=structure).first()
        if existing and existing.statut in PROTECTED_STATUTS:
            return {
                "success": False,
                "conflict": True,
                "declaration_id": existing.id,
                "error": "Déclaration déjà soumise ou validée — fusion manuelle requise.",
            }

        if existing:
            for field, value in payload.items():
                setattr(existing, field, value)
            existing.save()
            declaration, created = existing, False
        else:
            declaration = DeclarationRHS.objects.create(
                campagne=campagne,
                structure=structure,
                statut=DeclarationRHS.Statut.BROUILLON,
                **payload,
            )
            created = True

        return {
            "success": True,
            "declaration_id": declaration.id,
            "created": created,
            "statut": declaration.statut,
        }

    @staticmethod
    def sync_agents_batch(user, agents_data: List[Dict]) -> Dict:
        """Synchronise un lot d'agents créés hors ligne."""
        profile = getattr(user, "profile", None)
        if not profile:
            return {"success": False, "error": "Profil utilisateur introuvable"}

        campagne = CampagneCollecte.objects.filter(active=True).first()
        if not campagne:
            return {"success": False, "error": "Aucune campagne active"}

        results = {"success": 0, "errors": 0, "details": []}

        for agent_data in agents_data:
            try:
                # Vérifier la structure
                structure = Structure.objects.filter(id=agent_data.get("structure_id")).first()
                if not structure:
                    results["errors"] += 1
                    results["details"].append({
                        "matricule": agent_data.get("matricule"),
                        "error": "Structure introuvable",
                    })
                    continue

                # Vérifier les permissions
                if profile.scope == UserProfile.Scope.STRUCTURE and profile.structure_id != structure.id:
                    results["errors"] += 1
                    results["details"].append({
                        "matricule": agent_data.get("matricule"),
                        "error": "Structure hors périmètre",
                    })
                    continue

                # Créer ou mettre à jour l'agent
                agent, created = AgentSante.objects.update_or_create(
                    campagne=campagne,
                    matricule=agent_data["matricule"],
                    defaults={
                        "structure": structure,
                        "nom": agent_data.get("nom", ""),
                        "prenom": agent_data.get("prenom", ""),
                        "sexe": agent_data.get("sexe", "M"),
                        "date_naissance": agent_data.get("date_naissance"),
                        "profession": agent_data.get("profession", ""),
                        "grade": agent_data.get("grade", ""),
                        "specialite": agent_data.get("specialite", ""),
                        "diplome_principal": agent_data.get("diplome_principal", ""),
                        "ecole_formation": agent_data.get("ecole_formation", ""),
                        "annee_diplome": agent_data.get("annee_diplome"),
                        "secteur": agent_data.get("secteur", "public"),
                        "statut_agent": agent_data.get("statut_agent", "actif"),
                        "type_contrat": agent_data.get("type_contrat", "permanent"),
                        "poste_occupe": agent_data.get("poste_occupe", ""),
                        "date_prise_service": agent_data.get("date_prise_service"),
                        "date_fin_contrat": agent_data.get("date_fin_contrat"),
                        "depart_retraite_prevu": agent_data.get("depart_retraite_prevu"),
                        "telephone": agent_data.get("telephone", ""),
                        "email": agent_data.get("email", ""),
                        "nationalite": agent_data.get("nationalite", "Béninoise"),
                        "actif": True,
                        "source_fichier": "offline_sync",
                    },
                )

                results["success"] += 1
                results["details"].append({
                    "matricule": agent.matricule,
                    "created": created,
                })

            except Exception as e:
                results["errors"] += 1
                results["details"].append({
                    "matricule": agent_data.get("matricule"),
                    "error": str(e),
                })

        return results

    @staticmethod
    def detect_conflicts(user, offline_data: Dict) -> List[Dict]:
        """Détecte les conflits entre les données locales et serveur."""
        conflicts = []

        campagne = CampagneCollecte.objects.filter(active=True).first()
        if not campagne:
            return conflicts

        # Vérifier les déclarations
        for offline_decl in offline_data.get("declarations", []):
            server_decl = DeclarationRHS.objects.filter(
                campagne=campagne,
                structure_id=offline_decl["structure_id"],
            ).first()

            if server_decl:
                offline_updated = parse_datetime(str(offline_decl.get("updated_at") or ""))
                if offline_updated and timezone.is_naive(offline_updated):
                    offline_updated = timezone.make_aware(offline_updated)
                server_updated = server_decl.updated_at
                if offline_updated and server_updated > offline_updated:
                    conflicts.append({
                        "type": "declaration",
                        "structure_id": offline_decl["structure_id"],
                        "server_version": server_updated.isoformat(),
                        "offline_version": offline_updated.isoformat(),
                        "message": "La version serveur est plus récente",
                    })
                elif server_decl.statut in PROTECTED_STATUTS:
                    conflicts.append({
                        "type": "declaration",
                        "structure_id": offline_decl["structure_id"],
                        "server_version": server_updated.isoformat(),
                        "offline_version": offline_decl.get("updated_at"),
                        "message": "La déclaration serveur est déjà soumise ou validée",
                    })

        return conflicts
