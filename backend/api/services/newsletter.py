from typing import Optional, Tuple

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.utils import timezone

from api.models import AbonneNewsletter, CampagneNewsletter, EnvoiNewsletter


def normalize_email(value: str) -> str:
    return str(value or "").strip().lower()


def unsubscribe_url(abonne: AbonneNewsletter) -> str:
    base = getattr(settings, "FRONTEND_PUBLIC_URL", "http://127.0.0.1:5173").rstrip("/")
    return f"{base}/newsletter/desabonnement?token={abonne.token_desabonnement}"


def compose_message(corps: str, abonne: Optional[AbonneNewsletter] = None) -> str:
    parts = [corps.strip()]
    if abonne:
        parts.append(
            "\n---\nVous recevez ce message car vous êtes abonné à la newsletter ORHS Bénin.\n"
            f"Pour vous désabonner : {unsubscribe_url(abonne)}"
        )
    return "\n".join(parts)


def send_newsletter_mail(destinataire: str, sujet: str, corps: str) -> None:
    send_mail(
        subject=sujet,
        message=corps,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "ORHS Bénin <noreply@orhsb.bj>"),
        recipient_list=[destinataire],
        fail_silently=False,
    )


def subscribe(email: str, source: str = AbonneNewsletter.Source.SITE) -> Tuple[AbonneNewsletter, bool]:
    email = normalize_email(email)
    if not email:
        raise ValidationError({"email": ["Ce champ est requis."]})
    try:
        validate_email(email)
    except ValidationError as exc:
        raise ValidationError({"email": ["Adresse e-mail invalide."]}) from exc

    existing = AbonneNewsletter.objects.filter(email=email).first()
    if existing:
        if not existing.actif:
            existing.actif = True
            existing.date_desabonnement = None
            existing.source = source
            existing.save(update_fields=["actif", "date_desabonnement", "source", "updated_at"])
        return existing, False

    abonne = AbonneNewsletter.objects.create(email=email, source=source)
    try:
        send_newsletter_mail(
            abonne.email,
            "Bienvenue — newsletter ORHS Bénin",
            compose_message(
                "Votre inscription à la newsletter ORHS Bénin est enregistrée.\n"
                "Vous recevrez les publications et actualités lorsqu'elles seront diffusées.",
                abonne,
            ),
        )
    except Exception:
        pass
    return abonne, True


def unsubscribe(token: str) -> Optional[AbonneNewsletter]:
    abonne = AbonneNewsletter.objects.filter(token_desabonnement=token).first()
    if not abonne:
        return None
    if abonne.actif:
        abonne.actif = False
        abonne.date_desabonnement = timezone.now()
        abonne.save(update_fields=["actif", "date_desabonnement", "updated_at"])
    return abonne


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return email
    visible = local[:1] if local else ""
    return f"{visible}***@{domain}"


def queue_campaign(campagne: CampagneNewsletter) -> int:
    abonnes = list(AbonneNewsletter.objects.filter(actif=True))
    campagne.destinataires_prevus = len(abonnes)
    campagne.statut = CampagneNewsletter.Statut.FILE
    campagne.save(update_fields=["destinataires_prevus", "statut", "updated_at"])

    existing = set(
        EnvoiNewsletter.objects.filter(campagne=campagne).values_list("abonne_id", flat=True)
    )
    to_create = [
        EnvoiNewsletter(campagne=campagne, abonne=abonne, email=abonne.email)
        for abonne in abonnes
        if abonne.id not in existing
    ]
    EnvoiNewsletter.objects.bulk_create(to_create)
    return len(abonnes)


def send_envoi(envoi: EnvoiNewsletter) -> bool:
    abonne = envoi.abonne
    if abonne and not abonne.actif:
        envoi.statut = EnvoiNewsletter.Statut.ERREUR
        envoi.erreur_message = "Abonné désinscrit."
        envoi.save(update_fields=["statut", "erreur_message"])
        return False
    try:
        send_newsletter_mail(
            envoi.email,
            envoi.campagne.sujet,
            compose_message(envoi.campagne.corps, abonne),
        )
        envoi.statut = EnvoiNewsletter.Statut.ENVOYE
        envoi.date_envoi = timezone.now()
        envoi.erreur_message = ""
        envoi.save(update_fields=["statut", "date_envoi", "erreur_message"])
        return True
    except Exception as exc:
        envoi.statut = EnvoiNewsletter.Statut.ERREUR
        envoi.erreur_message = str(exc)[:2000]
        envoi.save(update_fields=["statut", "erreur_message"])
        return False


def send_pending_newsletters(limit: int = 200) -> dict:
    pending = list(
        EnvoiNewsletter.objects.filter(statut=EnvoiNewsletter.Statut.EN_ATTENTE)
        .select_related("campagne", "abonne")
        .order_by("created_at")[:limit]
    )
    sent = 0
    errors = 0
    touched = set()
    for envoi in pending:
        if send_envoi(envoi):
            sent += 1
        else:
            errors += 1
        touched.add(envoi.campagne_id)

    for campagne in CampagneNewsletter.objects.filter(id__in=touched):
        remaining = campagne.envois.filter(statut=EnvoiNewsletter.Statut.EN_ATTENTE).exists()
        campagne.envoyes = campagne.envois.filter(statut=EnvoiNewsletter.Statut.ENVOYE).count()
        campagne.erreurs = campagne.envois.filter(statut=EnvoiNewsletter.Statut.ERREUR).count()
        if not remaining:
            campagne.statut = CampagneNewsletter.Statut.ENVOYE
            campagne.date_envoi = timezone.now()
        campagne.save(update_fields=["envoyes", "erreurs", "statut", "date_envoi", "updated_at"])

    return {"sent": sent, "errors": errors, "processed": sent + errors}


def dispatch_campaign(campagne: CampagneNewsletter) -> dict:
    if campagne.statut == CampagneNewsletter.Statut.ANNULE:
        raise ValidationError("Campagne annulée.")
    queue_campaign(campagne)
    return send_pending_newsletters()
