import json
from datetime import datetime
from typing import Dict, List, Optional

from django.db.models import Q

from api.models import (
    AgentSante,
    CampagneCollecte,
    DeclarationRHS,
    Structure,
    UserProfile,
)


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
        structures = Structure.objects.filter(actif=True)
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
                    "infirmiers": d.infirmiers,
                    "sages_femmes": d.sages_femmes,
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

        declaration, created = DeclarationRHS.objects.update_or_create(
            campagne=campagne,
            structure=structure,
            defaults={
                "statut": DeclarationRHS.Statut.BROUILLON,
                "effectif_total": offline_declaration.get("effectif_total", 0),
                "dont_femmes": offline_declaration.get("dont_femmes", 0),
                "dont_hommes": offline_declaration.get("dont_homes", 0),
                "medecins": offline_declaration.get("medecins", 0),
                "medecins_generalistes": offline_declaration.get("medecins_generalistes", 0),
                "medecins_specialistes": offline_declaration.get("medecins_specialistes", 0),
                "infirmiers": offline_declaration.get("infirmiers", 0),
                "infirmiers_auxiliaires": offline_declaration.get("infirmiers_auxiliaires", 0),
                "sages_femmes": offline_declaration.get("sages_femmes", 0),
                "sages_femmes_auxiliaires": offline_declaration.get("sages_femmes_auxiliaires", 0),
                "pharmaciens": offline_declaration.get("pharmaciens", 0),
                "techniciens_laboratoire": offline_declaration.get("techniciens_laboratoire", 0),
                "techniciens_imagerie": offline_declaration.get("techniciens_imagerie", 0),
                "agents_sante_communautaire": offline_declaration.get("agents_sante_communautaire", 0),
                "chirurgiens_dentistes": offline_declaration.get("chirurgiens_dentistes", 0),
                "kinesitherapeutes": offline_declaration.get("kinesitherapeutes", 0),
                "autres_paramedicaux": offline_declaration.get("autres_paramedicaux", 0),
                "administratifs": offline_declaration.get("administratifs", 0),
                "agents_entretien": offline_declaration.get("agents_entretien", 0),
                "autre_personnel": offline_declaration.get("autre_personnel", 0),
                "postes_budgetes": offline_declaration.get("postes_budgetes", 0),
                "postes_pourvus": offline_declaration.get("postes_pourvus", 0),
                "postes_vacants": offline_declaration.get("postes_vacants", 0),
                "departs_retraite_6_mois": offline_declaration.get("departs_retraite_6_mois", 0),
                "departs_retraite_12_mois": offline_declaration.get("departs_retraite_12_mois", 0),
                "observations": offline_declaration.get("observations", ""),
            },
        )

        # Si la déclaration existait déjà et a été modifiée hors ligne, mettre à jour
        if not created:
            for field, value in offline_declaration.items():
                if hasattr(declaration, field) and field != "id" and field != "structure_id":
                    setattr(declaration, field, value)
            declaration.save()

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
                # Comparer les versions
                offline_updated = datetime.fromisoformat(offline_decl["updated_at"])
                if server_decl.updated_at > offline_updated:
                    conflicts.append({
                        "type": "declaration",
                        "structure_id": offline_decl["structure_id"],
                        "server_version": server_decl.updated_at.isoformat(),
                        "offline_version": offline_updated.isoformat(),
                        "message": "La version serveur est plus récente",
                    })

        return conflicts
