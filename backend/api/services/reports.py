import csv
import io
from datetime import datetime, timedelta
from typing import Optional

from django.db.models import Sum, Count, Q
from django.db.models.functions import Coalesce

from api.models import (
    AgentSante,
    CampagneCollecte,
    DeclarationRHS,
    Departement,
    MouvementAgent,
    Structure,
    ZoneSanitaire,
)


class ReportGenerator:
    """Générateur de rapports personnalisés pour ORHSB."""

    MODELES_RAPPORT = {
        "mensuel_drh": {
            "nom": "Rapport mensuel DRH",
            "description": "Rapport mensuel pour les Directions Régionales de la Santé",
            "indicateurs": ["effectifs", "mouvements", "retraites", "postes_vacants"],
        },
        "annuel_orhs": {
            "nom": "Rapport annuel ORHS",
            "description": "Rapport annuel de l'Observatoire des Ressources Humaines en Santé",
            "indicateurs": ["effectifs", "evolution", "pyramide_ages", "couverture", "specialites"],
        },
        "oms_unfpa": {
            "nom": "Rapport partenaires OMS/UNFPA",
            "description": "Rapport standardisé pour les partenaires internationaux",
            "indicateurs": ["effectifs", "ratios_oms", "couverture", "disparites"],
        },
        "cartographique": {
            "nom": "Rapport cartographique",
            "description": "Rapport avec cartes de distribution géographique",
            "indicateurs": ["distribution_geo", "densites", "zones_sous_servees"],
        },
    }

    @staticmethod
    def generate_report_data(
        modele: str,
        campagne: Optional[CampagneCollecte] = None,
        departement_code: Optional[str] = None,
        zone_code: Optional[str] = None,
        date_debut: Optional[datetime] = None,
        date_fin: Optional[datetime] = None,
    ):
        """Génère les données pour un rapport personnalisé."""
        
        if modele not in ReportGenerator.MODELES_RAPPORT:
            raise ValueError(f"Modèle de rapport inconnu: {modele}")

        config = ReportGenerator.MODELES_RAPPORT[modele]
        data = {
            "modele": modele,
            "nom_modele": config["nom"],
            "description": config["description"],
            "date_generation": datetime.now().isoformat(),
            "campagne": campagne.libelle if campagne else None,
            "periode": {
                "debut": date_debut.isoformat() if date_debut else None,
                "fin": date_fin.isoformat() if date_fin else None,
            },
            "filtres": {
                "departement": departement_code,
                "zone": zone_code,
            },
            "indicateurs": {},
        }

        # Filtrer les déclarations selon les paramètres
        qs = DeclarationRHS.objects.filter(statut=DeclarationRHS.Statut.VALIDE_NATIONAL)
        if campagne:
            qs = qs.filter(campagne=campagne)
        if departement_code:
            qs = qs.filter(structure__departement__code=departement_code)
        if zone_code:
            qs = qs.filter(structure__zone_sanitaire__code=zone_code)

        # Générer les indicateurs demandés
        for indicateur in config["indicateurs"]:
            data["indicateurs"][indicateur] = ReportGenerator._generate_indicateur(
                indicateur, qs, campagne, departement_code, zone_code
            )

        return data

    @staticmethod
    def _generate_indicateur(
        indicateur: str,
        qs,
        campagne: Optional[CampagneCollecte],
        departement_code: Optional[str],
        zone_code: Optional[str],
    ):
        """Génère un indicateur spécifique."""
        
        if indicateur == "effectifs":
            return ReportGenerator._indicateur_effectifs(qs)
        elif indicateur == "mouvements":
            return ReportGenerator._indicateur_mouvements(campagne, departement_code, zone_code)
        elif indicateur == "retraites":
            return ReportGenerator._indicateur_retraites(campagne, departement_code, zone_code)
        elif indicateur == "postes_vacants":
            return ReportGenerator._indicateur_postes_vacants(qs)
        elif indicateur == "evolution":
            return ReportGenerator._indicateur_evolution(campagne, departement_code, zone_code)
        elif indicateur == "pyramide_ages":
            return ReportGenerator._indicateur_pyramide_ages(campagne, departement_code, zone_code)
        elif indicateur == "couverture":
            return ReportGenerator._indicateur_couverture(qs, departement_code)
        elif indicateur == "specialites":
            return ReportGenerator._indicateur_specialites(qs)
        elif indicateur == "ratios_oms":
            return ReportGenerator._indicateur_ratios_oms(qs, departement_code)
        elif indicateur == "disparites":
            return ReportGenerator._indicateur_disparites(qs)
        elif indicateur == "distribution_geo":
            return ReportGenerator._indicateur_distribution_geo(qs, departement_code)
        elif indicateur == "densites":
            return ReportGenerator._indicateur_densites(qs, departement_code)
        elif indicateur == "zones_sous_servees":
            return ReportGenerator._indicateur_zones_sous_servees(qs)
        else:
            return {"erreur": f"Indicateur inconnu: {indicateur}"}

    @staticmethod
    def _indicateur_effectifs(qs):
        """Indicateur d'effectifs totaux par catégorie."""
        totals = qs.aggregate(
            effectif_total=Coalesce(Sum("effectif_total"), 0),
            medecins=Coalesce(Sum("medecins"), 0),
            infirmiers=Coalesce(Sum("infirmiers"), 0),
            sages_femmes=Coalesce(Sum("sages_femmes"), 0),
            pharmaciens=Coalesce(Sum("pharmaciens"), 0),
            femmes=Coalesce(Sum("dont_femmes"), 0),
            hommes=Coalesce(Sum("dont_hommes"), 0),
        )
        return {
            "total": totals["effectif_total"],
            "par_categorie": {
                "medecins": totals["medecins"],
                "infirmiers": totals["infirmiers"],
                "sages_femmes": totals["sages_femmes"],
                "pharmaciens": totals["pharmaciens"],
            },
            "par_genre": {
                "femmes": totals["femmes"],
                "hommes": totals["hommes"],
            },
        }

    @staticmethod
    def _indicateur_mouvements(campagne, departement_code, zone_code):
        """Indicateur des mouvements de personnel."""
        qs = MouvementAgent.objects.all()
        if campagne:
            qs = qs.filter(agent__campagne=campagne)
        if departement_code:
            qs = qs.filter(
                Q(agent__structure__departement__code=departement_code)
                | Q(structure_origine__departement__code=departement_code)
                | Q(structure_destination__departement__code=departement_code)
            )
        if zone_code:
            qs = qs.filter(
                Q(agent__structure__zone_sanitaire__code=zone_code)
                | Q(structure_origine__zone_sanitaire__code=zone_code)
                | Q(structure_destination__zone_sanitaire__code=zone_code)
            )

        mouvements_par_type = {}
        for type_mvt in MouvementAgent.TypeMouvement.values:
            count = qs.filter(type_mouvement=type_mvt).count()
            mouvements_par_type[type_mvt] = count

        return {
            "total": qs.count(),
            "par_type": mouvements_par_type,
        }

    @staticmethod
    def _indicateur_retraites(campagne, departement_code, zone_code):
        """Indicateur des départs à la retraite."""
        today = datetime.now().date()
        limit_6_mois = today + timedelta(days=183)
        limit_12_mois = today + timedelta(days=365)
        limit_24_mois = today + timedelta(days=730)

        qs = AgentSante.objects.filter(actif=True, depart_retraite_prevu__isnull=False)
        if campagne:
            qs = qs.filter(campagne=campagne)
        if departement_code:
            qs = qs.filter(structure__departement__code=departement_code)
        if zone_code:
            qs = qs.filter(structure__zone_sanitaire__code=zone_code)

        return {
            "prochaines_6_mois": qs.filter(depart_retraite_prevu__lte=limit_6_mois).count(),
            "prochaines_12_mois": qs.filter(depart_retraite_prevu__lte=limit_12_mois).count(),
            "prochaines_24_mois": qs.filter(depart_retraite_prevu__lte=limit_24_mois).count(),
        }

    @staticmethod
    def _indicateur_postes_vacants(qs):
        """Indicateur des postes vacants."""
        totals = qs.aggregate(
            postes_budgetes=Coalesce(Sum("postes_budgetes"), 0),
            postes_pourvus=Coalesce(Sum("postes_pourvus"), 0),
            postes_vacants=Coalesce(Sum("postes_vacants"), 0),
        )
        taux_vacance = (
            (totals["postes_vacants"] / totals["postes_budgetes"] * 100)
            if totals["postes_budgetes"] > 0
            else 0
        )
        return {
            "postes_budgetes": totals["postes_budgetes"],
            "postes_pourvus": totals["postes_pourvus"],
            "postes_vacants": totals["postes_vacants"],
            "taux_vacance": round(taux_vacance, 2),
        }

    @staticmethod
    def _indicateur_evolution(campagne, departement_code, zone_code):
        """Indicateur d'évolution sur 5 ans."""
        # Simuler l'évolution en utilisant les campagnes existantes
        annee_actuelle = campagne.annee if campagne else datetime.now().year
        evolution = []
        
        for i in range(5):
            annee = annee_actuelle - i
            camp = CampagneCollecte.objects.filter(annee=annee).first()
            if camp:
                qs = DeclarationRHS.objects.filter(
                    campagne=camp, statut=DeclarationRHS.Statut.VALIDE_NATIONAL
                )
                if departement_code:
                    qs = qs.filter(structure__departement__code=departement_code)
                if zone_code:
                    qs = qs.filter(structure__zone_sanitaire__code=zone_code)
                
                total = qs.aggregate(total=Coalesce(Sum("effectif_total"), 0))["total"]
                evolution.append({"annee": annee, "effectif": total})
        
        return evolution[::-1]  # Du plus ancien au plus récent

    @staticmethod
    def _indicateur_pyramide_ages(campagne, departement_code, zone_code):
        """Indicateur de la pyramide des âges."""
        qs = AgentSante.objects.filter(actif=True, date_naissance__isnull=False)
        if campagne:
            qs = qs.filter(campagne=campagne)
        if departement_code:
            qs = qs.filter(structure__departement__code=departement_code)
        if zone_code:
            qs = qs.filter(structure__zone_sanitaire__code=zone_code)

        today = datetime.now().date()
        tranches = {
            "20-29": 0,
            "30-39": 0,
            "40-49": 0,
            "50-59": 0,
            "60+": 0,
        }

        for agent in qs:
            age = (today - agent.date_naissance).days // 365
            if age < 30:
                tranches["20-29"] += 1
            elif age < 40:
                tranches["30-39"] += 1
            elif age < 50:
                tranches["40-49"] += 1
            elif age < 60:
                tranches["50-59"] += 1
            else:
                tranches["60+"] += 1

        return tranches

    @staticmethod
    def _indicateur_couverture(qs, departement_code):
        """Indicateur de couverture sanitaire."""
        if departement_code:
            dept = Departement.objects.filter(code=departement_code).first()
            population = dept.population if dept else 0
        else:
            population = Departement.objects.aggregate(total=Coalesce(Sum("population"), 0))["total"]

        totals = qs.aggregate(
            medecins=Coalesce(Sum("medecins"), 0),
            infirmiers=Coalesce(Sum("infirmiers"), 0),
        )

        ratio_medecins = (totals["medecins"] / population * 10000) if population > 0 else 0
        ratio_infirmiers = (totals["infirmiers"] / population * 10000) if population > 0 else 0

        return {
            "population": population,
            "ratio_medecins_10k": round(ratio_medecins, 2),
            "ratio_infirmiers_10k": round(ratio_infirmiers, 2),
            "norme_oms_medecins": 2.3,
            "conforme_medecins": ratio_medecins >= 2.3,
        }

    @staticmethod
    def _indicateur_specialites(qs):
        """Indicateur par spécialité médicale."""
        # Utiliser les données des déclarations pour les spécialités
        return {
            "medecins_generalistes": qs.aggregate(total=Coalesce(Sum("medecins_generalistes"), 0))["total"],
            "medecins_specialistes": qs.aggregate(total=Coalesce(Sum("medecins_specialistes"), 0))["total"],
        }

    @staticmethod
    def _indicateur_ratios_oms(qs, departement_code):
        """Indicateurs de conformité aux normes OMS."""
        couverture = ReportGenerator._indicateur_couverture(qs, departement_code)
        
        return {
            "ratio_medecins": couverture["ratio_medecins_10k"],
            "ratio_infirmiers": couverture["ratio_infirmiers_10k"],
            "norme_medecins": 2.3,
            "norme_infirmiers": 5.0,  # Norme approximative
            "conforme_medecins": couverture["conforme_medecins"],
            "conforme_infirmiers": couverture["ratio_infirmiers_10k"] >= 5.0,
        }

    @staticmethod
    def _indicateur_disparites(qs):
        """Indicateur de disparités (genre, géographique)."""
        totals = qs.aggregate(
            femmes=Coalesce(Sum("dont_femmes"), 0),
            total=Coalesce(Sum("effectif_total"), 0),
        )
        
        ratio_femmes = (totals["femmes"] / totals["total"] * 100) if totals["total"] > 0 else 0

        # Disparités géographiques par département
        par_dept = []
        for dept in Departement.objects.all():
            dept_qs = qs.filter(structure__departement=dept)
            dept_total = dept_qs.aggregate(total=Coalesce(Sum("effectif_total"), 0))["total"]
            if dept_total > 0:
                par_dept.append({
                    "departement": dept.nom,
                    "effectif": dept_total,
                    "population": dept.population,
                    "ratio": (dept_total / dept.population * 10000) if dept.population > 0 else 0,
                })

        return {
            "ratio_femmes": round(ratio_femmes, 2),
            "par_departement": sorted(par_dept, key=lambda x: x["ratio"], reverse=True),
        }

    @staticmethod
    def _indicateur_distribution_geo(qs, departement_code):
        """Distribution géographique des effectifs."""
        if departement_code:
            # Par zone sanitaire
            distribution = []
            for zone in ZoneSanitaire.objects.filter(departement__code=departement_code):
                zone_qs = qs.filter(structure__zone_sanitaire=zone)
                total = zone_qs.aggregate(total=Coalesce(Sum("effectif_total"), 0))["total"]
                distribution.append({
                    "zone": zone.nom,
                    "effectif": total,
                })
        else:
            # Par département
            distribution = []
            for dept in Departement.objects.all():
                dept_qs = qs.filter(structure__departement=dept)
                total = dept_qs.aggregate(total=Coalesce(Sum("effectif_total"), 0))["total"]
                distribution.append({
                    "departement": dept.nom,
                    "effectif": total,
                })

        return distribution

    @staticmethod
    def _indicateur_densites(qs, departement_code):
        """Densité de personnel par zone."""
        distribution = ReportGenerator._indicateur_distribution_geo(qs, departement_code)
        
        for item in distribution:
            if "departement" in item:
                dept = Departement.objects.filter(nom=item["departement"]).first()
                if dept:
                    item["densite_10k"] = (item["effectif"] / dept.population * 10000) if dept.population > 0 else 0
            elif "zone" in item:
                zone = ZoneSanitaire.objects.filter(nom=item["zone"]).first()
                if zone:
                    item["densite_10k"] = (item["effectif"] / zone.departement.population * 10000) if zone.departement.population > 0 else 0

        return distribution

    @staticmethod
    def _indicateur_zones_sous_servees(qs):
        """Zones sanitaires sous-servies."""
        zones_sous_servees = []
        
        for zone in ZoneSanitaire.objects.all():
            zone_qs = qs.filter(structure__zone_sanitaire=zone)
            medecins = zone_qs.aggregate(total=Coalesce(Sum("medecins"), 0))["total"]
            population = zone.departement.population
            
            if population > 0:
                ratio = medecins / population * 10000
                if ratio < 2.3:  # Norme OMS
                    zones_sous_servees.append({
                        "zone": zone.nom,
                        "departement": zone.departement.nom,
                        "medecins": medecins,
                        "population": population,
                        "ratio": round(ratio, 2),
                    })

        return sorted(zones_sous_servees, key=lambda x: x["ratio"])

    @staticmethod
    def export_csv(data, filename):
        """Exporte les données du rapport en CSV."""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # En-tête
        writer.writerow([f"Rapport: {data['nom_modele']}"])
        writer.writerow([f"Date de génération: {data['date_generation']}"])
        writer.writerow([f"Campagne: {data.get('campagne', 'N/A')}"])
        writer.writerow([])
        
        # Indicateurs
        for indicateur, valeur in data["indicateurs"].items():
            writer.writerow([f"--- {indicateur.upper()} ---"])
            if isinstance(valeur, dict):
                for k, v in valeur.items():
                    writer.writerow([k, v])
            else:
                writer.writerow([valeur])
            writer.writerow([])
        
        output.seek(0)
        return output.getvalue()
