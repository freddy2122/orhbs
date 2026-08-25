from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone

from api.models import AlerteEmail

MAX_TENTATIVES = 5


def normalize_recipients(value):
    if not value:
        return []
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return [str(item).strip() for item in value if str(item).strip()]


def send_alerte(alerte: AlerteEmail) -> bool:
    """Envoie une alerte email et met à jour son statut."""
    destinataires = normalize_recipients(alerte.destinataires)
    if not destinataires:
        alerte.statut = AlerteEmail.StatutAlerte.ERREUR
        alerte.erreur_message = "Aucun destinataire configuré."
        alerte.nombre_tentatives += 1
        alerte.save(update_fields=["statut", "erreur_message", "nombre_tentatives", "updated_at"])
        return False

    alerte.nombre_tentatives += 1
    try:
        send_mail(
            subject=alerte.sujet,
            message=alerte.corps,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@orhsb.bj"),
            recipient_list=destinataires,
            fail_silently=False,
        )
        alerte.statut = AlerteEmail.StatutAlerte.ENVOYE
        alerte.date_envoi = timezone.now()
        alerte.erreur_message = ""
        alerte.save(
            update_fields=["statut", "date_envoi", "erreur_message", "nombre_tentatives", "updated_at"]
        )
        return True
    except Exception as exc:
        alerte.statut = AlerteEmail.StatutAlerte.ERREUR
        alerte.erreur_message = str(exc)[:2000]
        alerte.save(update_fields=["statut", "erreur_message", "nombre_tentatives", "updated_at"])
        return False


def send_pending_alerts(limit: int = 100) -> dict:
    """Envoie les alertes en attente et relance les erreurs récentes."""
    now = timezone.now()
    pending = list(
        AlerteEmail.objects.filter(
            statut=AlerteEmail.StatutAlerte.EN_ATTENTE,
            nombre_tentatives__lt=MAX_TENTATIVES,
        )
        .filter(Q(date_prevue_envoi__isnull=True) | Q(date_prevue_envoi__lte=now))
        .order_by("created_at")[:limit]
    )
    remaining = max(0, limit - len(pending))
    retries = list(
        AlerteEmail.objects.filter(
            statut=AlerteEmail.StatutAlerte.ERREUR,
            nombre_tentatives__lt=MAX_TENTATIVES,
        ).order_by("updated_at")[:remaining]
    )

    sent = 0
    errors = 0
    for alerte in pending + retries:
        if send_alerte(alerte):
            sent += 1
        else:
            errors += 1
    return {"sent": sent, "errors": errors, "processed": sent + errors}
