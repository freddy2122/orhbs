from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.http import HttpResponse

from api.models import CampagneCollecte, RapportGenere
from api.permissions import IsAdminOrCoordinationOrAnalyst
from api.serializers import RapportGenereSerializer
from api.services.reports import ReportGenerator


def _report_response(data, format_export, modele):
    format_export = (format_export or "json").lower()
    filename = f"rapport_{modele}"

    if format_export == "csv":
        csv_data = ReportGenerator.export_csv(data, filename)
        response = HttpResponse(csv_data, content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{filename}.csv"'
        return response

    if format_export in ("excel", "xlsx"):
        payload = ReportGenerator.export_excel(data)
        response = HttpResponse(
            payload,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}.xlsx"'
        return response

    if format_export == "pdf":
        payload = ReportGenerator.export_pdf(data)
        response = HttpResponse(payload, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}.pdf"'
        return response

    return Response(data)


class ReportModelsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(ReportGenerator.MODELES_RAPPORT)


class ReportGenerateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordinationOrAnalyst]

    def get(self, request):
        modele = request.query_params.get("modele")
        if not modele:
            return Response({"detail": "Modèle de rapport requis."}, status=400)

        campagne_code = request.query_params.get("campagne")
        campagne = (
            CampagneCollecte.objects.filter(code=campagne_code).first()
            if campagne_code
            else None
        )
        try:
            data = ReportGenerator.generate_report_data(
                modele=modele,
                campagne=campagne,
                departement_code=request.query_params.get("departement"),
                zone_code=request.query_params.get("zone"),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        export = request.query_params.get("export") or request.query_params.get("output", "json")
        if export not in ("", "json"):
            _save_report_history(
                request,
                data,
                modele,
                {
                    "campagne": campagne_code,
                    "departement": request.query_params.get("departement"),
                    "zone": request.query_params.get("zone"),
                    "export": export,
                },
            )
        return _report_response(data, export, modele)

    def post(self, request):
        modele = request.data.get("modele")
        if not modele:
            return Response({"detail": "Modèle de rapport requis."}, status=400)

        campagne_code = request.data.get("campagne")
        campagne = (
            CampagneCollecte.objects.filter(code=campagne_code).first()
            if campagne_code
            else None
        )

        from datetime import datetime

        date_debut = None
        date_fin = None
        if request.data.get("date_debut"):
            date_debut = datetime.fromisoformat(request.data["date_debut"])
        if request.data.get("date_fin"):
            date_fin = datetime.fromisoformat(request.data["date_fin"])

        try:
            data = ReportGenerator.generate_report_data(
                modele=modele,
                campagne=campagne,
                departement_code=request.data.get("departement"),
                zone_code=request.data.get("zone"),
                date_debut=date_debut,
                date_fin=date_fin,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        export = request.data.get("export") or request.data.get("output", "json")
        _save_report_history(
            request,
            data,
            modele,
            {
                "campagne": campagne_code,
                "departement": request.data.get("departement"),
                "zone": request.data.get("zone"),
                "date_debut": request.data.get("date_debut"),
                "date_fin": request.data.get("date_fin"),
                "export": export,
            },
        )
        return _report_response(data, export, modele)


def _save_report_history(request, data, modele, params):
    RapportGenere.objects.create(
        modele=modele,
        nom_modele=data.get("nom_modele", modele),
        parametres=params,
        snapshot=data,
        cree_par=request.user if request.user.is_authenticated else None,
    )


class ReportHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoordinationOrAnalyst]

    def get(self, request):
        qs = RapportGenere.objects.all()[:50]
        return Response(RapportGenereSerializer(qs, many=True).data)

    def post(self, request):
        pk = request.data.get("id")
        report = RapportGenere.objects.filter(pk=pk).first()
        if not report:
            return Response({"detail": "Rapport introuvable."}, status=404)
        params = report.parametres or {}
        try:
            data = ReportGenerator.generate_report_data(
                modele=report.modele,
                campagne=CampagneCollecte.objects.filter(code=params.get("campagne")).first() if params.get("campagne") else None,
                departement_code=params.get("departement"),
                zone_code=params.get("zone"),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return _report_response(data, request.data.get("export") or "json", report.modele)
