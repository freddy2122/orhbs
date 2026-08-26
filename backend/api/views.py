from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import AuditLog
from .serializers import LoginSerializer, UserSerializer


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

    def post(self, request):
        from django.db.utils import DatabaseError

        try:
            serializer = LoginSerializer(data=request.data)
            valid = serializer.is_valid()
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
        response = Response(data)
        set_auth_cookies(
            response,
            access_token=data.get("access"),
            refresh_token=data.get("refresh"),
        )
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
