from django.conf import settings
from django.middleware.csrf import get_token
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import AuditLog
from .serializers import LoginSerializer, UserSerializer
from .services.account_security import (
    clear_lockout,
    lockout_message,
    lockout_remaining_seconds,
    register_failed_login,
    send_activation_email,
    set_user_password,
    user_from_activation_token,
)
from .throttling import LoginRateThrottle, LoginThrottled, PasswordResetRateThrottle

User = get_user_model()


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _auth_cookie_kwargs():
    # En production le front (Vercel) et l'API (Render) sont sur deux domaines :
    # SameSite=Lax empêcherait le navigateur d'envoyer le cookie de session.
    cross_site = not settings.DEBUG
    return {
        "httponly": True,
        "secure": cross_site,
        "samesite": "None" if cross_site else "Lax",
        "path": "/",
    }


def set_auth_cookies(response, access_token=None, refresh_token=None):
    cookie_kwargs = _auth_cookie_kwargs()
    if access_token:
        response.set_cookie("access_token", access_token, max_age=8 * 60 * 60, **cookie_kwargs)
    if refresh_token:
        response.set_cookie("refresh_token", refresh_token, max_age=7 * 24 * 60 * 60, **cookie_kwargs)
    return response


def clear_auth_cookies(response):
    kwargs = _auth_cookie_kwargs()
    response.delete_cookie("access_token", path=kwargs["path"], samesite=kwargs["samesite"])
    response.delete_cookie("refresh_token", path=kwargs["path"], samesite=kwargs["samesite"])
    return response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    from django.db import connection
    from django.db.utils import DatabaseError

    database_ok = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        database_ok = True
    except DatabaseError:
        database_ok = False
    return Response(
        {
            "status": "ok" if database_ok else "degraded",
            "message": "API Django opérationnelle",
            "database": database_ok,
        }
    )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def throttled(self, request, wait):
        raise LoginThrottled(wait=wait)

    def post(self, request):
        from django.db.utils import DatabaseError

        username = request.data.get("username") if hasattr(request.data, "get") else ""
        username = username if isinstance(username, str) else ""
        try:
            remaining = lockout_remaining_seconds(username)
            if remaining:
                return Response(
                    {"detail": lockout_message(remaining)}, status=status.HTTP_423_LOCKED
                )
            serializer = LoginSerializer(data=request.data)
            try:
                valid = serializer.is_valid()
            except AuthenticationFailed:
                register_failed_login(username, _client_ip(request))
                remaining = lockout_remaining_seconds(username)
                if remaining:
                    return Response(
                        {"detail": lockout_message(remaining)}, status=status.HTTP_423_LOCKED
                    )
                raise
        except DatabaseError:
            return Response(
                {
                    "detail": (
                        "Base de données indisponible. "
                        "Sur Render (orhsb-api → Environment), liez DATABASE_URL à orhsb-db."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not valid:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        clear_lockout(username)
        response = Response(data)
        set_auth_cookies(
            response,
            access_token=data.get("access"),
            refresh_token=data.get("refresh"),
        )
        # Issues the csrftoken cookie the SPA reads and echoes back as
        # X-CSRFToken on every mutating request (see api-client.ts) — required
        # now that CookieJWTAuthentication enforces CSRF on cookie-based auth.
        get_token(request)
        AuditLog.objects.create(
            user=serializer.user,
            action=AuditLog.Action.LOGIN,
            model_name="User",
            object_id=str(serializer.user.pk),
            object_repr=serializer.user.username,
            description="Connexion à l'espace privé",
            ip_address=_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.LOGOUT,
            model_name="User",
            object_id=str(request.user.pk),
            object_repr=request.user.username,
            description="Déconnexion",
            ip_address=_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        response = Response({"detail": "Déconnexion réussie."})
        return clear_auth_cookies(response)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, "profile"):
            return Response(
                {"detail": "Profil utilisateur introuvable."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(UserSerializer(request.user).data)


class PasswordForgotView(APIView):
    """Demande de lien de réinitialisation. Réponse identique que le compte existe ou non."""

    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        email = request.data.get("email") if hasattr(request.data, "get") else ""
        email = (email or "").strip() if isinstance(email, str) else ""
        if email:
            for user in User.objects.filter(email__iexact=email, is_active=True, profile__isnull=False):
                try:
                    send_activation_email(user, invitation=False)
                except Exception:
                    pass
        return Response(
            {"detail": "Si un compte correspond à cette adresse, un e-mail vient d'être envoyé."}
        )


class PasswordSetView(APIView):
    """Définit le mot de passe via le lien reçu (activation d'un compte invité ou réinitialisation)."""

    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        user = user_from_activation_token(request.data.get("uid"), request.data.get("token"))
        if not user:
            return Response({"detail": "Lien invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST)
        password = request.data.get("password")
        if not isinstance(password, str) or not password:
            return Response({"password": ["Mot de passe requis."]}, status=status.HTTP_400_BAD_REQUEST)
        set_user_password(user, password)
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.UPDATE,
            model_name="User",
            object_id=str(user.pk),
            object_repr=user.username,
            description="Mot de passe défini via lien d'activation / réinitialisation",
            ip_address=_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response({"detail": "Mot de passe enregistré. Vous pouvez vous connecter.", "username": user.username})


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password")
        new = request.data.get("new_password")
        if not isinstance(current, str) or not request.user.check_password(current):
            return Response(
                {"current_password": ["Mot de passe actuel incorrect."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(new, str) or not new:
            return Response({"password": ["Nouveau mot de passe requis."]}, status=status.HTTP_400_BAD_REQUEST)
        set_user_password(request.user, new)
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            model_name="User",
            object_id=str(request.user.pk),
            object_repr=request.user.username,
            description="Changement de mot de passe par l'utilisateur",
            ip_address=_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response({"detail": "Mot de passe modifié."})
