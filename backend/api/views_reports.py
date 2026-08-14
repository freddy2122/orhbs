import csv
import io
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.http import HttpResponse

from api.models import CampagneCollecte, UserProfile
from api.permissions import get_user_profile
from api.services.reports import ReportGenerator


class ReportModelsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Liste les modèles de rapports disponibles."""
        profile = get_user_profile(request.user)
        if not profile:
            return Response({"detail": "Non autorisé."}, status=403)

        return Response(ReportGenerator.MODELES_RAPPORT)


class ReportGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Génère un rapport personnalisé."""
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
            UserProfile.Role.ANALYSTE,
            UserProfile.Role.VALIDATEUR,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        modele = request.query_params.get("modele")
        campagne_code = request.query_params.get("campagne")
        departement_code = request.query_params.get("departement")
        zone_code = request.query_params.get("zone")
        format_export = request.query_params.get("format", "json")  # json, csv

        if not modele:
            return Response({"detail": "Modèle de rapport requis."}, status=400)

        # Récupérer la campagne
        campagne = None
        if campagne_code:
            campagne = CampagneCollecte.objects.filter(code=campagne_code).first()

        # Générer les données du rapport
        try:
            data = ReportGenerator.generate_report_data(
                modele=modele,
                campagne=campagne,
                departement_code=departement_code,
                zone_code=zone_code,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        # Export selon le format demandé
        if format_export == "csv":
            csv_data = ReportGenerator.export_csv(data, f"rapport_{modele}")
            response = HttpResponse(
                csv_data,
                content_type='text/csv'
            )
            response['Content-Disposition'] = f'attachment; filename="rapport_{modele}.csv"'
            return response

        return Response(data)

    def post(self, request):
        """Génère un rapport avec des paramètres avancés."""
        profile = get_user_profile(request.user)
        if not profile or profile.role not in (
            UserProfile.Role.ADMIN,
            UserProfile.Role.COORDINATION,
            UserProfile.Role.ANALYSTE,
        ):
            return Response({"detail": "Non autorisé."}, status=403)

        modele = request.data.get("modele")
        campagne_code = request.data.get("campagne")
        departement_code = request.data.get("departement")
        zone_code = request.data.get("zone")
        date_debut_str = request.data.get("date_debut")
        date_fin_str = request.data.get("date_fin")
        format_export = request.data.get("format", "json")

        if not modele:
            return Response({"detail": "Modèle de rapport requis."}, status=400)

        # Récupérer la campagne
        campagne = None
        if campagne_code:
            campagne = CampagneCollecte.objects.filter(code=campagne_code).first()

        # Parser les dates
        from datetime import datetime
        date_debut = None
        date_fin = None
        if date_debut_str:
            date_debut = datetime.fromisoformat(date_debut_str)
        if date_fin_str:
            date_fin = datetime.fromisoformat(date_fin_str)

        # Générer les données du rapport
        try:
            data = ReportGenerator.generate_report_data(
                modele=modele,
                campagne=campagne,
                departement_code=departement_code,
                zone_code=zone_code,
                date_debut=date_debut,
                date_fin=date_fin,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        # Export selon le format demandé
        if format_export == "csv":
            csv_data = ReportGenerator.export_csv(data, f"rapport_{modele}")
            response = HttpResponse(
                csv_data,
                content_type='text/csv'
            )
            response['Content-Disposition'] = f'attachment; filename="rapport_{modele}.csv"'
            return response

        return Response(data)
