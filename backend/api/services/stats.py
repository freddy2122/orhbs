from typing import Optional

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce

from api.models import AgentSante, CampagneCollecte, DeclarationRHS, Departement, Structure, ZoneSanitaire


def get_active_campagne() -> Optional[CampagneCollecte]:
    return CampagneCollecte.objects.filter(active=True).order_by("-date_debut").first()


def official_declarations(campagne: Optional[CampagneCollecte] = None):
    qs = DeclarationRHS.objects.filter(DeclarationRHS.official_filter()).filter(
        structure__actif=True,
    )
    if campagne:
        qs = qs.filter(campagne=campagne)
    return qs.select_related(
        "structure",
        "structure__departement",
        "structure__zone_sanitaire",
        "campagne",
    )


def aggregate_totals(qs):
    return qs.aggregate(
        effectif_total=Coalesce(Sum("effectif_total"), 0),
        medecins=Coalesce(Sum("medecins"), 0),
        infirmiers=Coalesce(Sum("infirmiers"), 0),
        sages_femmes=Coalesce(Sum("sages_femmes"), 0),
        dont_femmes=Coalesce(Sum("dont_femmes"), 0),
        structures_count=Count("structure_id", distinct=True),
    )


def ratio_per_10k(value: int, population: int) -> float:
    if not population:
        return 0.0
    return round((value / population) * 10000, 2)


def national_stats(campagne: Optional[CampagneCollecte] = None) -> dict:
    campagne = campagne or get_active_campagne()
    official = official_declarations(campagne)
    totals = aggregate_totals(official)

    structures_actives = Structure.objects.filter(actif=True).count()
    dept_count = Departement.objects.count()
    declared = totals["structures_count"]
    response_rate = round((declared / structures_actives) * 100, 1) if structures_actives else 0

    population = Departement.objects.aggregate(total=Coalesce(Sum("population"), 0))["total"]

    pending = 0
    if campagne:
        pending = DeclarationRHS.objects.filter(
            campagne=campagne,
            statut__in=[
                DeclarationRHS.Statut.SOUMIS,
                DeclarationRHS.Statut.VALIDE_DEPARTEMENT,
            ],
        ).count()

    agents = AgentSante.objects.filter(actif=True)
    if campagne:
        agents = agents.filter(campagne=campagne)
    secteur_counts = {
        "public": agents.filter(secteur=AgentSante.Secteur.PUBLIC).count(),
        "prive": agents.filter(secteur=AgentSante.Secteur.PRIVE).count(),
        "confessionnel": agents.filter(secteur=AgentSante.Secteur.CONFESSIONNEL).count(),
    }
    personnel_qualifie = totals["medecins"] + totals["infirmiers"] + totals["sages_femmes"]
    ratio_rhs = ratio_per_10k(totals["effectif_total"], population)
    ratio_qualifie = ratio_per_10k(personnel_qualifie, population)

    return {
        "campagne": campagne,
        "totals": totals,
        "population": population,
        "ratio_medecins": ratio_per_10k(totals["medecins"], population),
        "ratio_infirmiers": ratio_per_10k(totals["infirmiers"], population),
        "ratio_sages_femmes": ratio_per_10k(totals["sages_femmes"], population),
        "ratio_rhs_10k": ratio_rhs,
        "ratio_personnel_qualifie_10k": ratio_qualifie,
        "seuil_oms_rhs": 23,
        "conforme_oms_rhs": ratio_qualifie >= 23,
        "effectif_public": secteur_counts["public"],
        "effectif_prive": secteur_counts["prive"],
        "effectif_confessionnel": secteur_counts["confessionnel"],
        "structures_actives": structures_actives,
        "structures_declarantes": declared,
        "taux_reponse": response_rate,
        "departements_couverts": official.values("structure__departement_id").distinct().count(),
        "departements_total": dept_count,
        "en_attente_validation": pending,
    }


