"""Synchronise les totaux de déclaration à partir des fiches agents."""

from api.constants.rhs_fields import ALL_DECLARATION_COUNT_FIELDS
from api.models import AgentSante, DeclarationRHS


PROFESSION_MAP = {
    "médecin généraliste": ("medecins", "medecins_generalistes"),
    "medecin generaliste": ("medecins", "medecins_generalistes"),
    "médecin spécialiste": ("medecins", "medecins_specialistes"),
    "medecin specialiste": ("medecins", "medecins_specialistes"),
    "médecin": ("medecins",),
    "medecin": ("medecins",),
    "infirmier": ("infirmiers",),
    "infirmière": ("infirmiers",),
    "infirmier(ère) d'état": ("infirmiers",),
    "infirmier auxiliaire": ("infirmiers_auxiliaires",),
    "infirmière auxiliaire": ("infirmiers_auxiliaires",),
    "sage-femme": ("sages_femmes",),
    "sage-femme auxiliaire": ("sages_femmes_auxiliaires",),
    "pharmacien": ("pharmaciens",),
    "technicien de laboratoire": ("techniciens_laboratoire",),
    "technicien en imagerie médicale": ("techniciens_imagerie",),
    "agent de santé communautaire": ("agents_sante_communautaire",),
    "chirurgien-dentiste": ("chirurgiens_dentistes",),
    "kinésithérapeute": ("kinesitherapeutes",),
    "personnel administratif": ("administratifs",),
    "agent d'entretien / ouvrier": ("agents_entretien",),
}


def _normalize_profession(profession: str) -> str:
    return profession.strip().lower()


def sync_declaration_from_agents(campagne, structure) -> DeclarationRHS:
    """Agrège les agents actifs d'une structure et met à jour la déclaration."""
    agents = AgentSante.objects.filter(
        campagne=campagne,
        structure=structure,
        actif=True,
        statut_agent=AgentSante.StatutAgent.ACTIF,
    )

    declaration, _ = DeclarationRHS.objects.get_or_create(
        campagne=campagne,
        structure=structure,
        defaults={"statut": DeclarationRHS.Statut.BROUILLON},
    )

    counts = {field: 0 for field in ALL_DECLARATION_COUNT_FIELDS}
    counts["dont_femmes"] = 0
    counts["dont_hommes"] = 0
    counts["departs_retraite_6_mois"] = 0
    counts["departs_retraite_12_mois"] = 0

    from datetime import date, timedelta

    today = date.today()
    in_6m = today + timedelta(days=183)
    in_12m = today + timedelta(days=365)

    for agent in agents:
        if agent.sexe == AgentSante.Sexe.F:
            counts["dont_femmes"] += 1
        else:
            counts["dont_hommes"] += 1

        if agent.depart_retraite_prevu:
            if agent.depart_retraite_prevu <= in_6m:
                counts["departs_retraite_6_mois"] += 1
            elif agent.depart_retraite_prevu <= in_12m:
                counts["departs_retraite_12_mois"] += 1

        key = _normalize_profession(agent.profession)
        mapped = PROFESSION_MAP.get(key, ("autre_personnel",))
        for field in mapped:
            if field in counts:
                counts[field] += 1

    for field, value in counts.items():
        setattr(declaration, field, value)

    declaration.recalc_effectif_from_categories()
    declaration.save()
    return declaration
