from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import CampagneCollecte, UserProfile
from api.permissions import get_user_profile
from api.services.alerts import AlertGenerator


class AdvancedAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retourne les alertes avancées calculées en temps réel."""
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        campagne_code = request.query_params.get("campagne")
        campagne = None
        if campagne_code:
            campagne = CampagneCollecte.objects.filter(code=campagne_code).first()

        # Calculer les alertes
        structures_sans_medecin = AlertGenerator.check_structures_sans_medecin(campagne)
        desequilibres_genre = AlertGenerator.check_desequilibres_genre(campagne)
        zones_penurie = AlertGenerator.check_zones_penurie_critique(campagne)

        return Response({
            "structures_sans_medecin": structures_sans_medecin,
            "desequilibres_genre": desequilibres_genre,
            "zones_penurie_critique": zones_penurie,
            "total_alertes": len(structures_sans_medecin) + len(desequilibres_genre) + len(zones_penurie),
        })


class TriggerAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Déclenche la génération d'alertes email."""
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        campagne_code = request.data.get("campagne")
        campagne = None
        if campagne_code:
            campagne = CampagneCollecte.objects.filter(code=campagne_code).first()

        # Générer les alertes
        alertes_creees = AlertGenerator.run_all_checks(campagne)

        return Response({
            "alertes_creees": len(alertes_creees),
            "alertes": [alerte.id for alerte in alertes_creees],
        })
