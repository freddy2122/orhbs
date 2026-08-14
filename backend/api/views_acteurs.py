from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers import CampagneCollecteSerializer
from api.services.acteurs import (
    cartography_data,
    competences_data,
    interoperabilite_data,
    planification_data,
)


def _serialize_campagne(campagne):
    if not campagne:
        return None
    return CampagneCollecteSerializer(campagne).data


class PlanificationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = planification_data(request.user)
        return Response(
            {
                "campagne": _serialize_campagne(data["campagne"]),
                "besoins_recruitement": data["besoins_recruitement"],
                "alertes_retraite": data["alertes_retraite"],
            }
        )


class CartographyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = cartography_data(request.user)
        return Response(
            {
                "campagne": _serialize_campagne(data["campagne"]),
                "structures": data["structures"],
            }
        )


class CompetencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = competences_data(request.user)
        return Response(
            {
                "campagne": _serialize_campagne(data["campagne"]),
                "formations": data["formations"],
                "specialisations": data["specialisations"],
            }
        )


class InteroperabiliteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = interoperabilite_data(request.user)
        return Response(
            {
                "campagne": _serialize_campagne(data["campagne"]),
                "sources": data["sources"],
                "total_agents": data["total_agents"],
                "historique_imports": data["historique_imports"],
            }
        )
