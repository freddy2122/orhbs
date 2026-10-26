from django.utils import timezone

from api.models import AuditLog, UserProfile

AUTHOR_ROLES = (UserProfile.Role.REDACTEUR, UserProfile.Role.COORDINATION)
REVIEWER_ROLES = (UserProfile.Role.COORDINATION,)


class WorkflowError(Exception):
    def __init__(self, detail, status=400):
        super().__init__(detail)
        self.detail = detail
        self.status = status


def _role(user):
    profile = getattr(user, "profile", None)
    return profile.role if profile else None


def is_author(user):
    return _role(user) in AUTHOR_ROLES


def is_reviewer(user):
    return _role(user) in REVIEWER_ROLES


def _involved_user_ids(item):
    return {
        uid
        for uid in (
            item.cree_par_id,
            getattr(item, "modifie_par_id", None),
            item.soumis_par_id,
        )
        if uid
    }


def can_view(user, item):
    if is_reviewer(user):
        return True
    return _role(user) == UserProfile.Role.REDACTEUR and item.cree_par_id == user.id


def can_edit(user, item):
    """Un contenu publié est verrouillé : il faut d'abord le dépublier."""
    if item.statut in (item.Statut.PUBLIE, item.Statut.EN_RELECTURE):
        return False
    if is_reviewer(user):
        return True
    return _role(user) == UserProfile.Role.REDACTEUR and item.cree_par_id == user.id


def available_actions(user, item):
    actions = []
    if not user or not getattr(user, "is_authenticated", False) or not can_view(user, item):
        return actions
    statut = item.Statut
    if can_edit(user, item):
        actions += ["edit", "delete"]
        actions.append("submit")
    if is_reviewer(user):
        if item.statut == statut.EN_RELECTURE:
            actions.append("reject")
            if user.id not in _involved_user_ids(item):
                actions.append("publish")
        if item.statut == statut.PUBLIE:
            actions.append("unpublish")
    return actions


def _audit(request, item, action, description, changes=None):
    AuditLog.objects.create(
        user=request.user,
        action=action,
        model_name=item.__class__.__name__,
        object_id=str(item.pk),
        object_repr=str(item.titre)[:200],
        description=description,
        changes=changes or {},
        ip_address=request.META.get("REMOTE_ADDR") or None,
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
    )


def apply_transition(request, item, action, motif=""):
    user = request.user
    S = item.Statut
    now = timezone.now()

    if not can_view(user, item):
        raise WorkflowError("Non autorisé.", 403)

    if action == "submit":
        if not can_edit(user, item):
            raise WorkflowError("Ce contenu ne peut pas être soumis dans son état actuel.", 409)
        if not (item.resume or item.contenu or getattr(item, "fichier_pdf", None)):
            raise WorkflowError("Renseignez un résumé ou un contenu avant de soumettre.")
        item.statut = S.EN_RELECTURE
        item.soumis_par = user
        item.date_soumission = now
        item.motif_rejet = ""
        description = "Soumission pour relecture"
        audit_action = AuditLog.Action.SUBMIT

    elif action in ("publish", "reject"):
        if not is_reviewer(user):
            raise WorkflowError("Seule la coordination peut relire et publier.", 403)
        if item.statut != S.EN_RELECTURE:
            raise WorkflowError("Le contenu doit d'abord être soumis pour relecture.", 409)
        if action == "publish":
            if user.id in _involved_user_ids(item):
                raise WorkflowError(
                    "Vous ne pouvez pas publier un contenu que vous avez rédigé, modifié ou soumis : "
                    "un second relecteur est requis.",
                    403,
                )
            item.statut = S.PUBLIE
            item.publie = True
            if not item.date_publication:
                item.date_publication = now
            item.valide_par = user
            item.date_validation = now
            item.motif_rejet = ""
            description = "Publication"
            audit_action = AuditLog.Action.VALIDATE
        else:
            motif = (motif or "").strip()
            if not motif:
                raise WorkflowError("Un motif de rejet est requis.")
            item.statut = S.REJETE
            item.motif_rejet = motif
            description = f"Rejet : {motif}"
            audit_action = AuditLog.Action.REJECT

    elif action == "unpublish":
        if not is_reviewer(user):
            raise WorkflowError("Seule la coordination peut dépublier.", 403)
        if item.statut != S.PUBLIE:
            raise WorkflowError("Ce contenu n'est pas publié.", 409)
        item.statut = S.BROUILLON
        item.publie = False
        item.valide_par = None
        item.date_validation = None
        description = "Dépublication"
        audit_action = AuditLog.Action.UPDATE

    else:
        raise WorkflowError("Action inconnue.")

    item.save()
    _audit(request, item, audit_action, description, {"statut": item.statut})
    return item
