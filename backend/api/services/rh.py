from datetime import date

from django.db.models import Count

from api.models import AgentSante, MouvementAgent


def apply_mouvement_to_agent(mouvement: MouvementAgent) -> AgentSante:
    """Met à jour la fiche agent d'après le type de mouvement."""
    agent = mouvement.agent
    kind = mouvement.type_mouvement
    fields = ["updated_at"]

    if kind in (
        MouvementAgent.TypeMouvement.AFFECTATION,
        MouvementAgent.TypeMouvement.MUTATION,
        MouvementAgent.TypeMouvement.INTERIM,
        MouvementAgent.TypeMouvement.REMPLACEMENT,
    ) and mouvement.structure_destination_id:
        agent.structure_id = mouvement.structure_destination_id
        fields.append("structure")

    if mouvement.poste_nouveau:
        agent.poste_occupe = mouvement.poste_nouveau
        fields.append("poste_occupe")

    if kind == MouvementAgent.TypeMouvement.PROMOTION and mouvement.grade_nouveau:
        agent.grade = mouvement.grade_nouveau
        fields.append("grade")

    statut_map = {
        MouvementAgent.TypeMouvement.DETACHEMENT: AgentSante.StatutAgent.DETACHE,
        MouvementAgent.TypeMouvement.MISE_DISPOSITION: AgentSante.StatutAgent.DETACHE,
        MouvementAgent.TypeMouvement.CONGE_LONGUE_DUREE: AgentSante.StatutAgent.CONGE,
        MouvementAgent.TypeMouvement.RETRAITE: AgentSante.StatutAgent.RETRAITE,
        MouvementAgent.TypeMouvement.DEMISSION: AgentSante.StatutAgent.SUSPENDU,
        MouvementAgent.TypeMouvement.REVOCATION: AgentSante.StatutAgent.SUSPENDU,
        MouvementAgent.TypeMouvement.DECES: AgentSante.StatutAgent.SUSPENDU,
        MouvementAgent.TypeMouvement.RENTREE: AgentSante.StatutAgent.ACTIF,
        MouvementAgent.TypeMouvement.INTERIM: AgentSante.StatutAgent.INTERIMAIRE,
        MouvementAgent.TypeMouvement.REMPLACEMENT: AgentSante.StatutAgent.REMPLACANT,
    }
    if kind in statut_map:
        agent.statut_agent = statut_map[kind]
        fields.append("statut_agent")

    contrat_map = {
        MouvementAgent.TypeMouvement.INTERIM: AgentSante.TypeContrat.INTERIMAIRE,
        MouvementAgent.TypeMouvement.REMPLACEMENT: AgentSante.TypeContrat.REMPLACANT,
    }
    if kind in contrat_map:
        agent.type_contrat = contrat_map[kind]
        fields.append("type_contrat")

    if kind in (
        MouvementAgent.TypeMouvement.DEMISSION,
        MouvementAgent.TypeMouvement.REVOCATION,
        MouvementAgent.TypeMouvement.DECES,
    ):
        agent.actif = False
        fields.append("actif")

    if kind == MouvementAgent.TypeMouvement.RETRAITE:
        agent.depart_retraite_prevu = mouvement.date_effet
        fields.append("depart_retraite_prevu")

    agent.save(update_fields=list(dict.fromkeys(fields)))
    return agent


def birthdate_cutoff(age: int) -> date:
    today = date.today()
    try:
        return today.replace(year=today.year - age)
    except ValueError:
        return today.replace(year=today.year - age, month=2, day=28)


def find_duplicate_agents(qs):
    """Regroupe les homonymes (même nom + prénom) et les matricules répétés."""
    groups = []
    name_dupes = (
        qs.values("nom", "prenom")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
        .order_by("-total")[:50]
    )
    for row in name_dupes:
        agents = list(
            qs.filter(nom__iexact=row["nom"], prenom__iexact=row["prenom"]).values(
                "id", "matricule", "nom", "prenom", "structure__nom", "profession"
            )[:20]
        )
        groups.append({"type": "homonyme", "cle": f"{row['prenom']} {row['nom']}", "agents": agents})

    matricule_dupes = (
        qs.values("matricule")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
        .order_by("-total")[:50]
    )
    for row in matricule_dupes:
        agents = list(
            qs.filter(matricule=row["matricule"]).values(
                "id", "matricule", "nom", "prenom", "structure__nom", "profession"
            )[:20]
        )
        groups.append({"type": "matricule", "cle": row["matricule"], "agents": agents})
    return groups
