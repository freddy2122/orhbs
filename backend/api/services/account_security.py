from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model, password_validation
from django.contrib.auth.hashers import check_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.exceptions import ValidationError

from api.models import AuditLog, LoginLockout, PasswordHistory, UserProfile

User = get_user_model()

SENSITIVE_ROLES = (
    UserProfile.Role.ADMIN,
    UserProfile.Role.COORDINATION,
    UserProfile.Role.VALIDATEUR,
)


# --- Politique de mot de passe -------------------------------------------------


def _role_of(user, role=None):
    if role:
        return role
    profile = getattr(user, "profile", None) if getattr(user, "pk", None) else None
    return profile.role if profile else None


def password_policy_errors(user, raw_password, role=None):
    errors = []
    try:
        password_validation.validate_password(raw_password, user)
    except DjangoValidationError as exc:
        errors.extend(exc.messages)

    minimum = settings.SENSITIVE_ROLE_MIN_PASSWORD_LENGTH
    if _role_of(user, role) in SENSITIVE_ROLES and len(raw_password) < minimum:
        errors.append(
            f"Ce mot de passe est trop court. Les comptes d'administration, de coordination "
            f"et de validation exigent au moins {minimum} caractères."
        )

    if getattr(user, "pk", None):
        hashes = list(
            PasswordHistory.objects.filter(user=user).values_list("password_hash", flat=True)[
                : settings.PASSWORD_HISTORY_SIZE
            ]
        )
        if user.has_usable_password():
            hashes.append(user.password)
        if any(check_password(raw_password, h) for h in hashes):
            errors.append(
                f"Ce mot de passe a déjà été utilisé récemment "
                f"(les {settings.PASSWORD_HISTORY_SIZE} derniers sont refusés)."
            )
    return errors


def check_new_password(user, raw_password, role=None):
    errors = password_policy_errors(user, raw_password, role)
    if errors:
        raise ValidationError({"password": errors})


def set_user_password(user, raw_password, role=None):
    check_new_password(user, raw_password, role)
    with transaction.atomic():
        user.set_password(raw_password)
        user.save(update_fields=["password"])
        PasswordHistory.objects.create(user=user, password_hash=user.password)
        stale = PasswordHistory.objects.filter(user=user).values_list("id", flat=True)[
            settings.PASSWORD_HISTORY_SIZE :
        ]
        PasswordHistory.objects.filter(id__in=list(stale)).delete()
    clear_lockout(user.username)


# --- Verrouillage de compte ----------------------------------------------------


def _key(username):
    return (username or "").strip().lower()[:150]


def lockout_remaining_seconds(username):
    row = LoginLockout.objects.filter(username=_key(username)).first()
    if row and row.locked_until and row.locked_until > timezone.now():
        return int((row.locked_until - timezone.now()).total_seconds()) + 1
    return 0


def register_failed_login(username, ip=None):
    key = _key(username)
    if not key:
        return
    now = timezone.now()
    window = timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
    with transaction.atomic():
        row, _ = LoginLockout.objects.select_for_update().get_or_create(username=key)
        expired_lock = row.locked_until and row.locked_until <= now
        stale_count = row.last_failed_at and now - row.last_failed_at > window
        if expired_lock or stale_count:
            row.failed_count = 0
            row.locked_until = None
        row.failed_count += 1
        row.last_failed_at = now
        just_locked = row.failed_count >= settings.LOGIN_MAX_FAILED_ATTEMPTS and not row.locked_until
        if just_locked:
            row.locked_until = now + window
        row.save()
    LoginLockout.objects.filter(last_failed_at__lt=now - timedelta(days=1)).delete()
    if just_locked:
        user = User.objects.filter(username__iexact=key).first()
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.UPDATE,
            model_name="User",
            object_id=str(user.pk) if user else "",
            object_repr=key,
            description=(
                f"Compte verrouillé {settings.LOGIN_LOCKOUT_MINUTES} min après "
                f"{settings.LOGIN_MAX_FAILED_ATTEMPTS} échecs de connexion"
            ),
            ip_address=ip,
        )


def clear_lockout(username):
    LoginLockout.objects.filter(username=_key(username)).delete()


def lockout_message(seconds):
    minutes = max(1, (seconds + 59) // 60)
    return f"Compte temporairement verrouillé après plusieurs échecs. Réessayez dans {minutes} minute(s)."


# --- Invitation / réinitialisation --------------------------------------------


def make_activation_link(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = settings.FRONTEND_PUBLIC_URL.rstrip("/")
    return f"{base}/activation?uid={uid}&token={token}"


def send_activation_email(user, invitation=True):
    if not user.email:
        return False
    link = make_activation_link(user)
    days = settings.PASSWORD_RESET_TIMEOUT // 86400
    if invitation:
        subject = "Activation de votre compte ORHS Bénin"
        intro = "Un compte a été créé pour vous sur la plateforme de l'Observatoire des ressources humaines en santé du Bénin."
        action = "Définissez votre mot de passe"
    else:
        subject = "Réinitialisation de votre mot de passe ORHS Bénin"
        intro = "Une réinitialisation du mot de passe de votre compte a été demandée."
        action = "Choisissez un nouveau mot de passe"
    body = (
        f"Bonjour {user.get_full_name() or user.username},\n\n"
        f"{intro}\n\n"
        f"Identifiant : {user.username}\n"
        f"{action} (lien valable {days} jours, à usage unique) :\n{link}\n\n"
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : "
        "votre mot de passe actuel reste inchangé.\n\n"
        "— Observatoire des ressources humaines en santé du Bénin"
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    return True


def user_from_activation_token(uid, token):
    if not isinstance(uid, str) or not isinstance(token, str) or not uid or not token:
        return None
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
    except (TypeError, ValueError, OverflowError, UnicodeError, User.DoesNotExist):
        return None
    if not user.is_active or not default_token_generator.check_token(user, token):
        return None
    return user
