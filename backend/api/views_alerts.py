from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import CampagneCollecte
from api.permissions import IsAdminOrCoordination
from api.services.alerts import AlertGenerator, ensure_default_configs
from api.services.email import send_pending_alerts


class AdvancedAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retourne les alertes avancées calculées en temps réel."""
        campagne_code = request.query_params.get("campagne")
        campagne = None
        if campagne_code:
            campagne = CampagneCollecte.objects.filter(code=campagne_code).first()

        # Calculer les alertes
        structures_sans_medecin = AlertGenerator.check_structures_sans_medecin(campagne)
        desequilibres_genre = AlertGenerator.check_desequilibres_genre(campagne)
        zones_penurie = AlertGenerator.check_zones_penurie_critique(campagne)

        from api.permissions import get_user_profile
        from api.models import UserProfile

        profile = get_user_profile(request.user)
        if profile and profile.scope == UserProfile.Scope.DEPARTEMENTAL and profile.departement:
            nom = profile.departement.nom
            structures_sans_medecin = [r for r in structures_sans_medecin if r.get("departement") == nom]
            desequilibres_genre = [
                r for r in desequilibres_genre if r.get("departement") == nom or r.get("nom") == nom
            ]
            zones_penurie = [r for r in zones_penurie if r.get("departement") == nom]

        return Response({
            "structures_sans_medecin": structures_sans_medecin,
            "desequilibres_genre": desequilibres_genre,
            "zones_penurie_critique": zones_penurie,
            "total_alertes": len(structures_sans_medecin) + len(desequilibres_genre) + len(zones_penurie),
        })


class TriggerAlertsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def post(self, request):
        """Génère les alertes email, puis les envoie sauf si send=false."""
        ensure_default_configs()
        campagne_code = request.data.get("campagne")
        campagne = None
        if campagne_code:
            campagne = CampagneCollecte.objects.filter(code=campagne_code).first()

        alertes_creees = AlertGenerator.run_all_checks(campagne)
        send = request.data.get("send", True)
        envoi = {"sent": 0, "errors": 0, "processed": 0}
        if send:
            envoi = send_pending_alerts()

        return Response({
            "alertes_creees": len(alertes_creees),
            "alertes": [alerte.id for alerte in alertes_creees],
            "emails_envoyes": envoi["sent"],
            "emails_erreur": envoi["errors"],
        })


class SendPendingAlertsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordination]

    def post(self, request):
        """Envoie uniquement les emails déjà en file d'attente."""
        result = send_pending_alerts()
        return Response(result)
