from datetime import datetime, timedelta
from typing import List, Dict

from django.db.models import Q, Count, Sum
from django.db.models.functions import Coalesce

from api.models import (
    AgentSante,
    AlerteEmail,
    CampagneCollecte,
    ConfigAlerte,
    DeclarationRHS,
    Departement,
    Structure,
    ZoneSanitaire,
)


class AlertGenerator:
    """Générateur d'alertes automatiques pour ORHSB."""

    @staticmethod
    def check_structures_sans_medecin(campagne=None):
        """Détecte les structures sans médecin titulaire depuis plus de 3 mois."""
        qs = DeclarationRHS.objects.filter(statut=DeclarationRHS.Statut.VALIDE_NATIONAL)
        if campagne:
            qs = qs.filter(campagne=campagne)

        structures_sans_medecin = []
        date_limite = datetime.now() - timedelta(days=90)

        for decl in qs:
            if decl.medecins == 0:
                # Vérifier si c'est depuis plus de 3 mois
                if decl.date_valide_national and decl.date_valide_national < date_limite:
                    structures_sans_medecin.append({
                        "structure": decl.structure.nom,
                        "type_structure": decl.structure.get_type_structure_display(),
                        "departement": decl.structure.departement.nom,
                        "zone": decl.structure.zone_sanitaire.nom if decl.structure.zone_sanitaire else None,
                        "date_derniere_validation": decl.date_valide_national.isoformat(),
                        "jours_sans_medecin": (datetime.now() - decl.date_valide_national).days,
                    })

        return structures_sans_medecin

    @staticmethod
    def check_desequilibres_genre(campagne=None, seuil_ratio=0.3):
        """Détecte les déséquilibres de genre dans certaines spécialités ou zones."""
        qs = DeclarationRHS.objects.filter(statut=DeclarationRHS.Statut.VALIDE_NATIONAL)
        if campagne:
            qs = qs.filter(campagne=campagne)

        desequilibres = []

        # Par département
        for dept in Departement.objects.all():
            dept_qs = qs.filter(structure__departement=dept)
            totals = dept_qs.aggregate(
                total=Coalesce(Sum("effectif_total"), 0),
                femmes=Coalesce(Sum("dont_femmes"), 0),
            )

            if totals["total"] > 0:
                ratio_femmes = totals["femmes"] / totals["total"]
                if ratio_femmes < seuil_ratio or ratio_femmes > (1 - seuil_ratio):
                    desequilibres.append({
                        "type": "departement",
                        "nom": dept.nom,
                        "effectif_total": totals["total"],
                        "femmes": totals["femmes"],
                        "hommes": totals["total"] - totals["femmes"],
                        "ratio_femmes": round(ratio_femmes * 100, 2),
                        "seuil_alerte": round(seuil_ratio * 100, 2),
                    })

        # Par spécialité (médecins)
        medecins_qs = qs.filter(medecins__gt=0)
        for dept in Departement.objects.all():
            dept_med_qs = medecins_qs.filter(structure__departement=dept)
            totals = dept_med_qs.aggregate(
                total_med=Coalesce(Sum("medecins"), 0),
            )

            # Estimer le nombre de femmes médecins (approximation basée sur le ratio global)
            dept_totals = qs.filter(structure__departement=dept).aggregate(
                total=Coalesce(Sum("effectif_total"), 0),
                femmes=Coalesce(Sum("dont_femmes"), 0),
            )

            if totals["total_med"] > 0 and dept_totals["total"] > 0:
                ratio_femmes_global = dept_totals["femmes"] / dept_totals["total"]
                femmes_med_estimees = int(totals["total_med"] * ratio_femmes_global)
                
                if ratio_femmes_global < seuil_ratio or ratio_femmes_global > (1 - seuil_ratio):
                    desequilibres.append({
                        "type": "specialite",
                        "specialite": "Médecins",
                        "departement": dept.nom,
                        "total": totals["total_med"],
                        "femmes_estimees": femmes_med_estimees,
                        "hommes_estimes": totals["total_med"] - femmes_med_estimees,
                        "ratio_femmes": round(ratio_femmes_global * 100, 2),
                    })

        return desequilibres

    @staticmethod
    def check_zones_penurie_critique(campagne=None, seuil_ratio=1.5):
        """Détecte les zones sanitaires en situation de pénurie critique."""
        qs = DeclarationRHS.objects.filter(statut=DeclarationRHS.Statut.VALIDE_NATIONAL)
        if campagne:
            qs = qs.filter(campagne=campagne)

        zones_critiques = []

        for zone in ZoneSanitaire.objects.select_related("departement").all():
            zone_qs = qs.filter(structure__zone_sanitaire=zone)
            totals = zone_qs.aggregate(
                medecins=Coalesce(Sum("medecins"), 0),
                infirmiers=Coalesce(Sum("infirmiers"), 0),
            )

            population = zone.departement.population
            if population > 0:
                ratio_medecins = totals["medecins"] / population * 10000
                ratio_infirmiers = totals["infirmiers"] / population * 10000

                if ratio_medecins < seuil_ratio:
                    zones_critiques.append({
                        "zone": zone.nom,
                        "departement": zone.departement.nom,
                        "medecins": totals["medecins"],
                        "infirmiers": totals["infirmiers"],
                        "population": population,
                        "ratio_medecins_10k": round(ratio_medecins, 2),
                        "ratio_infirmiers_10k": round(ratio_infirmiers, 2),
                        "seuil_critique": seuil_ratio,
                        "niveau": "critique" if ratio_medecins < 1.0 else "alerte",
                    })

        return zones_critiques

    @staticmethod
    def generate_alerte_email(
        type_alerte: str,
        donnees_contexte: Dict,
        structure=None,
        departement=None,
        seuil_declencheur=None,
        valeur_actuelle=None,
        valeur_seuil=None,
    ):
        """Crée une alerte email dans la base de données."""
        
        # Récupérer la configuration
        config = ConfigAlerte.objects.filter(type_alerte=type_alerte, actif=True).first()
        if not config:
            return None

        # Générer le sujet et le corps
        sujet = config.template_sujet or f"Alerte ORHS: {type_alerte}"
        corps = config.template_sujet or f"Une alerte a été déclenchée: {type_alerte}"

        # Personnaliser avec les données de contexte
        if donnees_contexte:
            for key, value in donnees_contexte.items():
                sujet = sujet.replace(f"{{{key}}}", str(value))
                corps = corps.replace(f"{{{key}}}", str(value))

        # Créer l'alerte
        alerte = AlerteEmail.objects.create(
            type_alerte=type_alerte,
            statut=AlerteEmail.StatutAlerte.EN_ATTENTE,
            destinataires=config.destinataires_defaut,
            sujet=sujet,
            corps=corps,
            donnees_contexte=donnees_contexte,
            structure_concernee=structure,
            departement_concerne=departement,
            seuil_declencheur=seuil_declencheur or "",
            valeur_actuelle=valeur_actuelle,
            valeur_seuil=valeur_seuil or config.seuil_min,
        )

        return alerte

    @staticmethod
    def run_all_checks(campagne=None):
        """Exécute tous les contrôles d'alerte et crée les alertes email."""
        alertes_creees = []

        # Structures sans médecin
        structures_sans_medecin = AlertGenerator.check_structures_sans_medecin(campagne)
        if structures_sans_medecin:
            for struct in structures_sans_medecin:
                alerte = AlertGenerator.generate_alerte_email(
                    type_alerte=AlerteEmail.TypeAlerte.STRUCTURE_SANS_MEDECIN,
                    donnees_contexte={
                        "structure": struct["structure"],
                        "departement": struct["departement"],
                        "jours": struct["jours_sans_medecin"],
                    },
                    seuil_declencheur="jours_sans_medecin",
                    valeur_actuelle=struct["jours_sans_medecin"],
                    valeur_seuil=90,
                )
                if alerte:
                    alertes_creees.append(alerte)

        # Déséquilibres de genre
        desequilibres = AlertGenerator.check_desequilibres_genre(campagne)
        if desequilibres:
            for deseq in desequilibres:
                alerte = AlertGenerator.generate_alerte_email(
                    type_alerte=AlerteEmail.TypeAlerte.DESEQUILIBRE_GENRE,
                    donnees_contexte={
                        "type": deseq["type"],
                        "nom": deseq.get("nom") or deseq.get("departement"),
                        "ratio_femmes": deseq["ratio_femmes"],
                    },
                    seuil_declencheur="ratio_femmes",
                    valeur_actuelle=deseq["ratio_femmes"],
                    valeur_seuil=30.0,
                )
                if alerte:
                    alertes_creees.append(alerte)

        # Zones en pénurie critique
        zones_critiques = AlertGenerator.check_zones_penurie_critique(campagne)
        if zones_critiques:
            for zone in zones_critiques:
                alerte = AlertGenerator.generate_alerte_email(
                    type_alerte=AlerteEmail.TypeAlerte.SEUIL_COUVERTURE,
                    donnees_contexte={
                        "zone": zone["zone"],
                        "departement": zone["departement"],
                        "ratio": zone["ratio_medecins_10k"],
                    },
                    seuil_declencheur="ratio_medecins_10k",
                    valeur_actuelle=zone["ratio_medecins_10k"],
                    valeur_seuil=1.5,
                )
                if alerte:
                    alertes_creees.append(alerte)

        return alertes_creees
