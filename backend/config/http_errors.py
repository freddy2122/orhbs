from django.http import JsonResponse


def csrf_failure(request, reason=""):
    return JsonResponse(
        {
            "detail": "Requête refusée (CSRF). Rechargez la page puis reconnectez-vous.",
        },
        status=403,
    )


def server_error(request):
    if request.path.startswith("/api/"):
        return JsonResponse({"detail": "Erreur interne de l'API."}, status=500)
    from django.views.defaults import server_error as django_server_error

    return django_server_error(request)