def departement_stats(campagne: Optional[CampagneCollecte] = None) -> list:
    campagne = campagne or get_active_campagne()
    official = official_declarations(campagne)
    results = []

    for dept in Departement.objects.filter(actif=True):
        dept_qs = official.filter(structure__departement=dept)
        totals = aggregate_totals(dept_qs)
        structures_total = Structure.objects.filter(departement=dept, actif=True).count()
        declared = totals["structures_count"]
        rate = round((declared / structures_total) * 100, 1) if structures_total else 0

        results.append(
            {
                "departement": dept,
                "totals": totals,
                "ratio_medecins": ratio_per_10k(totals["medecins"], dept.population),
                "structures_total": structures_total,
                "structures_declarantes": declared,
                "taux_reponse": rate,
            }
        )

    results.sort(key=lambda x: x["totals"]["medecins"], reverse=True)
    for idx, row in enumerate(results, start=1):
        row["rang"] = idx
    return results


def zone_stats(
    campagne: Optional[CampagneCollecte] = None,
    departement_code: Optional[str] = None,
) -> list:
    campagne = campagne or get_active_campagne()
    official = official_declarations(campagne)
    zones = ZoneSanitaire.objects.filter(actif=True).select_related("departement")
    if departement_code:
        zones = zones.filter(departement__code=departement_code)

    results = []
    for zone in zones:
        zone_qs = official.filter(structure__zone_sanitaire=zone)
        totals = aggregate_totals(zone_qs)
        structures_total = Structure.objects.filter(zone_sanitaire=zone, actif=True).count()
        declared = totals["structures_count"]
        rate = round((declared / structures_total) * 100, 1) if structures_total else 0
        results.append(
            {
                "zone": zone,
                "departement": zone.departement,
                "totals": totals,
                "ratio_medecins": ratio_per_10k(totals["medecins"], zone.departement.population),
                "structures_total": structures_total,
                "structures_declarantes": declared,
                "taux_reponse": rate,
            }
        )
    return results


def structure_stats(
    campagne: Optional[CampagneCollecte] = None,
    departement_code: Optional[str] = None,
    zone_code: Optional[str] = None,
    type_structure: Optional[str] = None,
) -> list:
    campagne = campagne or get_active_campagne()
    official = official_declarations(campagne)
    if departement_code:
        official = official.filter(structure__departement__code=departement_code)
    if zone_code:
        official = official.filter(structure__zone_sanitaire__code=zone_code)
    if type_structure:
        official = official.filter(structure__type_structure=type_structure)

    results = []
    for decl in official.order_by("structure__nom"):
        results.append(
            {
                "structure": decl.structure,
                "departement": decl.structure.departement,
                "zone": decl.structure.zone_sanitaire,
                "effectif_total": decl.effectif_total,
                "medecins": decl.medecins,
                "infirmiers": decl.infirmiers,
                "sages_femmes": decl.sages_femmes,
                "dont_femmes": decl.dont_femmes,
                "date_validation": decl.date_valide_national,
            }
        )
    return results


def collection_progress(campagne: Optional[CampagneCollecte] = None) -> list:
    campagne = campagne or get_active_campagne()
    if not campagne:
        return []

    progress = []
    for dept in Departement.objects.all():
        total = Structure.objects.filter(departement=dept, actif=True).count()
        submitted = DeclarationRHS.objects.filter(
            campagne=campagne,
            structure__departement=dept,
            statut__in=[
                DeclarationRHS.Statut.SOUMIS,
                DeclarationRHS.Statut.VALIDE_DEPARTEMENT,
                DeclarationRHS.Statut.VALIDE_NATIONAL,
            ],
        ).count()
        validated = DeclarationRHS.objects.filter(
            campagne=campagne,
            structure__departement=dept,
            statut=DeclarationRHS.Statut.VALIDE_NATIONAL,
        ).count()
        rate = round((submitted / total) * 100, 1) if total else 0
        progress.append(
            {
                "departement": dept,
                "structures_total": total,
                "structures_soumises": submitted,
                "structures_validees": validated,
                "taux_reponse": rate,
            }
        )
    return progress
